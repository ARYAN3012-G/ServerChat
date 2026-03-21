const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    tier: {
        type: String,
        enum: ['free', 'pro'],
        default: 'free',
    },
    razorpayCustomerId: String,
    razorpaySubscriptionId: String,
    razorpayPlanId: String,
    status: {
        type: String,
        enum: ['active', 'cancelled', 'past_due', 'halted', 'inactive', 'created', 'authenticated', 'pending'],
        default: 'inactive',
    },
    features: {
        premiumBackgrounds: { type: Boolean, default: false },
        premiumBadge: { type: Boolean, default: false },
        uploadLimit: { type: Number, default: 10 }, // MB
        animatedAvatar: { type: Boolean, default: false },
        profileBanner: { type: Boolean, default: false },
        extendedBio: { type: Boolean, default: false },
        hdScreenShare: { type: Boolean, default: false },
        customEmoji: { type: Boolean, default: false },
        musicPriority: { type: Boolean, default: false },
        readReceipts: { type: Boolean, default: false },
        serverBoost: { type: Boolean, default: false },
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
