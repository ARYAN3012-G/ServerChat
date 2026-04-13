const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { logger } = require('../config/logger');
const { sendPasswordResetEmail } = require('../services/emailService');
const fetch = require('node-fetch');

// Generate tokens
const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
    return { accessToken, refreshToken };
};

// Register
exports.register = async (req, res, next) => {
    try {
        const { username, email, password, phone } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const isAdmin = email === 'aryanrajeshgadam.3012@gmail.com';
        const user = await User.create({ 
            username, 
            email, 
            password, 
            phone,
            role: isAdmin ? 'admin' : 'user'
        });
        const tokens = generateTokens(user);

        await ActivityLog.create({
            user: user._id,
            action: 'register',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            user: user.toJSON(),
            ...tokens,
        });
    } catch (error) {
        next(error);
    }
};

// Login
exports.login = async (req, res, next) => {
    try {
        const { email, password, phone } = req.body;

        // If phone field provided, look up by phone only
        let query;
        if (phone) {
            query = { phone };
        } else {
            query = { $or: [{ email }, { username: email }] };
        }
        const user = await User.findOne(query).select('+password +twoFactorSecret');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if user signed up via OAuth and has no password
        if (!user.password && (user.googleId || user.githubId)) {
            const provider = user.googleId ? 'Google' : 'GitHub';
            return res.status(401).json({
                message: `This account was created with ${provider}. Please use ${provider} login, or set a password in your account settings.`,
                oauthAccount: true
            });
        }

        if (!(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.isBanned) {
            return res.status(403).json({ message: 'Account suspended', reason: user.banReason });
        }

        // Check 2FA
        if (user.twoFactorEnabled) {
            const tempToken = jwt.sign({ id: user._id, require2FA: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
            return res.json({ require2FA: true, tempToken });
        }

        const tokens = generateTokens(user);

        // Log activity
        await ActivityLog.create({
            user: user._id,
            action: 'login',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.json({ user: user.toJSON(), ...tokens });
    } catch (error) {
        next(error);
    }
};

// Verify 2FA
exports.verify2FA = async (req, res, next) => {
    try {
        const { tempToken, code } = req.body;
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);

        if (!decoded.require2FA) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        const user = await User.findById(decoded.id).select('+twoFactorSecret');
        const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });

        if (!isValid) {
            return res.status(401).json({ message: 'Invalid 2FA code' });
        }

        const tokens = generateTokens(user);
        res.json({ user: user.toJSON(), ...tokens });
    } catch (error) {
        next(error);
    }
};

// Enable 2FA
exports.enable2FA = async (req, res, next) => {
    try {
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(req.user.email, process.env.TWO_FACTOR_APP_NAME || 'ServerChat', secret);
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret });

        res.json({ secret, qrCodeUrl });
    } catch (error) {
        next(error);
    }
};

// Confirm 2FA
exports.confirm2FA = async (req, res, next) => {
    try {
        const { code } = req.body;
        const user = await User.findById(req.user._id).select('+twoFactorSecret');

        const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid code' });
        }

        user.twoFactorEnabled = true;
        await user.save();

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        next(error);
    }
};

// Refresh Token
exports.refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        const tokens = generateTokens(user);
        res.json(tokens);
    } catch (error) {
        res.status(401).json({ message: 'Invalid refresh token' });
    }
};

// Change Password (for users who already have a password)
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.user._id).select('+password');

        if (!user.password) {
            return res.status(400).json({ message: 'No password set. Use Set Password instead.' });
        }

        if (!(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save(); // pre-save hook will hash it
        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ message: 'If an account exists, a reset link has been sent' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 min
        await user.save();

        // Send reset email in the background (fire-and-forget)
        // Wrapped in an async IIFE to ensure it absolutely cannot block or crash the request
        (async () => {
            try {
                await sendPasswordResetEmail(email, resetToken);
            } catch (err) {
                logger.error(`Background email send error: ${err.message}`);
            }
        })();

        return res.json({ message: 'If an account exists, a reset link has been sent' });
    } catch (error) {
        next(error);
    }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
};

// Get current user
exports.getMe = async (req, res) => {
    const user = await User.findById(req.user._id).select('+faceImageUrl +password');
    res.json({ user });
};

// Set password (for OAuth users who don't have one)
exports.setPassword = async (req, res, next) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (user.password) {
            return res.status(400).json({ message: 'Password already set. Use change password instead.' });
        }

        user.password = password;
        await user.save(); // pre-save hook will hash it
        res.json({ message: 'Password set successfully. You can now login with email and password.' });
    } catch (error) {
        next(error);
    }
};

