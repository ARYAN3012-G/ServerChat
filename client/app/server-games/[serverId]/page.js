'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiEye, FiCheck, FiX, FiClock, FiPlay, FiRefreshCw, FiMenu, FiSearch } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import { useAuth } from '../../../hooks/useAuth';
import { getSocket } from '../../../services/socket';
import api from '../../../services/api';
import { setGameSession, setServerSessions, updateServerSession, setSpectatingSessionId, clearGame } from '../../../redux/gameSlice';
import toast from 'react-hot-toast';

const MULTIPLAYER_GAMES = [
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', emoji: '❌⭕', desc: 'Classic 3×3 grid — first to 3 in a row wins', players: '2', color: '#6366f1', gradient: 'from-violet-600 to-indigo-600' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', emoji: '✊✋', desc: 'Pick rock, paper, or scissors', players: '2', color: '#ec4899', gradient: 'from-pink-600 to-rose-600' },
    { id: 'connect4', name: 'Connect 4', emoji: '🔴🟡', desc: 'Drop discs — 4 in a row wins!', players: '2', color: '#ef4444', gradient: 'from-red-600 to-orange-600' },
    { id: 'chess', name: 'Chess', emoji: '♟️👑', desc: 'The ultimate strategy game', players: '2', color: '#64748b', gradient: 'from-slate-600 to-zinc-600' },
    { id: 'checkers', name: 'Checkers', emoji: '🏁⚫', desc: 'Jump and capture all pieces', players: '2', color: '#f97316', gradient: 'from-orange-600 to-amber-600' },
    { id: 'battleship', name: 'Battleship', emoji: '🚢💥', desc: 'Sink the enemy fleet', players: '2', color: '#3b82f6', gradient: 'from-blue-600 to-indigo-600' },
    { id: 'pong', name: 'Ping Pong', emoji: '🏓🏓', desc: 'Classic paddle game', players: '2', color: '#06b6d4', gradient: 'from-cyan-600 to-blue-600' },
    { id: 'ludo', name: 'Ludo', emoji: '🎲🎲', desc: 'Race to the finish!', players: '2-4', color: '#eab308', gradient: 'from-yellow-600 to-amber-600' },
    { id: 'quiz', name: 'Quiz Battle', emoji: '🧠❓', desc: 'Test your knowledge', players: '2+', color: '#8b5cf6', gradient: 'from-purple-600 to-violet-600' },
];

