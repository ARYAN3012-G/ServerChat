const GameSession = require('../models/GameSession');
const Message = require('../models/Message');
const { logger } = require('../config/logger');

module.exports = (io, socket) => {
    // Create a game
    socket.on('game:create', async (data) => {
        try {
            const { game, channelId, serverId, settings = {} } = data;

            // Block: one active game per user per server
            const existing = await GameSession.findOne({
                server: serverId,
                'players.user': socket.userId,
                status: { $in: ['waiting', 'in_progress'] },
            });
            if (existing) {
                return socket.emit('game:error', { message: 'You already have an active game. Cancel or finish it first.' });
            }

            const session = await GameSession.create({
                game,
                channel: channelId,
                server: serverId,
                players: [{ user: socket.userId, isReady: true }],
                settings,
                state: getInitialState(game),
            });

            socket.join(`game:${session._id}`);

            const populated = await session.populate('players.user', 'username avatar');

            // Notify the server's game lobby (no chat message — Live Sessions tab is the lobby)
            if (serverId) {
                io.emit('game:created', { session: populated });
            }

            // Send session back to the creator so they enter the game UI immediately
            socket.emit('game:session-created', { session: populated });

            logger.debug(`${socket.username} created game ${game} in server ${serverId}`);
        } catch (error) {
            logger.error(`Game create error: ${error.message}`);
            socket.emit('error', { message: 'Failed to create game' });
        }
    });

    // Request to join a game (doesn't auto-join — host must accept)
    socket.on('game:request-join', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('error', { message: 'Game not available' });
            }

            // Check if already a player
            const alreadyPlayer = session.players.some(p => p.user.toString() === socket.userId);
            if (alreadyPlayer) {
                return socket.emit('error', { message: 'You are already in this game' });
            }

            // Check if already requested
            const existingRequest = session.joinRequests.find(r => r.user.toString() === socket.userId);
            if (existingRequest) {
                if (existingRequest.status === 'pending') {
                    return socket.emit('error', { message: 'Join request already pending' });
                }
                if (existingRequest.status === 'declined') {
                    return socket.emit('error', { message: 'Your request was declined' });
                }
            }

            session.joinRequests.push({ user: socket.userId, status: 'pending' });
            await session.save();

            const populated = await session.populate(['players.user', 'joinRequests.user']);

            // Notify host (first player)
            io.to(`game:${sessionId}`).emit('game:join-request', {
                session: populated,
                requester: { _id: socket.userId, username: socket.username },
            });

            socket.emit('game:request-sent', { sessionId });

            logger.debug(`${socket.username} requested to join game ${sessionId}`);
        } catch (error) {
            logger.error(`Game request-join error: ${error.message}`);
            socket.emit('error', { message: 'Failed to request join' });
        }
    });

    // Host accepts a join request
    socket.on('game:accept-join', async (data) => {
        try {
            const { sessionId, userId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('error', { message: 'Game not available' });
            }

            // Verify the requester is the host (first player)
            if (session.players[0]?.user.toString() !== socket.userId) {
                return socket.emit('error', { message: 'Only the host can accept requests' });
            }

            // Update the request status
            const request = session.joinRequests.find(r => r.user.toString() === userId);
            if (!request || request.status !== 'pending') {
                return socket.emit('error', { message: 'No pending request from this user' });
            }
            request.status = 'accepted';

            // Add the player
            session.players.push({ user: userId, isReady: true });

            // Auto-start when enough players
            const minPlayers = getMinPlayers(session.game);
            if (session.players.length >= minPlayers) {
                session.status = 'in_progress';
                session.startedAt = new Date();
                session.currentTurn = session.players[0].user;

                // Decline all remaining pending requests
                session.joinRequests.forEach(r => {
                    if (r.status === 'pending') r.status = 'declined';
                });
            }

            await session.save();

            const populated = await session.populate(['players.user', 'joinRequests.user', 'spectators.user']);

            // Make the accepted player join the game socket room
            const acceptedSockets = await io.fetchSockets();
            const targetSocket = acceptedSockets.find(s => s.userId === userId);
            if (targetSocket) targetSocket.join(`game:${sessionId}`);

            // Broadcast to all in game room + channel
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            if (session.channel) {
                io.to(`channel:${session.channel.toString()}`).emit('game:updated', { session: populated });

                // Update the challenge message in chat
                await updateChallengeMessage(io, session, populated);
            }

            // Notify the accepted player
            io.to(`game:${sessionId}`).emit('game:player-accepted', { userId, session: populated });

            logger.debug(`Host accepted ${userId} to game ${sessionId}`);
        } catch (error) {
            logger.error(`Game accept-join error: ${error.message}`);
            socket.emit('error', { message: 'Failed to accept join request' });
        }
    });

    // Host declines a join request
    socket.on('game:decline-join', async (data) => {
        try {
            const { sessionId, userId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session) return;

            // Verify host
            if (session.players[0]?.user.toString() !== socket.userId) {
                return socket.emit('error', { message: 'Only the host can decline requests' });
            }

            const request = session.joinRequests.find(r => r.user.toString() === userId);
            if (request) request.status = 'declined';
            await session.save();

            const populated = await session.populate(['players.user', 'joinRequests.user']);

            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });

            // Notify declined user
            const allSockets = await io.fetchSockets();
            const targetSocket = allSockets.find(s => s.userId === userId);
            if (targetSocket) {
                targetSocket.emit('game:request-declined', { sessionId });
            }

            logger.debug(`Host declined ${userId} from game ${sessionId}`);
        } catch (error) {
            logger.error(`Game decline-join error: ${error.message}`);
        }
    });

    // Legacy: direct join (for backwards compat)
    socket.on('game:join', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('error', { message: 'Game not available' });
            }

            const alreadyJoined = session.players.some(p => p.user.toString() === socket.userId);
            if (!alreadyJoined) {
                session.players.push({ user: socket.userId, isReady: true });
            }

            const minPlayers = getMinPlayers(session.game);
            if (session.players.length >= minPlayers) {
                session.status = 'in_progress';
                session.startedAt = new Date();
                session.currentTurn = session.players[0].user;
            }

            await session.save();
            socket.join(`game:${sessionId}`);

            const populated = await session.populate('players.user', 'username avatar');

            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            if (session.channel) {
                io.to(`channel:${session.channel.toString()}`).emit('game:updated', { session: populated });
                await updateChallengeMessage(io, session, populated);
            }

            logger.debug(`${socket.username} joined game ${sessionId}`);
        } catch (error) {
            logger.error(`Game join error: ${error.message}`);
            socket.emit('error', { message: 'Failed to join game' });
        }
    });

    // Spectate a game
    socket.on('game:spectate', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session) {
                return socket.emit('error', { message: 'Game not found' });
            }

            // Check if already spectating
            const already = session.spectators.some(s => s.user.toString() === socket.userId);
            if (!already) {
                session.spectators.push({ user: socket.userId });
                await session.save();
            }

            socket.join(`game:${sessionId}`);

            const populated = await session.populate(['players.user', 'spectators.user']);

            // Notify game room about new spectator
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            socket.emit('game:spectating', { session: populated });

            logger.debug(`${socket.username} is spectating game ${sessionId}`);
        } catch (error) {
            logger.error(`Game spectate error: ${error.message}`);
        }
    });

    // Leave spectating
    socket.on('game:leave-spectate', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);
            if (!session) return;

            session.spectators = session.spectators.filter(s => s.user.toString() !== socket.userId);
            await session.save();
            socket.leave(`game:${sessionId}`);

            const populated = await session.populate(['players.user', 'spectators.user']);
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });

            logger.debug(`${socket.username} stopped spectating game ${sessionId}`);
        } catch (error) {
            logger.error(`Game leave-spectate error: ${error.message}`);
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
            if (session.game === 'tic-tac-toe' || session.game === 'connect4') {
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

                const winnerPlayer = session.players.find(p => p.user.toString() === result.winner.toString());
                if (winnerPlayer) winnerPlayer.score += 1;
            }

            if (result.draw) {
                session.status = 'finished';
                session.finishedAt = new Date();
            }

            await session.save();

            const populated = await session.populate(['players.user', 'spectators.user']);

            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            if (session.channel) {
                io.to(`channel:${session.channel.toString()}`).emit('game:updated', { session: populated });
                if (session.status === 'finished') {
                    await updateChallengeMessage(io, session, populated);
                }
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

            const newSession = await GameSession.create({
                game: oldSession.game,
                channel: oldSession.channel,
                server: oldSession.server,
                players: oldSession.players.map(p => ({
                    user: p.user,
                    score: p.score,
                    isReady: true,
                })),
                state: getInitialState(oldSession.game),
                status: 'in_progress',
                currentTurn: oldSession.players[0].user,
                startedAt: new Date(),
                round: oldSession.round + 1,
                maxRounds: oldSession.maxRounds,
                settings: oldSession.settings,
            });

            const oldRoomId = `game:${sessionId}`;
            const newRoomId = `game:${newSession._id}`;

            const socketsInRoom = await io.in(oldRoomId).fetchSockets();
            for (const s of socketsInRoom) {
                s.leave(oldRoomId);
                s.join(newRoomId);
            }

            const populated = await newSession.populate('players.user', 'username avatar');

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

    // Cancel a game (host only)
    socket.on('game:cancel', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);
            if (!session) return;

            if (session.players[0]?.user.toString() !== socket.userId) {
                return socket.emit('error', { message: 'Only the host can cancel' });
            }

            session.status = 'cancelled';
            await session.save();

            const populated = await session.populate('players.user', 'username avatar');
            io.to(`game:${sessionId}`).emit('game:cancelled', { session: populated });
            if (session.channel) {
                io.to(`channel:${session.channel.toString()}`).emit('game:updated', { session: populated });
                // Update or delete the challenge message in chat
                await updateChallengeMessage(io, session, populated);
            }

            logger.debug(`Game ${sessionId} cancelled by host`);
        } catch (error) {
            logger.error(`Game cancel error: ${error.message}`);
        }
    });

    // Get all active sessions for a server
    socket.on('game:get-server-sessions', async (data) => {
        try {
            const { serverId } = data;
            const sessions = await GameSession.find({
                server: serverId,
                status: { $in: ['waiting', 'in_progress'] },
            }).populate('players.user', 'username avatar')
              .populate('joinRequests.user', 'username avatar')
              .populate('spectators.user', 'username avatar')
              .sort({ createdAt: -1 });

            socket.emit('game:server-sessions', { sessions });
        } catch (error) {
            logger.error(`Get server sessions error: ${error.message}`);
        }
    });
};

