const GameSession = require('../models/GameSession');
const ActivityLog = require('../models/ActivityLog');

// Save a game score
exports.saveScore = async (req, res, next) => {
    try {
        const { game, score, won, serverId } = req.body;

        const session = await GameSession.create({
            game,
            players: [{ user: req.user._id, score: score || 0 }],
            state: {},
            status: 'finished',
            winner: won ? req.user._id : null,
            ...(serverId && { server: serverId }),
            round: 1,
            maxRounds: 1,
            startedAt: new Date(Date.now() - 60000),
            finishedAt: new Date(),
        });

        await ActivityLog.create({
            user: req.user._id,
            action: 'game_finished',
            details: { game, score, won, sessionId: session._id },
            ipAddress: req.ip,
        });

        res.status(201).json({ session });
    } catch (error) {
        next(error);
    }
};

// Get active games
exports.getActiveGames = async (req, res, next) => {
    try {
        const games = await GameSession.find({
            status: { $in: ['waiting', 'in_progress'] }
        })
            .populate('players.user', 'username avatar')
            .sort({ createdAt: -1 });

        res.json({ games });
    } catch (error) {
        next(error);
    }
};

// Get game sessions for a specific server
exports.getServerSessions = async (req, res, next) => {
    try {
        const { serverId } = req.params;

        // Auto-cancel stale waiting sessions older than 30 minutes
        await GameSession.updateMany(
            { server: serverId, status: 'waiting', createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } },
            { $set: { status: 'cancelled' } }
        );

        const sessions = await GameSession.find({
            server: serverId,
            $or: [
                { status: { $in: ['waiting', 'in_progress'] } },
                { status: 'finished', finishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            ],
        })
            .populate('players.user', 'username avatar')
            .populate('joinRequests.user', 'username avatar')
            .populate('spectators.user', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ sessions });
    } catch (error) {
        next(error);
    }
};

// Get game session
exports.getGameSession = async (req, res, next) => {
    try {
        const session = await GameSession.findById(req.params.id)
            .populate('players.user', 'username avatar')
            .populate('winner', 'username avatar');

        if (!session) {
            return res.status(404).json({ message: 'Game not found' });
        }

        res.json({ session });
    } catch (error) {
        next(error);
    }
};

// Get game leaderboard
exports.getLeaderboard = async (req, res, next) => {
    try {
        const { game, serverId } = req.query;
        const matchFilter = { status: 'finished' };
        if (game) matchFilter.game = game;
        if (serverId) matchFilter.server = new (require('mongoose').Types.ObjectId)(serverId);

        const pipeline = [
            { $match: matchFilter },
            { $unwind: '$players' },
            {
                $group: {
                    _id: '$players.user',
                    totalScore: { $sum: '$players.score' },
                    gamesPlayed: { $sum: 1 },
                    wins: {
                        $sum: {
                            $cond: [{ $eq: ['$winner', '$players.user'] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { totalScore: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                    pipeline: [{ $project: { username: 1, avatar: 1 } }]
                }
            },
            { $unwind: '$user' },
        ];

        const leaderboard = await GameSession.aggregate(pipeline);
        res.json({ leaderboard });
    } catch (error) {
        next(error);
    }
};

// Get user game history
exports.getGameHistory = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const games = await GameSession.find({
            'players.user': req.user._id,
            status: 'finished'
        })
            .populate('players.user', 'username avatar')
            .populate('winner', 'username')
            .sort({ finishedAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        res.json({ games });
    } catch (error) {
        next(error);
    }
};

// Get user's best scores per game (for high score persistence)
exports.getMyBestScores = async (req, res, next) => {
    try {
        const pipeline = [
            { $match: { status: 'finished', 'players.user': req.user._id } },
            { $unwind: '$players' },
            { $match: { 'players.user': req.user._id } },
            {
                $group: {
                    _id: '$game',
                    bestScore: { $max: '$players.score' },
                }
            },
        ];
        const results = await GameSession.aggregate(pipeline);
        const scores = {};
        for (const r of results) {
            scores[r._id] = r.bestScore;
        }
        res.json({ scores });
    } catch (error) {
        next(error);
    }
};
