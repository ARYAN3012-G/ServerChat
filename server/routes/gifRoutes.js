const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const axios = require('axios'); // Utilizing axios which is already in the server package.json

const TENOR_API_KEY = process.env.TENOR_API_KEY || 'LIVDSRZULELA'; // Tenor public key

// Get trending GIFs
router.get('/trending', auth, async (req, res, next) => {
    try {
        const { limit = 20 } = req.query;
        const response = await axios.get(`https://g.tenor.com/v1/trending?key=${TENOR_API_KEY}&limit=${limit}`);
        res.json({ results: response.data.results || [] });
    } catch (error) {
        console.error('Tenor trending error:', error.message);
        res.status(500).json({ message: 'Failed to fetch trending GIFs' });
    }
});

// Search GIFs
router.get('/search', auth, async (req, res, next) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q) return res.json({ results: [] });
        
        const response = await axios.get(`https://g.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=${TENOR_API_KEY}&limit=${limit}`);
        res.json({ results: response.data.results || [] });
    } catch (error) {
        console.error('Tenor search error:', error.message);
        res.status(500).json({ message: 'Failed to search GIFs' });
    }
});

module.exports = router;
