const { logger } = require('../config/logger');

// In-memory music room state (persists track/playback state for late joiners)
const musicRooms = new Map();

module.exports = (io, socket) => {
    // Join a stream/music room
    socket.on('stream:join', (data) => {
        const { roomId, isServerOwner } = data;
        socket.join(`stream:${roomId}`);

        // Create room if it doesn't exist
        if (!musicRooms.has(roomId)) {
            musicRooms.set(roomId, {
                users: [],
                track: null,
                isPlaying: false,
                currentTime: 0,
                hostUserId: null,    // first joiner or server owner
                ownerUserId: null,   // server owner always has control
            });
        }
        const room = musicRooms.get(roomId);

        // Add user if not already present
        if (!room.users.find(u => u.userId === socket.userId)) {
            room.users.push({
                userId: socket.userId,
                username: socket.username,
                isHost: false,
                isOwner: !!isServerOwner,
            });
        }

        // Set owner if this user is the server owner
        if (isServerOwner) {
            room.ownerUserId = socket.userId;
        }

        // Set host: server owner always takes host, otherwise first joiner
        if (!room.hostUserId) {
            room.hostUserId = socket.userId;
        }
        if (isServerOwner) {
            room.hostUserId = socket.userId;
        }

        // Mark host flags on users
        room.users.forEach(u => {
            u.isHost = (u.userId === room.hostUserId || u.userId === room.ownerUserId);
        });

        // Notify everyone in the room
        io.to(`stream:${roomId}`).emit('stream:user-joined', {
            userId: socket.userId,
            username: socket.username,
            users: room.users,
            hostUserId: room.hostUserId,
            ownerUserId: room.ownerUserId,
        });

        // Send current room state to the new joiner (so they sync up)
        socket.emit('music:sync', {
            track: room.track,
            currentTime: room.currentTime,
            isPlaying: room.isPlaying,
            users: room.users,
            hostUserId: room.hostUserId,
            ownerUserId: room.ownerUserId,
            syncedBy: 'server',
        });

        logger.debug(`${socket.username} joined music room ${roomId} (host: ${room.hostUserId})`);
    });

    // Music sync — only host or server owner can change playback
    socket.on('music:sync', (data) => {
        const { roomId, track, currentTime, isPlaying } = data;

        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        // PERMISSION CHECK: only host or owner can control music
        const isHost = socket.userId === room.hostUserId;
        const isOwner = socket.userId === room.ownerUserId;
        if (!isHost && !isOwner) {
            // Reject — send error back to the user
            socket.emit('music:error', { message: 'Only the host can control playback. Use chat to request a song!' });
            return;
        }

        // Update server-side room state
        room.track = track;
        room.currentTime = currentTime;
        room.isPlaying = isPlaying;

        // Broadcast to ALL other users in the room
        socket.to(`stream:${roomId}`).emit('music:sync', {
            track,
            currentTime,
            isPlaying,
            users: room.users,
            hostUserId: room.hostUserId,
            ownerUserId: room.ownerUserId,
            syncedBy: socket.userId,
        });
    });

    // Transfer host to another user (host or owner only)
    socket.on('music:transfer-host', (data) => {
        const { roomId, newHostUserId } = data;
        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        if (socket.userId !== room.hostUserId && socket.userId !== room.ownerUserId) return;

        room.hostUserId = newHostUserId;
        room.users.forEach(u => {
            u.isHost = (u.userId === room.hostUserId || u.userId === room.ownerUserId);
        });

        io.to(`stream:${roomId}`).emit('music:host-changed', {
            hostUserId: newHostUserId,
            users: room.users,
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

            // If host left, assign new host (owner first, then first remaining user)
            if (room.hostUserId === socket.userId) {
                const ownerStillHere = room.users.find(u => u.userId === room.ownerUserId);
                room.hostUserId = ownerStillHere ? ownerStillHere.userId : (room.users[0]?.userId || null);
                room.users.forEach(u => {
                    u.isHost = (u.userId === room.hostUserId || u.userId === room.ownerUserId);
                });
            }

            // Clean up empty rooms
            if (room.users.length === 0) {
                musicRooms.delete(roomId);
            } else {
                io.to(`stream:${roomId}`).emit('music:host-changed', {
                    hostUserId: room.hostUserId,
                    users: room.users,
                });
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

                // Reassign host if the disconnected user was host
                if (room.hostUserId === socket.userId) {
                    const ownerStillHere = room.users.find(u => u.userId === room.ownerUserId);
                    room.hostUserId = ownerStillHere ? ownerStillHere.userId : (room.users[0]?.userId || null);
                    room.users.forEach(u => {
                        u.isHost = (u.userId === room.hostUserId || u.userId === room.ownerUserId);
                    });
                }

                io.to(`stream:${roomId}`).emit('stream:user-left', {
                    userId: socket.userId,
                    username: socket.username,
                });

                if (room.users.length === 0) {
                    musicRooms.delete(roomId);
                } else {
                    io.to(`stream:${roomId}`).emit('music:host-changed', {
                        hostUserId: room.hostUserId,
                        users: room.users,
                    });
                }
            }
        }
    });
};