// ── Helper: Update challenge message in chat ──
async function updateChallengeMessage(io, session, populated) {
    try {
        if (!session.chatMessageId) return;

        const playerNames = populated.players.map(p => p.user?.username || 'Player');
        let content, status;

        if (session.status === 'cancelled') {
            content = `🚫 **${formatGameName(session.game)}** game was cancelled`;
            status = 'cancelled';
        } else if (session.status === 'in_progress') {
            content = `🎮 **${playerNames.join(' vs ')}** — **${formatGameName(session.game)}** [In Progress]`;
            status = 'in_progress';
        } else if (session.status === 'finished') {
            const winnerPlayer = populated.players.find(p => p.user?._id?.toString() === session.winner?.toString());
            const winnerName = winnerPlayer?.user?.username || 'Unknown';
            content = `🏆 **${winnerName}** won! **${formatGameName(session.game)}** — ${playerNames.join(' vs ')} [Finished]`;
            status = 'finished';
        } else {
            return;
        }

        await Message.findByIdAndUpdate(session.chatMessageId, {
            content,
            'gameChallenge.status': status,
            'gameChallenge.players': playerNames,
            'gameChallenge.winner': session.winner?.toString(),
        });

        // Broadcast message update to channel
        const updatedMsg = await Message.findById(session.chatMessageId).populate('sender', 'username avatar');
        if (updatedMsg && session.channel) {
            io.to(`channel:${session.channel.toString()}`).emit('message:updated', updatedMsg);
        }
    } catch (error) {
        logger.error(`Update challenge message error: ${error.message}`);
    }
}

