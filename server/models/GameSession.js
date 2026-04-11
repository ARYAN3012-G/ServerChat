const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
    game: {
        type: String,
        enum: ['tic-tac-toe', 'rock-paper-scissors', 'quiz', 'word-guess', 'snake', 'connect4', 'chess', 'checkers', 'battleship', 'ludo', '2048', 'minesweeper', 'wordle', 'flappy', 'tetris', 'pong'],
        required: true,
    },
    server: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Server',
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
    joinRequests: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
        requestedAt: { type: Date, default: Date.now },
    }],
    spectators: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    }],
    chatMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    startedAt: Date,
    finishedAt: Date,
}, { timestamps: true });

gameSessionSchema.index({ channel: 1 });
gameSessionSchema.index({ status: 1 });
gameSessionSchema.index({ 'players.user': 1 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
