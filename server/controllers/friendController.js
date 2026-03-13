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

        res.json({ friends: user.friends });
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
