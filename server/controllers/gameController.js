const GameSession = require('../models/GameSession');
const ActivityLog = require('../models/ActivityLog');

// Save a game score
exports.saveScore = async (req, res, next) => {
    try {
        const { game, score, won } = req.body;

        const session = await GameSession.create({
            game,
            players: [{ user: req.user._id, score: score || 0 }],
            state: {},
            status: 'finished',
            winner: won ? req.user._id : null,
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
        const { game } = req.query;

        const pipeline = [
            { $match: { status: 'finished', ...(game && { game }) } },
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
