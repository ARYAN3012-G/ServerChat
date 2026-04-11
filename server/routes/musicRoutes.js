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

// Decode HTML entities (fixes &amp;quot; etc in song names)
function decodeHtml(str) {
    if (!str) return '';
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/');
}

// Normalize song data from different API formats
function normalizeSong(song, base) {
    // jiosaavn-api-privatecvc2 format
    if (base.includes('privatecvc2')) {
        return {
            id: song.id,
            title: decodeHtml(song.name),
            artist: decodeHtml(song.primaryArtists || song.featuredArtists || 'Unknown'),
            album: decodeHtml(song.album?.name || ''),
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
        title: decodeHtml(song.name),
        artist: decodeHtml(song.artists?.primary?.map(a => a.name).join(', ') || song.artists?.all?.map(a => a.name).join(', ') || 'Unknown'),
        album: decodeHtml(song.album?.name || ''),
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

// ─── FAVORITES ───
const User = require('../models/User');

router.get('/favorites', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ favorites: user.favoriteSongs || [] });
    } catch (error) { res.status(500).json({ message: 'Failed to fetch favorites' }); }
});

router.post('/favorites', auth, async (req, res) => {
    try {
        const { title, artist, url, thumbnail, duration } = req.body;
        if (!title || !url) return res.status(400).json({ message: 'Title and URL required' });
        const user = await User.findById(req.user._id);
        const exists = user.favoriteSongs?.some(s => s.url === url);
        if (exists) return res.status(400).json({ message: 'Already in favorites' });
        user.favoriteSongs.push({ title, artist, url, thumbnail, duration });
        await user.save();
        res.status(201).json({ favorites: user.favoriteSongs });
    } catch (error) { res.status(500).json({ message: 'Failed to add favorite' }); }
});

router.delete('/favorites/:songId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        user.favoriteSongs = user.favoriteSongs.filter(s => s._id.toString() !== req.params.songId);
        await user.save();
        res.json({ favorites: user.favoriteSongs });
    } catch (error) { res.status(500).json({ message: 'Failed to remove favorite' }); }
});

// ─── MUSIC SESSIONS ───
const MusicSession = require('../models/MusicSession');

router.get('/sessions/server/:serverId', auth, async (req, res) => {
    try {
        const sessions = await MusicSession.find({ server: req.params.serverId, status: 'active' })
            .populate('host', 'username avatar')
            .populate('listeners.user', 'username avatar')
            .populate('queue.requestedBy', 'username avatar')
            .sort({ createdAt: -1 });
        res.json({ sessions });
    } catch (error) { res.status(500).json({ message: 'Failed to fetch sessions' }); }
});

router.post('/sessions', auth, async (req, res) => {
    try {
        const { name, serverId } = req.body;
        if (!name || !serverId) return res.status(400).json({ message: 'Name and server required' });
        const session = await MusicSession.create({
            name, server: serverId, host: req.user._id,
            listeners: [{ user: req.user._id }],
        });
        const populated = await session.populate(['host', 'listeners.user']);
        res.status(201).json({ session: populated });
    } catch (error) { res.status(500).json({ message: 'Failed to create session' }); }
});

router.put('/sessions/:sessionId/end', auth, async (req, res) => {
    try {
        const session = await MusicSession.findById(req.params.sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.host.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only host can end' });
        session.status = 'ended';
        await session.save();
        res.json({ session });
    } catch (error) { res.status(500).json({ message: 'Failed to end session' }); }
});

module.exports = router;
