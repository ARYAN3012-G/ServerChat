const { logger } = require('../config/logger');
const MusicSession = require('../models/MusicSession');

// In-memory music room state (persists track/playback state for late joiners)
const musicRooms = new Map();

module.exports = (io, socket) => {
    // Join a stream/music room
    socket.on('stream:join', async (data) => {
        const { roomId } = data;
        socket.join(`stream:${roomId}`);

        // Fetch session from DB to accurately determine host and server owner
        let isServerOwner = false;
        let dbHostId = null;
        try {
            const dbSession = await MusicSession.findById(roomId).populate('server');
            if (dbSession) {
                dbHostId = dbSession.host?.toString();
                isServerOwner = dbSession.server?.owner?.toString() === socket.userId;
            }
        } catch (e) {
            logger.error(`Error fetching session in stream:join: ${e.message}`);
        }

        // Create room if it doesn't exist
        if (!musicRooms.has(roomId)) {
            musicRooms.set(roomId, {
                users: [],
                track: null,
                isPlaying: false,
                currentTime: 0,
                hostUserId: null,
                ownerUserId: null,
                sessionCreatorId: null,
                queue: [],
                skipVotes: [],
            });
        }
        const room = musicRooms.get(roomId);

        // Track session creator securely from DB
        if (!room.sessionCreatorId) {
            room.sessionCreatorId = dbHostId || socket.userId;
        }

        // Add user if not already present
        if (!room.users.find(u => u.userId === socket.userId)) {
            room.users.push({
                userId: socket.userId,
                username: socket.username,
                isHost: false,
                isOwner: !!isServerOwner,
            });
        } else {
            // User is rejoining — update their owner status
            const existingUser = room.users.find(u => u.userId === socket.userId);
            if (existingUser && isServerOwner) existingUser.isOwner = true;
        }

        // Set owner if this user is the server owner
        if (isServerOwner) {
            room.ownerUserId = socket.userId;
        }

        // Assign host strictly to the session creator
        if (!room.hostUserId) {
            room.hostUserId = room.sessionCreatorId || socket.userId;
        } else if (socket.userId === room.sessionCreatorId) {
            // Creator reclaims host if the current host already left
            const currentHostStillHere = room.users.some(u => u.userId === room.hostUserId && u.userId !== socket.userId);
            if (!currentHostStillHere) {
                room.hostUserId = socket.userId;
            }
        }

        // Mark host/owner flags on users
        room.users.forEach(u => {
            u.isHost = u.userId === room.hostUserId;
            u.isOwner = u.userId === room.ownerUserId;
        });

        // Notify EVERYONE in the room about the new user (includes full user list)
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
            queue: room.queue || [],
            syncedBy: 'server',
        });

        logger.debug(`${socket.username} joined music room ${roomId} (host: ${room.hostUserId}, users: ${room.users.length})`);

        // Also persist listener in MongoDB (best-effort, don't block socket flow)
        MusicSession.findById(roomId).then(dbSession => {
            if (dbSession && dbSession.status === 'active') {
                const alreadyListening = dbSession.listeners?.some(l => l.user?.toString() === socket.userId);
                if (!alreadyListening) {
                    dbSession.listeners.push({ user: socket.userId });
                    dbSession.save().catch(() => {});
                }
            }
        }).catch(() => {});
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
            socket.emit('music:error', { message: 'Only the host can control playback.' });
            return;
        }

        // Clear skip votes when track changes
        if (track && room.track?.url !== track?.url) {
            room.skipVotes = [];
        }

        // Update server-side room state
        room.track = track;
        room.currentTime = currentTime || 0;
        room.isPlaying = isPlaying;

        // Broadcast to ALL other users in the room
        socket.to(`stream:${roomId}`).emit('music:sync', {
            track,
            currentTime: room.currentTime,
            isPlaying,
            users: room.users,
            hostUserId: room.hostUserId,
            ownerUserId: room.ownerUserId,
            syncedBy: socket.userId,
            queue: room.queue || [],
            skipVotes: room.skipVotes?.length || 0,
        });
    });

    // Lightweight heartbeat — host sends current time every few seconds.
    // Server relays as 'music:time-update' (NOT 'music:sync') so listeners
    // only adjust seek position without re-evaluating track/play state.
    socket.on('music:heartbeat', (data) => {
        const { roomId, currentTime } = data;
        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        // Only host or owner can send heartbeats
        if (socket.userId !== room.hostUserId && socket.userId !== room.ownerUserId) return;

        // Update server-side time (no track/isPlaying change)
        room.currentTime = currentTime || 0;

        // Relay to everyone EXCEPT sender
        socket.to(`stream:${roomId}`).emit('music:time-update', {
            currentTime: room.currentTime,
            senderId: socket.userId,
        });
    });

    // ── DJ Queue: Request a song ──
    socket.on('music:queue-request', (data) => {
        const { roomId, track } = data;
        if (!musicRooms.has(roomId) || !track) return;
        const room = musicRooms.get(roomId);

        if (!room.queue) room.queue = [];

        // Check for duplicates
        const alreadyQueued = room.queue.some(q => q.url === track.url);
        if (alreadyQueued) {
            socket.emit('music:error', { message: 'Song already in queue' });
            return;
        }

        const queueItem = {
            ...track,
            requestedBy: { userId: socket.userId, username: socket.username },
            status: 'pending',
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };

        room.queue.push(queueItem);

        // Notify everyone in the room
        io.to(`stream:${roomId}`).emit('music:queue-updated', {
            queue: room.queue,
            action: 'request',
            track: queueItem,
        });

        logger.debug(`${socket.username} requested "${track.title}" in room ${roomId}`);
    });

    // ── DJ Queue: Approve/Reject (host only) ──
    socket.on('music:queue-action', (data) => {
        const { roomId, trackId, action } = data; // action = 'approve' | 'reject'
        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        if (socket.userId !== room.hostUserId && socket.userId !== room.ownerUserId) {
            socket.emit('music:error', { message: 'Only the host can manage the queue' });
            return;
        }

        if (!room.queue) room.queue = [];

        if (action === 'approve') {
            const item = room.queue.find(q => q.id === trackId);
            if (item) item.status = 'approved';
        } else if (action === 'reject') {
            room.queue = room.queue.filter(q => q.id !== trackId);
        }

        io.to(`stream:${roomId}`).emit('music:queue-updated', {
            queue: room.queue,
            action,
            trackId,
        });
    });

    // ── DJ Queue: Play next from queue ──
    socket.on('music:play-next', (data) => {
        const { roomId } = data;
        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        if (socket.userId !== room.hostUserId && socket.userId !== room.ownerUserId) return;

        if (!room.queue) room.queue = [];
        const nextTrack = room.queue.find(q => q.status === 'approved');
        if (!nextTrack) {
            socket.emit('music:error', { message: 'No approved songs in queue' });
            return;
        }

        // Remove from queue
        room.queue = room.queue.filter(q => q.id !== nextTrack.id);
        room.skipVotes = [];

        // Update room state
        room.track = nextTrack;
        room.currentTime = 0;
        room.isPlaying = true;

        io.to(`stream:${roomId}`).emit('music:sync', {
            track: nextTrack,
            currentTime: 0,
            isPlaying: true,
            users: room.users,
            hostUserId: room.hostUserId,
            ownerUserId: room.ownerUserId,
            syncedBy: 'queue',
            queue: room.queue,
            skipVotes: 0,
        });
    });

    // ── Vote to Skip ──
    socket.on('music:vote-skip', (data) => {
        const { roomId } = data;
        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        if (!room.skipVotes) room.skipVotes = [];

        // Prevent double voting
        if (room.skipVotes.includes(socket.userId)) {
            socket.emit('music:error', { message: 'You already voted to skip' });
            return;
        }

        room.skipVotes.push(socket.userId);
        const threshold = Math.ceil(room.users.length * 0.5);
        const passed = room.skipVotes.length >= threshold;

        io.to(`stream:${roomId}`).emit('music:skip-vote', {
            votes: room.skipVotes.length,
            needed: threshold,
            passed,
            votedBy: socket.username,
        });

        // Auto-skip if threshold reached
        if (passed) {
            room.skipVotes = [];
            const nextTrack = (room.queue || []).find(q => q.status === 'approved');
            if (nextTrack) {
                room.queue = room.queue.filter(q => q.id !== nextTrack.id);
                room.track = nextTrack;
                room.currentTime = 0;
                room.isPlaying = true;
            } else {
                room.isPlaying = false;
            }

            io.to(`stream:${roomId}`).emit('music:sync', {
                track: nextTrack || room.track,
                currentTime: 0,
                isPlaying: !!nextTrack,
                users: room.users,
                hostUserId: room.hostUserId,
                ownerUserId: room.ownerUserId,
                syncedBy: 'vote-skip',
                queue: room.queue || [],
                skipVotes: 0,
            });
        }
    });

    // Transfer host to another user (host or owner only)
    socket.on('music:transfer-host', (data) => {
        const { roomId, newHostUserId } = data;
        if (!musicRooms.has(roomId)) return;
        const room = musicRooms.get(roomId);

        if (socket.userId !== room.hostUserId && socket.userId !== room.ownerUserId) return;

        room.hostUserId = newHostUserId;
        room.users.forEach(u => {
            u.isHost = u.userId === room.hostUserId;
            u.isOwner = u.userId === room.ownerUserId;
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
        const { roomId, message, isGif } = data;
        io.to(`stream:${roomId}`).emit('stream:chat', {
            userId: socket.userId,
            username: socket.username,
            message,
            isGif: !!isGif,
            timestamp: new Date(),
        });
    });

    // Leave stream/music room
    socket.on('stream:leave', (data) => {
        const { roomId } = data;
        socket.leave(`stream:${roomId}`);

        if (musicRooms.has(roomId)) {
            const room = musicRooms.get(roomId);
            room.users = room.users.filter(u => u.userId !== socket.userId);

            // If host left, assign new host (owner first, then first remaining user)
            if (room.hostUserId === socket.userId) {
                const ownerStillHere = room.users.find(u => u.userId === room.ownerUserId);
                room.hostUserId = ownerStillHere ? ownerStillHere.userId : (room.users[0]?.userId || null);
                room.users.forEach(u => {
                    u.isHost = u.userId === room.hostUserId;
                    u.isOwner = u.userId === room.ownerUserId;
                });
            }

            // Clean up empty rooms
            if (room.users.length === 0) {
                musicRooms.delete(roomId);
            } else {
                // Send updated user list and host info to remaining users
                io.to(`stream:${roomId}`).emit('stream:user-left', {
                    userId: socket.userId,
                    username: socket.username,
                    users: room.users,
                });
                io.to(`stream:${roomId}`).emit('music:host-changed', {
                    hostUserId: room.hostUserId,
                    users: room.users,
                });
            }
        }

        logger.debug(`${socket.username} left music room ${roomId}`);

        // Remove listener from MongoDB (best-effort)
        MusicSession.findById(roomId).then(dbSession => {
            if (dbSession && dbSession.status === 'active') {
                dbSession.listeners = (dbSession.listeners || []).filter(l => l.user?.toString() !== socket.userId);
                dbSession.save().catch(() => {});
            }
        }).catch(() => {});
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
                        u.isHost = u.userId === room.hostUserId;
                        u.isOwner = u.userId === room.ownerUserId;
                    });
                }

                if (room.users.length === 0) {
                    musicRooms.delete(roomId);
                } else {
                    io.to(`stream:${roomId}`).emit('stream:user-left', {
                        userId: socket.userId,
                        username: socket.username,
                        users: room.users,
                    });
                    io.to(`stream:${roomId}`).emit('music:host-changed', {
                        hostUserId: room.hostUserId,
                        users: room.users,
                    });
                }
            }
        }
    });
};
