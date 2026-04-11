'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiEye, FiCheck, FiX, FiClock, FiPlay, FiRefreshCw, FiPlus, FiGrid, FiActivity, FiAward } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import { useAuth } from '../../../hooks/useAuth';
import { getSocket } from '../../../services/socket';
import api from '../../../services/api';
import { setGameSession, setServerSessions, updateServerSession, setSpectatingSessionId, clearGame } from '../../../redux/gameSlice';
import toast from 'react-hot-toast';

const MULTIPLAYER_GAMES = [
    { id: 'tic-tac-toe', name: 'Tic-Tac-Toe', emoji: '❌⭕', players: '2', desc: 'Classic X vs O battle', color: 'from-indigo-500/20 to-purple-500/20', border: 'border-indigo-500/20' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', emoji: '✊✋', players: '2', desc: 'Quick reflex showdown', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/20' },
    { id: 'connect4', name: 'Connect 4', emoji: '🔴🟡', players: '2', desc: 'Drop & connect strategy', color: 'from-red-500/20 to-yellow-500/20', border: 'border-red-500/20' },
    { id: 'chess', name: 'Chess', emoji: '♟️👑', players: '2', desc: 'The ultimate strategy game', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/20' },
    { id: 'checkers', name: 'Checkers', emoji: '🏁⚫', players: '2', desc: 'Jump & capture classic', color: 'from-stone-500/20 to-zinc-500/20', border: 'border-stone-500/20' },
    { id: 'battleship', name: 'Battleship', emoji: '🚢💥', players: '2', desc: 'Naval warfare strategy', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/20' },
    { id: 'pong', name: 'Ping Pong', emoji: '🏓🏓', players: '2', desc: 'Fast-paced paddle action', color: 'from-lime-500/20 to-green-500/20', border: 'border-lime-500/20' },
    { id: 'ludo', name: 'Ludo', emoji: '🎲🎲', players: '2-4', desc: 'Roll dice & race home', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/20' },
    { id: 'quiz', name: 'Quiz Battle', emoji: '🧠❓', players: '2+', desc: 'Test your knowledge', color: 'from-violet-500/20 to-fuchsia-500/20', border: 'border-violet-500/20' },
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

    // Fetch server sessions
    const fetchSessions = useCallback(async () => {
        if (!serverId) return;
        try {
            const { data } = await api.get(`/games/server/${serverId}`);
            dispatch(setServerSessions(data.sessions || []));
        } catch (e) { console.error('Failed to fetch sessions', e); }
    }, [serverId, dispatch]);

    useEffect(() => { fetchSessions(); }, [fetchSessions]);

    // Poll sessions every 15s for live updates
    useEffect(() => {
        const interval = setInterval(fetchSessions, 15000);
        return () => clearInterval(interval);
    }, [fetchSessions]);

    // Socket events
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleUpdated = ({ session }) => { dispatch(updateServerSession(session)); };
        const handleCreated = ({ session }) => {
            dispatch(updateServerSession(session));
        };
        // Creator receives this — enter game UI immediately
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
            if (session.status === 'in_progress') toast.success('Game started!');
        };
        const handleRematch = ({ session }) => { dispatch(setGameSession(session)); dispatch(updateServerSession(session)); };
        const handleCancelled = ({ session }) => {
            dispatch(clearGame());
            if (session) dispatch(updateServerSession(session));
            toast('Game was cancelled', { icon: '🚫' });
        };
        const handleForfeited = ({ session, forfeitedBy }) => {
            dispatch(clearGame());
            if (session) dispatch(updateServerSession(session));
            if (forfeitedBy === user?._id) {
                toast('You forfeited the game', { icon: '🏳️' });
            } else {
                toast('Opponent forfeited — you win!', { icon: '🏆' });
            }
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
    }, [dispatch]);

    const createGame = (gameId) => {
        const socket = getSocket();
        if (!socket || !serverId) return;
        // Block if user already has active game
        if (myActiveSession) {
            toast.error('You already have an active game. Cancel or finish it first.');
            return;
        }
        setCreatingGame(gameId);
        socket.emit('game:create', { game: gameId, serverId, channelId: currentServer?.channels?.[0] });
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
    const forfeitGame = (sessionId) => {
        if (confirm('Are you sure you want to forfeit? The other player will win.')) {
            const s = getSocket(); s?.emit('game:forfeit', { sessionId });
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

    // Check if user is actively in a game session
    const isInGame = activeSession &&
        activeSession.players?.some(p => (p.user?._id || p.user)?.toString() === user?._id?.toString()) &&
        !spectatingSessionId;

    const makeMove = (move) => {
        const socket = getSocket();
        if (!socket || !activeSession) return;
        socket.emit('game:move', { sessionId: activeSession._id, move });
    };

    // ── GAME PLAY OVERLAY ──
    // When user has an active session and is a player, show the game interface
    if (isInGame) {
        const session = activeSession;
        const gameName = session.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const gameEmoji = MULTIPLAYER_GAMES.find(g => g.id === session.game)?.emoji?.slice(0, 2) || '🎮';
        const myIndex = session.players?.findIndex(p => (p.user?._id || p.user)?.toString() === user?._id?.toString());
        const opponentPlayer = session.players?.find((p, i) => i !== myIndex);
        const isMyTurn = (session.currentTurn?._id || session.currentTurn)?.toString() === user?._id?.toString();
        const isFinished = session.status === 'finished';
        const isWaiting = session.status === 'waiting';
        const iWon = session.winner?.toString() === user?._id?.toString() || session.winner?._id?.toString() === user?._id?.toString();
        const isDraw = isFinished && !session.winner;

        return (
            <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden flex-col">
                {/* Game Header */}
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                    <button onClick={() => dispatch(clearGame())}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xl">{gameEmoji}</span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm sm:text-lg font-bold truncate">{gameName}</h1>
                        <p className="text-[10px] sm:text-xs text-white/30 truncate">
                            {isWaiting ? 'Waiting for opponent…' :
                             isFinished ? (iWon ? '🎉 You won!' : isDraw ? '🤝 Draw!' : '😔 You lost') :
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
                        const isMe = (p.user?._id || p.user)?.toString() === user?._id?.toString();
                        const isTurn = (session.currentTurn?._id || session.currentTurn)?.toString() === (p.user?._id || p.user)?.toString();
                        return (
                            <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all ${
                                isTurn && !isFinished
                                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                    : 'bg-white/5 text-white/40'
                            }`}>
                                <span className="font-bold">{i === 0 ? '🔵' : '🔴'}</span>
                                <span className="font-medium truncate max-w-[80px]">{isMe ? 'You' : (p.user?.username || 'Player')}</span>
                                {isTurn && !isFinished && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />}
                            </div>
                        );
                    })}
                </div>

                {/* Game board */}
                <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
                    {isWaiting ? (
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6" />
                            <p className="text-white/60 text-lg font-medium mb-2">Waiting for opponent…</p>
                            <p className="text-white/20 text-sm">Share the Live Sessions tab with friends</p>
                            {/* Show join requests if host */}
                            {session.joinRequests?.filter(r => r.status === 'pending').length > 0 && (
                                <div className="mt-6 space-y-2 max-w-xs mx-auto">
                                    <p className="text-amber-400/70 text-xs font-bold">Join Requests:</p>
                                    {session.joinRequests.filter(r => r.status === 'pending').map((req, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                            <span className="text-xs text-white/60 flex-1">{req.user?.username || 'Player'}</span>
                                            <button onClick={() => acceptJoin(session._id, req.user?._id || req.user)}
                                                className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-medium">
                                                Accept
                                            </button>
                                            <button onClick={() => declineJoin(session._id, req.user?._id || req.user)}
                                                className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs">
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-md mx-auto">
                            {/* Result banner */}
                            {isFinished && (
                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className={`text-center mb-6 p-4 rounded-2xl font-bold text-lg ${
                                        iWon ? 'bg-emerald-500/15 text-emerald-400' :
                                        isDraw ? 'bg-amber-500/15 text-amber-300' :
                                        'bg-red-500/15 text-red-400'
                                    }`}>
                                    {iWon ? '🎉 You Won!' : isDraw ? '🤝 Draw!' : '😔 You Lost'}
                                </motion.div>
                            )}

                            {/* Tic-Tac-Toe Board */}
                            {session.game === 'tic-tac-toe' && (() => {
                                const board = session.state?.board || Array(9).fill(null);
                                const mySymbol = myIndex === 0 ? 'X' : 'O';
                                return (
                                    <div>
                                        {!isFinished && <p className="text-center text-white/30 mb-4 text-sm">You are <span className="font-bold text-indigo-400">{mySymbol}</span></p>}
                                        <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
                                            {board.map((cell, i) => (
                                                <motion.button key={i}
                                                    whileHover={!cell && isMyTurn && !isFinished ? { scale: 1.08 } : {}}
                                                    whileTap={!cell && isMyTurn && !isFinished ? { scale: 0.95 } : {}}
                                                    onClick={() => { if (!cell && isMyTurn && !isFinished) makeMove({ position: i }); }}
                                                    className={`aspect-square rounded-xl text-3xl sm:text-4xl font-black flex items-center justify-center transition-all border ${
                                                        cell === 'X' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' :
                                                        cell === 'O' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
                                                        isMyTurn && !isFinished ? 'bg-white/[0.03] border-white/10 hover:bg-white/10 cursor-pointer' :
                                                        'bg-white/[0.02] border-white/5'
                                                    }`}>
                                                    {cell && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>{cell}</motion.span>}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Rock Paper Scissors */}
                            {session.game === 'rock-paper-scissors' && (() => {
                                const choices = session.state?.choices || {};
                                const myChoice = choices[user?._id];
                                const allChosen = Object.keys(choices).length >= 2;
                                const options = [
                                    { id: 'rock', emoji: '🪨', label: 'Rock' },
                                    { id: 'paper', emoji: '📄', label: 'Paper' },
                                    { id: 'scissors', emoji: '✂️', label: 'Scissors' },
                                ];
                                return (
                                    <div className="text-center">
                                        {!myChoice && !isFinished ? (
                                            <>
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
                                            </>
                                        ) : myChoice && !allChosen && !isFinished ? (
                                            <div>
                                                <p className="text-white/30 mb-4">You chose</p>
                                                <div className="w-24 h-24 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-5xl mx-auto mb-4">
                                                    {options.find(o => o.id === myChoice)?.emoji}
                                                </div>
                                                <p className="text-white/20 text-sm animate-pulse">Waiting for opponent…</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-8">
                                                {session.players?.map((p, i) => {
                                                    const pId = (p.user?._id || p.user)?.toString();
                                                    const choice = choices[pId];
                                                    return (
                                                        <div key={i} className="text-center">
                                                            <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl mb-2">
                                                                {choice ? (options.find(o => o.id === choice)?.emoji || '❓') : '⏳'}
                                                            </div>
                                                            <p className="text-xs text-white/40">{pId === user?._id ? 'You' : (p.user?.username || 'Opponent')}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Connect 4 */}
                            {session.game === 'connect4' && (() => {
                                const board = session.state?.board || Array(6).fill(null).map(() => Array(7).fill(null));
                                const myColor = myIndex === 0 ? 'R' : 'Y';
                                return (
                                    <div>
                                        {!isFinished && <p className="text-center text-white/30 mb-4 text-sm">You are <span className={`font-bold ${myColor === 'R' ? 'text-red-400' : 'text-yellow-400'}`}>{myColor === 'R' ? '🔴 Red' : '🟡 Yellow'}</span></p>}
                                        <div className="bg-indigo-900/30 rounded-xl p-2 sm:p-3 border border-indigo-500/20 inline-block mx-auto">
                                            {/* Column buttons */}
                                            {isMyTurn && !isFinished && (
                                                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
                                                    {Array(7).fill(null).map((_, col) => (
                                                        <button key={col} onClick={() => makeMove({ column: col })}
                                                            disabled={board[0][col] !== null}
                                                            className="h-6 rounded bg-white/5 hover:bg-indigo-500/20 transition-colors text-[10px] text-white/20 hover:text-indigo-400 disabled:opacity-20 disabled:cursor-not-allowed">
                                                            ▼
                                                        </button>
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
                            })()}

                            {/* Fallback for unsupported games */}
                            {!['tic-tac-toe', 'rock-paper-scissors', 'connect4'].includes(session.game) && (
                                <div className="text-center py-8">
                                    <p className="text-5xl mb-4">{gameEmoji}</p>
                                    <p className="text-white/40 mb-2">Multiplayer board coming soon for {gameName}</p>
                                    <p className="text-white/20 text-sm">Use spectator view for now</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden flex-col">
            {/* Header */}
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

            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-[#0e1020] flex-shrink-0 px-2 sm:px-4">
                {TABS.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-colors ${
                            activeTab === tab.id
                                ? 'text-white'
                                : 'text-white/30 hover:text-white/60'
                        }`}>
                        <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="sm:hidden">{tab.mobileLabel}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                        {tab.id === 'live' && liveCount > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 min-w-[18px] text-center">
                                {liveCount}
                            </span>
                        )}
                        {activeTab === tab.id && (
                            <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Active game banner */}
            {myActiveSession && (
                <div className="mx-4 sm:mx-6 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-emerald-400 font-medium flex-1 truncate">
                        You're in a {myActiveSession.game?.replace(/-/g, ' ')} game ({myActiveSession.status === 'waiting' ? 'waiting' : 'in progress'})
                    </p>
                    <button onClick={() => dispatch(setGameSession(myActiveSession))}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] sm:text-xs font-medium hover:bg-emerald-600 transition-colors flex-shrink-0">
                        Rejoin
                    </button>
                    <button onClick={() => myActiveSession.status === 'in_progress' ? forfeitGame(myActiveSession._id) : cancelGame(myActiveSession._id)}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-red-500/20 transition-colors flex-shrink-0">
                        {myActiveSession.status === 'in_progress' ? '🏳️ Forfeit' : '✕ Cancel'}
                    </button>
                </div>
            )}

            {/* Spectating banner */}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                    <AnimatePresence mode="wait">
                        {/* ══════════════ GAMES TAB ══════════════ */}
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
                                            {/* Glow effect */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative">
                                                <div className="flex items-start justify-between mb-3">
                                                    <span className="text-2xl sm:text-3xl">{g.emoji.slice(0, 2)}</span>
                                                    <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-medium">
                                                        {g.players} players
                                                    </span>
                                                </div>
                                                <h3 className="text-sm sm:text-base font-bold text-white/90 group-hover:text-white transition-colors mb-1">{g.name}</h3>
                                                <p className="text-[10px] sm:text-xs text-white/30 group-hover:text-white/50 transition-colors">{g.desc}</p>
                                                <div className="mt-3 flex items-center gap-1.5">
                                                    {creatingGame === g.id ? (
                                                        <div className="flex items-center gap-2 text-[10px] text-indigo-400">
                                                            <div className="w-3 h-3 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                                                            Creating…
                                                        </div>
                                                    ) : myActiveSession ? (
                                                        <span className="text-[10px] text-red-400/60 font-medium">
                                                            ⚠️ You have an active game
                                                        </span>
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

                        {/* ══════════════ LIVE SESSIONS TAB ══════════════ */}
                        {activeTab === 'live' && (
                            <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                                className="space-y-5">

                                {liveSessions.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-4xl sm:text-5xl mb-4">🎮</div>
                                        <p className="text-white/40 mb-2 text-sm sm:text-base">No live sessions right now</p>
                                        <p className="text-xs text-white/20 mb-6">Go to the Games tab to start one!</p>
                                        <button onClick={() => setActiveTab('games')}
                                            className="px-5 py-2.5 bg-indigo-500 rounded-xl text-xs sm:text-sm font-medium hover:bg-indigo-600 transition-colors">
                                            <FiGrid className="w-4 h-4 inline mr-1.5" /> Browse Games
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

                                {/* In-progress sessions */}
                                {activeSessions.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-emerald-400/60 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <FiPlay className="w-3 h-3" /> In Progress ({activeSessions.length})
                                        </h3>
                                        <div className="space-y-2">
                                            {activeSessions.map(s => (
                                                <SessionCard key={s._id} session={s} user={user}
                                                    onSpectate={spectateGame} onForfeit={forfeitGame}
                                                    onRejoin={() => dispatch(setGameSession(s))} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ══════════════ HISTORY TAB ══════════════ */}
                        {activeTab === 'history' && (
                            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

                                {finishedSessions.length === 0 && (
                                    <div className="text-center py-16">
                                        <div className="text-4xl sm:text-5xl mb-4">🏆</div>
                                        <p className="text-white/40 mb-2 text-sm sm:text-base">No game history yet</p>
                                        <p className="text-xs text-white/20">Completed games will appear here</p>
                                    </div>
                                )}

                                {finishedSessions.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-bold text-white/20 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            🏁 Recently Finished ({finishedSessions.length})
                                        </h3>
                                        <div className="space-y-2">
                                            {finishedSessions.slice(0, 20).map(s => (
                                                <SessionCard key={s._id} session={s} user={user} onRematch={requestRematch} />
                                            ))}
                                        </div>
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

/* ─── Session Card ─── */
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
                         `🏆 ${winnerPlayer?.user?.username || (session.winner ? 'Winner' : 'Draw')} • ${playerNames?.join(' vs ')}`}
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
                    {session.status === 'waiting' && isPlayer && (
                        <button onClick={() => onCancel?.(session._id)}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-red-500/20">
                            ✕ Cancel
                        </button>
                    )}
                    {session.status === 'in_progress' && isPlayer && (
                        <>
                            <button onClick={() => onRejoin?.()}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">
                                Rejoin
                            </button>
                            <button onClick={() => onForfeit?.(session._id)}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-red-500/20">
                                🏳️ Forfeit
                            </button>
                        </>
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
        </motion.div>
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
