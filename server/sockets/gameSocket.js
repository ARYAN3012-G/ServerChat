const GameSession = require('../models/GameSession');
const Message = require('../models/Message');
const { Chess } = require('chess.js');
const { logger } = require('../config/logger');

// Trivia cache to avoid re-fetching
let triviaCache = [];

async function fetchTriviaQuestions() {
    try {
        const res = await fetch('https://opentdb.com/api.php?amount=10&type=multiple&encode=url3986');
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return data.results.map(q => ({
                question: decodeURIComponent(q.question),
                correct: decodeURIComponent(q.correct_answer),
                options: shuffleArray([
                    decodeURIComponent(q.correct_answer),
                    ...q.incorrect_answers.map(a => decodeURIComponent(a))
                ]),
                category: decodeURIComponent(q.category),
                difficulty: q.difficulty,
            }));
        }
    } catch (e) {
        logger.error(`Trivia fetch error: ${e.message}`);
    }
    // Fallback questions
    return [
        { question: 'What is the capital of France?', correct: 'Paris', options: ['Paris', 'London', 'Berlin', 'Madrid'], category: 'Geography', difficulty: 'easy' },
        { question: 'What planet is known as the Red Planet?', correct: 'Mars', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], category: 'Science', difficulty: 'easy' },
        { question: 'Who painted the Mona Lisa?', correct: 'Leonardo da Vinci', options: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Donatello'], category: 'Art', difficulty: 'easy' },
        { question: 'What is the largest ocean on Earth?', correct: 'Pacific Ocean', options: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'], category: 'Geography', difficulty: 'easy' },
        { question: 'What year did World War II end?', correct: '1945', options: ['1945', '1944', '1946', '1943'], category: 'History', difficulty: 'medium' },
    ];
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Wordle word list (common 5-letter words)
const WORDLE_WORDS = [
    'apple', 'brave', 'crane', 'drown', 'eagle', 'flame', 'grape', 'house', 'ivory', 'jolly',
    'kneel', 'lemon', 'mango', 'nerve', 'ocean', 'plant', 'queen', 'round', 'stone', 'trail',
    'ultra', 'vivid', 'wheat', 'xenon', 'youth', 'zebra', 'angel', 'beach', 'chair', 'dance',
    'earth', 'frost', 'globe', 'heart', 'index', 'judge', 'knife', 'light', 'music', 'night',
    'olive', 'piano', 'quest', 'river', 'solar', 'tiger', 'unity', 'voice', 'world', 'zonal',
    'amber', 'blade', 'cloud', 'dream', 'event', 'flora', 'ghost', 'happy', 'input', 'jewel',
    'karma', 'lunar', 'metal', 'noble', 'opera', 'pearl', 'quiet', 'reign', 'smart', 'think',
];

module.exports = (io, socket) => {
    // Join server room for scoped game broadcasts
    socket.on('game:join-server', ({ serverId }) => {
        if (serverId) socket.join(`server-games:${serverId}`);
    });

    socket.on('game:leave-server', ({ serverId }) => {
        if (serverId) socket.leave(`server-games:${serverId}`);
    });

    // Rejoin a game socket room
    socket.on('game:join-room', async ({ sessionId }) => {
        try {
            const session = await GameSession.findById(sessionId);
            if (!session) return;
            const isPlayer = session.players.some(p => p.user.toString() === socket.userId);
            const isSpectator = session.spectators?.some(s => s.user.toString() === socket.userId);
            if (isPlayer || isSpectator) {
                socket.join(`game:${sessionId}`);
                // Send current state to the reconnecting user
                const populated = await session.populate(['players.user', 'spectators.user']);
                socket.emit('game:updated', { session: populated });
                logger.debug(`${socket.username} rejoined game room ${sessionId}`);
            }
        } catch (e) { logger.error(`game:join-room error: ${e.message}`); }
    });

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

            // For quiz, pre-fetch questions
            let initialState = getInitialState(game);
            if (game === 'quiz') {
                const questions = await fetchTriviaQuestions();
                initialState = { questions, currentQuestion: 0, answers: {}, scores: {}, totalQuestions: questions.length };
            }
            if (game === 'wordle') {
                const word = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
                initialState = { word, guesses: {}, maxAttempts: 6, finished: {} };
            }

            const session = await GameSession.create({
                game,
                channel: channelId,
                server: serverId,
                players: [{ user: socket.userId, isReady: true }],
                settings,
                state: initialState,
            });

            socket.join(`game:${session._id}`);

            const populated = await session.populate('players.user', 'username avatar');

            // Broadcast to server room only (not globally)
            if (serverId) {
                io.to(`server-games:${serverId}`).emit('game:created', { session: populated });
            }

            socket.emit('game:session-created', { session: populated });
            logger.debug(`${socket.username} created game ${game} in server ${serverId}`);
        } catch (error) {
            logger.error(`Game create error: ${error.message}`);
            socket.emit('game:error', { message: 'Failed to create game' });
        }
    });

    // Request to join a game
    socket.on('game:request-join', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('game:error', { message: 'Game not available' });
            }

            const alreadyPlayer = session.players.some(p => p.user.toString() === socket.userId);
            if (alreadyPlayer) return socket.emit('game:error', { message: 'You are already in this game' });

            const existingRequest = session.joinRequests.find(r => r.user.toString() === socket.userId);
            if (existingRequest) {
                if (existingRequest.status === 'pending') return socket.emit('game:error', { message: 'Join request already pending' });
                if (existingRequest.status === 'declined') return socket.emit('game:error', { message: 'Your request was declined' });
            }

            session.joinRequests.push({ user: socket.userId, status: 'pending' });
            await session.save();

            const populated = await session.populate(['players.user', 'joinRequests.user']);

            // Notify game room
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });

            // Also notify host directly
            const hostUserId = session.players[0]?.user.toString();
            io.to(`user:${hostUserId}`).emit('game:updated', { session: populated });

            socket.emit('game:request-sent', { sessionId });
            logger.debug(`${socket.username} requested to join game ${sessionId}`);
        } catch (error) {
            logger.error(`Game request-join error: ${error.message}`);
            socket.emit('game:error', { message: 'Failed to request join' });
        }
    });

    // Host accepts a join request
    socket.on('game:accept-join', async (data) => {
        try {
            const { sessionId, userId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('game:error', { message: 'Game not available' });
            }

            if (session.players[0]?.user.toString() !== socket.userId) {
                return socket.emit('game:error', { message: 'Only the host can accept requests' });
            }

            const request = session.joinRequests.find(r => r.user.toString() === userId);
            if (!request || request.status !== 'pending') {
                return socket.emit('game:error', { message: 'No pending request from this user' });
            }
            request.status = 'accepted';

            session.players.push({ user: userId, isReady: true });

            const minPlayers = getMinPlayers(session.game);
            if (session.players.length >= minPlayers) {
                session.status = 'in_progress';
                session.startedAt = new Date();
                session.currentTurn = session.players[0].user;

                session.joinRequests.forEach(r => {
                    if (r.status === 'pending') r.status = 'declined';
                });
            }

            await session.save();

            const populated = await session.populate(['players.user', 'joinRequests.user', 'spectators.user']);

            // Make accepted player join socket room
            const allSockets = await io.fetchSockets();
            const targetSocket = allSockets.find(s => s.userId === userId);
            if (targetSocket) targetSocket.join(`game:${sessionId}`);

            // Single broadcast to game room
            io.to(`game:${sessionId}`).emit('game:player-accepted', { userId, session: populated });

            // Also notify the accepted player directly (in case they aren't in the room yet)
            io.to(`user:${userId}`).emit('game:player-accepted', { userId, session: populated });

            // Update server lobby
            if (session.server) {
                io.to(`server-games:${session.server.toString()}`).emit('game:updated', { session: populated });
            }

            logger.debug(`Host accepted ${userId} to game ${sessionId}`);
        } catch (error) {
            logger.error(`Game accept-join error: ${error.message}`);
            socket.emit('game:error', { message: 'Failed to accept join request' });
        }
    });

    // Host declines a join request
    socket.on('game:decline-join', async (data) => {
        try {
            const { sessionId, userId } = data;
            const session = await GameSession.findById(sessionId);
            if (!session) return;

            if (session.players[0]?.user.toString() !== socket.userId) {
                return socket.emit('game:error', { message: 'Only the host can decline requests' });
            }

            const request = session.joinRequests.find(r => r.user.toString() === userId);
            if (request) request.status = 'declined';
            await session.save();

            const populated = await session.populate(['players.user', 'joinRequests.user']);
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            io.to(`user:${userId}`).emit('game:request-declined', { sessionId });

            logger.debug(`Host declined ${userId} from game ${sessionId}`);
        } catch (error) {
            logger.error(`Game decline-join error: ${error.message}`);
        }
    });

    // Legacy: direct join
    socket.on('game:join', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session || session.status !== 'waiting') {
                return socket.emit('game:error', { message: 'Game not available' });
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

            if (session.server) {
                io.to(`server-games:${session.server.toString()}`).emit('game:updated', { session: populated });
            }

            logger.debug(`${socket.username} joined game ${sessionId}`);
        } catch (error) {
            logger.error(`Game join error: ${error.message}`);
            socket.emit('game:error', { message: 'Failed to join game' });
        }
    });

    // Spectate a game
    socket.on('game:spectate', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);

            if (!session) return socket.emit('game:error', { message: 'Game not found' });

            const already = session.spectators.some(s => s.user.toString() === socket.userId);
            if (!already) {
                session.spectators.push({ user: socket.userId });
                await session.save();
            }

            socket.join(`game:${sessionId}`);

            const populated = await session.populate(['players.user', 'spectators.user']);

            // Send full state to spectator (hide wordle word)
            const safeSession = sanitizeForSpectator(populated);
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });
            socket.emit('game:spectating', { session: safeSession });

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
                return socket.emit('game:error', { message: 'Game not in progress' });
            }

            // Verify turn for turn-based games
            const turnBasedGames = ['tic-tac-toe', 'connect4', 'chess', 'checkers'];
            if (turnBasedGames.includes(session.game)) {
                if (session.currentTurn?.toString() !== socket.userId) {
                    return socket.emit('game:error', { message: 'Not your turn' });
                }
            }

            const result = processMove(session, socket.userId, move);

            if (result.error) {
                return socket.emit('game:error', { message: result.error });
            }

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

            // Single broadcast to game room (players + spectators are all in this room)
            io.to(`game:${sessionId}`).emit('game:updated', { session: populated });

            // Update server lobby if game finished
            if (session.status === 'finished' && session.server) {
                io.to(`server-games:${session.server.toString()}`).emit('game:updated', { session: populated });
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

            let initialState = getInitialState(oldSession.game);
            if (oldSession.game === 'quiz') {
                const questions = await fetchTriviaQuestions();
                initialState = { questions, currentQuestion: 0, answers: {}, scores: {}, totalQuestions: questions.length };
            }
            if (oldSession.game === 'wordle') {
                const word = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
                initialState = { word, guesses: {}, maxAttempts: 6, finished: {} };
            }

            const newSession = await GameSession.create({
                game: oldSession.game,
                channel: oldSession.channel,
                server: oldSession.server,
                players: oldSession.players.map(p => ({
                    user: p.user,
                    score: p.score,
                    isReady: true,
                })),
                state: initialState,
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

            if (oldSession.server) {
                io.to(`server-games:${oldSession.server.toString()}`).emit('game:updated', { session: populated });
            }

            logger.debug(`Game rematch created from ${sessionId} -> ${newSession._id}`);
        } catch (error) {
            logger.error(`Game rematch error: ${error.message}`);
        }
    });

    // Cancel a game
    socket.on('game:cancel', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);
            if (!session) return;

            const isPlayer = session.players.some(p => p.user.toString() === socket.userId);
            if (!isPlayer) return socket.emit('game:error', { message: 'You are not in this game' });

            if (session.status === 'in_progress') {
                return socket.emit('game:error', { message: 'Use forfeit for in-progress games' });
            }

            session.status = 'cancelled';
            await session.save();

            const populated = await session.populate('players.user', 'username avatar');
            io.to(`game:${sessionId}`).emit('game:cancelled', { session: populated });

            // Remove from server lobby
            if (session.server) {
                io.to(`server-games:${session.server.toString()}`).emit('game:cancelled', { session: populated });
            }

            logger.debug(`Game ${sessionId} cancelled by ${socket.username}`);
        } catch (error) {
            logger.error(`Game cancel error: ${error.message}`);
        }
    });

    // Forfeit
    socket.on('game:forfeit', async (data) => {
        try {
            const { sessionId } = data;
            const session = await GameSession.findById(sessionId);
            if (!session) return;

            const isPlayer = session.players.some(p => p.user.toString() === socket.userId);
            if (!isPlayer) return socket.emit('game:error', { message: 'You are not in this game' });

            if (session.status === 'waiting') {
                session.status = 'cancelled';
                await session.save();
                const populated = await session.populate('players.user', 'username avatar');
                io.to(`game:${sessionId}`).emit('game:cancelled', { session: populated });
                if (session.server) {
                    io.to(`server-games:${session.server.toString()}`).emit('game:cancelled', { session: populated });
                }
                return;
            }

            if (session.status !== 'in_progress') return;

            const opponent = session.players.find(p => p.user.toString() !== socket.userId);
            session.status = 'finished';
            session.winner = opponent ? opponent.user : null;
            session.finishedAt = new Date();
            if (opponent) opponent.score = (opponent.score || 0) + 1;

            await session.save();

            const populated = await session.populate(['players.user', 'spectators.user']);

            io.to(`game:${sessionId}`).emit('game:forfeited', {
                session: populated,
                forfeitedBy: socket.userId,
            });

            if (session.server) {
                io.to(`server-games:${session.server.toString()}`).emit('game:updated', { session: populated });
            }

            logger.debug(`${socket.username} forfeited game ${sessionId}`);
        } catch (error) {
            logger.error(`Game forfeit error: ${error.message}`);
        }
    });

    // Get server sessions via socket
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

