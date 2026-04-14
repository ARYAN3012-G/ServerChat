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

    // Admin force mute: server owner can mute others' audio/video
    socket.on('voice:admin-mute', async ({ channelId, targetUserId, type }) => {
        try {
            const channel = await Channel.findById(channelId).populate('server');
            if (!channel) return;

            const Server = require('../models/Server');
            const serverId = channel.server?._id || channel.server;
            const server = await Server.findById(serverId);
            if (!server) return;

            // Check if requester is the server owner
            if (server.owner.toString() !== socket.userId) {
                socket.emit('error', { message: 'Only the server owner can mute others' });
                return;
            }

            // Find target user's socket and send mute command
            const room = io.sockets.adapter.rooms.get(`voice:${channelId}`);
            if (room) {
                for (const socketId of room) {
                    const memberSocket = io.sockets.sockets.get(socketId);
                    if (memberSocket && memberSocket.userId === targetUserId) {
                        memberSocket.emit('voice:admin-muted', { type });
                        // Broadcast state change to all peers
                        io.to(`voice:${channelId}`).emit('voice:user-state', {
                            userId: targetUserId,
                            ...(type === 'audio' ? { isMuted: true } : { isVideoOn: false }),
                        });
                        break;
                    }
                }
            }
            logger.debug(`${socket.username} admin-muted ${targetUserId} (${type}) in channel ${channelId}`);
        } catch (error) {
            logger.error(`Admin mute error: ${error.message}`);
        }
    });

    // Invite users to a voice channel call
    socket.on('voice:invite', async ({ channelId, targetUserIds, callType }) => {
        try {
            const channel = await Channel.findById(channelId).populate('server');
            const channelName = channel?.name || 'Voice Channel';
            const serverName = channel?.server?.name || 'Server';

            (targetUserIds || []).forEach(userId => {
                io.to(`user:${userId}`).emit('voice:call-invite', {
                    channelId,
                    channelName,
                    serverName,
                    callType: callType || 'voice',
                    from: {
                        userId: socket.userId,
                        username: socket.username,
                    },
                });
            });

            logger.debug(`${socket.username} invited ${targetUserIds?.length} users to voice channel ${channelId}`);
        } catch (error) {
            logger.error(`Voice invite error: ${error.message}`);
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
            } else if (!threadId) {
                // Only broadcast to main channel if NOT a thread reply
                console.log(`[Socket] Emitting Channel message to channel:${channelId}`);
                io.to(`channel:${channelId}`).emit('message:new', populated);
            }
            // Thread replies: don't emit message:new — client refreshes thread panel via openThread()

            // --- Bot Integration Logic ---
            if (!threadId && channel.name === 'integration' && type !== 'system' && socket.userId) {
                setTimeout(async () => {
                    let botReply = '';
                    const msgContent = content.toLowerCase().trim();

                    if (msgContent === '/help') {
                        botReply = `🤖 **Available Commands:**\n\`/help\` - This menu\n\`/joke\` - Random joke\n\`/quote\` - Inspiration\n\`/flip\` - Flip a coin\n\`/roll\` - Roll a dice`;
                    } else if (msgContent === '/joke') {
                        const jokes = [
                            "Why do programmers prefer dark mode? Because light attracts bugs.",
                            "There are 10 types of people in the world: those who understand binary, and those who don't.",
                            "A SQL query goes into a bar, walks up to two tables and asks... 'Can I join you?'"
                        ];
                        botReply = `🤖 ${jokes[Math.floor(Math.random() * jokes.length)]}`;
                    } else if (msgContent === '/quote') {
                        const quotes = [
                            "The only way to do great work is to love what you do. - Steve Jobs",
                            "Life is what happens when you're busy making other plans. - John Lennon",
                            "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt"
                        ];
                        botReply = `💬 *"${quotes[Math.floor(Math.random() * quotes.length)]}"*`;
                    } else if (msgContent === '/flip') {
                        botReply = `🪙 The coin landed on: **${Math.random() > 0.5 ? 'Heads' : 'Tails'}**`;
                    } else if (msgContent.startsWith('/roll')) {
                        const sides = parseInt(msgContent.split(' ')[1]) || 6;
                        botReply = `🎲 You rolled a **${Math.floor(Math.random() * sides) + 1}** (1-${sides})`;
                    } else if (msgContent.includes('hello') || msgContent.includes('hi')) {
                        botReply = `👋 Hello there <@${socket.userId}>! How can I help you today? Type \`/help\` to see what I can do.`;
                    } else {
                        botReply = `🤖 I'm a simple integration bot. I don't understand "${content}". Try \`/help\` for a list of commands I do know!`;
                    }

                    try {
                        const botMsg = await Message.create({
                            content: botReply,
                            sender: socket.userId,
                            channel: channelId,
                            type: 'system',
                        });

                        const popBotMsg = await Message.findById(botMsg._id).populate('sender', 'username avatar status');
                        
                        io.to(`channel:${channelId}`).emit('message:new', popBotMsg);
                        
                        await Channel.findByIdAndUpdate(channelId, {
                            lastMessage: botMsg._id,
                            lastActivity: new Date(),
                        });
                    } catch (err) {
                        logger.error(`Failed to send bot response: ${err.message}`);
                    }
                }, 800);
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
