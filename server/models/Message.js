const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: {
        type: String,
        maxlength: 4000,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
        required: true,
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file', 'system', 'voice_message'],
        default: 'text',
    },
    attachments: [{
        url: String,
        publicId: String,
        filename: String,
        name: String,
        mimetype: String,
        type: { type: String },
        size: Number,
    }],
    // Reply / Thread
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    threadCount: {
        type: Number,
        default: 0,
    },
    // Reactions
    reactions: [{
        emoji: String,
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }],
    }],
    // Read receipts
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        readAt: {
            type: Date,
            default: Date.now,
        },
    }],
    // Status
    isPinned: {
        type: Boolean,
        default: false,
    },
    isEdited: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    editedAt: Date,
}, { timestamps: true });

// Indexes
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ content: 'text' });
messageSchema.index({ threadId: 1 });

module.exports = mongoose.model('Message', messageSchema);