// Update phone number
exports.updatePhone = async (req, res, next) => {
    try {
        const { phone } = req.body;
        if (!phone || phone.length < 7) {
            return res.status(400).json({ message: 'Please provide a valid phone number' });
        }
        // Check uniqueness
        const existing = await User.findOne({ phone, _id: { $ne: req.user._id } });
        if (existing) {
            return res.status(400).json({ message: 'This phone number is already linked to another account' });
        }
        await User.findByIdAndUpdate(req.user._id, { phone });
        res.json({ message: 'Phone number updated successfully' });
    } catch (error) {
        next(error);
    }
};

// Face login - store face image (skip detection, user confirms preview on client)
exports.storeFaceDescriptor = async (req, res, next) => {
    try {
        const { image } = req.body; // base64 image
        if (!image) return res.status(400).json({ message: 'No image provided' });

        // Convert base64 to raw base64 (without data URI prefix)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // Upload directly to Cloudinary (user already confirmed the preview)
        const cloudinary = require('cloudinary').v2;
        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
                folder: 'face-id',
                public_id: `face_${req.user._id}`,
                overwrite: true,
                transformation: [{ width: 480, height: 480, crop: 'limit', quality: 'auto' }],
            }, (err, result) => err ? reject(err) : resolve(result));
        });

        await User.findByIdAndUpdate(req.user._id, { faceImageUrl: uploadResult.secure_url });
        res.json({ message: 'Face ID registered successfully' });
    } catch (error) {
        logger.error(`storeFaceDescriptor error: ${error.message}`);
        next(error);
    }
};

// Face login - delete face image
exports.deleteFaceDescriptor = async (req, res, next) => {
    try {
        try {
            const cloudinary = require('cloudinary').v2;
            await cloudinary.uploader.destroy(`face-id/face_${req.user._id}`);
        } catch (e) { /* ignore cleanup errors */ }

        await User.findByIdAndUpdate(req.user._id, { $unset: { faceImageUrl: 1 } });
        res.json({ message: 'Face ID deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Face login - verify via Face++ Compare API
exports.faceLogin = async (req, res, next) => {
    try {
        const { image, email } = req.body;
        if (!image || !email) return res.status(400).json({ message: 'Email and face image required' });

        const user = await User.findOne({ email }).select('+faceImageUrl');
        if (!user || !user.faceImageUrl) {
            return res.status(400).json({ message: 'Face login not set up for this account' });
        }

        const apiKey = process.env.FACEPP_API_KEY;
        const apiSecret = process.env.FACEPP_API_SECRET;
        if (!apiKey || !apiSecret) {
            return res.status(500).json({ message: 'Face++ API not configured' });
        }

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // Face++ Compare: send login photo (base64) vs stored photo (URL) in one call
        const FormData = require('form-data');
        const compareForm = new FormData();
        compareForm.append('api_key', apiKey);
        compareForm.append('api_secret', apiSecret);
        compareForm.append('image_base64_1', base64Data);
        compareForm.append('image_url_2', user.faceImageUrl);

        const compareRes = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
            method: 'POST',
            body: compareForm,
        });
        const compareResult = await compareRes.json();

        if (compareResult.error_message) {
            logger.error(`Face++ compare error: ${compareResult.error_message}`);
            return res.status(400).json({ message: compareResult.error_message.includes('No face') ? 'No face detected. Look at the camera.' : 'Face verification failed' });
        }

        // Face++ returns confidence 0-100 (threshold ~70+ is a good match)
        if (!compareResult.confidence || compareResult.confidence < 70) {
            return res.status(401).json({ message: 'Face not recognized' });
        }

        if (user.isBanned) {
            return res.status(403).json({ message: 'Account suspended', reason: user.banReason });
        }

        const tokens = generateTokens(user);
        res.json({ user: user.toJSON(), ...tokens });
    } catch (error) {
        logger.error(`faceLogin error: ${error.message}`);
        next(error);
    }
};

// OAuth Callback
exports.oauthCallback = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=oauth_failed`);
        }

        const tokens = generateTokens(req.user);

        // Check if user has a password set
        const fullUser = await User.findById(req.user._id).select('+password');
        const needsPassword = !fullUser.password;

        // Log activity
        await ActivityLog.create({
            user: req.user._id,
            action: 'login',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            details: { method: 'oauth' }
        });

        // Redirect back to frontend with tokens in URL (frontend will parse and store them)
        let redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/login?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        if (needsPassword) {
            redirectUrl += '&needsPassword=true';
        }
        res.redirect(redirectUrl);
    } catch (error) {
        next(error);
    }
};
