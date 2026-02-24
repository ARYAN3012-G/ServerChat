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
        enum: ['free', 'basic', 'premium'],
        default: 'free',
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripePriceId: String,
    status: {
        type: String,
        enum: ['active', 'cancelled', 'past_due', 'trialing', 'inactive'],
        default: 'inactive',
    },
    features: {
        customEmojis: { type: Boolean, default: false },
        premiumBadge: { type: Boolean, default: false },
        uploadLimit: { type: Number, default: 10 }, // MB
        animatedAvatar: { type: Boolean, default: false },
        screenShare: { type: Boolean, default: false },
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
