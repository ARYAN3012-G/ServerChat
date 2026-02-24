const { logger } = require('../config/logger');

module.exports = (io, socket) => {
    // Join a watch party / stream room
    socket.on('stream:join', (data) => {
        const { roomId } = data;
        socket.join(`stream:${roomId}`);
        io.to(`stream:${roomId}`).emit('stream:user-joined', {
            userId: socket.userId,
            username: socket.username,
        });
    });

    // Sync playback
    socket.on('stream:sync', (data) => {
        const { roomId, currentTime, isPlaying, url } = data;
        socket.to(`stream:${roomId}`).emit('stream:sync', {
            currentTime,
            isPlaying,
            url,
            syncedBy: socket.userId,
        });
    });

    // Chat in stream room
    socket.on('stream:chat', (data) => {
        const { roomId, message } = data;
        io.to(`stream:${roomId}`).emit('stream:chat', {
            userId: socket.userId,
            username: socket.username,
            message,
            timestamp: new Date(),
        });
    });

    // Leave stream room
    socket.on('stream:leave', (data) => {
        const { roomId } = data;
        socket.leave(`stream:${roomId}`);
        io.to(`stream:${roomId}`).emit('stream:user-left', {
            userId: socket.userId,
            username: socket.username,
        });
    });

    // Music sync
    socket.on('music:sync', (data) => {
        const { roomId, track, currentTime, isPlaying } = data;
        socket.to(`stream:${roomId}`).emit('music:sync', {
            track,
            currentTime,
            isPlaying,
            syncedBy: socket.userId,
        });
    });
};
