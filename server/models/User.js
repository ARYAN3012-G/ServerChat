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
        required: [true, 'Password is required'],
        minlength: 6,
        select: false,
    },
    avatar: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
    },
    banner: {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
    },
    bio: {
        type: String,
        maxlength: 200,
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

    // Face recognition
    faceDescriptor: {
        type: [Number],
        select: false,
    },

    // OAuth
    googleId: String,
    githubId: String,

    // Subscription
    subscription: {
        tier: {
            type: String,
            enum: ['free', 'basic', 'premium'],
            default: 'free',
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
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
    delete obj.password;
    delete obj.twoFactorSecret;
    delete obj.faceDescriptor;
    delete obj.resetPasswordToken;
    delete obj.resetPasswordExpires;
    return obj;
};

// Indexes
userSchema.index({ username: 'text', email: 'text' });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
