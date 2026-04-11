const mongoose = require('mongoose');

const musicSessionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    server: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server',
        required: true,
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    listeners: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
    }],
    currentTrack: {
        title: String,
        artist: String,
        url: String,
        thumbnail: String,
        duration: String,
        startedAt: Date,
    },
    queue: [{
        title: String,
        artist: String,
        url: String,
        thumbnail: String,
        duration: String,
        requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'approved'], default: 'approved' },
    }],
    status: {
        type: String,
        enum: ['active', 'ended'],
        default: 'active',
    },
    settings: {
        allowRequests: { type: Boolean, default: true },
        voteToSkip: { type: Boolean, default: true },
        skipThreshold: { type: Number, default: 0.5 },
    },
    skipVotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, { timestamps: true });

musicSessionSchema.index({ server: 1, status: 1 });

module.exports = mongoose.model('MusicSession', musicSessionSchema);
