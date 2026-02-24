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
