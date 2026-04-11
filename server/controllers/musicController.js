const User = require('../models/User');
const MusicSession = require('../models/MusicSession');

// Add song to favorites
exports.addFavorite = async (req, res, next) => {
    try {
        const { title, artist, url, thumbnail, duration } = req.body;
        if (!title || !url) return res.status(400).json({ message: 'Title and URL required' });

        const user = await User.findById(req.user._id);
        const exists = user.favoriteSongs?.some(s => s.url === url);
        if (exists) return res.status(400).json({ message: 'Song already in favorites' });

        user.favoriteSongs.push({ title, artist, url, thumbnail, duration });
        await user.save();

        res.status(201).json({ favorites: user.favoriteSongs });
    } catch (error) { next(error); }
};

// Remove song from favorites
exports.removeFavorite = async (req, res, next) => {
    try {
        const { songId } = req.params;
        const user = await User.findById(req.user._id);
        user.favoriteSongs = user.favoriteSongs.filter(s => s._id.toString() !== songId);
        await user.save();
        res.json({ favorites: user.favoriteSongs });
    } catch (error) { next(error); }
};

// Get all favorites
exports.getFavorites = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ favorites: user.favoriteSongs || [] });
    } catch (error) { next(error); }
};

// Get music sessions for a server
exports.getServerMusicSessions = async (req, res, next) => {
    try {
        const { serverId } = req.params;
        const sessions = await MusicSession.find({ server: serverId, status: 'active' })
            .populate('host', 'username avatar')
            .populate('listeners.user', 'username avatar')
            .populate('queue.requestedBy', 'username avatar')
            .sort({ createdAt: -1 });
        res.json({ sessions });
    } catch (error) { next(error); }
};

// Create a music session
exports.createMusicSession = async (req, res, next) => {
    try {
        const { name, serverId } = req.body;
        if (!name || !serverId) return res.status(400).json({ message: 'Name and server required' });

        const session = await MusicSession.create({
            name, server: serverId, host: req.user._id,
            listeners: [{ user: req.user._id }],
        });
        const populated = await session.populate(['host', 'listeners.user']);
        res.status(201).json({ session: populated });
    } catch (error) { next(error); }
};

// End a music session
exports.endMusicSession = async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const session = await MusicSession.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only host can end session' });
        }
        session.status = 'ended';
        await session.save();
        res.json({ session });
    } catch (error) { next(error); }
};