// ── Sanitize session for spectators (hide secret info) ──
function sanitizeForSpectator(session) {
    const s = session.toObject ? session.toObject() : { ...session };
    // Hide wordle word from spectators
    if (s.game === 'wordle' && s.state?.word) {
        s.state = { ...s.state, word: '?????'  };
    }
    // Hide quiz correct answers from spectators
    if (s.game === 'quiz' && s.state?.questions) {
        s.state = {
            ...s.state,
            questions: s.state.questions.map(q => ({ ...q, correct: undefined })),
        };
    }
    return s;
}

// ── Initial state for each game ──
function getInitialState(game) {
    switch (game) {
        case 'tic-tac-toe':
            return { board: Array(9).fill(null), xIsNext: true };
        case 'rock-paper-scissors':
            return { choices: {}, round: 1 };
        case 'connect4':
            return { board: Array(6).fill(null).map(() => Array(7).fill(null)), isRedNext: true };
        case 'chess':
            return { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [], captured: { w: [], b: [] } };
        case 'checkers':
            return { board: getInitialCheckersBoard(), isRedNext: true, captured: { r: 0, b: 0 } };
        case 'battleship':
            return { boards: {}, shots: {}, phase: 'setup', shipsPlaced: {} };
        case 'quiz':
            return { questions: [], currentQuestion: 0, answers: {}, scores: {}, totalQuestions: 5 };
        case 'wordle':
            return { word: '', guesses: {}, maxAttempts: 6, finished: {} };
        default:
            return {};
    }
}

