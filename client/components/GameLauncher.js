'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiRefreshCw, FiLink, FiArrowLeft } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

const GAMES = [
    { id: 'tic-tac-toe', name: 'Tic Tac Toe', emoji: '❌⭕', desc: 'Classic 3x3 grid — first to 3 in a row wins', players: '2 players', color: '#6366f1' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', emoji: '✊✋', desc: 'Pick rock, paper, or scissors', players: '2 players', color: '#ec4899' },
    { id: 'connect4', name: 'Connect 4', emoji: '🔴🟡', desc: 'Drop discs — 4 in a row wins!', players: '2 players', color: '#ef4444' },
];

export default function GameLauncher({ channelId, onClose, createGame, joinGame, makeGameMove, requestRematch, inviteCode }) {
    const gameSession = useSelector((s) => s.game?.session);
    const user = useSelector((s) => s.auth?.user);
    const [view, setView] = useState('lobby'); // lobby | playing

    useEffect(() => {
        if (gameSession?.status === 'in_progress' || gameSession?.status === 'waiting') {
            setView('playing');
        }
    }, [gameSession?.status]);

    const handleCreate = (gameName) => {
        createGame(gameName, channelId);
        setView('playing');
    };

    const handleJoin = () => {
        if (gameSession?._id) {
            joinGame(gameSession._id);
        }
    };

    const copyInviteLink = () => {
        if (!inviteCode) return;
        const url = `${window.location.origin}/invite/${inviteCode}?room=games`;
        navigator.clipboard?.writeText(url);
        toast.success('Game room invite copied!');
    };

    const isMyTurn = gameSession?.currentTurn?.toString() === user?._id?.toString();
    const myPlayerIndex = gameSession?.players?.findIndex(p => (p.user?._id || p.user)?.toString() === user?._id?.toString());
    const isInGame = myPlayerIndex !== undefined && myPlayerIndex >= 0;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#111427] border border-white/10 rounded-2xl w-full max-w-[520px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            {view === 'playing' && (
                                <button onClick={() => setView('lobby')} className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors flex-shrink-0">
                                    <FiArrowLeft className="w-4 h-4" />
                                </button>
                            )}
                            <IoGameControllerOutline className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 flex-shrink-0" />
                            <h2 className="text-sm sm:text-lg font-bold text-white truncate">
                                {view === 'lobby' ? 'Play Games Together' : gameSession?.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </h2>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {inviteCode && (
                                <button onClick={copyInviteLink}
                                    className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-white/25 hover:text-indigo-400 transition-colors" title="Copy Invite Link">
                                    <FiLink className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            )}
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {view === 'lobby' ? (
                            /* ─── GAME LOBBY ─── */
                            <div className="p-4 sm:p-6 space-y-3">
                                <p className="text-xs sm:text-sm text-white/40 mb-4">Pick a game to start — other members in this channel can join!</p>
                                {GAMES.map((game) => (
                                    <motion.div key={game.id} whileHover={{ scale: 1.02 }}
                                        onClick={() => handleCreate(game.id)}
                                        className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:bg-white/8 hover:border-indigo-500/30 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0"
                                                style={{ background: `${game.color}15` }}>
                                                {game.emoji.slice(0, 2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">{game.name}</h3>
                                                <p className="text-[10px] sm:text-xs text-white/30 mt-0.5 truncate">{game.desc}</p>
                                            </div>
                                            <span className="text-[9px] sm:text-[10px] bg-white/5 text-white/30 px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap">{game.players}</span>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Active game session */}
                                {gameSession && gameSession.status !== 'finished' && (
                                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <p className="text-sm text-emerald-400 font-medium">🎮 Active game session!</p>
                                        <button onClick={() => setView('playing')}
                                            className="mt-2 w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors">
                                            Rejoin Game
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ─── GAME VIEW ─── */
                            <div className="p-4 sm:p-6">
                                {gameSession?.game === 'tic-tac-toe' && (
                                    <TicTacToeBoard
                                        session={gameSession}
                                        user={user}
                                        isMyTurn={isMyTurn}
                                        myPlayerIndex={myPlayerIndex}
                                        onMove={(pos) => makeGameMove(gameSession._id, { position: pos })}
                                        onRematch={() => requestRematch(gameSession._id)}
                                    />
                                )}
                                {gameSession?.game === 'rock-paper-scissors' && (
                                    <RPSBoard
                                        session={gameSession}
                                        user={user}
                                        onMove={(choice) => makeGameMove(gameSession._id, { choice })}
                                        onRematch={() => requestRematch(gameSession._id)}
                                    />
                                )}
                                {gameSession?.game === 'connect4' && (
                                    <Connect4Board
                                        session={gameSession}
                                        user={user}
                                        isMyTurn={isMyTurn}
                                        myPlayerIndex={myPlayerIndex}
                                        onMove={(col) => makeGameMove(gameSession._id, { column: col })}
                                        onRematch={() => requestRematch(gameSession._id)}
                                    />
                                )}
                                {(!gameSession || gameSession.status === 'waiting') && (
                                    <div className="text-center py-8">
                                        {isInGame ? (
                                            <>
                                                <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                                <p className="text-white/50">Waiting for another player to join...</p>
                                                <p className="text-xs text-white/20 mt-1">Share with server members!</p>
                                                {inviteCode && (
                                                    <button onClick={copyInviteLink}
                                                        className="mt-3 px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-medium hover:bg-indigo-500/30 transition-colors inline-flex items-center gap-1.5">
                                                        <FiLink className="w-3 h-3" /> Copy Invite Link
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-3xl mx-auto mb-4">🎮</div>
                                                <p className="text-white/60 font-medium mb-1">
                                                    {gameSession?.players?.[0]?.user?.username || 'A player'} wants to play!
                                                </p>
                                                <p className="text-sm text-white/30 mb-4">{gameSession?.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                                                <button onClick={handleJoin}
                                                    className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
                                                    🎮 Join Game
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ─── TIC TAC TOE ─── */
function TicTacToeBoard({ session, user, isMyTurn, myPlayerIndex, onMove, onRematch }) {
    const board = session?.state?.board || Array(9).fill(null);
    const isFinished = session?.status === 'finished';
    const mySymbol = myPlayerIndex === 0 ? 'X' : 'O';
    const winnerId = session?.winner;
    const isWinner = winnerId?.toString() === user?._id?.toString();

    return (
        <div className="flex flex-col items-center">
            {/* Status */}
            <div className="mb-4 text-center">
                {isFinished ? (
                    <p className={`text-lg font-bold ${isWinner ? 'text-emerald-400' : winnerId ? 'text-red-400' : 'text-amber-400'}`}>
                        {isWinner ? '🎉 You Won!' : winnerId ? '😔 You Lost' : '🤝 Draw!'}
                    </p>
                ) : (
                    <p className={`text-sm font-medium ${isMyTurn ? 'text-emerald-400' : 'text-white/40'}`}>
                        {isMyTurn ? `Your turn (${mySymbol})` : "Opponent's turn..."}
                    </p>
                )}
            </div>

            {/* Board */}
            <div className="grid grid-cols-3 gap-2 w-[210px] sm:w-[240px]">
                {board.map((cell, idx) => (
                    <motion.button key={idx} whileHover={!cell && isMyTurn ? { scale: 1.05 } : {}}
                        whileTap={!cell && isMyTurn ? { scale: 0.95 } : {}}
                        onClick={() => !cell && isMyTurn && !isFinished && onMove(idx)}
                        className={`w-[66px] h-[66px] sm:w-[76px] sm:h-[76px] rounded-xl text-xl sm:text-2xl font-bold flex items-center justify-center transition-all
                            ${cell ? 'cursor-default' : isMyTurn ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed'}
                            ${cell === 'X' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' :
                                cell === 'O' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' :
                                    'bg-white/5 border border-white/10'}`}>
                        {cell}
                    </motion.button>
                ))}
            </div>

            {/* Players */}
            <div className="flex gap-3 sm:gap-4 mt-4">
                {session?.players?.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs ${session.currentTurn?.toString() === (p.user?._id || p.user)?.toString()
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-white/5 text-white/40'}`}>
                        <span className="font-bold">{i === 0 ? 'X' : 'O'}</span>
                        <span className="truncate max-w-[60px] sm:max-w-none">{p.user?.username || 'Player'}</span>
                        <span className="text-white/20">({p.score || 0})</span>
                    </div>
                ))}
            </div>

            {isFinished && (
                <button onClick={onRematch}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">
                    <FiRefreshCw className="w-4 h-4" /> Rematch
                </button>
            )}
        </div>
    );
}

/* ─── ROCK PAPER SCISSORS ─── */
function RPSBoard({ session, user, onMove, onRematch }) {
    const choices = ['rock', 'paper', 'scissors'];
    const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
    const myChoice = session?.state?.choices?.[user?._id];
    const isFinished = session?.status === 'finished';
    const result = session?.state?.result;
    const isWinner = result === user?._id?.toString();
    const isDraw = result === 'draw';

    return (
        <div className="flex flex-col items-center">
            {/* Status */}
            <div className="mb-6 text-center">
                {isFinished ? (
                    <p className={`text-lg font-bold ${isWinner ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-red-400'}`}>
                        {isWinner ? '🎉 You Won!' : isDraw ? '🤝 Draw!' : '😔 You Lost'}
                    </p>
                ) : myChoice ? (
                    <p className="text-sm text-white/40">Waiting for opponent...</p>
                ) : (
                    <p className="text-sm text-emerald-400 font-medium">Pick your weapon!</p>
                )}
            </div>

            {/* Choices */}
            <div className="flex gap-3 sm:gap-4">
                {choices.map((choice) => (
                    <motion.button key={choice}
                        whileHover={!myChoice && !isFinished ? { scale: 1.1, y: -5 } : {}}
                        whileTap={!myChoice && !isFinished ? { scale: 0.9 } : {}}
                        onClick={() => !myChoice && !isFinished && onMove(choice)}
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl text-3xl sm:text-4xl flex items-center justify-center transition-all
                            ${myChoice === choice ? 'bg-indigo-500/30 border-2 border-indigo-400 ring-4 ring-indigo-500/20' :
                                myChoice ? 'opacity-30 cursor-not-allowed' :
                                    'bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10'}`}>
                        {emojis[choice]}
                    </motion.button>
                ))}
            </div>

            {/* Reveal */}
            {isFinished && (
                <div className="mt-6 flex items-center gap-6">
                    {session?.players?.map((p, i) => {
                        const pChoice = session.state.choices[(p.user?._id || p.user)?.toString()];
                        return (
                            <div key={i} className="text-center">
                                <div className="text-4xl sm:text-5xl mb-2">{emojis[pChoice] || '❓'}</div>
                                <p className="text-xs text-white/40 truncate max-w-[80px]">{p.user?.username || 'Player'}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {isFinished && (
                <button onClick={onRematch}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">
                    <FiRefreshCw className="w-4 h-4" /> Rematch
                </button>
            )}
        </div>
    );
}

/* ─── CONNECT 4 ─── */
function Connect4Board({ session, user, isMyTurn, myPlayerIndex, onMove, onRematch }) {
    const board = session?.state?.board || Array(6).fill(null).map(() => Array(7).fill(null));
    const isFinished = session?.status === 'finished';
    const myColor = myPlayerIndex === 0 ? 'R' : 'Y';
    const winnerId = session?.winner;
    const isWinner = winnerId?.toString() === user?._id?.toString();
    const [hoverCol, setHoverCol] = useState(null);

    return (
        <div className="flex flex-col items-center">
            {/* Status */}
            <div className="mb-3 sm:mb-4 text-center">
                {isFinished ? (
                    <p className={`text-lg font-bold ${isWinner ? 'text-emerald-400' : winnerId ? 'text-red-400' : 'text-amber-400'}`}>
                        {isWinner ? '🎉 You Won!' : winnerId ? '😔 You Lost' : '🤝 Draw!'}
                    </p>
                ) : (
                    <p className={`text-sm font-medium ${isMyTurn ? 'text-emerald-400' : 'text-white/40'}`}>
                        {isMyTurn ? `Your turn (${myColor === 'R' ? '🔴' : '🟡'})` : "Opponent's turn..."}
                    </p>
                )}
            </div>

            {/* Board */}
            <div className="bg-indigo-900/30 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border border-indigo-500/20">
                {/* Column hover indicators */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
                    {Array(7).fill(null).map((_, col) => (
                        <div key={col}
                            className={`h-2 sm:h-3 rounded-full transition-all ${hoverCol === col && isMyTurn ? (myColor === 'R' ? 'bg-red-400/50' : 'bg-yellow-400/50') : 'bg-transparent'}`} />
                    ))}
                </div>
                {board.map((row, ri) => (
                    <div key={ri} className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 last:mb-0">
                        {row.map((cell, ci) => (
                            <button key={ci}
                                onClick={() => isMyTurn && !isFinished && !board[0][ci] && onMove(ci)}
                                onMouseEnter={() => setHoverCol(ci)}
                                onMouseLeave={() => setHoverCol(null)}
                                disabled={!isMyTurn || isFinished || !!board[0][ci]}
                                className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full border-2 transition-all flex items-center justify-center
                                    ${cell === 'R' ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/20' :
                                    cell === 'Y' ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-400/20' :
                                    'bg-indigo-950/50 border-indigo-800/30'} 
                                    ${!cell && isMyTurn && !isFinished && !board[0][ci] ? 'cursor-pointer hover:border-white/30' : !cell ? 'cursor-not-allowed' : ''}`}>
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            {/* Players */}
            <div className="flex gap-3 sm:gap-4 mt-3 sm:mt-4">
                {session?.players?.map((p, i) => (
                    <div key={i} className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs ${session.currentTurn?.toString() === (p.user?._id || p.user)?.toString()
                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-white/5 text-white/40'}`}>
                        <span>{i === 0 ? '🔴' : '🟡'}</span>
                        <span className="truncate max-w-[60px] sm:max-w-none">{p.user?.username || 'Player'}</span>
                        <span className="text-white/20">({p.score || 0})</span>
                    </div>
                ))}
            </div>

            {isFinished && (
                <button onClick={onRematch}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-colors">
                    <FiRefreshCw className="w-4 h-4" /> Rematch
                </button>
            )}
        </div>
    );
}
