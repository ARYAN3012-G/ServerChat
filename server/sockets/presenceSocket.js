const User = require('../models/User');
const { getRedis } = require('../config/redis');
const { logger } = require('../config/logger');

const handleConnect = async (io, socket) => {
    try {
        // Join personal room immediately so real-time messaging doesn't break
        socket.join(`user:${socket.userId}`);

        const redis = getRedis();

        // Update user status
        const userDoc = await User.findById(socket.userId);
        const newStatus = userDoc?.preferredStatus || 'online';
        await User.findByIdAndUpdate(socket.userId, { status: newStatus });

        // Store in Redis for fast lookups
        if (redis) {
            try {
                await redis.sadd('online_users', socket.userId);
                await redis.set(`user:${socket.userId}:socketId`, socket.id);
            } catch (redisErr) {
                logger.warn(`Redis presence error (non-fatal): ${redisErr.message}`);
            }
        }

        // Notify friends
        const user = await User.findById(socket.userId).select('friends');
        if (user?.friends) {
            user.friends.forEach(friendId => {
                io.to(`user:${friendId}`).emit('presence:online', {
                    userId: socket.userId,
                    status: newStatus,
                });
            });
        }
    } catch (error) {
        logger.error(`Presence connect error: ${error.message}`);
    }
};

const handleDisconnect = async (io, socket) => {
    try {
        const redis = getRedis();
        const lastSeen = new Date();

        // Update user status
        await User.findByIdAndUpdate(socket.userId, {
            status: 'offline',
            lastSeen,
        });

        // Remove from Redis
        if (redis) {
            try {
                await redis.srem('online_users', socket.userId);
                await redis.del(`user:${socket.userId}:socketId`);
            } catch (redisErr) {
                logger.warn(`Redis presence disconnect error (non-fatal): ${redisErr.message}`);
            }
        }

        // Notify friends
        const user = await User.findById(socket.userId).select('friends');
        if (user?.friends) {
            user.friends.forEach(friendId => {
                io.to(`user:${friendId}`).emit('presence:offline', {
                    userId: socket.userId,
                    lastSeen,
                });
            });
        }
    } catch (error) {
        logger.error(`Presence disconnect error: ${error.message}`);
    }
};

const handleStatusChange = async (io, socket, data) => {
    try {
        const { status } = data;
        if (!['online', 'idle', 'dnd', 'invisible'].includes(status)) return;

        await User.findByIdAndUpdate(socket.userId, { status, preferredStatus: status });

        // Notify friends of status change
        const user = await User.findById(socket.userId).select('friends');
        if (user?.friends) {
            user.friends.forEach(friendId => {
                io.to(`user:${friendId}`).emit('presence:status-changed', {
                    userId: socket.userId,
                    status,
                });
            });
        }
    } catch (error) {
        logger.error(`Status change error: ${error.message}`);
    }
};

module.exports = { handleConnect, handleDisconnect, handleStatusChange };
