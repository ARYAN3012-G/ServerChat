const Server = require('../models/Server');
const Channel = require('../models/Channel');
const { logger } = require('../config/logger');
const { getIO } = require('../sockets');

// Create a new server
exports.createServer = async (req, res, next) => {
    try {
        const { name, description, isPublic } = req.body;

        const server = await Server.create({
            name,
            description,
            isPublic: isPublic || false,
            owner: req.user._id,
            members: [{
                user: req.user._id,
                role: 'owner',
                joinedAt: new Date(),
            }],
            memberCount: 1,
        });

        // Create default channels
        const generalChannel = await Channel.create({
            name: 'general',
            type: 'text',
            server: server._id,
            owner: req.user._id,
        });

        const voiceChannel = await Channel.create({
            name: 'General Voice',
            type: 'voice',
            server: server._id,
            owner: req.user._id,
        });

        server.channels.push(generalChannel._id, voiceChannel._id);
        server.systemChannel = generalChannel._id;

        // Create default category
        server.categories.push({
            name: 'Text Channels',
            position: 0,
            channels: [generalChannel._id],
        });
        server.categories.push({
            name: 'Voice Channels',
            position: 1,
            channels: [voiceChannel._id],
        });

        await server.save();

        const populated = await Server.findById(server._id)
            .populate('owner', 'username avatar status')
            .populate('channels')
            .populate('members.user', 'username avatar status');

        res.status(201).json(populated);
    } catch (error) {
        next(error);
    }
};

// Get all servers for the current user
exports.getMyServers = async (req, res, next) => {
    try {
        const servers = await Server.find({ 'members.user': req.user._id })
            .populate('owner', 'username avatar')
            .populate('channels')
            .select('name icon description memberCount boostTier inviteCode');

        res.json(servers);
    } catch (error) {
        next(error);
    }
};

// Get single server by ID
exports.getServer = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id)
            .populate('owner', 'username avatar status')
            .populate('channels')
            .populate('members.user', 'username avatar status customStatus lastSeen');

        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Check if user is a member
        const isMember = server.members.some(m => m.user._id.toString() === req.user._id.toString());
        if (!isMember && !server.isPublic) {
            return res.status(403).json({ message: 'You are not a member of this server' });
        }

        res.json(server);
    } catch (error) {
        next(error);
    }
};

// Join server via invite code
exports.joinServer = async (req, res, next) => {
    try {
        const { inviteCode } = req.params;

        // Check permanent invite code
        let server = await Server.findOne({ inviteCode });

        // Check invite links
        if (!server) {
            server = await Server.findOne({ 'inviteLinks.code': inviteCode });
            if (server) {
                const invite = server.inviteLinks.find(l => l.code === inviteCode);
                if (invite.expiresAt && invite.expiresAt < new Date()) {
                    return res.status(400).json({ message: 'Invite link has expired' });
                }
                if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
                    return res.status(400).json({ message: 'Invite link has reached maximum uses' });
                }
                invite.uses += 1;
            }
        }

        if (!server) {
            return res.status(404).json({ message: 'Invalid invite code' });
        }

        // Check if already a member
        const isMember = server.members.some(m => m.user.toString() === req.user._id.toString());
        if (isMember) {
            return res.status(400).json({ message: 'You are already a member of this server' });
        }

        // Check if server is full
        if (server.memberCount >= server.maxMembers) {
            return res.status(400).json({ message: 'Server is full' });
        }

        server.members.push({
            user: req.user._id,
            role: 'member',
            joinedAt: new Date(),
        });
        server.memberCount += 1;
        await server.save();

        const populated = await Server.findById(server._id)
            .populate('owner', 'username avatar')
            .populate('channels')
            .populate('members.user', 'username avatar status');

        // Notify all existing members in real-time
        try {
            const io = getIO();
            if (io) {
                // Broadcast to all channels in this server so existing members get updated
                const channelIds = populated.channels.map(ch => ch._id.toString());
                channelIds.forEach(chId => {
                    io.to(`channel:${chId}`).emit('server:member-joined', {
                        serverId: server._id.toString(),
                        member: {
                            user: { _id: req.user._id, username: req.user.username, avatar: req.user.avatar, status: req.user.status || 'online' },
                            role: 'member',
                            joinedAt: new Date(),
                        },
                    });
                });
            }
        } catch (socketErr) {
            logger.error('Failed to emit server:member-joined:', socketErr);
        }

        res.json(populated);
    } catch (error) {
        next(error);
    }
};

// Leave server
exports.leaveServer = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Owner cannot leave. Transfer ownership or delete the server.' });
        }

        server.members = server.members.filter(m => m.user.toString() !== req.user._id.toString());
        server.memberCount = Math.max(0, server.memberCount - 1);
        await server.save();

        res.json({ message: 'Left server successfully' });
    } catch (error) {
        next(error);
    }
};

