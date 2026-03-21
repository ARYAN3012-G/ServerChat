const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// Get user profile
exports.getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-sessions -blockedUsers')
            .populate('friends', 'username avatar status lastSeen');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        next(error);
    }
};

// Update profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { username, bio, customStatus, preferences, prebuiltAvatar, banner, accentColor } = req.body;
        const updates = {};

        if (username) updates.username = username;
        if (bio !== undefined) updates.bio = bio;
        if (customStatus !== undefined) updates.customStatus = customStatus;
        if (banner !== undefined) updates.banner = banner;
        if (accentColor !== undefined) updates.accentColor = accentColor;
        if (preferences !== undefined) {
            updates.preferences = { ...req.user.preferences, ...preferences };
        }
        if (req.body.status) {
            updates.status = req.body.status;
            updates.preferredStatus = req.body.status;
        }
        // Support pre-built avatar gallery selection
        if (prebuiltAvatar) {
            updates.avatar = { prebuilt: prebuiltAvatar };
        }

        const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

        await ActivityLog.create({
            user: req.user._id,
            action: 'profile_updated',
            details: { fields: Object.keys(updates) },
            ipAddress: req.ip,
        });

        res.json({ user });
    } catch (error) {
        next(error);
    }
};

// Upload avatar
exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Feature Gate: Animated Avatars (GIFs) are Pro only
        if (req.file.mimetype === 'image/gif' && req.user?.subscription?.tier !== 'pro') {
            const fs = require('fs');
            fs.unlink(req.file.path, () => {});
            return res.status(403).json({ message: 'Animated avatars require ServerChat Pro!' });
        }

        // Delete old avatar
        if (req.user.avatar?.publicId) {
            await deleteFromCloudinary(req.user.avatar.publicId);
        }

        const result = await uploadToCloudinary(req.file.path, 'serverchat/avatars');

        // Remove local temp file after upload
        const fs = require('fs');
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting temp avatar file:', err);
        });

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: result },
            { new: true }
        );

        res.json({ user });
    } catch (error) {
        // Clean up temp file on error
        if (req.file) {
            const fs = require('fs');
            fs.unlink(req.file.path, () => {});
        }
        next(error);
    }
};

// Search users
exports.searchUsers = async (req, res, next) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        const query = q ? {
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
            ],
            _id: { $ne: req.user._id },
        } : { _id: { $ne: req.user._id } };

        const users = await User.find(query)
            .select('username avatar status lastSeen bio')
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ username: 1 });

        const total = await User.countDocuments(query);

        res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        next(error);
    }
};

// Block user
exports.blockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;

        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { blockedUsers: userId },
            $pull: { friends: userId },
        });

        // Remove from other user's friends too
        await User.findByIdAndUpdate(userId, {
            $pull: { friends: req.user._id },
        });

        res.json({ message: 'User blocked' });
    } catch (error) {
        next(error);
    }
};

// Unblock user
exports.unblockUser = async (req, res, next) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { blockedUsers: userId },
        });
        res.json({ message: 'User unblocked' });
    } catch (error) {
        next(error);
    }
};

// Get blocked users list
exports.getBlockedUsers = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('blockedUsers', 'username avatar status');
        res.json({ blockedUsers: user.blockedUsers || [] });
    } catch (error) {
        next(error);
    }
};

// Get online users
exports.getOnlineUsers = async (req, res, next) => {
    try {
        const users = await User.find({ status: 'online' })
            .select('username avatar status');
        res.json({ users });
    } catch (error) {
        next(error);
    }
};

// Get activity history
exports.getActivityHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const activities = await ActivityLog.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        res.json({ activities });
    } catch (error) {
        next(error);
    }
};