function formatGameName(game) {
    return game.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Helper functions ──
function getInitialState(game) {
    switch (game) {
        case 'tic-tac-toe':
            return { board: Array(9).fill(null), xIsNext: true };
        case 'rock-paper-scissors':
            return { choices: {}, round: 1 };
        case 'connect4':
            return { board: Array(6).fill(null).map(() => Array(7).fill(null)), isRedNext: true };
        case 'chess':
            return { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] };
        case 'checkers':
            return { board: getInitialCheckersBoard(), isRedNext: true };
        case 'battleship':
            return { boards: {}, shots: {}, phase: 'setup' };
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
        case 'ludo': return 2;
        case 'quiz': return 2;
        default: return 2;
    }
}

function processMove(session, userId, move) {
    switch (session.game) {
        case 'tic-tac-toe':
            return processTicTacToe(session, userId, move);
        case 'rock-paper-scissors':
            return processRPS(session, userId, move);
        case 'connect4':
            return processConnect4(session, userId, move);
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

    if (board.every(cell => cell !== null)) {
        return { state, draw: true };
    }

    const nextPlayerIndex = state.xIsNext ? 0 : 1;
    return { state, nextTurn: session.players[nextPlayerIndex]?.user };
}

function processRPS(session, userId, move) {
    const state = { ...session.state };
    state.choices[userId] = move.choice;

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

function processConnect4(session, userId, move) {
    const state = JSON.parse(JSON.stringify(session.state));
    const board = state.board;
    const col = move.column;
    const playerIndex = session.players.findIndex(p => p.user.toString() === userId);
    const color = playerIndex === 0 ? 'R' : 'Y';

    let row = -1;
    for (let r = 5; r >= 0; r--) {
        if (!board[r][col]) { row = r; break; }
    }
    if (row === -1) return { state };

    board[row][col] = color;
    state.board = board;
    state.isRedNext = !state.isRedNext;

    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            const nr = row + dr * i, nc = col + dc * i;
            if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === color) count++;
            else break;
        }
        for (let i = 1; i < 4; i++) {
            const nr = row - dr * i, nc = col - dc * i;
            if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === color) count++;
            else break;
        }
        if (count >= 4) return { state, winner: userId };
    }

    if (board[0].every(cell => cell !== null)) return { state, draw: true };

    const nextPlayerIndex = state.isRedNext ? 0 : 1;
    return { state, nextTurn: session.players[nextPlayerIndex]?.user };
}

function getInitialCheckersBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 === 1) board[r][c] = 'b';
        }
    }
    for (let r = 5; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if ((r + c) % 2 === 1) board[r][c] = 'r';
        }
    }
    return board;
}
