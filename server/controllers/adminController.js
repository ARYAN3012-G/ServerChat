const User = require('../models/User');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const ActivityLog = require('../models/ActivityLog');
const AdminLog = require('../models/AdminLog');
const Payment = require('../models/Payment');
const GameSession = require('../models/GameSession');

// Dashboard stats
exports.getDashboard = async (req, res, next) => {
    try {
        const [totalUsers, totalChannels, totalMessages, onlineUsers, totalPayments, activeGames] = await Promise.all([
            User.countDocuments(),
            Channel.countDocuments(),
            Message.countDocuments(),
            User.countDocuments({ status: 'online' }),
            Payment.aggregate([{ $match: { status: 'succeeded' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
            GameSession.countDocuments({ status: 'in_progress' }),
        ]);

        // New users last 7 days
        const newUsersWeek = await User.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        // Messages last 24h
        const messagesDay = await Message.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        res.json({
            stats: {
                totalUsers,
                totalChannels,
                totalMessages,
                onlineUsers,
                totalRevenue: totalPayments[0]?.total || 0,
                activeGames,
                newUsersWeek,
                messagesDay,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get all users
exports.getUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 50, search, role, status } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }
        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query)
            .select('-sessions')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await User.countDocuments(query);
        res.json({ users, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        next(error);
    }
};

// Ban user
exports.banUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        await User.findByIdAndUpdate(userId, { isBanned: true, banReason: reason });

        await AdminLog.create({
            admin: req.user._id,
            action: 'user_banned',
            target: userId,
            targetModel: 'User',
            details: { reason },
            ipAddress: req.ip,
        });

        res.json({ message: 'User banned' });
    } catch (error) {
        next(error);
    }
};

// Unban user
exports.unbanUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndUpdate(userId, { isBanned: false, banReason: '' });

        await AdminLog.create({
            admin: req.user._id,
            action: 'user_unbanned',
            target: userId,
            targetModel: 'User',
            ipAddress: req.ip,
        });

        res.json({ message: 'User unbanned' });
    } catch (error) {
        next(error);
    }
};

// Change user role
exports.changeRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        await User.findByIdAndUpdate(userId, { role });

        await AdminLog.create({
            admin: req.user._id,
            action: 'user_role_changed',
            target: userId,
            targetModel: 'User',
            details: { newRole: role },
            ipAddress: req.ip,
        });

        res.json({ message: 'Role updated' });
    } catch (error) {
        next(error);
    }
};

// Get login logs
exports.getLoginLogs = async (req, res, next) => {
    try {
        const { page = 1, limit = 100 } = req.query;
        const logs = await ActivityLog.find({ action: { $in: ['login', 'register'] } })
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await ActivityLog.countDocuments({ action: { $in: ['login', 'register'] } });
        res.json({ logs, total });
    } catch (error) {
        next(error);
    }
};

// Get admin logs
exports.getAdminLogs = async (req, res, next) => {
    try {
        const logs = await AdminLog.find()
            .populate('admin', 'username')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ logs });
    } catch (error) {
        next(error);
    }
};

// Get game activity
exports.getGameActivity = async (req, res, next) => {
    try {
        const games = await GameSession.find()
            .populate('players.user', 'username')
            .populate('winner', 'username')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({ games });
    } catch (error) {
        next(error);
    }
};
