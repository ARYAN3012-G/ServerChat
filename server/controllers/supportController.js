const SupportTicket = require('../models/SupportTicket');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logger } = require('../config/logger');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are ServerChat's AI Support Assistant. You help users with issues related to the ServerChat platform — a Discord-like communication app with features including:

- Text and voice channels in servers
- Direct messages (DMs)
- Voice & video calls (WebRTC)
- Screen sharing
- Games (Chess, Tic-tac-toe, Connect 4, Flappy Bird, 2048, Battleship)
- Music listening rooms (YouTube integration)
- Friend system
- Server management (roles, invites, settings)
- Face ID login
- Google/GitHub OAuth login
- Two-factor authentication (2FA)
- File/image uploads
- Custom status & presence
- Admin panel

Guidelines:
- Be friendly, concise, and helpful
- If you can solve the issue, provide clear step-by-step instructions
- If you cannot solve it or the user seems frustrated, suggest they escalate to a human admin by clicking "Talk to Human"
- Never make up features that don't exist
- Keep responses under 200 words
- Use emojis sparingly for friendliness`;

// Get or create active ticket for user
exports.getActiveTicket = async (req, res, next) => {
    try {
        let ticket = await SupportTicket.findOne({
            user: req.user._id,
            status: { $in: ['ai-chat', 'escalated', 'in-progress'] },
        }).sort({ lastActivity: -1 });

        if (!ticket) {
            ticket = await SupportTicket.create({
                user: req.user._id,
                messages: [{
                    role: 'ai',
                    content: '👋 Hi there! I\'m ServerChat\'s AI assistant. How can I help you today?\n\nI can help with:\n• Account issues\n• Voice/video problems\n• Server settings\n• General questions\n\nJust type your question below!',
                }],
            });
        }

        res.json({ ticket });
    } catch (error) {
        next(error);
    }
};

// Send message to AI and get response
exports.sendMessage = async (req, res, next) => {
    try {
        const { message, ticketId } = req.body;
        if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

        let ticket;
        if (ticketId) {
            ticket = await SupportTicket.findOne({ _id: ticketId, user: req.user._id });
        }
        if (!ticket) {
            ticket = await SupportTicket.findOne({
                user: req.user._id,
                status: { $in: ['ai-chat', 'escalated', 'in-progress'] },
            }).sort({ lastActivity: -1 });
        }
        if (!ticket) {
            ticket = await SupportTicket.create({ user: req.user._id, messages: [] });
        }

        // Add user message
        ticket.messages.push({ role: 'user', content: message.trim() });
        ticket.lastActivity = new Date();

        // If ticket is escalated/in-progress (admin is handling), don't call AI
        if (ticket.status === 'escalated' || ticket.status === 'in-progress') {
            await ticket.save();
            return res.json({ ticket, aiResponse: null });
        }

        // Build conversation history for Gemini
        const history = ticket.messages
            .filter(m => m.role !== 'admin')
            .slice(-20) // last 20 messages for context
            .map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            }));

        // Remove the last user message from history (we'll send it separately)
        const lastMsg = history.pop();

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const chat = model.startChat({
                history: [
                    { role: 'user', parts: [{ text: 'System context: ' + SYSTEM_PROMPT }] },
                    { role: 'model', parts: [{ text: 'Understood! I\'m ready to help ServerChat users.' }] },
                    ...history,
                ],
            });

            const result = await chat.sendMessage(lastMsg.parts[0].text);
            const aiText = result.response.text();

            ticket.messages.push({ role: 'ai', content: aiText });
            await ticket.save();

            return res.json({ ticket, aiResponse: aiText });
        } catch (aiErr) {
            logger.error(`Gemini AI error: ${aiErr.message}`);
            const fallback = '😅 I\'m having trouble processing that right now. You can click **"Talk to Human"** to connect with an admin who can help!';
            ticket.messages.push({ role: 'ai', content: fallback });
            await ticket.save();
            return res.json({ ticket, aiResponse: fallback });
        }
    } catch (error) {
        next(error);
    }
};

// Escalate to human admin
exports.escalateTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.body;
        const ticket = await SupportTicket.findOne({ _id: ticketId, user: req.user._id });
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        ticket.status = 'escalated';
        ticket.messages.push({
            role: 'ai',
            content: '🔔 Your request has been escalated to a human admin. They\'ll respond as soon as possible. Please hang tight!',
        });
        ticket.lastActivity = new Date();

        // Auto-generate subject from first user message
        const firstUserMsg = ticket.messages.find(m => m.role === 'user');
        if (firstUserMsg && ticket.subject === 'Support Request') {
            ticket.subject = firstUserMsg.content.slice(0, 80) + (firstUserMsg.content.length > 80 ? '...' : '');
        }

        await ticket.save();
        res.json({ ticket });
    } catch (error) {
        next(error);
    }
};

// Close/resolve ticket (user)
exports.closeTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.body;
        const ticket = await SupportTicket.findOne({ _id: ticketId, user: req.user._id });
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        ticket.status = 'resolved';
        ticket.resolvedAt = new Date();
        ticket.lastActivity = new Date();
        await ticket.save();

        res.json({ ticket });
    } catch (error) {
        next(error);
    }
};

// Start new ticket (user)
exports.newTicket = async (req, res, next) => {
    try {
        // Close any open tickets first
        await SupportTicket.updateMany(
            { user: req.user._id, status: { $in: ['ai-chat'] } },
            { status: 'closed', lastActivity: new Date() }
        );

        const ticket = await SupportTicket.create({
            user: req.user._id,
            messages: [{
                role: 'ai',
                content: '👋 Hi again! Starting a fresh conversation. How can I help you?',
            }],
        });

        res.json({ ticket });
    } catch (error) {
        next(error);
    }
};

// Get user's ticket history
exports.getMyTickets = async (req, res, next) => {
    try {
        const tickets = await SupportTicket.find({ user: req.user._id })
            .select('status subject lastActivity createdAt messages')
            .sort({ lastActivity: -1 })
            .limit(20);

        res.json({ tickets });
    } catch (error) {
        next(error);
    }
};

// ─── ADMIN ENDPOINTS ───

// Get all escalated/in-progress tickets
exports.adminGetTickets = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        else query.status = { $in: ['escalated', 'in-progress', 'resolved'] };

        const tickets = await SupportTicket.find(query)
            .populate('user', 'username email avatar')
            .populate('assignedAdmin', 'username avatar')
            .select('user status subject priority lastActivity createdAt messages assignedAdmin')
            .sort({ lastActivity: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await SupportTicket.countDocuments(query);
        const escalatedCount = await SupportTicket.countDocuments({ status: 'escalated' });

        res.json({ tickets, total, escalatedCount });
    } catch (error) {
        next(error);
    }
};

// Get single ticket with full history (admin)
exports.adminGetTicket = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id)
            .populate('user', 'username email avatar status')
            .populate('assignedAdmin', 'username avatar');

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        res.json({ ticket });
    } catch (error) {
        next(error);
    }
};

// Admin reply to ticket
exports.adminReply = async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        ticket.messages.push({ role: 'admin', content: message.trim() });
        ticket.status = 'in-progress';
        ticket.assignedAdmin = req.user._id;
        ticket.lastActivity = new Date();
        await ticket.save();

        // Notify user via socket
        const { getIO } = require('../sockets');
        const io = getIO();
        if (io) {
            io.to(`user:${ticket.user}`).emit('support:admin-reply', {
                ticketId: ticket._id,
                message: message.trim(),
                adminName: req.user.username,
            });
        }

        const populated = await SupportTicket.findById(ticket._id)
            .populate('user', 'username email avatar')
            .populate('assignedAdmin', 'username avatar');

        res.json({ ticket: populated });
    } catch (error) {
        next(error);
    }
};

// Admin resolve ticket
exports.adminResolveTicket = async (req, res, next) => {
    try {
        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        ticket.status = 'resolved';
        ticket.resolvedAt = new Date();
        ticket.lastActivity = new Date();
        ticket.messages.push({
            role: 'admin',
            content: '✅ This ticket has been marked as resolved. If you need further help, feel free to start a new conversation!',
        });
        await ticket.save();

        const { getIO } = require('../sockets');
        const io = getIO();
        if (io) {
            io.to(`user:${ticket.user}`).emit('support:ticket-resolved', { ticketId: ticket._id });
        }

        res.json({ ticket });
    } catch (error) {
        next(error);
    }
};
