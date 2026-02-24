const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const messageLimiter = rateLimit({
    windowMs: 1000, // 1 second
    max: 5,
    message: { message: 'Sending messages too fast.' },
});

module.exports = { apiLimiter, authLimiter, messageLimiter };
