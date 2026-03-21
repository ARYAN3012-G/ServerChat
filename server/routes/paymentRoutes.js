const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Create Razorpay subscription checkout
router.post('/checkout', auth, paymentController.createCheckout);

// Verify payment after Razorpay checkout completes
router.post('/verify', auth, paymentController.verifyPayment);

// Get current subscription status
router.get('/subscription', auth, paymentController.getSubscription);

// Cancel subscription
router.post('/cancel', auth, paymentController.cancelSubscription);

// Payment history
router.get('/history', auth, paymentController.getPaymentHistory);

// Razorpay webhook (no auth — called by Razorpay servers)
router.post('/webhook', express.json(), paymentController.webhook);

module.exports = router;
