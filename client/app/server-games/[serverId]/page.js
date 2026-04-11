'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiEye, FiCheck, FiX, FiClock, FiPlay, FiRefreshCw, FiPlus, FiChevronDown } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import { useAuth } from '../../../hooks/useAuth';
import { getSocket } from '../../../services/socket';
import api from '../../../services/api';
import { setGameSession, setServerSessions, updateServerSession, setSpectatingSessionId, clearGame } from '../../../redux/gameSlice';
import toast from 'react-hot-toast';

const MULTIPLAYER_GAMES = [
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', emoji: '❌⭕', players: '2' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', emoji: '✊✋', players: '2' },
    { id: 'connect4', name: 'Connect 4', emoji: '🔴🟡', players: '2' },
    { id: 'chess', name: 'Chess', emoji: '♟️👑', players: '2' },
    { id: 'checkers', name: 'Checkers', emoji: '🏁⚫', players: '2' },
    { id: 'battleship', name: 'Battleship', emoji: '🚢💥', players: '2' },
    { id: 'pong', name: 'Ping Pong', emoji: '🏓🏓', players: '2' },
    { id: 'ludo', name: 'Ludo', emoji: '🎲🎲', players: '2-4' },
    { id: 'quiz', name: 'Quiz Battle', emoji: '🧠❓', players: '2+' },
];

