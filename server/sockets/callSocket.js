const CallSession = require('../models/CallSession');
const { logger } = require('../config/logger');

module.exports = (io, socket) => {
    // Initiate a call
    socket.on('call:initiate', async (data) => {
        try {
            const { targetUserId, channelId, type = 'voice', isGroup = false } = data;

            const session = await CallSession.create({
                type,
                channel: channelId,
                initiator: socket.userId,
                participants: [{ user: socket.userId }],
                isGroup,
                status: 'ringing',
            });

            socket.join(`call:${session._id}`);

            // Notify target user
            io.to(`user:${targetUserId}`).emit('call:incoming', {
                session: await session.populate(['initiator', 'participants.user']),
                from: { userId: socket.userId, username: socket.username },
            });
        } catch (error) {
            logger.error(`Call initiate error: ${error.message}`);
        }
    });

    // Answer a call
    socket.on('call:answer', async (data) => {
        try {
            const { sessionId } = data;
            const session = await CallSession.findById(sessionId);

            if (!session) return;

            session.participants.push({ user: socket.userId });
            session.status = 'active';
            session.startedAt = new Date();
            await session.save();

            socket.join(`call:${sessionId}`);
            io.to(`call:${sessionId}`).emit('call:answered', {
                session: await session.populate('participants.user', 'username avatar'),
                userId: socket.userId,
            });
        } catch (error) {
            logger.error(`Call answer error: ${error.message}`);
        }
    });

    // WebRTC signaling - Offer
    socket.on('call:offer', (data) => {
        const { targetUserId, offer, sessionId } = data;
        io.to(`user:${targetUserId}`).emit('call:offer', {
            offer,
            from: socket.userId,
            sessionId,
        });
    });

    // WebRTC signaling - Answer
    socket.on('call:sdp-answer', (data) => {
        const { targetUserId, answer, sessionId } = data;
        io.to(`user:${targetUserId}`).emit('call:sdp-answer', {
            answer,
            from: socket.userId,
            sessionId,
        });
    });

    // WebRTC signaling - ICE Candidate
    socket.on('call:ice-candidate', (data) => {
        const { targetUserId, candidate, sessionId } = data;
        io.to(`user:${targetUserId}`).emit('call:ice-candidate', {
            candidate,
            from: socket.userId,
            sessionId,
        });
    });

    // End a call
    socket.on('call:end', async (data) => {
        try {
            const { sessionId } = data;
            const session = await CallSession.findById(sessionId);

            if (!session) return;

            session.status = 'ended';
            session.endedAt = new Date();
            if (session.startedAt) {
                session.duration = Math.floor((session.endedAt - session.startedAt) / 1000);
            }
            await session.save();

            io.to(`call:${sessionId}`).emit('call:ended', { sessionId });
        } catch (error) {
            logger.error(`Call end error: ${error.message}`);
        }
    });

    // Toggle mute/video
    socket.on('call:toggle-media', (data) => {
        const { sessionId, type, enabled } = data;
        socket.to(`call:${sessionId}`).emit('call:media-toggled', {
            userId: socket.userId,
            type,
            enabled,
        });
    });

    // Reject call
    socket.on('call:reject', async (data) => {
        try {
            const { sessionId } = data;
            const session = await CallSession.findByIdAndUpdate(sessionId, {
                status: 'missed',
                endedAt: new Date(),
            });

            io.to(`call:${sessionId}`).emit('call:rejected', { sessionId });
        } catch (error) {
            logger.error(`Call reject error: ${error.message}`);
        }
    });
};