function getMinPlayers(game) {
    return 2;
}

// ── Move processing ──
function processMove(session, userId, move) {
    switch (session.game) {
        case 'tic-tac-toe': return processTicTacToe(session, userId, move);
        case 'rock-paper-scissors': return processRPS(session, userId, move);
        case 'connect4': return processConnect4(session, userId, move);
        case 'chess': return processChess(session, userId, move);
        case 'checkers': return processCheckers(session, userId, move);
        case 'quiz': return processQuiz(session, userId, move);
        case 'wordle': return processWordle(session, userId, move);
        default: return { state: session.state };
    }
}

// ── Tic-Tac-Toe ──
function processTicTacToe(session, userId, move) {
    const state = { ...session.state };
    const board = [...state.board];
    const playerIndex = session.players.findIndex(p => p.user.toString() === userId);
    const symbol = playerIndex === 0 ? 'X' : 'O';

    if (board[move.position] !== null) return { state };

    board[move.position] = symbol;
    state.board = board;
    state.xIsNext = !state.xIsNext;

    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { state, winner: userId };
        }
    }

    if (board.every(cell => cell !== null)) return { state, draw: true };

    const nextPlayerIndex = state.xIsNext ? 0 : 1;
    return { state, nextTurn: session.players[nextPlayerIndex]?.user };
}

