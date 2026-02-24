const mongoose = require('mongoose');
const crypto = require('crypto');

const serverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Server name is required'],
        trim: true,
        minlength: 2,
        maxlength: 50,
    },
    icon: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
    },
    banner: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
    },
    description: {
        type: String,
        maxlength: 500,
        default: '',
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: {
            type: String,
            enum: ['owner', 'admin', 'moderator', 'member'],
            default: 'member',
        },
        nickname: { type: String, default: '' },
        joinedAt: { type: Date, default: Date.now },
    }],
    channels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
    }],
    categories: [{
        name: { type: String, required: true },
        position: { type: Number, default: 0 },
        channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
    }],
    inviteCode: {
        type: String,
        unique: true,
    },
    inviteLinks: [{
        code: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        expiresAt: Date,
        maxUses: { type: Number, default: 0 }, // 0 = unlimited
        uses: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
    }],
    isPublic: {
        type: Boolean,
        default: false,
    },
    memberCount: {
        type: Number,
        default: 1,
    },
    maxMembers: {
        type: Number,
        default: 500,
    },
    boostCount: {
        type: Number,
        default: 0,
    },
    boostTier: {
        type: Number,
        enum: [0, 1, 2, 3],
        default: 0,
    },
    features: [{
        type: String,
        enum: ['ANIMATED_ICON', 'BANNER', 'VANITY_URL', 'MORE_EMOJI', 'HIGH_AUDIO'],
    }],
    systemChannel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Channel',
    },
    systemMessages: {
        welcomeEnabled: { type: Boolean, default: true },
        boostEnabled: { type: Boolean, default: true },
    },
    vanityUrl: {
        type: String,
        unique: true,
        sparse: true,
    },
}, { timestamps: true });

// Generate unique invite code before saving
serverSchema.pre('save', function (next) {
    if (!this.inviteCode) {
        this.inviteCode = crypto.randomBytes(4).toString('hex');
    }
    next();
});

// Virtual to check if server is full
serverSchema.virtual('isFull').get(function () {
    return this.memberCount >= this.maxMembers;
});

// Method to generate a new invite link
serverSchema.methods.createInvite = function (userId, options = {}) {
    const code = crypto.randomBytes(4).toString('hex');
    const invite = {
        code,
        createdBy: userId,
        expiresAt: options.expiresAt || null,
        maxUses: options.maxUses || 0,
    };
    this.inviteLinks.push(invite);
    return code;
};

// Indexes
serverSchema.index({ name: 'text', description: 'text' });
serverSchema.index({ inviteCode: 1 });
serverSchema.index({ 'inviteLinks.code': 1 });
serverSchema.index({ 'members.user': 1 });
serverSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Server', serverSchema);
