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
            await Channel.findByIdAndUpdate(channelId, {
                lastMessage: message._id,
                lastActivity: new Date(),
            });

            io.to(`channel:${channelId}`).emit('message:new', populated);
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
                io.to(`channel:${message.channel}`).emit('message:updated', message);
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
                io.to(`channel:${message.channel}`).emit('message:deleted', { messageId, channelId: message.channel });
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
};
