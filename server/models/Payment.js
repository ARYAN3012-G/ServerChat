const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySubscriptionId: String,
    razorpaySignature: String,
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'INR',
    },
    status: {
        type: String,
        enum: ['pending', 'succeeded', 'failed', 'refunded'],
        default: 'pending',
    },
    method: {
        type: String, // upi, card, netbanking, wallet
    },
    description: String,
    tier: {
        type: String,
        enum: ['pro'],
        default: 'pro',
    },
}, { timestamps: true });

paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
