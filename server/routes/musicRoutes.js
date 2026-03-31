const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Working JioSaavn API endpoints (fallback chain)
const API_BASES = [
    'https://jiosaavn-api-privatecvc2.vercel.app',
    'https://saavn.dev/api',
];

async function fetchFromAPI(path) {
    for (const base of API_BASES) {
        try {
            const url = base.includes('saavn.dev') ? `${base}${path}` : `${base}${path}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!response.ok) continue;
            const data = await response.json();
            if (data.status === 'SUCCESS' || data.success) return { data, base };
        } catch (e) {
            console.log(`Music API ${base} failed: ${e.message}`);
        }
    }
    return null;
}

// Normalize song data from different API formats
function normalizeSong(song, base) {
    // jiosaavn-api-privatecvc2 format
    if (base.includes('privatecvc2')) {
        return {
            id: song.id,
            title: song.name,
            artist: song.primaryArtists || song.featuredArtists || 'Unknown',
            album: song.album?.name || '',
            duration: song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}` : '0:00',
            durationSec: parseInt(song.duration) || 0,
            image: song.image?.[2]?.link || song.image?.[1]?.link || song.image?.[0]?.link || '',
            url: song.downloadUrl?.[4]?.link || song.downloadUrl?.[3]?.link || song.downloadUrl?.[2]?.link || song.downloadUrl?.[1]?.link || song.downloadUrl?.[0]?.link || '',
            language: song.language || '',
            year: song.year || '',
            color: '#6366f1',
        };
    }
    // saavn.dev format (original)
    return {
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
    };
}

// Search songs
router.get('/search', auth, async (req, res) => {
    try {
        const { query, page = 1, limit = 20 } = req.query;
        if (!query) return res.status(400).json({ message: 'Query is required' });

        const result = await fetchFromAPI(`/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
        if (!result) return res.status(502).json({ message: 'All music APIs unavailable' });

        const { data, base } = result;
        const results = data.data?.results || data.results || [];
        const songs = results.map(song => normalizeSong(song, base));

        res.json({ songs, total: data.data?.total || data.total || songs.length });
    } catch (error) {
        console.error('Music search error:', error.message);
        res.status(500).json({ message: 'Failed to search songs' });
    }
});

// Get trending/popular songs
router.get('/trending', auth, async (req, res) => {
    try {
        const { language = 'hindi,english,telugu' } = req.query;
        const result = await fetchFromAPI(`/search/songs?query=trending+${language}&limit=30`);
        if (!result) return res.status(502).json({ message: 'All music APIs unavailable' });

        const { data, base } = result;
        const results = data.data?.results || data.results || [];
        const songs = results.map(song => normalizeSong(song, base));

        res.json({ songs });
    } catch (error) {
        console.error('Music trending error:', error.message);
        res.status(500).json({ message: 'Failed to fetch trending' });
    }
});

module.exports = router;
