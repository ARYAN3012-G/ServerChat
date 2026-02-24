const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        enum: [
            'login', 'logout', 'register',
            'message_sent', 'message_deleted',
            'channel_created', 'channel_joined', 'channel_left',
            'friend_added', 'friend_removed',
            'game_started', 'game_finished',
            'call_started', 'call_ended',
            'profile_updated', 'password_changed',
            'subscription_changed',
            'user_reported', 'user_blocked',
        ],
        required: true,
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ipAddress: String,
    userAgent: String,
}, { timestamps: true });

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
