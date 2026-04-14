'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiEye, FiCheck, FiX, FiClock, FiPlay, FiRefreshCw, FiPlus, FiGrid, FiActivity, FiAward, FiDelete } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import { useAuth } from '../../../hooks/useAuth';
import { getSocket } from '../../../services/socket';
import api from '../../../services/api';
import { setGameSession, setServerSessions, updateServerSession, removeServerSession, setSpectatingSessionId, clearGame } from '../../../redux/gameSlice';
import toast from 'react-hot-toast';

const MULTIPLAYER_GAMES = [
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', emoji: '❌⭕', players: '2', desc: 'Classic X vs O battle', color: 'from-indigo-500/20 to-purple-500/20', border: 'border-indigo-500/20' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', emoji: '✊✋', players: '2', desc: 'Quick reflex showdown', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20' },
    { id: 'connect4', name: 'Connect 4', emoji: '🔴🟡', players: '2', desc: 'Drop & connect strategy', color: 'from-red-500/20 to-yellow-500/20', border: 'border-red-500/20' },
    { id: 'chess', name: 'Chess', emoji: '♟️👑', players: '2', desc: 'The ultimate strategy game', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/20' },
    { id: 'checkers', name: 'Checkers', emoji: '🏁⚫', players: '2', desc: 'Jump & capture classic', color: 'from-stone-500/20 to-zinc-500/20', border: 'border-stone-500/20' },
    { id: 'quiz', name: 'Trivia Quiz', emoji: '🧠❓', players: '2', desc: 'Test your knowledge', color: 'from-violet-500/20 to-fuchsia-500/20', border: 'border-violet-500/20' },
    { id: 'wordle', name: 'Wordle Battle', emoji: '📝🔤', players: '2', desc: 'Guess the word first!', color: 'from-green-500/20 to-lime-500/20', border: 'border-green-500/20' },
];

const TABS = [
    { id: 'games', label: 'Games', icon: FiGrid, mobileLabel: 'Games' },
    { id: 'live', label: 'Live Sessions', icon: FiActivity, mobileLabel: 'Live' },
    { id: 'history', label: 'History', icon: FiAward, mobileLabel: 'History' },
];

export default function ServerGamesPage({ params }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading } = useAuth();
    const { serverSessions, session: activeSession, spectatingSessionId } = useSelector(s => s.game);
    const { currentServer } = useSelector(s => s.server);

    const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'games');
    const [creatingGame, setCreatingGame] = useState(null);
    const serverId = params?.serverId || currentServer?._id;

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);

    // Join server game room for scoped broadcasts
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !serverId) return;
        socket.emit('game:join-server', { serverId });
        return () => { socket.emit('game:leave-server', { serverId }); };
    }, [serverId]);

    const fetchSessions = useCallback(async () => {
        if (!serverId) return;
        try {
            const { data } = await api.get(`/games/server/${serverId}`);
            dispatch(setServerSessions(data.sessions || []));
        } catch (e) { console.error('Failed to fetch sessions', e); }
    }, [serverId, dispatch]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);
    useEffect(() => {
        const interval = setInterval(fetchSessions, 15000);
        return () => clearInterval(interval);
    }, [fetchSessions]);

    // Socket events
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleUpdated = ({ session }) => { dispatch(updateServerSession(session)); };
        const handleCreated = ({ session }) => { dispatch(updateServerSession(session)); };
        const handleSessionCreated = ({ session }) => {
            dispatch(setGameSession(session));
            dispatch(updateServerSession(session));
            setCreatingGame(null);
            setActiveTab('live');
            toast.success('Game created! Waiting for challengers…');
        };
        const handleGameError = ({ message }) => {
            setCreatingGame(null);
            toast.error(message || 'Failed to create game');
        };
        const handleRequestSent = () => toast.success('Join request sent! Waiting for host…');
        const handleRequestDeclined = () => toast.error('Your join request was declined');
        const handlePlayerAccepted = ({ session }) => {
            dispatch(setGameSession(session));
            dispatch(updateServerSession(session));
            if (session.status === 'in_progress') toast.success('Game started!');
        };
        const handleRematch = ({ session }) => { dispatch(setGameSession(session)); dispatch(updateServerSession(session)); };
        const handleCancelled = ({ session }) => {
            dispatch(removeServerSession(session?._id || session));
            dispatch(clearGame());
            toast('Game was cancelled', { icon: '🚫' });
        };
        const handleForfeited = ({ session, forfeitedBy }) => {
            dispatch(clearGame());
            if (session) dispatch(updateServerSession(session));
            toast(forfeitedBy === user?._id ? 'You forfeited the game' : 'Opponent forfeited — you win!', { icon: forfeitedBy === user?._id ? '🏳️' : '🏆' });
        };
        const handleSpectating = ({ session }) => {
            dispatch(setGameSession(session));
            dispatch(setSpectatingSessionId(session._id));
            toast.success('Now spectating!');
        };

        socket.on('game:updated', handleUpdated);
        socket.on('game:created', handleCreated);
        socket.on('game:session-created', handleSessionCreated);
        socket.on('game:error', handleGameError);
        socket.on('game:request-sent', handleRequestSent);
        socket.on('game:request-declined', handleRequestDeclined);
        socket.on('game:player-accepted', handlePlayerAccepted);
        socket.on('game:rematch', handleRematch);
        socket.on('game:cancelled', handleCancelled);
        socket.on('game:forfeited', handleForfeited);
        socket.on('game:spectating', handleSpectating);

        return () => {
            socket.off('game:updated', handleUpdated);
            socket.off('game:created', handleCreated);
            socket.off('game:session-created', handleSessionCreated);
            socket.off('game:error', handleGameError);
            socket.off('game:request-sent', handleRequestSent);
            socket.off('game:request-declined', handleRequestDeclined);
            socket.off('game:player-accepted', handlePlayerAccepted);
            socket.off('game:rematch', handleRematch);
            socket.off('game:cancelled', handleCancelled);
            socket.off('game:forfeited', handleForfeited);
            socket.off('game:spectating', handleSpectating);
        };
    }, [dispatch, user?._id]);

    const createGame = (gameId) => {
        const socket = getSocket();
        if (!socket || !serverId) return;
        if (myActiveSession) { toast.error('You already have an active game.'); return; }
        setCreatingGame(gameId);
        socket.emit('game:create', { game: gameId, serverId, channelId: currentServer?.channels?.[0] });
    };

    const requestJoin = (sessionId) => { getSocket()?.emit('game:request-join', { sessionId }); };
    const acceptJoin = (sessionId, userId) => { getSocket()?.emit('game:accept-join', { sessionId, userId }); };
    const declineJoin = (sessionId, userId) => { getSocket()?.emit('game:decline-join', { sessionId, userId }); };
    const spectateGame = (sessionId) => { getSocket()?.emit('game:spectate', { sessionId }); };
    const leaveSpectate = (sessionId) => {
        getSocket()?.emit('game:leave-spectate', { sessionId });
        dispatch(setSpectatingSessionId(null)); dispatch(setGameSession(null));
    };
    const requestRematch = (sessionId) => { getSocket()?.emit('game:rematch', { sessionId }); };
    const cancelGame = (sessionId) => { getSocket()?.emit('game:cancel', { sessionId }); };
    const forfeitGame = (sessionId) => {
        if (confirm('Are you sure you want to forfeit?')) {
            getSocket()?.emit('game:forfeit', { sessionId });
        }
    };

    const waitingSessions = serverSessions.filter(s => s.status === 'waiting');
    const activeSessions = serverSessions.filter(s => s.status === 'in_progress');
    const finishedSessions = serverSessions.filter(s => s.status === 'finished');
    const liveSessions = [...waitingSessions, ...activeSessions];
    const liveCount = liveSessions.length;

    const myActiveSession = serverSessions.find(s =>
        ['waiting', 'in_progress'].includes(s.status) &&
        s.players?.some(p => (p.user?._id || p.user)?.toString() === user?._id?.toString())
    );

    const getUserId = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (val._id) return val._id.toString();
        return val.toString();
    };

    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeSession?._id) return;
        socket.emit('game:join-room', { sessionId: activeSession._id });
    }, [activeSession?._id]);

    const isInGame = activeSession &&
        activeSession.players?.some(p => getUserId(p.user) === user?._id?.toString()) &&
        !spectatingSessionId;

    const makeMove = (move) => {
        const socket = getSocket();
        if (!socket || !activeSession) return;
        socket.emit('game:move', { sessionId: activeSession._id, move });
    };

    // ── GAME PLAY OVERLAY ──
    if (isInGame) {
        const session = activeSession;
        const gameName = session.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const gameEmoji = MULTIPLAYER_GAMES.find(g => g.id === session.game)?.emoji?.slice(0, 2) || '🎮';
        const myIndex = session.players?.findIndex(p => getUserId(p.user) === user?._id?.toString());
        const isMyTurn = getUserId(session.currentTurn) === user?._id?.toString();
        const isFinished = session.status === 'finished';
        const isWaiting = session.status === 'waiting';
        const iWon = getUserId(session.winner) === user?._id?.toString();
        const isDraw = isFinished && !session.winner;
        // Non turn-based games
        const isSimultaneous = ['rock-paper-scissors', 'quiz', 'wordle'].includes(session.game);

        return (
            <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden flex-col">
                {/* Game Header */}
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                    <button onClick={() => dispatch(clearGame())} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xl">{gameEmoji}</span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm sm:text-lg font-bold truncate">{gameName}</h1>
                        <p className="text-[10px] sm:text-xs text-white/30 truncate">
                            {isWaiting ? 'Waiting for opponent…' :
                             isFinished ? (iWon ? '🎉 You won!' : isDraw ? '🤝 Draw!' : '😔 You lost') :
                             isSimultaneous ? 'Game in progress' :
                             isMyTurn ? "Your turn" : "Opponent's turn"}
                        </p>
                    </div>
                    {!isFinished && (
                        <button onClick={() => session.status === 'in_progress' ? forfeitGame(session._id) : cancelGame(session._id)}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-red-500/20 transition-colors">
                            {session.status === 'in_progress' ? '🏳️ Forfeit' : '✕ Cancel'}
                        </button>
                    )}
                    {isFinished && (
                        <div className="flex gap-2">
                            <button onClick={() => requestRematch(session._id)}
                                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">
                                <FiRefreshCw className="w-3 h-3 inline mr-1" /> Rematch
                            </button>
                            <button onClick={() => dispatch(clearGame())}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-white/10">
                                Back
                            </button>
                        </div>
                    )}
                </div>

                {/* Players bar */}
                <div className="flex items-center justify-center gap-4 sm:gap-8 px-4 py-3 bg-[#0e1020] border-b border-white/5 flex-shrink-0">
                    {session.players?.map((p, i) => {
                        const isMe = getUserId(p.user) === user?._id?.toString();
                        const isTurn = getUserId(session.currentTurn) === getUserId(p.user);
                        return (
                            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                                isTurn && !isFinished && !isSimultaneous
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                    : 'bg-white/5 text-white/40'
                            }`}>
                                <span className="font-bold">{i === 0 ? '🔵' : '🔴'}</span>
                                <span className="font-medium truncate max-w-[80px]">{isMe ? 'You' : (p.user?.username || 'Player')}</span>
                                {/* Show quiz scores */}
                                {session.game === 'quiz' && session.state?.scores && (
                                    <span className="text-amber-400 font-bold">{session.state.scores[getUserId(p.user)] || 0}pts</span>
                                )}
                                {isTurn && !isFinished && !isSimultaneous && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />}
                            </div>
                        );
                    })}
                </div>

                {/* Game board */}
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                    {isWaiting ? (
                        <WaitingScreen session={session} acceptJoin={acceptJoin} declineJoin={declineJoin} />
                    ) : (
                        <div className="w-full max-w-lg mx-auto">
                            {isFinished && <ResultBanner iWon={iWon} isDraw={isDraw} />}

                            {session.game === 'tic-tac-toe' && <TicTacToeBoard session={session} myIndex={myIndex} isMyTurn={isMyTurn} isFinished={isFinished} makeMove={makeMove} />}
                            {session.game === 'rock-paper-scissors' && <RPSBoard session={session} userId={user?._id} isFinished={isFinished} makeMove={makeMove} />}
                            {session.game === 'connect4' && <Connect4Board session={session} myIndex={myIndex} isMyTurn={isMyTurn} isFinished={isFinished} makeMove={makeMove} />}
                            {session.game === 'chess' && <ChessBoard session={session} myIndex={myIndex} isMyTurn={isMyTurn} isFinished={isFinished} makeMove={makeMove} userId={user?._id} />}
                            {session.game === 'checkers' && <CheckersBoard session={session} myIndex={myIndex} isMyTurn={isMyTurn} isFinished={isFinished} makeMove={makeMove} />}
                            {session.game === 'quiz' && <QuizBoard session={session} userId={user?._id} isFinished={isFinished} makeMove={makeMove} />}
                            {session.game === 'wordle' && <WordleBoard session={session} userId={user?._id} isFinished={isFinished} makeMove={makeMove} />}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── LOBBY VIEW ──
    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden flex-col">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                <button onClick={() => router.push('/channels')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <IoGameControllerOutline className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-sm sm:text-lg font-bold truncate">Server Games</h1>
                    <p className="text-[10px] sm:text-xs text-white/30 truncate">{currentServer?.name || 'Multiplayer'} — {liveCount} live</p>
                </div>
            </div>

            <div className="flex border-b border-white/5 bg-[#0e1020] flex-shrink-0 px-2 sm:px-4">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors ${
                            activeTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/60'}`}>
                        <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="sm:hidden">{tab.mobileLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.id === 'live' && liveCount > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 min-w-[18px] text-center">{liveCount}</span>
                        )}
                        {activeTab === tab.id && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />}
                    </button>
                ))}
            </div>

            {myActiveSession && (
                <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-emerald-400 font-medium flex-1 truncate">
                        You're in a {myActiveSession.game?.replace(/-/g, ' ')} game ({myActiveSession.status === 'waiting' ? 'waiting' : 'in progress'})
                    </p>
                    <button onClick={() => dispatch(setGameSession(myActiveSession))}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] sm:text-xs font-medium hover:bg-emerald-600 transition-colors flex-shrink-0">Rejoin</button>
                    <button onClick={() => myActiveSession.status === 'in_progress' ? forfeitGame(myActiveSession._id) : cancelGame(myActiveSession._id)}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-red-500/20 transition-colors flex-shrink-0">
                        {myActiveSession.status === 'in_progress' ? '🏳️ Forfeit' : '✕ Cancel'}
                    </button>
                </div>
            )}

            {spectatingSessionId && activeSession && (
                <div className="mx-4 sm:mx-6 mt-3 bg-white/[0.02] rounded-2xl border border-white/5 p-4 sm:p-6 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                            <h3 className="text-sm sm:text-base font-bold truncate">
                                {activeSession.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — LIVE
                            </h3>
                        </div>
                        <button onClick={() => leaveSpectate(spectatingSessionId)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors flex-shrink-0">Leave Spectate</button>
                    </div>
                    <SpectatorBoard session={activeSession} />
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <AnimatePresence mode="wait">
                        {activeTab === 'games' && (
                            <motion.div key="games" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {MULTIPLAYER_GAMES.map(g => (
                                        <motion.button key={g.id} onClick={() => createGame(g.id)}
                                            disabled={!!creatingGame || !!myActiveSession}
                                            whileHover={!myActiveSession ? { scale: 1.02 } : {}} whileTap={!myActiveSession ? { scale: 0.98 } : {}}
                                            className={`group relative text-left p-4 sm:p-5 rounded-2xl border bg-gradient-to-br ${g.color} ${g.border} transition-all overflow-hidden ${
                                                myActiveSession ? 'opacity-40 cursor-not-allowed' : 'hover:border-white/20'
                                            } ${creatingGame === g.id ? 'opacity-50' : ''}`}>
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative">
                                                <div className="flex items-start justify-between mb-3">
                                                    <span className="text-2xl sm:text-3xl">{g.emoji.slice(0, 2)}</span>
                                                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-medium">{g.players} players</span>
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-white/90 group-hover:text-white transition-colors mb-1">{g.name}</h3>
                                                <p className="text-[10px] sm:text-xs text-white/30 group-hover:text-white/50 transition-colors">{g.desc}</p>
                                                <div className="mt-3 flex items-center gap-1.5">
                                                    {creatingGame === g.id ? (
                                                        <div className="flex items-center gap-2 text-[10px] text-indigo-400">
                                                            <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />Creating…
                                                        </div>
                                                    ) : myActiveSession ? (
                                                        <span className="text-[10px] text-red-400/60 font-medium">⚠️ Active game</span>
                                                    ) : (
                                                        <span className="text-[10px] text-indigo-400/60 group-hover:text-indigo-400 font-medium transition-colors flex items-center gap-1">
                                                            <FiPlay className="w-3 h-3" /> Click to create
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'live' && (
                            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-5">
                                {liveSessions.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-4xl sm:text-5xl mb-4">🎮</div>
                                        <p className="text-white/40 mb-2 text-sm sm:text-base">No live sessions right now</p>
                                        <button onClick={() => setActiveTab('games')} className="px-5 py-2.5 bg-indigo-500 rounded-xl text-xs sm:text-sm font-medium hover:bg-indigo-600 transition-colors">
                                            <FiGrid className="w-4 h-4 inline mr-1.5" /> Browse Games
                                        </button>
                                    </div>
                                )}
                                {waitingSessions.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-wider mb-3 flex items-center gap-2"><FiClock className="w-3 h-3" /> Waiting ({waitingSessions.length})</h3>
                                        <div className="space-y-2">{waitingSessions.map(s => (
                                            <SessionCard key={s._id} session={s} user={user} onRequestJoin={requestJoin} onAcceptJoin={acceptJoin} onDeclineJoin={declineJoin}
                                                onSpectate={spectateGame} onCancel={cancelGame} onRejoin={() => dispatch(setGameSession(s))} />
                                        ))}</div>
                                    </div>
                                )}
                                {activeSessions.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-emerald-400/60 uppercase tracking-wider mb-3 flex items-center gap-2"><FiPlay className="w-3 h-3" /> In Progress ({activeSessions.length})</h3>
                                        <div className="space-y-2">{activeSessions.map(s => (
                                            <SessionCard key={s._id} session={s} user={user} onSpectate={spectateGame} onForfeit={forfeitGame} onRejoin={() => dispatch(setGameSession(s))} />
                                        ))}</div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                                {finishedSessions.length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="text-4xl sm:text-5xl mb-4">🏆</div>
                                        <p className="text-white/40 mb-2">No game history yet</p>
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className="text-xs font-bold text-white/20 uppercase tracking-wider mb-3">🏁 Recently Finished ({finishedSessions.length})</h3>
                                        <div className="space-y-2">{finishedSessions.slice(0, 20).map(s => (
                                            <SessionCard key={s._id} session={s} user={user} onRematch={requestRematch} />
                                        ))}</div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

// ══════════════ SHARED COMPONENTS ══════════════

function WaitingScreen({ session, acceptJoin, declineJoin }) {
    return (
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-white/60 text-lg font-medium mb-2">Waiting for opponent…</p>
            <p className="text-white/20 text-sm">Share the Live Sessions tab with friends</p>
            {session.joinRequests?.filter(r => r.status === 'pending').length > 0 && (
                <div className="mt-6 space-y-2 max-w-xs mx-auto">
                    <p className="text-amber-400/70 text-xs font-bold">Join Requests:</p>
                    {session.joinRequests.filter(r => r.status === 'pending').map((req, i) => (
                        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                            <span className="text-xs text-white/60 flex-1">{req.user?.username || 'Player'}</span>
                            <button onClick={() => acceptJoin(session._id, req.user?._id || req.user)}
                                className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium">Accept</button>
                            <button onClick={() => declineJoin(session._id, req.user?._id || req.user)}
                                className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs">✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ResultBanner({ iWon, isDraw }) {
    return (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={`text-center mb-6 p-4 rounded-2xl font-bold text-lg ${
                iWon ? 'bg-emerald-500/15 text-emerald-400' : isDraw ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-400'
            }`}>{iWon ? '🎉 You Won!' : isDraw ? '🤝 Draw!' : '😔 You Lost'}</motion.div>
    );
}

// ══════════════ GAME BOARDS ══════════════

function TicTacToeBoard({ session, myIndex, isMyTurn, isFinished, makeMove }) {
    const board = session.state?.board || Array(9).fill(null);
    const mySymbol = myIndex === 0 ? 'X' : 'O';
    return (
        <div>
            {!isFinished && <p className="text-center text-white/30 mb-4 text-sm">You are <span className="font-bold text-indigo-400">{mySymbol}</span></p>}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
                {board.map((cell, i) => (
                    <motion.button key={i} whileHover={!cell && isMyTurn && !isFinished ? { scale: 1.08 } : {}}
                        onClick={() => { if (!cell && isMyTurn && !isFinished) makeMove({ position: i }); }}
                        className={`aspect-square rounded-xl text-3xl sm:text-4xl font-black flex items-center justify-center transition-all border ${
                            cell === 'X' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                            cell === 'O' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                            isMyTurn && !isFinished ? 'bg-white/[0.03] border-white/10 hover:bg-white/10 cursor-pointer' :
                            'bg-white/[0.02] border-white/5'
                        }`}>{cell && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{cell}</motion.span>}</motion.button>
                ))}
            </div>
        </div>
    );
}

function RPSBoard({ session, userId, isFinished, makeMove }) {
    const choices = session.state?.choices || {};
    const myChoice = choices[userId];
    const allChosen = Object.keys(choices).length >= 2;
    const options = [{ id: 'rock', emoji: '🪨', label: 'Rock' }, { id: 'paper', emoji: '📄', label: 'Paper' }, { id: 'scissors', emoji: '✂️', label: 'Scissors' }];

    if (!myChoice && !isFinished) {
        return (
            <div className="text-center">
                <p className="text-white/30 mb-6">Pick your weapon!</p>
                <div className="flex justify-center gap-4">
                    {options.map(o => (
                        <motion.button key={o.id} whileHover={{ scale: 1.15, y: -8 }} whileTap={{ scale: 0.9 }}
                            onClick={() => makeMove({ choice: o.id })}
                            className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                            <span className="text-4xl">{o.emoji}</span>
                            <span className="text-[9px] text-white/40 uppercase font-bold">{o.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }
    if (myChoice && !allChosen && !isFinished) {
        return (
            <div className="text-center">
                <p className="text-white/30 mb-4">You chose</p>
                <div className="w-24 h-24 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-5xl mx-auto mb-4">
                    {options.find(o => o.id === myChoice)?.emoji}
                </div>
                <p className="text-white/20 text-sm animate-pulse">Waiting for opponent…</p>
            </div>
        );
    }
    return (
        <div className="flex items-center justify-center gap-8">
            {session.players?.map((p, i) => {
                const pId = (p.user?._id || p.user)?.toString();
                const choice = choices[pId];
                return (
                    <div key={i} className="text-center">
                        <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-2">
                            {choice ? (options.find(o => o.id === choice)?.emoji || '❓') : '⏳'}
                        </div>
                        <p className="text-xs text-white/40">{pId === userId ? 'You' : (p.user?.username || 'Opponent')}</p>
                    </div>
                );
            })}
        </div>
    );
}

function Connect4Board({ session, myIndex, isMyTurn, isFinished, makeMove }) {
    const board = session.state?.board || Array(6).fill(null).map(() => Array(7).fill(null));
    const myColor = myIndex === 0 ? 'R' : 'Y';
    return (
        <div>
            {!isFinished && <p className="text-center text-white/30 mb-4 text-sm">You are <span className={`font-bold ${myColor === 'R' ? 'text-red-400' : 'text-yellow-400'}`}>{myColor === 'R' ? '🔴 Red' : '🟡 Yellow'}</span></p>}
            <div className="bg-indigo-900/30 rounded-xl p-2 sm:p-3 border border-indigo-500/20 inline-block mx-auto">
                {isMyTurn && !isFinished && (
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                        {Array(7).fill(null).map((_, col) => (
                            <button key={col} onClick={() => makeMove({ column: col })} disabled={board[0][col] !== null}
                                className="h-6 rounded bg-white/5 hover:bg-indigo-500/20 transition-colors text-[10px] text-white/20 hover:text-indigo-400 disabled:opacity-20 disabled:cursor-not-allowed">▼</button>
                        ))}
                    </div>
                )}
                {board.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 last:mb-0">
                        {row.map((cell, ci) => (
                            <div key={ci} onClick={() => { if (isMyTurn && !isFinished && !board[0][ci]) makeMove({ column: ci }); }}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all ${
                                    cell === 'R' ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30' :
                                    cell === 'Y' ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/30' :
                                    isMyTurn && !isFinished ? 'bg-indigo-950/50 border-indigo-800/30 cursor-pointer hover:border-indigo-500/50' :
                                    'bg-indigo-950/50 border-indigo-800/30'
                                }`} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── CHESS BOARD ──
function ChessBoard({ session, myIndex, isMyTurn, isFinished, makeMove, userId }) {
    const [selected, setSelected] = useState(null);
    const fen = session.state?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const lastMove = session.state?.lastMove;
    const myColor = myIndex === 0 ? 'w' : 'b';

    // Parse FEN to board
    const parseFen = (fen) => {
        const rows = fen.split(' ')[0].split('/');
        const board = [];
        for (const row of rows) {
            const r = [];
            for (const ch of row) {
                if (/\d/.test(ch)) { for (let i = 0; i < parseInt(ch); i++) r.push(null); }
                else r.push(ch);
            }
            board.push(r);
        }
        return board;
    };

    const board = parseFen(fen);
    // Flip board for black
    const displayBoard = myColor === 'b' ? [...board].reverse().map(r => [...r].reverse()) : board;

    const pieceUnicode = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

    const getSquare = (row, col) => {
        const actualRow = myColor === 'b' ? 7 - row : row;
        const actualCol = myColor === 'b' ? 7 - col : col;
        return `${'abcdefgh'[actualCol]}${8 - actualRow}`;
    };

    const isWhite = (piece) => piece && piece === piece.toUpperCase();
    const isMyPiece = (piece) => {
        if (!piece) return false;
        return myColor === 'w' ? isWhite(piece) : !isWhite(piece);
    };

    const handleClick = (row, col) => {
        if (isFinished || !isMyTurn) return;
        const piece = displayBoard[row][col];
        const square = getSquare(row, col);

        if (selected) {
            // Try move
            const move = { from: selected, to: square };
            // Check for pawn promotion
            const actualRow = myColor === 'b' ? 7 - row : row;
            const selectedPiece = board[myColor === 'b' ? 7 - parseInt(selected[1]) + 1 : 8 - parseInt(selected[1])]?.['abcdefgh'.indexOf(selected[0])];
            if (selectedPiece && selectedPiece.toLowerCase() === 'p' && (actualRow === 0 || actualRow === 7)) {
                move.promotion = 'q';
            }
            makeMove(move);
            setSelected(null);
        } else if (isMyPiece(piece)) {
            setSelected(square);
        }
    };

    return (
        <div>
            {!isFinished && <p className="text-center text-white/30 mb-3 text-sm">You are <span className="font-bold text-indigo-400">{myColor === 'w' ? '⬜ White' : '⬛ Black'}</span></p>}
            {session.state?.inCheck && !isFinished && <p className="text-center text-red-400 mb-2 text-sm font-bold animate-pulse">⚠️ Check!</p>}
            {/* Captured pieces */}
            {session.state?.captured && (
                <div className="flex justify-between mb-2 px-2 text-xs">
                    <div className="text-white/30">Captured: {(session.state.captured[myColor === 'w' ? 'w' : 'b'] || []).map((p, i) => <span key={i}>{pieceUnicode[myColor === 'w' ? p : p.toUpperCase()] || p}</span>)}</div>
                </div>
            )}
            <div className="inline-block mx-auto rounded-lg overflow-hidden border border-white/10">
                {displayBoard.map((row, ri) => (
                    <div key={ri} className="flex">
                        {row.map((piece, ci) => {
                            const sq = getSquare(ri, ci);
                            const isLight = (ri + ci) % 2 === 0;
                            const isSelected = selected === sq;
                            const isLastMove = lastMove && (sq === lastMove.from || sq === lastMove.to);
                            return (
                                <div key={ci} onClick={() => handleClick(ri, ci)}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl cursor-pointer transition-all ${
                                        isSelected ? 'bg-indigo-500/50' :
                                        isLastMove ? 'bg-amber-500/30' :
                                        isLight ? 'bg-amber-100/80' : 'bg-amber-800/60'
                                    }`}>
                                    {piece && <span className={`${isWhite(piece) ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'}`}>
                                        {pieceUnicode[piece] || piece}
                                    </span>}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            {/* Move history */}
            {session.state?.moves?.length > 0 && (
                <div className="mt-3 max-h-20 overflow-y-auto bg-white/5 rounded-lg p-2 text-[10px] text-white/40">
                    {session.state.moves.map((m, i) => (
                        <span key={i} className={`inline-block mr-1 ${m.color === 'w' ? 'text-white/50' : 'text-white/30'}`}>
                            {i % 2 === 0 && <span className="text-white/20 mr-0.5">{Math.floor(i/2)+1}.</span>}{m.san}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── CHECKERS BOARD ──
function CheckersBoard({ session, myIndex, isMyTurn, isFinished, makeMove }) {
    const [selected, setSelected] = useState(null);
    const board = session.state?.board || Array(8).fill(null).map(() => Array(8).fill(null));
    const myColor = myIndex === 0 ? 'r' : 'b';
    const displayBoard = myColor === 'b' ? [...board].reverse().map(r => [...r].reverse()) : board;

    const handleClick = (row, col) => {
        if (isFinished || !isMyTurn) return;
        const actualRow = myColor === 'b' ? 7 - row : row;
        const actualCol = myColor === 'b' ? 7 - col : col;
        const piece = board[actualRow]?.[actualCol];

        if (selected) {
            makeMove({ fromRow: selected.row, fromCol: selected.col, toRow: actualRow, toCol: actualCol });
            setSelected(null);
        } else if (piece && piece.startsWith(myColor)) {
            setSelected({ row: actualRow, col: actualCol });
        }
    };

    return (
        <div>
            {!isFinished && <p className="text-center text-white/30 mb-3 text-sm">You are <span className="font-bold text-red-400">{myColor === 'r' ? '🔴 Red' : '⚫ Black'}</span></p>}
            <div className="inline-block mx-auto rounded-lg overflow-hidden border border-white/10">
                {displayBoard.map((row, ri) => (
                    <div key={ri} className="flex">
                        {row.map((piece, ci) => {
                            const actualRow = myColor === 'b' ? 7 - ri : ri;
                            const actualCol = myColor === 'b' ? 7 - ci : ci;
                            const isLight = (ri + ci) % 2 === 0;
                            const isSelected = selected && selected.row === actualRow && selected.col === actualCol;
                            return (
                                <div key={ci} onClick={() => handleClick(ri, ci)}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center cursor-pointer transition-all ${
                                        isSelected ? 'bg-indigo-500/50' : isLight ? 'bg-amber-100/80' : 'bg-emerald-900/60'
                                    }`}>
                                    {piece && (
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                                            piece.startsWith('r') ? 'bg-red-500 border-red-300' : 'bg-gray-800 border-gray-600'
                                        }`}>{piece.includes('K') ? '👑' : ''}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── TRIVIA QUIZ ──
function QuizBoard({ session, userId, isFinished, makeMove }) {
    const state = session.state || {};
    const currentQ = state.questions?.[state.currentQuestion];
    const myAnswer = state.answers?.[state.currentQuestion]?.[userId];
    const allAnswered = session.players?.every(p => state.answers?.[state.currentQuestion]?.[(p.user?._id || p.user)?.toString()]);

    if (isFinished) {
        return (
            <div className="text-center">
                <p className="text-xl font-bold mb-4">Final Scores</p>
                {session.players?.map((p, i) => {
                    const pId = (p.user?._id || p.user)?.toString();
                    return (
                        <div key={i} className="flex items-center justify-center gap-3 mb-2">
                            <span className="text-white/60">{p.user?.username || 'Player'}</span>
                            <span className="text-2xl font-bold text-amber-400">{state.scores?.[pId] || 0}</span>
                            <span className="text-white/20 text-sm">pts</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (!currentQ) return <p className="text-white/30 text-center">Loading questions...</p>;

    return (
        <div className="max-w-md mx-auto">
            <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-white/20">Q{(state.currentQuestion || 0) + 1}/{state.totalQuestions || state.questions?.length}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                    currentQ.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                    currentQ.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                }`}>{currentQ.difficulty} • {currentQ.category}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 mb-4 border border-white/10">
                <p className="text-sm sm:text-base font-medium text-white/90">{currentQ.question}</p>
            </div>
            <div className="space-y-2">
                {currentQ.options?.map((opt, i) => {
                    const isMyChoice = myAnswer?.answer === opt;
                    const showResult = myAnswer && allAnswered;
                    const isCorrect = opt === currentQ.correct;
                    return (
                        <button key={i} onClick={() => { if (!myAnswer) makeMove({ answer: opt }); }}
                            disabled={!!myAnswer}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                                showResult && isCorrect ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                                showResult && isMyChoice && !isCorrect ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                                isMyChoice ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' :
                                myAnswer ? 'bg-white/[0.02] border-white/5 text-white/30' :
                                'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20 cursor-pointer'
                            }`}>
                            <span className="font-bold mr-2 text-white/20">{['A', 'B', 'C', 'D'][i]}.</span>{opt}
                            {showResult && isCorrect && ' ✓'}
                            {showResult && isMyChoice && !isCorrect && ' ✗'}
                        </button>
                    );
                })}
            </div>
            {myAnswer && !allAnswered && <p className="text-center text-white/20 text-sm mt-4 animate-pulse">Waiting for opponent to answer…</p>}
        </div>
    );
}

// ── WORDLE ──
function WordleBoard({ session, userId, isFinished, makeMove }) {
    const [currentGuess, setCurrentGuess] = useState('');
    const state = session.state || {};
    const myGuesses = state.guesses?.[userId] || [];
    const myFinished = state.finished?.[userId];
    const maxAttempts = state.maxAttempts || 6;

    const handleSubmit = () => {
        if (currentGuess.length !== 5) return toast.error('Must be 5 letters');
        makeMove({ guess: currentGuess });
        setCurrentGuess('');
    };

    const handleKey = (key) => {
        if (myFinished) return;
        if (key === 'ENTER') { handleSubmit(); return; }
        if (key === 'DEL') { setCurrentGuess(prev => prev.slice(0, -1)); return; }
        if (currentGuess.length < 5) setCurrentGuess(prev => prev + key.toLowerCase());
    };

    // Keyboard colors based on previous guesses
    const letterStates = {};
    myGuesses.forEach(g => {
        g.result?.forEach(r => {
            const prev = letterStates[r.letter];
            if (r.status === 'green') letterStates[r.letter] = 'green';
            else if (r.status === 'yellow' && prev !== 'green') letterStates[r.letter] = 'yellow';
            else if (!prev) letterStates[r.letter] = 'gray';
        });
    });

    const keyboard = [['Q','W','E','R','T','Y','U','I','O','P'], ['A','S','D','F','G','H','J','K','L'], ['ENTER','Z','X','C','V','B','N','M','DEL']];

    return (
        <div className="max-w-sm mx-auto">
            {/* Show opponent progress */}
            {session.players?.map((p, i) => {
                const pId = (p.user?._id || p.user)?.toString();
                if (pId === userId) return null;
                const theirGuesses = state.guesses?.[pId] || [];
                const theirFinished = state.finished?.[pId];
                return (
                    <div key={i} className="text-center mb-2 text-xs text-white/30">
                        {p.user?.username}: {theirGuesses.length} guesses {theirFinished ? (theirFinished.won ? '✅' : '❌') : '⏳'}
                    </div>
                );
            })}

            {/* Grid */}
            <div className="space-y-1 mb-4">
                {Array(maxAttempts).fill(null).map((_, rowIdx) => {
                    const guess = myGuesses[rowIdx];
                    const isCurrentRow = rowIdx === myGuesses.length && !myFinished;
                    return (
                        <div key={rowIdx} className="flex justify-center gap-1">
                            {Array(5).fill(null).map((_, colIdx) => {
                                let letter = '';
                                let bg = 'bg-white/5 border-white/10';
                                if (guess) {
                                    letter = guess.result[colIdx]?.letter || '';
                                    const status = guess.result[colIdx]?.status;
                                    bg = status === 'green' ? 'bg-emerald-500 border-emerald-400' :
                                         status === 'yellow' ? 'bg-amber-500 border-amber-400' :
                                         'bg-gray-600 border-gray-500';
                                } else if (isCurrentRow) {
                                    letter = currentGuess[colIdx] || '';
                                    if (letter) bg = 'bg-white/10 border-white/20';
                                }
                                return (
                                    <div key={colIdx} className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg border-2 uppercase transition-all ${bg}`}>
                                        {letter}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            {/* Result */}
            {myFinished && (
                <div className={`text-center mb-3 p-2 rounded-lg text-sm ${myFinished.won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {myFinished.won ? `🎉 Got it in ${myFinished.attempts}!` : `😔 The word was "${state.word}"`}
                </div>
            )}

            {/* Keyboard */}
            {!myFinished && (
                <div className="space-y-1">
                    {keyboard.map((row, ri) => (
                        <div key={ri} className="flex justify-center gap-[3px]">
                            {row.map(key => {
                                const ls = letterStates[key.toLowerCase()];
                                return (
                                    <button key={key} onClick={() => handleKey(key)}
                                        className={`${key.length > 1 ? 'px-2 sm:px-3' : 'w-8 sm:w-9'} h-10 sm:h-11 rounded-md text-xs sm:text-sm font-bold flex items-center justify-center transition-all ${
                                            ls === 'green' ? 'bg-emerald-500 text-white' :
                                            ls === 'yellow' ? 'bg-amber-500 text-white' :
                                            ls === 'gray' ? 'bg-gray-700 text-white/30' :
                                            'bg-white/10 text-white/70 hover:bg-white/20'
                                        }`}>{key === 'DEL' ? '⌫' : key}</button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ══════════════ SESSION CARD ══════════════
function SessionCard({ session, user, onRequestJoin, onAcceptJoin, onDeclineJoin, onSpectate, onCancel, onForfeit, onRejoin, onRematch }) {
    const isHost = session.players?.[0]?.user?._id?.toString() === user?._id?.toString() ||
                   session.players?.[0]?.user?.toString() === user?._id?.toString();
    const isPlayer = session.players?.some(p => (p.user?._id || p.user)?.toString() === user?._id?.toString());
    const gameName = session.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const hostName = session.players?.[0]?.user?.username || 'Unknown';
    const playerNames = session.players?.map(p => p.user?.username || 'Player');
    const pendingRequests = session.joinRequests?.filter(r => r.status === 'pending') || [];
    const winnerPlayer = session.players?.find(p => (p.user?._id || p.user)?.toString() === session.winner?.toString());
    const elapsed = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt)) / 60000) : 0;
    const gameEmoji = MULTIPLAYER_GAMES.find(g => g.id === session.game)?.emoji?.slice(0, 2) || '🎮';

    return (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className={`p-3 sm:p-4 rounded-xl border transition-all ${
                session.status === 'waiting' ? 'bg-amber-500/5 border-amber-500/15 hover:border-amber-500/30' :
                session.status === 'in_progress' ? 'bg-emerald-500/5 border-emerald-500/15 hover:border-emerald-500/30' :
                'bg-white/[0.02] border-white/5 hover:border-white/10'
            }`}>
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 ${
                    session.status === 'waiting' ? 'bg-amber-500/10' : session.status === 'in_progress' ? 'bg-emerald-500/10' : 'bg-white/5'
                }`}>{gameEmoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold truncate">{gameName}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                            session.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' :
                            session.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-white/5 text-white/30'
                        }`}>{session.status === 'waiting' ? '⏳ Waiting' : session.status === 'in_progress' ? '🟢 Playing' : '🏁 Finished'}</span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-white/30 mt-0.5 truncate">
                        {session.status === 'waiting' ? `Host: ${hostName}` :
                         session.status === 'in_progress' ? `${playerNames?.join(' vs ')} • ${elapsed}m` :
                         `🏆 ${winnerPlayer?.user?.username || (session.winner ? 'Winner' : 'Draw')} • ${playerNames?.join(' vs ')}`}
                    </p>
                    {isHost && pendingRequests.length > 0 && session.status === 'waiting' && (
                        <div className="mt-2 space-y-1.5">
                            <p className="text-[10px] text-amber-400/70 font-semibold">Join Requests:</p>
                            {pendingRequests.map((req, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                                    <span className="text-xs text-white/60 flex-1 truncate">{req.user?.username}</span>
                                    <button onClick={() => onAcceptJoin?.(session._id, req.user?._id || req.user)} className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"><FiCheck className="w-3 h-3" /></button>
                                    <button onClick={() => onDeclineJoin?.(session._id, req.user?._id || req.user)} className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><FiX className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {session.status === 'waiting' && !isPlayer && <button onClick={() => onRequestJoin?.(session._id)} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">⚔️ Join</button>}
                    {session.status === 'waiting' && isPlayer && <button onClick={() => onCancel?.(session._id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-red-500/20">✕ Cancel</button>}
                    {session.status === 'in_progress' && isPlayer && (
                        <>
                            <button onClick={onRejoin} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">Rejoin</button>
                            <button onClick={() => onForfeit?.(session._id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-red-500/20">🏳️</button>
                        </>
                    )}
                    {session.status === 'in_progress' && !isPlayer && <button onClick={() => onSpectate?.(session._id)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-white/10">👁️ Watch</button>}
                    {session.status === 'finished' && isPlayer && <button onClick={() => onRematch?.(session._id)} className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-indigo-500/20"><FiRefreshCw className="w-3 h-3 inline mr-1" /> Rematch</button>}
                </div>
            </div>
        </motion.div>
    );
}

// ══════════════ SPECTATOR BOARD ══════════════
function SpectatorBoard({ session }) {
    if (!session) return <p className="text-white/20 text-center">No game data</p>;
    const gameName = session.game;
    return (
        <div className="flex flex-col items-center">
            <div className="flex gap-2 mb-4 flex-wrap">
                {session.players?.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                        (session.currentTurn?.toString() === (p.user?._id || p.user)?.toString() ||
                         session.currentTurn?._id?.toString() === (p.user?._id || p.user)?.toString())
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-white/5 text-white/40'
                    }`}>
                        <span className="font-bold">{i === 0 ? '🔵' : '🔴'}</span>
                        <span className="truncate max-w-[80px]">{p.user?.username || 'Player'}</span>
                    </div>
                ))}
            </div>
            {gameName === 'tic-tac-toe' && <TicTacToeSpectator state={session.state} />}
            {gameName === 'connect4' && <Connect4Spectator state={session.state} />}
            {gameName === 'rock-paper-scissors' && <RPSSpectator state={session.state} session={session} />}
            {gameName === 'chess' && <ChessSpectator state={session.state} />}
            {!['tic-tac-toe', 'connect4', 'rock-paper-scissors', 'chess'].includes(gameName) && (
                <div className="text-center py-8">
                    <p className="text-3xl mb-2">{MULTIPLAYER_GAMES.find(g => g.id === gameName)?.emoji?.slice(0, 2) || '🎮'}</p>
                    <p className="text-sm text-white/30">Game in progress</p>
                </div>
            )}
        </div>
    );
}

function TicTacToeSpectator({ state }) {
    const board = state?.board || Array(9).fill(null);
    return (
        <div className="grid grid-cols-3 gap-2 w-[180px] sm:w-[210px]">
            {board.map((cell, i) => (
                <div key={i} className={`w-[56px] h-[56px] sm:w-[66px] sm:h-[66px] rounded-xl text-xl font-bold flex items-center justify-center ${
                    cell === 'X' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                    cell === 'O' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                    'bg-white/5 border border-white/10'
                }`}>{cell}</div>
            ))}
        </div>
    );
}

function Connect4Spectator({ state }) {
    const board = state?.board || Array(6).fill(null).map(() => Array(7).fill(null));
    return (
        <div className="bg-indigo-900/30 rounded-xl p-1.5 sm:p-2 border border-indigo-500/20">
            {board.map((row, ri) => (
                <div key={ri} className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 last:mb-0">
                    {row.map((cell, ci) => (
                        <div key={ci} className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 ${
                            cell === 'R' ? 'bg-red-500 border-red-400' : cell === 'Y' ? 'bg-yellow-400 border-yellow-300' : 'bg-indigo-950/50 border-indigo-800/30'
                        }`} />
                    ))}
                </div>
            ))}
        </div>
    );
}

function RPSSpectator({ state, session }) {
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    const allChosen = Object.keys(state?.choices || {}).length >= 2;
    return (
        <div className="flex items-center gap-8">
            {session.players?.map((p, i) => {
                const choice = state?.choices?.[(p.user?._id || p.user)?.toString()];
                return (
                    <div key={i} className="text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl sm:text-4xl mb-1">
                            {allChosen ? (emojis[choice] || '❓') : (choice ? '✅' : '⏳')}
                        </div>
                        <p className="text-xs text-white/40 truncate max-w-[80px]">{p.user?.username}</p>
                    </div>
                );
            })}
        </div>
    );
}

function ChessSpectator({ state }) {
    const fen = state?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const pieceUnicode = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const rows = fen.split(' ')[0].split('/');
    const board = rows.map(row => {
        const r = [];
        for (const ch of row) {
            if (/\d/.test(ch)) { for (let i = 0; i < parseInt(ch); i++) r.push(null); }
            else r.push(ch);
        }
        return r;
    });

    return (
        <div className="inline-block rounded-lg overflow-hidden border border-white/10">
            {board.map((row, ri) => (
                <div key={ri} className="flex">
                    {row.map((piece, ci) => (
                        <div key={ci} className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-lg sm:text-xl ${
                            (ri + ci) % 2 === 0 ? 'bg-amber-100/80' : 'bg-amber-800/60'
                        }`}>
                            {piece && <span className={piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'}>{pieceUnicode[piece]}</span>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
