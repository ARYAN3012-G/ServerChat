const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../services/emailService');
const { logger } = require('../config/logger');

// POST /api/contact — send contact form email to admin
router.post('/', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Name, email, and message are required.' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    try {
        const sent = await sendContactEmail({ name, email, subject, message });
        if (!sent) {
            logger.error(`Contact form: Failed to send email from ${email}`);
            return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
        }
        res.json({ message: 'Message sent successfully!' });
    } catch (err) {
        logger.error(`Contact route error: ${err.message}`);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
});

module.exports = router;
