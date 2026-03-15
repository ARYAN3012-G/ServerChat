const { logger } = require('../config/logger');

// In-memory music room state (persists track/playback state for late joiners)
const musicRooms = new Map();

module.exports = (io, socket) => {
    // Join a stream/music room
    socket.on('stream:join', (data) => {
        const { roomId } = data;
        socket.join(`stream:${roomId}`);

        // Track users in the room
        if (!musicRooms.has(roomId)) {
            musicRooms.set(roomId, { users: [], track: null, isPlaying: false, currentTime: 0 });
        }
        const room = musicRooms.get(roomId);
        
        // Add user if not already present
        if (!room.users.find(u => u.userId === socket.userId)) {
            room.users.push({ userId: socket.userId, username: socket.username });
        }

        // Notify everyone in the room (including joiner)
        io.to(`stream:${roomId}`).emit('stream:user-joined', {
            userId: socket.userId,
            username: socket.username,
        });

        // Send current room state to the new joiner (so they sync up)
        socket.emit('music:sync', {
            track: room.track,
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
            users: room.users,
            syncedBy: 'server',
        });

        logger.debug(`${socket.username} joined music room ${roomId}`);
    });

    // Music sync — a user changed track, paused, or seeked
    socket.on('music:sync', (data) => {
        const { roomId, track, currentTime, isPlaying } = data;

        // Update server-side room state
        if (musicRooms.has(roomId)) {
            const room = musicRooms.get(roomId);
            room.track = track;
            room.currentTime = currentTime;
            room.isPlaying = isPlaying;
        }

        // Broadcast to ALL other users in the room
        socket.to(`stream:${roomId}`).emit('music:sync', {
            track,
            currentTime,
            isPlaying,
            syncedBy: socket.userId,
        });
    });

    // Stream sync (for video watch parties)
    socket.on('stream:sync', (data) => {
        const { roomId, currentTime, isPlaying, url } = data;
        socket.to(`stream:${roomId}`).emit('stream:sync', {
            currentTime,
            isPlaying,
            url,
            syncedBy: socket.userId,
        });
    });

    // Chat in stream/music room
    socket.on('stream:chat', (data) => {
        const { roomId, message } = data;
        // Broadcast to ALL users including sender so chat appears for everyone
        io.to(`stream:${roomId}`).emit('stream:chat', {
            userId: socket.userId,
            username: socket.username,
            message,
            timestamp: new Date(),
        });
    });

    // Leave stream/music room
    socket.on('stream:leave', (data) => {
        const { roomId } = data;
        socket.leave(`stream:${roomId}`);

        // Remove user from room state
        if (musicRooms.has(roomId)) {
            const room = musicRooms.get(roomId);
            room.users = room.users.filter(u => u.userId !== socket.userId);

            // Clean up empty rooms
            if (room.users.length === 0) {
                musicRooms.delete(roomId);
            }
        }

        io.to(`stream:${roomId}`).emit('stream:user-left', {
            userId: socket.userId,
            username: socket.username,
        });

        logger.debug(`${socket.username} left music room ${roomId}`);
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
        for (const [roomId, room] of musicRooms) {
            const userIdx = room.users.findIndex(u => u.userId === socket.userId);
            if (userIdx !== -1) {
                room.users.splice(userIdx, 1);
                io.to(`stream:${roomId}`).emit('stream:user-left', {
                    userId: socket.userId,
                    username: socket.username,
                });
                if (room.users.length === 0) {
                    musicRooms.delete(roomId);
                }
            }
        }
    });
};
