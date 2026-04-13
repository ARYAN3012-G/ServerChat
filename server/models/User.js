const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    phone: {
        type: String,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        required: [function () { return !this.googleId && !this.githubId; }, 'Password is required'],
        minlength: 6,
        select: false,
    },
    avatar: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
        emoji: { type: String },
        bg: { type: String },
        prebuilt: { type: Boolean, default: false },
    },
    banner: {
        type: String,
        default: '',
    },
    accentColor: {
        type: String,
        default: '#6366f1', // default indigo-500
    },
    bio: {
        type: String,
        maxlength: 500, // Enforced tier limits in controller
        default: '',
    },
    role: {
        type: String,
        enum: ['user', 'moderator', 'admin'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'idle', 'dnd', 'invisible'],
        default: 'offline',
    },
    preferredStatus: {
        type: String,
        enum: ['online', 'idle', 'dnd', 'invisible'],
        default: 'online',
    },
    customStatus: {
        text: { type: String, default: '' },
        emoji: { type: String, default: '' },
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    isBanned: {
        type: Boolean,
        default: false,
    },
    banReason: String,

    // 2FA
    twoFactorEnabled: {
        type: Boolean,
        default: false,
    },
    twoFactorSecret: {
        type: String,
        select: false,
    },

    // Face recognition (Azure Face API)
    faceImageUrl: {
        type: String,
        select: false,
    },

    // OAuth
    googleId: String,
    githubId: String,

    // Subscription
    subscription: {
        tier: {
            type: String,
            enum: ['free', 'pro'],
            default: 'free',
        },
        razorpayCustomerId: String,
        razorpaySubscriptionId: String,
        expiresAt: Date,
    },

    // Friends
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // Per-user friend nicknames (only visible to the user who set them)
    friendNicknames: {
        type: Map,
        of: String,
        default: new Map(),
    },
    // Per-user custom avatars for friends (only visible to the user who set them)
    friendAvatars: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map(),
    },

    // Device sessions
    sessions: [{
        deviceInfo: String,
        ipAddress: String,
        token: String,
        lastActive: { type: Date, default: Date.now },
    }],

    // Reset password
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // User preferences
    preferences: {
        background: { type: String, default: '' },
    },

    // Music favorites
    favoriteSongs: [{
        title: String,
        artist: String,
        url: String,
        thumbnail: String,
        duration: String,
        addedAt: { type: Date, default: Date.now },
    }],

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.hasPassword = !!obj.password;
    delete obj.password;
    delete obj.twoFactorSecret;
    obj.hasFaceId = !!obj.faceImageUrl;
    delete obj.faceImageUrl;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
};

// Indexes
userSchema.index({ username: 'text', email: 'text' });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
