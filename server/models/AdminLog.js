const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        enum: [
            'user_banned', 'user_unbanned',
            'user_role_changed',
            'channel_deleted', 'channel_moderated',
            'message_deleted',
            'payment_refunded',
            'system_setting_changed',
        ],
        required: true,
    },
    target: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'targetModel',
    },
    targetModel: {
        type: String,
        enum: ['User', 'Channel', 'Message', 'Payment'],
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    ipAddress: String,
}, { timestamps: true });

adminLogSchema.index({ admin: 1, createdAt: -1 });
adminLogSchema.index({ action: 1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
