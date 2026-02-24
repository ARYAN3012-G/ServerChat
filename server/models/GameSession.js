const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
    game: {
        type: String,
        enum: ['tic-tac-toe', 'rock-paper-scissors', 'quiz', 'word-guess', 'snake'],
        required: true,
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
    },
    players: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        score: {
            type: Number,
            default: 0,
        },
        isReady: {
            type: Boolean,
            default: false,
        },
    }],
    state: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    status: {
        type: String,
        enum: ['waiting', 'in_progress', 'finished', 'cancelled'],
        default: 'waiting',
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    currentTurn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    round: {
        type: Number,
        default: 1,
    },
    maxRounds: {
        type: Number,
        default: 1,
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    startedAt: Date,
    finishedAt: Date,
}, { timestamps: true });

gameSessionSchema.index({ channel: 1 });
gameSessionSchema.index({ status: 1 });
gameSessionSchema.index({ 'players.user': 1 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