export default function ServerGamesPage({ params }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading } = useAuth();
    const { serverSessions, session: activeSession, spectatingSessionId } = useSelector(s => s.game);
    const { currentServer } = useSelector(s => s.server);

    const [tab, setTab] = useState('library'); // library | sessions | spectate
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const serverId = params?.serverId || currentServer?._id;

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);

    // Auto-open tab from URL param
    useEffect(() => {
        const t = searchParams.get('tab');
        if (t && ['library', 'sessions', 'spectate'].includes(t)) setTab(t);
    }, [searchParams]);

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

        const handleUpdated = ({ session }) => {
            dispatch(updateServerSession(session));
        };
        const handleCreated = ({ session }) => {
            dispatch(updateServerSession(session));
        };
        const handleRequestSent = () => {
            toast.success('Join request sent! Waiting for host...');
        };
        const handleRequestDeclined = () => {
            toast.error('Your join request was declined');
        };
        const handlePlayerAccepted = ({ session }) => {
            dispatch(setGameSession(session));
            if (session.status === 'in_progress') {
                toast.success('Game started!');
            }
        };
        const handleRematch = ({ session }) => {
            dispatch(setGameSession(session));
            dispatch(updateServerSession(session));
        };
        const handleCancelled = () => {
            dispatch(clearGame());
            toast('Game was cancelled', { icon: '🚫' });
        };
        const handleSpectating = ({ session }) => {
            dispatch(setGameSession(session));
            dispatch(setSpectatingSessionId(session._id));
            setTab('spectate');
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
        setTab('sessions');
        toast.success('Game created! Waiting for challengers...');
    };

    const requestJoin = (sessionId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:request-join', { sessionId });
    };

    const acceptJoin = (sessionId, userId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:accept-join', { sessionId, userId });
    };

    const declineJoin = (sessionId, userId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:decline-join', { sessionId, userId });
    };

    const spectateGame = (sessionId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:spectate', { sessionId });
    };

    const leaveSpectate = (sessionId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:leave-spectate', { sessionId });
        dispatch(setSpectatingSessionId(null));
        dispatch(setGameSession(null));
        setTab('sessions');
    };

    const makeMove = (sessionId, move) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:move', { sessionId, move });
    };

    const requestRematch = (sessionId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:rematch', { sessionId });
    };

    const cancelGame = (sessionId) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('game:cancel', { sessionId });
    };

    const filteredGames = MULTIPLAYER_GAMES.filter(g =>
        !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const waitingSessions = serverSessions.filter(s => s.status === 'waiting');
    const activeSessions = serverSessions.filter(s => s.status === 'in_progress');
    const finishedSessions = serverSessions.filter(s => s.status === 'finished');
    const myActiveSession = serverSessions.find(s =>
        ['waiting', 'in_progress'].includes(s.status) &&
        s.players?.some(p => (p.user?._id || p.user)?.toString() === user?._id?.toString())
    );

    const isMyTurn = activeSession?.currentTurn?.toString() === user?._id?.toString() ||
                     activeSession?.currentTurn?._id?.toString() === user?._id?.toString();
    const myPlayerIndex = activeSession?.players?.findIndex(p => (p.user?._id || p.user)?.toString() === user?._id?.toString());

    const tabs = [
        { id: 'library', label: '🎮 Game Library', count: MULTIPLAYER_GAMES.length },
        { id: 'sessions', label: '⚔️ Active Sessions', count: waitingSessions.length + activeSessions.length },
        { id: 'spectate', label: '👁️ Spectate', count: spectatingSessionId ? 1 : 0 },
    ];

    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden">
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 sm:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Left sidebar — back nav */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 fixed sm:static z-40 w-[72px] bg-[#080a14] flex flex-col items-center py-3 gap-2 border-r border-white/5 h-full transition-transform duration-200`}>
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500 cursor-pointer transition-all" title="Back to Chat">
                    <FiArrowLeft className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-0.5 bg-white/10 rounded-full mx-auto" />
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide px-2">
                    {MULTIPLAYER_GAMES.map(g => (
                        <motion.div key={g.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { createGame(g.id); setSidebarOpen(false); }}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all text-lg bg-white/5 hover:bg-white/10 flex-shrink-0"
                            title={`Create ${g.name}`}>
                            {g.emoji.slice(0, 2)}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                    <button onClick={() => setSidebarOpen(true)} className="sm:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        <FiMenu className="w-5 h-5" />
                    </button>
                    <IoGameControllerOutline className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm sm:text-lg font-bold truncate">Server Games</h1>
                        <p className="text-[10px] sm:text-xs text-white/30 truncate">{currentServer?.name || 'Multiplayer'} — {activeSessions.length + waitingSessions.length} active</p>
                    </div>
                    <button onClick={() => router.push('/channels')} className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors flex-shrink-0">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-2 sm:px-4 bg-[#0c0e1a] flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
                                tab === t.id ? 'text-indigo-400 border-indigo-400' : 'text-white/30 border-transparent hover:text-white/60'
                            }`}>
                            {t.label}
                            {t.count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/20'}`}>{t.count}</span>}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        {tab === 'library' && (
                            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

                                {/* My active session banner */}
                                {myActiveSession && (
                                    <div className="mb-4 p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                                            <p className="text-sm text-emerald-400 font-medium truncate">
                                                You're in a {myActiveSession.game?.replace(/-/g, ' ')} game ({myActiveSession.status})
                                            </p>
                                        </div>
                                        <button onClick={() => { dispatch(setGameSession(myActiveSession)); setTab('sessions'); }}
                                            className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors flex-shrink-0">
                                            Rejoin
                                        </button>
                                    </div>
                                )}

                                {/* Search */}
                                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/5 mb-4 sm:mb-6">
                                    <FiSearch className="w-4 h-4 text-white/20 flex-shrink-0" />
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search multiplayer games..." className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20 min-w-0" />
                                </div>

                                {/* Game Grid */}
                                <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    {filteredGames.map((g, i) => (
                                        <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                            whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => createGame(g.id)}
                                            className="relative rounded-2xl cursor-pointer overflow-hidden shadow-xl group">
                                            <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient} opacity-90`} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                            <div className="absolute -right-2 -top-2 text-[60px] sm:text-[70px] opacity-10 group-hover:opacity-20 transition-opacity rotate-12">{g.emoji.slice(0, 2)}</div>
                                            <div className="relative p-4 sm:p-5 min-h-[120px] sm:min-h-[140px] flex flex-col justify-end">
                                                <div className="text-2xl sm:text-3xl mb-1.5 drop-shadow-lg">{g.emoji.slice(0, 2)}</div>
                                                <h3 className="text-sm sm:text-base font-extrabold mb-0.5 tracking-tight">{g.name}</h3>
                                                <p className="text-white/60 text-[10px] sm:text-xs mb-2">{g.desc}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex items-center gap-1 bg-black/25 backdrop-blur-sm rounded-full px-2 py-1 text-[9px] font-semibold">
                                                        <FiUsers className="w-2.5 h-2.5" /> {g.players}P
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                {filteredGames.length === 0 && <p className="text-center text-white/20 py-10">No games found</p>}
                            </motion.div>
                        )}

                        {tab === 'sessions' && (
                            <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">

                                {(waitingSessions.length + activeSessions.length + finishedSessions.length) === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-5xl mb-4">🎮</div>
                                        <p className="text-white/40 mb-2">No active game sessions</p>
                                        <p className="text-xs text-white/20 mb-6">Start a game from the Game Library tab!</p>
                                        <button onClick={() => setTab('library')} className="px-6 py-2.5 bg-indigo-500 rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">
                                            Browse Games
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
                                                    onRejoin={() => { dispatch(setGameSession(s)); }} />
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
                                                    onRejoin={() => { dispatch(setGameSession(s)); }}
                                                    onMakeMove={makeMove} onRematch={requestRematch} />
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
                            </motion.div>
                        )}

                        {tab === 'spectate' && (
                            <motion.div key="spectate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

                                {!spectatingSessionId ? (
                                    <div className="text-center py-16">
                                        <div className="text-5xl mb-4">👁️</div>
                                        <p className="text-white/40 mb-2">Not spectating any game</p>
                                        <p className="text-xs text-white/20 mb-6">Go to Active Sessions and click Spectate on any game</p>
                                        <button onClick={() => setTab('sessions')} className="px-6 py-2.5 bg-indigo-500 rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">
                                            View Sessions
                                        </button>
                                    </div>
                                ) : activeSession ? (
                                    <div>
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

                                        {/* Players */}
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

                                        {/* Game Board — read-only view */}
                                        <div className="bg-white/[0.02] rounded-2xl border border-white/5 p-4 sm:p-6 mb-4">
                                            <SpectatorBoard session={activeSession} />
                                        </div>

                                        {/* Spectator List */}
                                        <div className="bg-white/[0.02] rounded-xl border border-white/5 p-3 sm:p-4">
                                            <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                <FiEye className="w-3 h-3" /> Spectators ({activeSession.spectators?.length || 0})
                                            </h4>
                                            {activeSession.spectators?.length > 0 ? (
                                                <div className="space-y-1.5">
                                                    {activeSession.spectators.map((s, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs text-white/50">
                                                            <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                                                {s.user?.username?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span className="truncate">{s.user?.username || 'Unknown'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-white/20">No other spectators</p>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

/* ─── Session Card Component ─── */
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
                    {MULTIPLAYER_GAMES.find(g => g.id === session.game)?.emoji?.slice(0, 2) || '🎮'}
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

                    {/* Spectator count */}
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

/* ─── Spectator Board — Read-only game display ─── */
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
