const Message = require('../models/Message');
const Channel = require('../models/Channel');

// Get messages for a channel
exports.getMessages = async (req, res, next) => {
    try {
        const { channelId } = req.params;
        const { page = 1, limit = 50, before } = req.query;

        const query = { channel: channelId, isDeleted: false };
        if (before) query.createdAt = { $lt: new Date(before) };

        const messages = await Message.find(query)
            .populate('sender', 'username avatar status')
            .populate('replyTo', 'content sender')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Message.countDocuments(query);

        res.json({
            messages: messages.reverse(),
            total,
            hasMore: total > page * limit,
        });
    } catch (error) {
        next(error);
    }
};

// Get thread messages
exports.getThread = async (req, res, next) => {
    try {
        const { messageId } = req.params;

        const parent = await Message.findById(messageId)
            .populate('sender', 'username avatar status');

        const replies = await Message.find({ threadId: messageId, isDeleted: false })
            .populate('sender', 'username avatar status')
            .sort({ createdAt: 1 });

        res.json({ parent, replies });
    } catch (error) {
        next(error);
    }
};

// Get pinned messages
exports.getPinnedMessages = async (req, res, next) => {
    try {
        const { channelId } = req.params;
        const messages = await Message.find({
            channel: channelId,
            isPinned: true,
            isDeleted: false,
        })
            .populate('sender', 'username avatar status')
            .sort({ createdAt: -1 });

        res.json({ messages });
    } catch (error) {
        next(error);
    }
};

// Search messages
exports.searchMessages = async (req, res, next) => {
    try {
        const { q, channelId, page = 1, limit = 20 } = req.query;

        const query = { isDeleted: false };
        if (q) query.$text = { $search: q };
        if (channelId) query.channel = channelId;

        const messages = await Message.find(query)
            .populate('sender', 'username avatar status')
            .populate('channel', 'name')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Message.countDocuments(query);
        res.json({ messages, total });
    } catch (error) {
        next(error);
    }
};

// Send a message via REST
exports.sendMessage = async (req, res, next) => {
    try {
        const { channelId } = req.params;
        const { content, type = 'text' } = req.body;

        const message = await Message.create({
            content, type,
            sender: req.user._id,
            channel: channelId,
        });

        const populated = await message.populate('sender', 'username avatar status');
        await Channel.findByIdAndUpdate(channelId, {
            lastMessage: message._id,
            lastActivity: new Date(),
        });

        res.status(201).json({ message: populated });
    } catch (error) {
        next(error);
    }
};

// Edit a message
exports.editMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Can only edit your own messages' });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        const populated = await message.populate('sender', 'username avatar status');
        res.json({ message: populated });
    } catch (error) {
        next(error);
    }
};

// Delete a message (soft delete)
exports.deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        await message.save();

        res.json({ message: 'Message deleted' });
    } catch (error) {
        next(error);
    }
};

// Toggle reaction on a message
exports.toggleReaction = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        const existingReaction = message.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
            const userIdx = existingReaction.users.indexOf(req.user._id);
            if (userIdx > -1) {
                existingReaction.users.splice(userIdx, 1);
                if (existingReaction.users.length === 0) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                }
            } else {
                existingReaction.users.push(req.user._id);
            }
        } else {
            message.reactions.push({ emoji, users: [req.user._id] });
        }

        await message.save();
        const populated = await message.populate('sender', 'username avatar status');
        res.json({ message: populated });
    } catch (error) {
        next(error);
    }
};

// Mark a message as read
exports.markAsRead = async (req, res, next) => {
    try {
        const { messageId } = req.params;

        const message = await Message.findById(messageId);
        if (!message) return res.status(404).json({ message: 'Message not found' });

        const alreadyRead = message.readBy.find(r => r.user.toString() === req.user._id.toString());
        if (!alreadyRead) {
            message.readBy.push({ user: req.user._id, readAt: new Date() });
            await message.save();
        }

        res.json({ success: true, messageId });
    } catch (error) {
        next(error);
    }
};
