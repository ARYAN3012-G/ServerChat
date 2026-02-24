const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const { getRedis } = require('../config/redis');
const chatSocket = require('./chatSocket');
const presenceSocket = require('./presenceSocket');
const gameSocket = require('./gameSocket');
const callSocket = require('./callSocket');
const streamSocket = require('./streamSocket');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // Auth middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.username = decoded.username;
            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        logger.info(`🔌 User connected: ${socket.username} (${socket.userId})`);

        // Set user online
        presenceSocket.handleConnect(io, socket);

        // Register event handlers
        chatSocket(io, socket);
        gameSocket(io, socket);
        callSocket(io, socket);
        streamSocket(io, socket);

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            logger.info(`🔌 User disconnected: ${socket.username} - ${reason}`);
            presenceSocket.handleDisconnect(io, socket);
        });

        // Error handling
        socket.on('error', (error) => {
            logger.error(`Socket error for ${socket.username}: ${error.message}`);
        });
    });

    logger.info('⚡ Socket.io initialized');
    return io;
};

const getIO = () => io;

module.exports = { initializeSocket, getIO };
