const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Proxy JioSaavn API to avoid CORS issues
router.get('/search', auth, async (req, res) => {
    try {
        const { query, page = 1, limit = 20 } = req.query;
        if (!query) return res.status(400).json({ message: 'Query is required' });

        const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        const data = await response.json();

        if (!data.success) {
            return res.status(502).json({ message: 'JioSaavn API error' });
        }

        // Map to a clean format
        const songs = (data.data?.results || []).map(song => ({
            id: song.id,
            title: song.name,
            artist: song.artists?.primary?.map(a => a.name).join(', ') || song.artists?.all?.map(a => a.name).join(', ') || 'Unknown',
            album: song.album?.name || '',
            duration: song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : '0:00',
            durationSec: song.duration || 0,
            image: song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url || '',
            url: song.downloadUrl?.[4]?.url || song.downloadUrl?.[3]?.url || song.downloadUrl?.[2]?.url || song.downloadUrl?.[1]?.url || song.downloadUrl?.[0]?.url || '',
            language: song.language || '',
            year: song.year || '',
            color: '#6366f1',
        }));

        res.json({ songs, total: data.data?.total || 0 });
    } catch (error) {
        console.error('JioSaavn proxy error:', error.message);
        res.status(500).json({ message: 'Failed to search songs' });
    }
});

// Get trending/popular songs
router.get('/trending', auth, async (req, res) => {
    try {
        const { language = 'hindi,english,telugu' } = req.query;
        const response = await fetch(`https://saavn.dev/api/search/songs?query=trending+${language}&limit=30`);
        const data = await response.json();

        const songs = (data.data?.results || []).map(song => ({
            id: song.id,
            title: song.name,
            artist: song.artists?.primary?.map(a => a.name).join(', ') || song.artists?.all?.map(a => a.name).join(', ') || 'Unknown',
            album: song.album?.name || '',
            duration: song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : '0:00',
            durationSec: song.duration || 0,
            image: song.image?.[2]?.url || song.image?.[1]?.url || song.image?.[0]?.url || '',
            url: song.downloadUrl?.[4]?.url || song.downloadUrl?.[3]?.url || song.downloadUrl?.[2]?.url || song.downloadUrl?.[1]?.url || song.downloadUrl?.[0]?.url || '',
            language: song.language || '',
            year: song.year || '',
            color: '#6366f1',
        }));

        res.json({ songs });
    } catch (error) {
        console.error('JioSaavn trending error:', error.message);
        res.status(500).json({ message: 'Failed to fetch trending' });
    }
});

module.exports = router;
