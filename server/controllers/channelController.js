const Channel = require('../models/Channel');
const Message = require('../models/Message');
const Server = require('../models/Server');
const { getIO } = require('../sockets');

// Create channel
exports.createChannel = async (req, res, next) => {
    try {
        const { name, description, type = 'text', isPrivate = false, category, serverId } = req.body;

        const channelData = {
            name, description, type, isPrivate, category,
            owner: req.user._id,
            members: [{ user: req.user._id, role: 'owner' }],
        };
        if (serverId) channelData.server = serverId;

        const channel = await Channel.create(channelData);

        if (serverId) {
            await Server.findByIdAndUpdate(serverId, { $push: { channels: channel._id } });
        }

        const populated = await channel.populate('members.user', 'username avatar status');

        const io = getIO();
        if (io && serverId) {
            io.to(`server:${serverId}`).emit('channel:created', { channel: populated });
        }

        res.status(201).json({ channel: populated });
    } catch (error) {
        next(error);
    }
};

// Get all channels (public)
exports.getChannels = async (req, res, next) => {
    try {
        const { type, page = 1, limit = 50 } = req.query;
        const query = { isPrivate: false };
        if (type) query.type = type;

        const channels = await Channel.find(query)
            .populate('owner', 'username avatar')
            .populate('lastMessage')
            .sort({ lastActivity: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await Channel.countDocuments(query);
        res.json({ channels, total });
    } catch (error) {
        next(error);
    }
};

// Get user's channels
exports.getMyChannels = async (req, res, next) => {
    try {
        const channels = await Channel.find({ 'members.user': req.user._id })
            .populate('owner', 'username avatar')
            .populate('lastMessage')
            .populate('members.user', 'username avatar status')
            .sort({ lastActivity: -1 });

        res.json({ channels });
    } catch (error) {
        next(error);
    }
};

// Get single channel
exports.getChannel = async (req, res, next) => {
    try {
        const channel = await Channel.findById(req.params.id)
            .populate('owner', 'username avatar')
            .populate('members.user', 'username avatar status')
            .populate('pinnedMessages');

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        res.json({ channel });
    } catch (error) {
        next(error);
    }
};

// Update channel
exports.updateChannel = async (req, res, next) => {
    try {
        const { name, description, isPrivate, category, slowMode } = req.body;
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        // Check permissions
        const member = channel.members.find(m => m.user.toString() === req.user._id.toString());
        if (!member || !['owner', 'admin'].includes(member.role)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updates = {};
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (isPrivate !== undefined) updates.isPrivate = isPrivate;
        if (category) updates.category = category;
        if (slowMode !== undefined) updates.slowMode = slowMode;

        const updated = await Channel.findByIdAndUpdate(req.params.id, updates, { new: true })
            .populate('members.user', 'username avatar status');

        res.json({ channel: updated });
    } catch (error) {
        next(error);
    }
};

// Delete channel
exports.deleteChannel = async (req, res, next) => {
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) return res.status(404).json({ message: 'Channel not found' });

        if (channel.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Remove from server
        if (channel.server) {
            await Server.findByIdAndUpdate(channel.server, { $pull: { channels: channel._id } });
        }

        await Message.deleteMany({ channel: channel._id });
        await Channel.findByIdAndDelete(req.params.id);

        const io = getIO();
        if (io && channel.server) {
            io.to(`server:${channel.server}`).emit('channel:deleted', { channelId: channel._id });
        }

        res.json({ message: 'Channel deleted' });
    } catch (error) {
        next(error);
    }
};

// Join channel
exports.joinChannel = async (req, res, next) => {
    try {
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        const isMember = channel.members.some(m => m.user.toString() === req.user._id.toString());
        if (isMember) {
            return res.status(400).json({ message: 'Already a member' });
        }

        channel.members.push({ user: req.user._id, role: 'member' });
        await channel.save();

        const populated = await channel.populate('members.user', 'username avatar status');

        // Notify channel members
        const io = getIO();
        if (io) {
            io.to(`channel:${channel._id}`).emit('channel:member-joined', {
                channelId: channel._id,
                user: req.user,
            });
        }

        res.json({ channel: populated });
    } catch (error) {
        next(error);
    }
};

// Leave channel
exports.leaveChannel = async (req, res, next) => {
    try {
        const channel = await Channel.findById(req.params.id);

        if (!channel) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        channel.members = channel.members.filter(m => m.user.toString() !== req.user._id.toString());
        await channel.save();

        res.json({ message: 'Left channel' });
    } catch (error) {
        next(error);
    }
};

// Create DM channel
exports.createDM = async (req, res, next) => {
    try {
        const { targetUserId } = req.body;

        // Check if DM already exists
        const existing = await Channel.findOne({
            type: 'dm',
            'members.user': { $all: [req.user._id, targetUserId] },
        }).populate('members.user', 'username avatar status');

        if (existing) {
            return res.json({ channel: existing });
        }

        const channel = await Channel.create({
            name: 'Direct Message',
            type: 'dm',
            owner: req.user._id,
            members: [
                { user: req.user._id, role: 'member' },
                { user: targetUserId, role: 'member' },
            ],
        });

        const populated = await channel.populate('members.user', 'username avatar status');
        res.status(201).json({ channel: populated });
    } catch (error) {
        next(error);
    }
};