// Update server
exports.updateServer = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        // Only owner and admins can update
        const member = server.members.find(m => m.user.toString() === req.user._id.toString());
        if (!member || !['owner', 'admin'].includes(member.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { name, description, isPublic } = req.body;
        if (name) server.name = name;
        if (description !== undefined) server.description = description;
        if (isPublic !== undefined) server.isPublic = isPublic;

        await server.save();

        res.json(server);
    } catch (error) {
        next(error);
    }
};

// Delete server (owner only)
exports.deleteServer = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the owner can delete the server' });
        }

        // Delete all channels in this server
        await Channel.deleteMany({ server: server._id });
        await Server.findByIdAndDelete(server._id);

        res.json({ message: 'Server deleted' });
    } catch (error) {
        next(error);
    }
};

// Generate invite link
exports.createInvite = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        const member = server.members.find(m => m.user.toString() === req.user._id.toString());
        if (!member) {
            return res.status(403).json({ message: 'You are not a member of this server' });
        }

        const { expiresIn, maxUses } = req.body;
        let expiresAt = null;
        if (expiresIn) {
            expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000); // hours
        }

        const code = server.createInvite(req.user._id, { expiresAt, maxUses });
        await server.save();

        res.json({
            code,
            inviteUrl: `${process.env.CLIENT_URL}/invite/${code}`,
            expiresAt,
            maxUses: maxUses || 'unlimited',
        });
    } catch (error) {
        next(error);
    }
};

// Discover public servers
exports.discoverServers = async (req, res, next) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const query = { isPublic: true };

        if (search) {
            query.$text = { $search: search };
        }

        const servers = await Server.find(query)
            .populate('owner', 'username avatar')
            .select('name icon description memberCount boostTier')
            .sort({ memberCount: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Server.countDocuments(query);

        res.json({ servers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        next(error);
    }
};

// Update member role
exports.updateMemberRole = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        const requester = server.members.find(m => m.user.toString() === req.user._id.toString());
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { userId, role } = req.body;
        if (role === 'owner') {
            return res.status(400).json({ message: 'Cannot assign owner role this way' });
        }

        const target = server.members.find(m => m.user.toString() === userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found in server' });
        }

        target.role = role;
        await server.save();

        res.json({ message: `Role updated to ${role}` });
    } catch (error) {
        next(error);
    }
};

// Update member nickname
exports.updateMemberNickname = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        const requester = server.members.find(m => m.user.toString() === req.user._id.toString());
        if (!requester || !['owner', 'admin'].includes(requester.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { userId, nickname } = req.body;
        const target = server.members.find(m => m.user.toString() === userId);
        if (!target) {
            return res.status(404).json({ message: 'User not found in server' });
        }

        target.nickname = nickname || '';
        await server.save();

        res.json({ message: 'Nickname updated', nickname: target.nickname });
    } catch (error) {
        next(error);
    }
};

// Transfer ownership
exports.transferOwnership = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        if (server.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the owner can transfer ownership' });
        }

        const { newOwnerId, leaveAfterTransfer } = req.body;
        if (!newOwnerId) {
            return res.status(400).json({ message: 'New owner ID is required' });
        }

        const newOwnerMember = server.members.find(m => m.user.toString() === newOwnerId);
        if (!newOwnerMember) {
            return res.status(404).json({ message: 'User not found in server' });
        }

        // Transfer ownership
        server.owner = newOwnerId;
        newOwnerMember.role = 'owner';

        // Demote old owner to member or remove
        const oldOwnerMember = server.members.find(m => m.user.toString() === req.user._id.toString());
        if (leaveAfterTransfer) {
            server.members = server.members.filter(m => m.user.toString() !== req.user._id.toString());
            server.memberCount = Math.max(0, server.memberCount - 1);
        } else {
            if (oldOwnerMember) oldOwnerMember.role = 'member';
        }

        await server.save();

        const populated = await Server.findById(server._id)
            .populate('owner', 'username avatar status')
            .populate('channels')
            .populate('members.user', 'username avatar status');

        res.json(populated);
    } catch (error) {
        next(error);
    }
};

// Kick member
exports.kickMember = async (req, res, next) => {
    try {
        const server = await Server.findById(req.params.id);
        if (!server) {
            return res.status(404).json({ message: 'Server not found' });
        }

        const requester = server.members.find(m => m.user.toString() === req.user._id.toString());
        if (!requester || !['owner', 'admin', 'moderator'].includes(requester.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }

        const { userId } = req.params;
        if (userId === server.owner.toString()) {
            return res.status(400).json({ message: 'Cannot kick the owner' });
        }

        server.members = server.members.filter(m => m.user.toString() !== userId);
        server.memberCount = Math.max(0, server.memberCount - 1);
        await server.save();

        res.json({ message: 'Member kicked' });
    } catch (error) {
        next(error);
    }
};