// ── Rock Paper Scissors ──
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

// ── Connect 4 ──
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

// ── Chess (using chess.js) ──
function processChess(session, userId, move) {
    const state = JSON.parse(JSON.stringify(session.state));
    const chess = new Chess(state.fen);
    const playerIndex = session.players.findIndex(p => p.user.toString() === userId);
    const playerColor = playerIndex === 0 ? 'w' : 'b';

    // Verify it's the correct player's turn
    if (chess.turn() !== playerColor) {
        return { error: 'Not your turn', state };
    }

    // Try the move
    const result = chess.move(move); // move = { from: 'e2', to: 'e4', promotion: 'q' }
    if (!result) {
        return { error: 'Invalid move', state };
    }

    // Track captured pieces
    if (result.captured) {
        if (!state.captured) state.captured = { w: [], b: [] };
        // The capturing player's color captures the opponent's piece
        state.captured[playerColor].push(result.captured);
    }

    state.fen = chess.fen();
    state.moves = [...(state.moves || []), { from: move.from, to: move.to, san: result.san, color: playerColor }];
    state.lastMove = { from: move.from, to: move.to };

    // Check game over conditions
    if (chess.isCheckmate()) {
        state.status = 'checkmate';
        return { state, winner: userId };
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
        state.status = 'draw';
        return { state, draw: true };
    }
    if (chess.isCheck()) {
        state.inCheck = true;
    } else {
        state.inCheck = false;
    }

    const nextPlayerIndex = chess.turn() === 'w' ? 0 : 1;
    return { state, nextTurn: session.players[nextPlayerIndex]?.user };
}

