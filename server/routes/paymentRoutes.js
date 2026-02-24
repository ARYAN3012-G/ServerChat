const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.post('/checkout', auth, paymentController.createCheckout);
router.get('/subscription', auth, paymentController.getSubscription);
router.post('/cancel', auth, paymentController.cancelSubscription);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.webhook);

module.exports = router;
