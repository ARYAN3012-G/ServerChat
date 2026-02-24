const { stripe } = require('../config/stripe');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const User = require('../models/User');

// Create checkout session
exports.createCheckout = async (req, res, next) => {
    try {
        const { tier } = req.body;
        const priceId = tier === 'basic' ? process.env.STRIPE_PRICE_BASIC : process.env.STRIPE_PRICE_PREMIUM;

        let sub = await Subscription.findOne({ user: req.user._id });
        let customerId = sub?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                metadata: { userId: req.user._id.toString() },
            });
            customerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.CLIENT_URL}/settings?payment=success`,
            cancel_url: `${process.env.CLIENT_URL}/settings?payment=cancelled`,
            metadata: { userId: req.user._id.toString(), tier },
        });

        res.json({ url: session.url });
    } catch (error) {
        next(error);
    }
};

// Stripe webhook
exports.webhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const { userId, tier } = session.metadata;

            await Subscription.findOneAndUpdate(
                { user: userId },
                {
                    user: userId,
                    tier,
                    stripeCustomerId: session.customer,
                    stripeSubscriptionId: session.subscription,
                    status: 'active',
                    features: getFeatures(tier),
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
                { upsert: true, new: true }
            );

            await User.findByIdAndUpdate(userId, {
                'subscription.tier': tier,
                'subscription.stripeCustomerId': session.customer,
                'subscription.stripeSubscriptionId': session.subscription,
            });

            await Payment.create({
                user: userId,
                stripePaymentIntentId: session.payment_intent,
                amount: session.amount_total / 100,
                status: 'succeeded',
                tier,
                description: `${tier} subscription`,
            });
            break;
        }

        case 'customer.subscription.deleted': {
            const sub = event.data.object;
            await Subscription.findOneAndUpdate(
                { stripeSubscriptionId: sub.id },
                { status: 'cancelled', tier: 'free', features: getFeatures('free') }
            );
            break;
        }
    }

    res.json({ received: true });
};

// Get subscription
exports.getSubscription = async (req, res, next) => {
    try {
        const sub = await Subscription.findOne({ user: req.user._id });
        res.json({ subscription: sub || { tier: 'free', status: 'inactive' } });
    } catch (error) {
        next(error);
    }
};

// Cancel subscription
exports.cancelSubscription = async (req, res, next) => {
    try {
        const sub = await Subscription.findOne({ user: req.user._id });
        if (!sub?.stripeSubscriptionId) {
            return res.status(400).json({ message: 'No active subscription' });
        }

        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        sub.cancelAtPeriodEnd = true;
        await sub.save();

        res.json({ message: 'Subscription will cancel at end of period' });
    } catch (error) {
        next(error);
    }
};

function getFeatures(tier) {
    switch (tier) {
        case 'premium':
            return {
                customEmojis: true,
                premiumBadge: true,
                uploadLimit: 100,
                animatedAvatar: true,
                screenShare: true,
            };
        case 'basic':
            return {
                customEmojis: true,
                premiumBadge: false,
                uploadLimit: 50,
                animatedAvatar: false,
                screenShare: true,
            };
        default:
            return {
                customEmojis: false,
                premiumBadge: false,
                uploadLimit: 10,
                animatedAvatar: false,
                screenShare: false,
            };
    }
}