// ── Checkers ──
function processCheckers(session, userId, move) {
    const state = JSON.parse(JSON.stringify(session.state));
    const board = state.board;
    const playerIndex = session.players.findIndex(p => p.user.toString() === userId);
    const myColor = playerIndex === 0 ? 'r' : 'b';
    const { fromRow, fromCol, toRow, toCol } = move;

    // Basic validation
    const piece = board[fromRow]?.[fromCol];
    if (!piece || !piece.startsWith(myColor)) return { error: 'Invalid piece', state };
    if (board[toRow]?.[toCol] !== null) return { error: 'Target occupied', state };

    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    const isKing = piece.includes('K');

    // Normal move (1 diagonal)
    if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {
        // Regular pieces can only move forward
        if (!isKing) {
            if (myColor === 'r' && dr > 0) return { error: 'Red moves up only', state };
            if (myColor === 'b' && dr < 0) return { error: 'Black moves down only', state };
        }
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
    }
    // Jump (2 diagonal = capture)
    else if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
        const midRow = fromRow + dr / 2;
        const midCol = fromCol + dc / 2;
        const midPiece = board[midRow]?.[midCol];
        if (!midPiece || midPiece.startsWith(myColor)) return { error: 'Invalid jump', state };

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = null;
        board[midRow][midCol] = null;

        if (!state.captured) state.captured = { r: 0, b: 0 };
        state.captured[myColor] = (state.captured[myColor] || 0) + 1;
    } else {
        return { error: 'Invalid move distance', state };
    }

    // King promotion
    if (myColor === 'r' && toRow === 0) board[toRow][toCol] = 'rK';
    if (myColor === 'b' && toRow === 7) board[toRow][toCol] = 'bK';

    state.board = board;
    state.isRedNext = !state.isRedNext;

    // Check win (opponent has no pieces)
    const opponentColor = myColor === 'r' ? 'b' : 'r';
    const opponentPieces = board.flat().filter(c => c && c.startsWith(opponentColor));
    if (opponentPieces.length === 0) {
        return { state, winner: userId };
    }

    const nextPlayerIndex = state.isRedNext ? 0 : 1;
    return { state, nextTurn: session.players[nextPlayerIndex]?.user };
}

