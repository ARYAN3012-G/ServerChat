const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateInput } = require('../middleware/validate');
const authController = require('../controllers/authController');

router.post('/register', authLimiter, validateInput, authController.register);
router.post('/login', authLimiter, validateInput, authController.login);
router.post('/verify-2fa', authLimiter, authController.verify2FA);
router.post('/enable-2fa', auth, authController.enable2FA);
router.post('/confirm-2fa', auth, authController.confirm2FA);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', auth, authController.getMe);
router.post('/face-descriptor', auth, authController.storeFaceDescriptor);
router.post('/face-login', authLimiter, authController.faceLogin);

module.exports = router;
