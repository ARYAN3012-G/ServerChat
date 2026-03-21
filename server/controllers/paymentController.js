const crypto = require('crypto');
const { razorpay } = require('../config/razorpay');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { logger } = require('../config/logger');

// Pro features definition
function getProFeatures() {
    return {
        premiumBackgrounds: true,
        premiumBadge: true,
        uploadLimit: 100, // MB
        animatedAvatar: true,
        profileBanner: true,
        extendedBio: true,
        hdScreenShare: true,
        customEmoji: true,
        musicPriority: true,
        readReceipts: true,
        serverBoost: true,
    };
}

function getFreeFeatures() {
    return {
        premiumBackgrounds: false,
        premiumBadge: false,
        uploadLimit: 10,
        animatedAvatar: false,
        profileBanner: false,
        extendedBio: false,
        hdScreenShare: false,
        customEmoji: false,
        musicPriority: false,
        readReceipts: false,
        serverBoost: false,
    };
}

// Create Razorpay subscription for the user
exports.createCheckout = async (req, res, next) => {
    try {
        const planId = process.env.RAZORPAY_PLAN_ID;
        if (!planId) {
            return res.status(500).json({ message: 'Razorpay plan not configured. Set RAZORPAY_PLAN_ID in .env' });
        }

        // Check if already subscribed
        const existingSub = await Subscription.findOne({ user: req.user._id, status: 'active' });
        if (existingSub) {
            return res.status(400).json({ message: 'You already have an active Pro subscription!' });
        }

        // Create Razorpay subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: 12, // 12 months max (re-subscribes after)
            notes: {
                userId: req.user._id.toString(),
                username: req.user.username,
            },
        });

        // Save initial subscription record
        await Subscription.findOneAndUpdate(
            { user: req.user._id },
            {
                user: req.user._id,
                tier: 'free', // stays free until payment confirmed
                razorpaySubscriptionId: subscription.id,
                status: 'created',
            },
            { upsert: true, new: true }
        );

        res.json({
            subscriptionId: subscription.id,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            amount: 5000, // ₹50 in paise
            currency: 'INR',
            name: 'ServerChat Pro',
            description: 'Premium subscription — ₹50/month',
        });
    } catch (error) {
        logger.error('Razorpay checkout error:', error);
        next(error);
    }
};

// Verify Razorpay payment after user completes checkout
exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

        // Verify signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed — invalid signature' });
        }

        // Payment is verified — activate subscription
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

        await Subscription.findOneAndUpdate(
            { user: req.user._id },
            {
                tier: 'pro',
                razorpaySubscriptionId: razorpay_subscription_id,
                status: 'active',
                features: getProFeatures(),
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
            { upsert: true, new: true }
        );

        // Update user model
        await User.findByIdAndUpdate(req.user._id, {
            'subscription.tier': 'pro',
            'subscription.razorpaySubscriptionId': razorpay_subscription_id,
            'subscription.expiresAt': periodEnd,
        });

        // Record payment
        let paymentAmount = 50;
        try {
            const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
            paymentAmount = (paymentDetails.amount || 5000) / 100;
        } catch (e) { /* use default */ }

        await Payment.create({
            user: req.user._id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySubscriptionId: razorpay_subscription_id,
            razorpaySignature: razorpay_signature,
            amount: paymentAmount,
            currency: 'INR',
            status: 'succeeded',
            tier: 'pro',
            description: 'ServerChat Pro subscription',
        });

        res.json({ 
            success: true, 
            message: 'Welcome to ServerChat Pro! 🎉',
            subscription: { tier: 'pro', status: 'active', expiresAt: periodEnd },
        });
    } catch (error) {
        logger.error('Payment verification error:', error);
        next(error);
    }
};

// Get current subscription
exports.getSubscription = async (req, res, next) => {
    try {
        const sub = await Subscription.findOne({ user: req.user._id });
        res.json({
            subscription: sub || { tier: 'free', status: 'inactive', features: getFreeFeatures() },
        });
    } catch (error) {
        next(error);
    }
};

// Cancel subscription
exports.cancelSubscription = async (req, res, next) => {
    try {
        const sub = await Subscription.findOne({ user: req.user._id });
        if (!sub?.razorpaySubscriptionId || sub.status !== 'active') {
            return res.status(400).json({ message: 'No active subscription to cancel' });
        }

        // Cancel on Razorpay (cancel at end of period)
        try {
            await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
        } catch (e) {
            logger.error('Razorpay cancel error:', e);
        }

        sub.cancelAtPeriodEnd = true;
        await sub.save();

        res.json({ 
            message: 'Subscription will cancel at the end of your billing period.',
            cancelAt: sub.currentPeriodEnd,
        });
    } catch (error) {
        next(error);
    }
};

// Razorpay Webhook (for auto-renewal, failed payments, etc.)
exports.webhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    if (secret) {
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const expectedSignature = shasum.digest('hex');
        const receivedSignature = req.headers['x-razorpay-signature'];

        if (expectedSignature !== receivedSignature) {
            return res.status(400).json({ message: 'Invalid webhook signature' });
        }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    try {
        switch (event) {
            // Subscription charged successfully (auto-renewal)
            case 'subscription.charged': {
                const subId = payload.subscription?.entity?.id;
                if (subId) {
                    const sub = await Subscription.findOne({ razorpaySubscriptionId: subId });
                    if (sub) {
                        const now = new Date();
                        sub.status = 'active';
                        sub.tier = 'pro';
                        sub.features = getProFeatures();
                        sub.currentPeriodStart = now;
                        sub.currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        await sub.save();

                        await User.findByIdAndUpdate(sub.user, {
                            'subscription.tier': 'pro',
                            'subscription.expiresAt': sub.currentPeriodEnd,
                        });
                    }
                }
                break;
            }

            // Subscription halted (payment failed too many times)
            case 'subscription.halted':
            case 'subscription.cancelled': {
                const subId = payload.subscription?.entity?.id;
                if (subId) {
                    const sub = await Subscription.findOne({ razorpaySubscriptionId: subId });
                    if (sub) {
                        sub.status = 'cancelled';
                        sub.tier = 'free';
                        sub.features = getFreeFeatures();
                        await sub.save();

                        await User.findByIdAndUpdate(sub.user, {
                            'subscription.tier': 'free',
                        });
                    }
                }
                break;
            }

            // Payment failed
            case 'payment.failed': {
                const paymentEntity = payload.payment?.entity;
                if (paymentEntity) {
                    await Payment.create({
                        user: paymentEntity.notes?.userId,
                        razorpayPaymentId: paymentEntity.id,
                        amount: paymentEntity.amount / 100,
                        currency: 'INR',
                        status: 'failed',
                        method: paymentEntity.method,
                        description: 'Payment failed',
                        tier: 'pro',
                    });
                }
                break;
            }
        }
    } catch (error) {
        logger.error('Webhook processing error:', error);
    }

    res.json({ status: 'ok' });
};

// Get payment history
exports.getPaymentHistory = async (req, res, next) => {
    try {
        const payments = await Payment.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json({ payments });
    } catch (error) {
        next(error);
    }
};