export default function ServerGamesPage({ params }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading } = useAuth();
    const { serverSessions, session: activeSession, spectatingSessionId } = useSelector(s => s.game);
    const { currentServer } = useSelector(s => s.server);

    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const serverId = params?.serverId || currentServer?._id;

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);

    // Fetch server sessions
    const fetchSessions = useCallback(async () => {
        if (!serverId) return;
        try {
            const { data } = await api.get(`/games/server/${serverId}`);
            dispatch(setServerSessions(data.sessions || []));
        } catch (e) { console.error('Failed to fetch sessions', e); }
    }, [serverId, dispatch]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // Socket events
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleUpdated = ({ session }) => dispatch(updateServerSession(session));
        const handleCreated = ({ session }) => dispatch(updateServerSession(session));
        const handleRequestSent = () => toast.success('Join request sent! Waiting for host…');
        const handleRequestDeclined = () => toast.error('Your join request was declined');
        const handlePlayerAccepted = ({ session }) => {
            dispatch(setGameSession(session));
            if (session.status === 'in_progress') toast.success('Game started!');
        };
        const handleRematch = ({ session }) => { dispatch(setGameSession(session)); dispatch(updateServerSession(session)); };
        const handleCancelled = () => { dispatch(clearGame()); toast('Game was cancelled', { icon: '🚫' }); };
        const handleSpectating = ({ session }) => {
            dispatch(setGameSession(session));
            dispatch(setSpectatingSessionId(session._id));
            toast.success('Now spectating!');
        };

        socket.on('game:updated', handleUpdated);
        socket.on('game:created', handleCreated);
        socket.on('game:request-sent', handleRequestSent);
        socket.on('game:request-declined', handleRequestDeclined);
        socket.on('game:player-accepted', handlePlayerAccepted);
        socket.on('game:rematch', handleRematch);
        socket.on('game:cancelled', handleCancelled);
        socket.on('game:spectating', handleSpectating);

        return () => {
            socket.off('game:updated', handleUpdated);
            socket.off('game:created', handleCreated);
            socket.off('game:request-sent', handleRequestSent);
            socket.off('game:request-declined', handleRequestDeclined);
            socket.off('game:player-accepted', handlePlayerAccepted);
            socket.off('game:rematch', handleRematch);
            socket.off('game:cancelled', handleCancelled);
            socket.off('game:spectating', handleSpectating);
        };
    }, [dispatch]);

    const createGame = (gameId) => {
        const socket = getSocket();
        if (!socket || !serverId) return;
        socket.emit('game:create', { game: gameId, serverId, channelId: currentServer?.channels?.[0] });
        setShowCreateMenu(false);
        toast.success('Game created! Waiting for challengers…');
    };

    const requestJoin = (sessionId) => { const s = getSocket(); s?.emit('game:request-join', { sessionId }); };
    const acceptJoin = (sessionId, userId) => { const s = getSocket(); s?.emit('game:accept-join', { sessionId, userId }); };
    const declineJoin = (sessionId, userId) => { const s = getSocket(); s?.emit('game:decline-join', { sessionId, userId }); };
    const spectateGame = (sessionId) => { const s = getSocket(); s?.emit('game:spectate', { sessionId }); };
    const leaveSpectate = (sessionId) => {
        const s = getSocket(); s?.emit('game:leave-spectate', { sessionId });
        dispatch(setSpectatingSessionId(null)); dispatch(setGameSession(null));
    };
    const requestRematch = (sessionId) => { const s = getSocket(); s?.emit('game:rematch', { sessionId }); };
    const cancelGame = (sessionId) => { const s = getSocket(); s?.emit('game:cancel', { sessionId }); };

    const waitingSessions = serverSessions.filter(s => s.status === 'waiting');
    const activeSessions = serverSessions.filter(s => s.status === 'in_progress');
    const finishedSessions = serverSessions.filter(s => s.status === 'finished');
    const myActiveSession = serverSessions.find(s =>
        ['waiting', 'in_progress'].includes(s.status) &&
        s.players?.some(p => (p.user?._id || p.user)?.toString() === user?._id?.toString())
    );

    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                <button onClick={() => router.push('/channels')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <IoGameControllerOutline className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-sm sm:text-lg font-bold truncate">Server Games</h1>
                    <p className="text-[10px] sm:text-xs text-white/30 truncate">{currentServer?.name || 'Multiplayer'} — {activeSessions.length + waitingSessions.length} active</p>
                </div>

                {/* Create Game Button */}
                <div className="relative flex-shrink-0">
                    <button onClick={() => setShowCreateMenu(!showCreateMenu)}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors">
                        <FiPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Create Game</span>
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                        {showCreateMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
                                <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="p-2 border-b border-white/5">
                                        <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider px-2 py-1">Pick a game to start</p>
                                    </div>
                                    <div className="max-h-[320px] overflow-y-auto p-1.5" style={{ scrollbarWidth: 'thin' }}>
                                        {MULTIPLAYER_GAMES.map(g => (
                                            <button key={g.id} onClick={() => createGame(g.id)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left transition-colors group">
                                                <span className="text-xl flex-shrink-0">{g.emoji.slice(0, 2)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-white/80 group-hover:text-white truncate">{g.name}</p>
                                                    <p className="text-[10px] text-white/25">{g.players} players</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content — All sessions */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

                    {/* My active session banner */}
                    {myActiveSession && (
                        <div className="p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                                <p className="text-sm text-emerald-400 font-medium truncate">
                                    You're in a {myActiveSession.game?.replace(/-/g, ' ')} game ({myActiveSession.status === 'waiting' ? 'waiting for players' : 'in progress'})
                                </p>
                            </div>
                            <button onClick={() => dispatch(setGameSession(myActiveSession))}
                                className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors flex-shrink-0">
                                Rejoin
                            </button>
                        </div>
                    )}

                    {/* Spectating banner */}
                    {spectatingSessionId && activeSession && (
                        <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                                    <h3 className="text-sm sm:text-base font-bold truncate">
                                        {activeSession.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — LIVE
                                    </h3>
                                </div>
                                <button onClick={() => leaveSpectate(spectatingSessionId)}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs hover:bg-white/10 transition-colors flex-shrink-0">
                                    Leave Spectate
                                </button>
                            </div>
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {activeSession.players?.map((p, i) => (
                                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                                        (activeSession.currentTurn?.toString() === (p.user?._id || p.user)?.toString() ||
                                         activeSession.currentTurn?._id?.toString() === (p.user?._id || p.user)?.toString())
                                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                            : 'bg-white/5 text-white/40'
                                    }`}>
                                        <span className="font-bold">{i === 0 ? '🔵' : '🔴'}</span>
                                        <span className="truncate max-w-[80px]">{p.user?.username || 'Player'}</span>
                                        <span className="text-white/20">({p.score || 0})</span>
                                    </div>
                                ))}
                            </div>
                            <SpectatorBoard session={activeSession} />
                            <div className="mt-4 bg-white/[0.02] rounded-xl border border-white/5 p-3">
                                <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <FiEye className="w-3 h-3" /> Spectators ({activeSession.spectators?.length || 0})
                                </h4>
                                {activeSession.spectators?.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeSession.spectators.map((s, i) => (
                                            <span key={i} className="px-2 py-1 rounded-full bg-white/5 text-[10px] text-white/40">{s.user?.username || '?'}</span>
                                        ))}
                                    </div>
                                ) : <p className="text-xs text-white/20">No other spectators</p>}
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {(waitingSessions.length + activeSessions.length + finishedSessions.length) === 0 && !spectatingSessionId && (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-4">🎮</div>
                            <p className="text-white/40 mb-2">No active game sessions</p>
                            <p className="text-xs text-white/20 mb-6">Create a game and challenge your friends!</p>
                            <button onClick={() => setShowCreateMenu(true)}
                                className="px-6 py-2.5 bg-indigo-500 rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">
                                <FiPlus className="w-4 h-4 inline mr-1.5" /> Create Game
                            </button>
                        </div>
                    )}

                    {/* Waiting sessions */}
                    {waitingSessions.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-amber-400/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FiClock className="w-3 h-3" /> Waiting for Players ({waitingSessions.length})
                            </h3>
                            <div className="space-y-2">
                                {waitingSessions.map(s => (
                                    <SessionCard key={s._id} session={s} user={user}
                                        onRequestJoin={requestJoin} onAcceptJoin={acceptJoin} onDeclineJoin={declineJoin}
                                        onSpectate={spectateGame} onCancel={cancelGame}
                                        onRejoin={() => dispatch(setGameSession(s))} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active sessions */}
                    {activeSessions.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-emerald-400/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FiPlay className="w-3 h-3" /> In Progress ({activeSessions.length})
                            </h3>
                            <div className="space-y-2">
                                {activeSessions.map(s => (
                                    <SessionCard key={s._id} session={s} user={user}
                                        onSpectate={spectateGame}
                                        onRejoin={() => dispatch(setGameSession(s))} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Finished sessions */}
                    {finishedSessions.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold text-white/20 uppercase tracking-wider mb-3 flex items-center gap-2">
                                🏁 Recently Finished ({finishedSessions.length})
                            </h3>
                            <div className="space-y-2">
                                {finishedSessions.slice(0, 10).map(s => (
                                    <SessionCard key={s._id} session={s} user={user} onRematch={requestRematch} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Session Card ─── */
function SessionCard({ session, user, onRequestJoin, onAcceptJoin, onDeclineJoin, onSpectate, onCancel, onRejoin, onRematch }) {
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
        <div className={`p-3 sm:p-4 rounded-xl border transition-all ${
            session.status === 'waiting' ? 'bg-amber-500/5 border-amber-500/15' :
            session.status === 'in_progress' ? 'bg-emerald-500/5 border-emerald-500/15' :
            'bg-white/[0.02] border-white/5'
        }`}>
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl flex-shrink-0 ${
                    session.status === 'waiting' ? 'bg-amber-500/10' :
                    session.status === 'in_progress' ? 'bg-emerald-500/10' : 'bg-white/5'
                }`}>
                    {gameEmoji}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold truncate">{gameName}</h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                            session.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' :
                            session.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-white/5 text-white/30'
                        }`}>
                            {session.status === 'waiting' ? '⏳ Waiting' :
                             session.status === 'in_progress' ? '🟢 Playing' : '🏁 Finished'}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-white/30 mt-0.5 truncate">
                        {session.status === 'waiting' ? `Host: ${hostName}` :
                         session.status === 'in_progress' ? `${playerNames?.join(' vs ')} • ${elapsed}m` :
                         `🏆 ${winnerPlayer?.user?.username || 'Draw'} • ${playerNames?.join(' vs ')}`}
                    </p>

                    {/* Host: show join requests */}
                    {isHost && pendingRequests.length > 0 && session.status === 'waiting' && (
                        <div className="mt-2 space-y-1.5">
                            <p className="text-[10px] text-amber-400/70 font-semibold">Join Requests:</p>
                            {pendingRequests.map((req, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                                    <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                        {req.user?.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <span className="text-xs text-white/60 flex-1 truncate">{req.user?.username}</span>
                                    <button onClick={() => onAcceptJoin?.(session._id, req.user?._id || req.user)}
                                        className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex-shrink-0">
                                        <FiCheck className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => onDeclineJoin?.(session._id, req.user?._id || req.user)}
                                        className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex-shrink-0">
                                        <FiX className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {session.spectators?.length > 0 && (
                        <p className="text-[10px] text-white/20 mt-1 flex items-center gap-1">
                            <FiEye className="w-2.5 h-2.5" /> {session.spectators.length} spectator{session.spectators.length !== 1 ? 's' : ''}
                        </p>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {session.status === 'waiting' && !isPlayer && (
                        <button onClick={() => onRequestJoin?.(session._id)}
                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">
                            ⚔️ Join
                        </button>
                    )}
                    {session.status === 'waiting' && isHost && (
                        <button onClick={() => onCancel?.(session._id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-red-500/20">
                            Cancel
                        </button>
                    )}
                    {session.status === 'in_progress' && isPlayer && (
                        <button onClick={() => onRejoin?.()}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">
                            Rejoin
                        </button>
                    )}
                    {session.status === 'in_progress' && !isPlayer && (
                        <button onClick={() => onSpectate?.(session._id)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-white/10">
                            👁️ Watch
                        </button>
                    )}
                    {session.status === 'finished' && isPlayer && (
                        <button onClick={() => onRematch?.(session._id)}
                            className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-indigo-500/20">
                            <FiRefreshCw className="w-3 h-3 inline mr-1" /> Rematch
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Spectator Board ─── */
function SpectatorBoard({ session }) {
    if (!session) return <p className="text-white/20 text-center">No game data</p>;

    const gameName = session.game;
    const statusText = session.status === 'finished'
        ? (session.winner ? `🏆 ${session.players?.find(p => (p.user?._id || p.user)?.toString() === session.winner?.toString())?.user?.username || 'Unknown'} won!` : '🤝 Draw!')
        : `${session.players?.find(p => (p.user?._id || p.user)?.toString() === (session.currentTurn?._id || session.currentTurn)?.toString())?.user?.username || 'Player'}'s turn`;

    return (
        <div className="flex flex-col items-center">
            <p className={`text-sm font-medium mb-4 ${session.status === 'finished' ? 'text-amber-400' : 'text-white/40'}`}>{statusText}</p>
            {gameName === 'tic-tac-toe' && <TicTacToeSpectator state={session.state} />}
            {gameName === 'connect4' && <Connect4Spectator state={session.state} />}
            {gameName === 'rock-paper-scissors' && <RPSSpectator state={session.state} session={session} />}
            {!['tic-tac-toe', 'connect4', 'rock-paper-scissors'].includes(gameName) && (
                <div className="text-center py-8">
                    <p className="text-3xl mb-2">{MULTIPLAYER_GAMES.find(g => g.id === gameName)?.emoji?.slice(0, 2) || '🎮'}</p>
                    <p className="text-sm text-white/30">Game in progress — spectator view coming soon</p>
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
                            cell === 'R' ? 'bg-red-500 border-red-400' :
                            cell === 'Y' ? 'bg-yellow-400 border-yellow-300' :
                            'bg-indigo-950/50 border-indigo-800/30'
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
