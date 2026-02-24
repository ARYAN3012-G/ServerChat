const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { logger } = require('../config/logger');

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

        const user = await User.create({ username, email, password, phone });
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
        const { email, password } = req.body;

        const user = await User.findOne({
            $or: [{ email }, { phone: email }, { username: email }]
        }).select('+password +twoFactorSecret');

        if (!user || !(await user.comparePassword(password))) {
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

        // In production, send email with reset link
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        logger.info(`Password reset URL for ${email}: ${resetUrl}`);

        res.json({ message: 'If an account exists, a reset link has been sent', resetUrl });
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
    res.json({ user: req.user });
};

// Face login - store descriptor
exports.storeFaceDescriptor = async (req, res, next) => {
    try {
        const { descriptor } = req.body;
        await User.findByIdAndUpdate(req.user._id, { faceDescriptor: descriptor });
        res.json({ message: 'Face data stored successfully' });
    } catch (error) {
        next(error);
    }
};

// Face login - verify
exports.faceLogin = async (req, res, next) => {
    try {
        const { descriptor, email } = req.body;
        const user = await User.findOne({ email }).select('+faceDescriptor');

        if (!user || !user.faceDescriptor || user.faceDescriptor.length === 0) {
            return res.status(400).json({ message: 'Face login not set up for this account' });
        }

        // Calculate euclidean distance
        const distance = Math.sqrt(
            user.faceDescriptor.reduce((sum, val, i) => sum + Math.pow(val - descriptor[i], 2), 0)
        );

        if (distance > 0.6) {
            return res.status(401).json({ message: 'Face not recognized' });
        }

        const tokens = generateTokens(user);
        res.json({ user: user.toJSON(), ...tokens });
    } catch (error) {
        next(error);
    }
};
