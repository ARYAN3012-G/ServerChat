const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stripePaymentIntentId: String,
    stripeInvoiceId: String,
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'usd',
    },
    status: {
        type: String,
        enum: ['pending', 'succeeded', 'failed', 'refunded'],
        default: 'pending',
    },
    description: String,
    tier: {
        type: String,
        enum: ['basic', 'premium'],
    },
}, { timestamps: true });

paymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
