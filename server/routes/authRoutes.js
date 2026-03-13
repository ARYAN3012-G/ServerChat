const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateInput } = require('../middleware/validate');
const authController = require('../controllers/authController');
const passport = require('passport');

router.post('/register', authLimiter, validateInput, authController.register);
router.post('/login', authLimiter, validateInput, authController.login);
router.post('/verify-2fa', authLimiter, authController.verify2FA);
router.post('/enable-2fa', auth, authController.enable2FA);
router.post('/confirm-2fa', auth, authController.confirm2FA);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', auth, authController.getMe);
router.post('/set-password', auth, authController.setPassword);
router.post('/face-descriptor', auth, authController.storeFaceDescriptor);
router.delete('/face-descriptor', auth, authController.deleteFaceDescriptor);
router.post('/face-login', authLimiter, authController.faceLogin);
router.put('/phone', auth, authController.updatePhone);

// OAuth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed` }), authController.oauthCallback);

router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', passport.authenticate('github', { failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed` }), authController.oauthCallback);

module.exports = router;
