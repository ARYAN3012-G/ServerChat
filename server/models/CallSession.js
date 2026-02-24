const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['voice', 'video', 'screen_share'],
        required: true,
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
    },
    initiator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        joinedAt: { type: Date, default: Date.now },
        leftAt: Date,
        isMuted: { type: Boolean, default: false },
        isVideoOff: { type: Boolean, default: false },
    }],
    status: {
        type: String,
        enum: ['ringing', 'active', 'ended', 'missed'],
        default: 'ringing',
    },
    isGroup: {
        type: Boolean,
        default: false,
    },
    startedAt: Date,
    endedAt: Date,
    duration: Number, // seconds
}, { timestamps: true });

callSessionSchema.index({ channel: 1 });
callSessionSchema.index({ status: 1 });

module.exports = mongoose.model('CallSession', callSessionSchema);