// ── Trivia Quiz ──
function processQuiz(session, userId, move) {
    const state = JSON.parse(JSON.stringify(session.state));
    const { answer } = move; // answer = selected option string
    const currentQ = state.questions[state.currentQuestion];

    if (!currentQ) return { state, draw: true };

    // Record answer
    if (!state.answers[state.currentQuestion]) state.answers[state.currentQuestion] = {};
    if (state.answers[state.currentQuestion][userId]) return { state }; // already answered

    const isCorrect = answer === currentQ.correct;
    state.answers[state.currentQuestion][userId] = { answer, isCorrect };

    // Update score
    if (!state.scores[userId]) state.scores[userId] = 0;
    if (isCorrect) {
        const points = currentQ.difficulty === 'hard' ? 3 : currentQ.difficulty === 'medium' ? 2 : 1;
        state.scores[userId] += points;
    }

    // Check if all players answered this question
    const allAnswered = session.players.every(p =>
        state.answers[state.currentQuestion]?.[p.user.toString()]
    );

    if (allAnswered) {
        state.currentQuestion += 1;

        // Game over if all questions answered
        if (state.currentQuestion >= state.questions.length) {
            const players = session.players.map(p => p.user.toString());
            const [p1, p2] = players;
            const s1 = state.scores[p1] || 0;
            const s2 = state.scores[p2] || 0;

            if (s1 === s2) return { state, draw: true };
            return { state, winner: s1 > s2 ? p1 : p2 };
        }
    }

    // Quiz is not turn-based, both answer simultaneously
    return { state };
}

// ── Wordle ──
function processWordle(session, userId, move) {
    const state = JSON.parse(JSON.stringify(session.state));
    const { guess } = move; // guess = 5-letter word string

    if (!guess || guess.length !== 5) return { error: 'Guess must be 5 letters', state };
    if (state.finished?.[userId]) return { state }; // already finished

    const word = state.word.toLowerCase();
    const guessLower = guess.toLowerCase();

    if (!state.guesses[userId]) state.guesses[userId] = [];

    // Evaluate guess: green (correct), yellow (wrong position), gray (not in word)
    const result = [];
    const wordArr = word.split('');
    const guessArr = guessLower.split('');
    const used = Array(5).fill(false);

    // First pass: greens
    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === wordArr[i]) {
            result[i] = { letter: guessArr[i], status: 'green' };
            used[i] = true;
        }
    }
    // Second pass: yellows and grays
    for (let i = 0; i < 5; i++) {
        if (result[i]) continue;
        const idx = wordArr.findIndex((c, j) => c === guessArr[i] && !used[j] && !result[j]);
        if (idx >= 0) {
            result[i] = { letter: guessArr[i], status: 'yellow' };
            used[idx] = true;
        } else {
            result[i] = { letter: guessArr[i], status: 'gray' };
        }
    }

    state.guesses[userId].push({ word: guessLower, result });

    // Check if user guessed correctly
    if (guessLower === word) {
        state.finished[userId] = { won: true, attempts: state.guesses[userId].length };
    } else if (state.guesses[userId].length >= state.maxAttempts) {
        state.finished[userId] = { won: false, attempts: state.guesses[userId].length };
    }

    // Check if all players finished
    const allFinished = session.players.every(p => state.finished?.[p.user.toString()]);
    if (allFinished) {
        const players = session.players.map(p => p.user.toString());
        const [p1, p2] = players;
        const f1 = state.finished[p1];
        const f2 = state.finished[p2];

        // Winner: whoever guessed correctly in fewer attempts
        if (f1.won && !f2.won) return { state, winner: p1 };
        if (f2.won && !f1.won) return { state, winner: p2 };
        if (f1.won && f2.won) {
            if (f1.attempts < f2.attempts) return { state, winner: p1 };
            if (f2.attempts < f1.attempts) return { state, winner: p2 };
            return { state, draw: true };
        }
        return { state, draw: true };
    }

    // Wordle is not turn-based
    return { state };
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
