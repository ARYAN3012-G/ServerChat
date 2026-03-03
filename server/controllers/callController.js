const CallSession = require('../models/CallSession');
const ActivityLog = require('../models/ActivityLog');

// Start a call
exports.startCall = async (req, res, next) => {
    try {
        const { type, channelId, isGroup } = req.body;

        const call = await CallSession.create({
            type: type || 'voice',
            channel: channelId || null,
            initiator: req.user._id,
            participants: [{ user: req.user._id, joinedAt: new Date() }],
            status: 'active',
            isGroup: isGroup || false,
            startedAt: new Date(),
        });

        await ActivityLog.create({
            user: req.user._id,
            action: 'call_started',
            details: { callId: call._id, type },
            ipAddress: req.ip,
        });

        const populated = await CallSession.findById(call._id)
            .populate('initiator', 'username avatar')
            .populate('participants.user', 'username avatar');

        res.status(201).json({ call: populated });
    } catch (error) {
        next(error);
    }
};

// End a call
exports.endCall = async (req, res, next) => {
    try {
        const call = await CallSession.findById(req.params.id);
        if (!call) return res.status(404).json({ message: 'Call not found' });

        call.status = 'ended';
        call.endedAt = new Date();
        call.duration = Math.round((call.endedAt - call.startedAt) / 1000);

        // Mark all participants as left
        call.participants.forEach(p => {
            if (!p.leftAt) p.leftAt = call.endedAt;
        });

        await call.save();

        await ActivityLog.create({
            user: req.user._id,
            action: 'call_ended',
            details: { callId: call._id, duration: call.duration },
            ipAddress: req.ip,
        });

        res.json({ call });
    } catch (error) {
        next(error);
    }
};

// Join a call
exports.joinCall = async (req, res, next) => {
    try {
        const call = await CallSession.findById(req.params.id);
        if (!call) return res.status(404).json({ message: 'Call not found' });
        if (call.status !== 'active') return res.status(400).json({ message: 'Call is not active' });

        const already = call.participants.find(p => p.user.toString() === req.user._id.toString());
        if (!already) {
            call.participants.push({ user: req.user._id, joinedAt: new Date() });
            await call.save();
        }

        const populated = await CallSession.findById(call._id)
            .populate('participants.user', 'username avatar');

        res.json({ call: populated });
    } catch (error) {
        next(error);
    }
};

// Get call history for the current user
exports.getCallHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const calls = await CallSession.find({
            $or: [
                { initiator: req.user._id },
                { 'participants.user': req.user._id },
            ]
        })
            .populate('initiator', 'username avatar')
            .populate('participants.user', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await CallSession.countDocuments({
            $or: [
                { initiator: req.user._id },
                { 'participants.user': req.user._id },
            ]
        });

        res.json({ calls, total });
    } catch (error) {
        next(error);
    }
};

// Get active calls
exports.getActiveCalls = async (req, res, next) => {
    try {
        const calls = await CallSession.find({ status: 'active' })
            .populate('initiator', 'username avatar')
            .populate('participants.user', 'username avatar')
            .sort({ startedAt: -1 });

        res.json({ calls });
    } catch (error) {
        next(error);
    }
};
