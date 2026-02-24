const User = require('../models/User');
const { getRedis } = require('../config/redis');
const { logger } = require('../config/logger');

const handleConnect = async (io, socket) => {
    try {
        const redis = getRedis();

        // Update user status
        await User.findByIdAndUpdate(socket.userId, { status: 'online' });

        // Store in Redis for fast lookups
        if (redis) {
            await redis.sadd('online_users', socket.userId);
            await redis.set(`user:${socket.userId}:socketId`, socket.id);
        }

        // Join personal room
        socket.join(`user:${socket.userId}`);

        // Notify friends
        const user = await User.findById(socket.userId).select('friends');
        if (user?.friends) {
            user.friends.forEach(friendId => {
                io.to(`user:${friendId}`).emit('presence:online', {
                    userId: socket.userId,
                    status: 'online',
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
            await redis.srem('online_users', socket.userId);
            await redis.del(`user:${socket.userId}:socketId`);
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

module.exports = { handleConnect, handleDisconnect };
