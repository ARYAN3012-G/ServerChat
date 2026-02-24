const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Channel name is required'],
        trim: true,
        maxlength: 100,
    },
    description: {
        type: String,
        maxlength: 500,
        default: '',
    },
    type: {
        type: String,
        enum: ['text', 'voice', 'video', 'dm', 'group_dm'],
        default: 'text',
    },
    isPrivate: {
        type: Boolean,
        default: false,
    },
    icon: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        role: {
            type: String,
            enum: ['owner', 'admin', 'moderator', 'member'],
            default: 'member',
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    pinnedMessages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    }],
    category: {
        type: String,
        default: 'General',
    },
    slowMode: {
        type: Number,  // seconds between messages
        default: 0,
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

// Indexes
channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ type: 1 });
channelSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Channel', channelSchema);
