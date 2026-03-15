const GameSession = require('../models/GameSession');
const { logger } = require('../config/logger');

module.exports = (io, socket) => {
    // Create a game
    socket.on('game:create', async (data) => {
        try {
            const { game, channelId, settings = {} } = data;

            const session = await GameSession.create({
                game,
                channel: channelId,
                players: [{ user: socket.userId, isReady: true }],
                settings,
                state: getInitialState(game),
            });

            // Creator joins the game socket room
            socket.join(`game:${session._id}`);

            const populated = await session.populate('players.user', 'username avatar');

            // Notify the channel so other players can join
            io.to(`channel:${channelId}`).emit('game:created', {
                session: populated,
            });

            // Also send to the creator directly (in case they're not in the channel room)
            socket.emit('game:updated', { session: populated });

            logger.debug(`${socket.username} created game ${game} in channel ${channelId}`);
        } catch (error) {
            logger.error(`Game create error: ${error.message}`);
            socket.emit('error', { message: 'Failed to create game' });
        }
    });

    // Join a game
    socket.on('game:join', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('error', { message: 'Game not available' });
            }

            // Check if already joined
            const alreadyJoined = session.players.some(p => p.user.toString() === socket.userId);
            if (!alreadyJoined) {
                session.players.push({ user: socket.userId, isReady: true });
            }

            // Auto-start when enough players
            const minPlayers = getMinPlayers(session.game);
            if (session.players.length >= minPlayers) {
                session.status = 'in_progress';
                session.startedAt = new Date();
                session.currentTurn = session.players[0].user;
            }

            await session.save();
            socket.join(`game:${sessionId}`);

            const populated = await session.populate('players.user', 'username avatar');

            // Broadcast to all players in the game room AND the channel
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            if (session.channel) {
                io.to(`channel:${session.channel.toString()}`).emit('game:updated', { session: populated });
            }

            logger.debug(`${socket.username} joined game ${sessionId}`);
        } catch (error) {
            logger.error(`Game join error: ${error.message}`);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    // Make a move
    socket.on('game:move', async (data) => {
        try {
            const { sessionId, move } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'in_progress') {
                return socket.emit('error', { message: 'Game not in progress' });
            }

            // Verify it's the player's turn (for turn-based games)
            if (session.game === 'tic-tac-toe') {
                if (session.currentTurn?.toString() !== socket.userId) {
                    return socket.emit('error', { message: 'Not your turn' });
                }
            }

            // Process move based on game type
            const result = processMove(session, socket.userId, move);

            session.state = result.state;
            if (result.nextTurn) session.currentTurn = result.nextTurn;

            if (result.winner) {
                session.winner = result.winner;
                session.status = 'finished';
                session.finishedAt = new Date();

                // Update scores
                const winnerPlayer = session.players.find(p => p.user.toString() === result.winner.toString());
                if (winnerPlayer) winnerPlayer.score += 1;
            }

            if (result.draw) {
                session.status = 'finished';
                session.finishedAt = new Date();
            }

            await session.save();

            const populated = await session.populate('players.user', 'username avatar');

            // Broadcast to all players in game room AND channel
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            if (session.channel) {
                io.to(`channel:${session.channel.toString()}`).emit('game:updated', { session: populated });
            }
        } catch (error) {
            logger.error(`Game move error: ${error.message}`);
        }
    });

    // Rematch
    socket.on('game:rematch', async (data) => {
        try {
            const { sessionId } = data;
            const oldSession = await GameSession.findById(sessionId);

            if (!oldSession) return;

            // Create new session with players ready and auto-started
            const newSession = await GameSession.create({
                game: oldSession.game,
                channel: oldSession.channel,
                players: oldSession.players.map(p => ({
                    user: p.user,
                    score: p.score,
                    isReady: true,
                })),
                state: getInitialState(oldSession.game),
                status: 'in_progress', // Auto-start rematch
                currentTurn: oldSession.players[0].user,
                startedAt: new Date(),
                round: oldSession.round + 1,
                maxRounds: oldSession.maxRounds,
                settings: oldSession.settings,
            });

            // Move all players from old game room to new game room
            const oldRoomId = `game:${sessionId}`;
            const newRoomId = `game:${newSession._id}`;

            // Get all sockets in old room and move them
            const socketsInRoom = await io.in(oldRoomId).fetchSockets();
            for (const s of socketsInRoom) {
                s.leave(oldRoomId);
                s.join(newRoomId);
            }

            const populated = await newSession.populate('players.user', 'username avatar');

            // Broadcast new session to both old room sockets (now in new room) and channel
            io.to(newRoomId).emit('game:rematch', { session: populated });
            io.to(newRoomId).emit('game:updated', { session: populated });
            if (oldSession.channel) {
                io.to(`channel:${oldSession.channel.toString()}`).emit('game:updated', { session: populated });
            }

            logger.debug(`Game rematch created from ${sessionId} -> ${newSession._id}`);
        } catch (error) {
            logger.error(`Game rematch error: ${error.message}`);
        }
    });
};

// Helper functions
function getInitialState(game) {
    switch (game) {
        case 'tic-tac-toe':
            return { board: Array(9).fill(null), xIsNext: true };
        case 'rock-paper-scissors':
            return { choices: {}, round: 1 };
        case 'quiz':
            return { currentQuestion: 0, answers: {}, scores: {} };
        case 'word-guess':
            return { word: '', guesses: [], revealed: [], attemptsLeft: 6 };
        default:
            return {};
    }
}

function getMinPlayers(game) {
    switch (game) {
        case 'tic-tac-toe': return 2;
        case 'rock-paper-scissors': return 2;
        case 'quiz': return 2;
        case 'word-guess': return 2;
        default: return 2;
    }
}

function processMove(session, userId, move) {
    switch (session.game) {
        case 'tic-tac-toe':
            return processTicTacToe(session, userId, move);
        case 'rock-paper-scissors':
            return processRPS(session, userId, move);
        default:
            return { state: session.state };
    }
}

function processTicTacToe(session, userId, move) {
    const state = { ...session.state };
    const board = [...state.board];
    const playerIndex = session.players.findIndex(p => p.user.toString() === userId);
    const symbol = playerIndex === 0 ? 'X' : 'O';

    if (board[move.position] !== null) {
        return { state };
    }

    board[move.position] = symbol;
    state.board = board;
    state.xIsNext = !state.xIsNext;

    // Check winner
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { state, winner: userId };
        }
    }

    // Check draw
    if (board.every(cell => cell !== null)) {
        return { state, draw: true };
    }

    const nextPlayerIndex = state.xIsNext ? 0 : 1;
    return { state, nextTurn: session.players[nextPlayerIndex]?.user };
}

function processRPS(session, userId, move) {
    const state = { ...session.state };
    state.choices[userId] = move.choice;

    // Check if both players have chosen
    if (Object.keys(state.choices).length === session.players.length) {
        const players = session.players.map(p => p.user.toString());
        const [p1, p2] = players;
        const c1 = state.choices[p1];
        const c2 = state.choices[p2];

        const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

        if (c1 === c2) {
            return { state: { ...state, result: 'draw', choices: {} }, draw: false };
        } else if (wins[c1] === c2) {
            return { state: { ...state, result: p1 }, winner: p1 };
        } else {
            return { state: { ...state, result: p2 }, winner: p2 };
        }
    }

    return { state };
}
