const Message = require('../models/Message');
const Channel = require('../models/Channel');
const { logger } = require('../config/logger');

module.exports = (io, socket) => {
    // Join a channel room
    socket.on('channel:join', async (channelId) => {
        socket.join(`channel:${channelId}`);
        logger.debug(`${socket.username} joined channel ${channelId}`);
    });

    // Leave a channel room
    socket.on('channel:leave', (channelId) => {
        socket.leave(`channel:${channelId}`);
    });

    // Voice channel join (enforces single channel at a time)
    socket.on('voice:join', async ({ channelId }) => {
        // Auto-leave previous voice channel
        if (socket.currentVoiceChannel && socket.currentVoiceChannel !== channelId) {
            socket.leave(`voice:${socket.currentVoiceChannel}`);
            io.to(`channel:${socket.currentVoiceChannel}`).emit('voice:user-left', {
                channelId: socket.currentVoiceChannel,
                userId: socket.userId,
            });
        }
        socket.currentVoiceChannel = channelId;
        socket.join(`voice:${channelId}`);

        // Get list of existing users in this voice channel (before broadcasting join)
        const room = io.sockets.adapter.rooms.get(`voice:${channelId}`);
        const existingUsers = [];
        if (room) {
            for (const socketId of room) {
                const memberSocket = io.sockets.sockets.get(socketId);
                if (memberSocket && memberSocket.userId !== socket.userId) {
                    existingUsers.push({
                        userId: memberSocket.userId,
                        username: memberSocket.username,
                        socketId: memberSocket.id,
                    });
                }
            }
        }

        // Tell the joining user who is already in the channel (so they can create peer connections)
        socket.emit('voice:existing-users', {
            channelId,
            users: existingUsers,
        });

        // Tell everyone else that a new user joined
        socket.to(`voice:${channelId}`).emit('voice:user-joined', {
            channelId,
            userId: socket.userId,
            username: socket.username,
            socketId: socket.id,
        });
        // Also emit to the channel room for sidebar display
        io.to(`channel:${channelId}`).emit('voice:user-joined', {
            channelId,
            userId: socket.userId,
            username: socket.username,
        });

        logger.debug(`${socket.username} joined voice channel ${channelId} (${existingUsers.length} existing users)`);
    });

    // Voice channel leave
    socket.on('voice:leave', ({ channelId }) => {
        socket.currentVoiceChannel = null;
        socket.leave(`voice:${channelId}`);
        io.to(`channel:${channelId}`).emit('voice:user-left', {
            channelId,
            userId: socket.userId,
        });
        // Also notify voice room peers so they tear down peer connections
        io.to(`voice:${channelId}`).emit('voice:peer-left', {
            channelId,
            userId: socket.userId,
        });
    });

    // WebRTC signaling for voice channels (mesh networking)
    socket.on('voice:offer', ({ targetSocketId, offer, channelId }) => {
        io.to(targetSocketId).emit('voice:offer', {
            offer,
            from: socket.userId,
            fromSocketId: socket.id,
            channelId,
        });
    });

    socket.on('voice:answer', ({ targetSocketId, answer, channelId }) => {
        io.to(targetSocketId).emit('voice:answer', {
            answer,
            from: socket.userId,
            fromSocketId: socket.id,
            channelId,
        });
    });

    socket.on('voice:ice-candidate', ({ targetSocketId, candidate, channelId }) => {
        io.to(targetSocketId).emit('voice:ice-candidate', {
            candidate,
            from: socket.userId,
            fromSocketId: socket.id,
            channelId,
        });
    });

    // Broadcast user media state changes (mute/video/screen) to voice channel peers
    socket.on('voice:user-state', ({ channelId, isMuted, isVideoOn, isScreenSharing }) => {
        if (channelId) {
            socket.to(`voice:${channelId}`).emit('voice:user-state', {
                userId: socket.userId,
                isMuted,
                isVideoOn,
                isScreenSharing,
            });
        }
    });

    // Send a message
    socket.on('message:send', async (data) => {
        try {
            const { channelId, content, type = 'text', attachments = [], replyTo, threadId } = data;

            const message = await Message.create({
                content,
                sender: socket.userId,
                channel: channelId,
                type,
                attachments,
                replyTo,
                threadId,
            });

            const populated = await Message.findById(message._id)
                .populate('sender', 'username avatar status')
                .populate('replyTo', 'content sender');

            // Update thread count
            if (threadId) {
                await Message.findByIdAndUpdate(threadId, { $inc: { threadCount: 1 } });
            }

            // Update channel last message
            const channel = await Channel.findByIdAndUpdate(channelId, {
                lastMessage: message._id,
                lastActivity: new Date(),
            }, { new: true });

            if (channel && (channel.type === 'dm' || channel.type === 'group_dm')) {
                channel.members.forEach(member => {
                    console.log(`[Socket] Emitting DM message to user:${member.user.toString()}`);
                    io.to(`user:${member.user.toString()}`).emit('message:new', populated);
                });
            } else {
                console.log(`[Socket] Emitting Channel message to channel:${channelId}`);
                io.to(`channel:${channelId}`).emit('message:new', populated);
            }
        } catch (error) {
            logger.error(`Message send error: ${error.message}`);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Edit a message
    socket.on('message:edit', async (data) => {
        try {
            const { messageId, content } = data;
            const message = await Message.findOneAndUpdate(
                { _id: messageId, sender: socket.userId },
                { content, isEdited: true, editedAt: new Date() },
                { new: true }
            ).populate('sender', 'username avatar status');

            if (message) {
                // Route through user: rooms for DMs, channel: room for server channels
                const channel = await Channel.findById(message.channel);
                if (channel && (channel.type === 'dm' || channel.type === 'group_dm')) {
                    channel.members.forEach(member => {
                        io.to(`user:${member.user.toString()}`).emit('message:updated', message);
                    });
                } else {
                    io.to(`channel:${message.channel}`).emit('message:updated', message);
                }
            }
        } catch (error) {
            logger.error(`Message edit error: ${error.message}`);
        }
    });

    // Delete a message
    socket.on('message:delete', async (data) => {
        try {
            const { messageId } = data;
            const message = await Message.findOneAndUpdate(
                { _id: messageId, sender: socket.userId },
                { isDeleted: true, content: '[Message deleted]' },
                { new: true }
            );

            if (message) {
                // Route through user: rooms for DMs, channel: room for server channels
                const channel = await Channel.findById(message.channel);
                if (channel && (channel.type === 'dm' || channel.type === 'group_dm')) {
                    channel.members.forEach(member => {
                        io.to(`user:${member.user.toString()}`).emit('message:deleted', { messageId, channelId: message.channel });
                    });
                } else {
                    io.to(`channel:${message.channel}`).emit('message:deleted', { messageId, channelId: message.channel });
                }
            }
        } catch (error) {
            logger.error(`Message delete error: ${error.message}`);
        }
    });

    // Typing indicator
    socket.on('typing:start', (channelId) => {
        socket.to(`channel:${channelId}`).emit('typing:start', {
            userId: socket.userId,
            username: socket.username,
            channelId,
        });
    });

    socket.on('typing:stop', (channelId) => {
        socket.to(`channel:${channelId}`).emit('typing:stop', {
            userId: socket.userId,
            channelId,
        });
    });

    // Read receipts
    socket.on('message:read', async (data) => {
        try {
            const { channelId, messageId } = data;
            await Message.findByIdAndUpdate(messageId, {
                $addToSet: { readBy: { user: socket.userId, readAt: new Date() } }
            });

            socket.to(`channel:${channelId}`).emit('message:read', {
                messageId,
                userId: socket.userId,
                channelId,
            });
        } catch (error) {
            logger.error(`Read receipt error: ${error.message}`);
        }
    });

    // Reaction
    socket.on('message:react', async (data) => {
        try {
            const { messageId, emoji } = data;
            const message = await Message.findById(messageId);

            if (!message) return;

            const existingReaction = message.reactions.find(r => r.emoji === emoji);
            if (existingReaction) {
                const userIndex = existingReaction.users.indexOf(socket.userId);
                if (userIndex > -1) {
                    existingReaction.users.splice(userIndex, 1);
                    if (existingReaction.users.length === 0) {
                        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                    }
                } else {
                    existingReaction.users.push(socket.userId);
                }
            } else {
                message.reactions.push({ emoji, users: [socket.userId] });
            }

            await message.save();

            io.to(`channel:${message.channel}`).emit('message:reacted', {
                messageId,
                reactions: message.reactions,
            });
        } catch (error) {
            logger.error(`Reaction error: ${error.message}`);
        }
    });

    // Pin message
    socket.on('message:pin', async (data) => {
        try {
            const { messageId, channelId } = data;
            const message = await Message.findByIdAndUpdate(messageId, { isPinned: true }, { new: true });

            await Channel.findByIdAndUpdate(channelId, {
                $addToSet: { pinnedMessages: messageId }
            });

            io.to(`channel:${channelId}`).emit('message:pinned', { messageId, channelId });
        } catch (error) {
            logger.error(`Pin error: ${error.message}`);
        }
    });

    // DM Chat Background sync
    socket.on('dm:background', async (data) => {
        try {
            const { channelId, background } = data;
            if (!channelId) return;

            // Save background to channel
            await Channel.findByIdAndUpdate(channelId, {
                $set: { background: background || '' }
            });

            // Broadcast to all members in the channel (including the sender so they get confirmation)
            const channel = await Channel.findById(channelId);
            if (channel && (channel.type === 'dm' || channel.type === 'group_dm')) {
                channel.members.forEach(member => {
                    io.to(`user:${member.user.toString()}`).emit('dm:background:changed', {
                        channelId,
                        background: background || '',
                        changedBy: socket.userId,
                    });
                });
            }

            logger.debug(`${socket.username} changed background for channel ${channelId}`);
        } catch (error) {
            logger.error(`Background change error: ${error.message}`);
        }
    });
};
