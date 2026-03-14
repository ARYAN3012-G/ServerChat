const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const { getIO } = require('../sockets');

// Send friend request
exports.sendRequest = async (req, res, next) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        // Check if blocked
        const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "Can't send request to yourself" });
        }

        if (targetUser.blockedUsers?.includes(req.user._id)) {
            return res.status(400).json({ message: 'Cannot send request' });
        }

        // Check existing
        const existing = await FriendRequest.findOne({
            $or: [
                { from: req.user._id, to: targetUser._id },
                { from: targetUser._id, to: req.user._id },
            ],
        });

        if (existing) {
            return res.status(400).json({ message: 'Friend request already exists' });
        }

        const request = await FriendRequest.create({
            from: req.user._id,
            to: targetUser._id,
        });

        const populated = await request.populate('from', 'username avatar');

        // Notify target user
        const io = getIO();
        if (io) {
            io.to(`user:${targetUser._id}`).emit('friend:request', { request: populated });
        }

        res.status(201).json({ request: populated });
    } catch (error) {
        next(error);
    }
};

// Accept friend request
exports.acceptRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const request = await FriendRequest.findById(requestId);

        if (!request || request.to.toString() !== req.user._id.toString()) {
            return res.status(404).json({ message: 'Request not found' });
        }

        request.status = 'accepted';
        await request.save();

        // Add to friends list
        await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: request.from } });
        await User.findByIdAndUpdate(request.from, { $addToSet: { friends: req.user._id } });

        // Notify sender
        const io = getIO();
        if (io) {
            io.to(`user:${request.from}`).emit('friend:accepted', {
                userId: req.user._id,
                username: req.user.username,
            });
        }

        res.json({ message: 'Friend request accepted' });
    } catch (error) {
        next(error);
    }
};

// Reject friend request
exports.rejectRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        await FriendRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
        res.json({ message: 'Friend request rejected' });
    } catch (error) {
        next(error);
    }
};

// Get friend requests
exports.getRequests = async (req, res, next) => {
    try {
        const incoming = await FriendRequest.find({ to: req.user._id, status: 'pending' })
            .populate('from', 'username avatar status');
        const outgoing = await FriendRequest.find({ from: req.user._id, status: 'pending' })
            .populate('to', 'username avatar status');

        res.json({ incoming, outgoing });
    } catch (error) {
        next(error);
    }
};

// Get friends list
exports.getFriends = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('friends', 'username avatar status lastSeen bio');

        // Include nicknames and custom avatars in the response
        const friendsWithCustom = (user.friends || []).map(f => {
            const obj = f.toObject ? f.toObject() : { ...f };
            const nickname = user.friendNicknames?.get(f._id.toString());
            if (nickname) obj.nickname = nickname;
            const customAvatar = user.friendAvatars?.get(f._id.toString());
            if (customAvatar) obj.customAvatar = customAvatar;
            return obj;
        });

        res.json({ friends: friendsWithCustom });
    } catch (error) {
        next(error);
    }
};

// Set friend nickname (only visible to the current user)
exports.setNickname = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { nickname } = req.body;

        // Verify they are friends
        const user = await User.findById(req.user._id);
        if (!user.friends.includes(userId)) {
            return res.status(400).json({ message: 'Not a friend' });
        }

        // Set or remove nickname
        if (nickname && nickname.trim()) {
            user.friendNicknames.set(userId, nickname.trim().substring(0, 30));
        } else {
            user.friendNicknames.delete(userId);
        }
        await user.save();

        res.json({ message: 'Nickname updated', nickname: nickname?.trim() || null });
    } catch (error) {
        next(error);
    }
};

// Set custom avatar for a friend (only visible to the current user)
exports.setFriendAvatar = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { avatarId, bg, emoji } = req.body;

        const user = await User.findById(req.user._id);
        if (!user.friends.includes(userId)) {
            return res.status(400).json({ message: 'Not a friend' });
        }

        if (avatarId) {
            user.friendAvatars.set(userId, { id: avatarId, bg, emoji });
        } else {
            user.friendAvatars.delete(userId);
        }
        await user.save();

        res.json({ message: 'Friend avatar updated', customAvatar: avatarId ? { id: avatarId, bg, emoji } : null });
    } catch (error) {
        next(error);
    }
};

// Remove friend
exports.removeFriend = async (req, res, next) => {
    try {
        const { userId } = req.params;
        await User.findByIdAndUpdate(req.user._id, { $pull: { friends: userId } });
        await User.findByIdAndUpdate(userId, { $pull: { friends: req.user._id } });
        res.json({ message: 'Friend removed' });
    } catch (error) {
        next(error);
    }
};
