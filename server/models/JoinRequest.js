const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
    server: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    message: {
        type: String,
        maxlength: 200,
        default: '',
    },
    inviteCode: {
        type: String,
        default: '',
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewedAt: Date,
}, { timestamps: true });

// Prevent duplicate pending requests
joinRequestSchema.index({ server: 1, user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
joinRequestSchema.index({ server: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
