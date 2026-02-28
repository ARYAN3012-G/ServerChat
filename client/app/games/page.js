'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRotateCw, FiUsers, FiCpu, FiAward, FiZap } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';

// ─── HIGH SCORE HELPERS ─────────────────────────────────────
const getHighScore = (game) => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(`hs_${game}`) || '0');
};
const setHighScore = (game, score) => {
    const current = getHighScore(game);
    if (score > current) { localStorage.setItem(`hs_${game}`, score.toString()); return true; }
    return false;
};

// ─── GAME DATA ──────────────────────────────────────────────
const GAMES = [
    { id: 'ttt', name: 'Tic-Tac-Toe', desc: 'Classic 3×3 strategy', gradient: 'from-violet-600 via-indigo-500 to-blue-500', glow: 'shadow-indigo-500/30', icon: '🎯', modes: ['cpu', '2player'] },
    { id: 'rps', name: 'Rock Paper Scissors', desc: 'Best of rounds', gradient: 'from-rose-600 via-pink-500 to-fuchsia-500', glow: 'shadow-pink-500/30', icon: '⚔️', modes: ['cpu'] },
    { id: 'memory', name: 'Memory Match', desc: 'Find matching pairs', gradient: 'from-emerald-600 via-teal-500 to-cyan-500', glow: 'shadow-teal-500/30', icon: '🧠', modes: ['solo'] },
    { id: 'snake', name: 'Snake', desc: 'Eat, grow, survive', gradient: 'from-lime-600 via-green-500 to-emerald-500', glow: 'shadow-green-500/30', icon: '🐍', modes: ['solo'] },
];

const MEMORY_ICONS = ['🎮', '🎲', '🎯', '🏆', '⭐', '💎', '🔥', '🚀'];

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function GamesPage() {
    const router = useRouter();
    const [activeGame, setActiveGame] = useState(null);
    const [gameMode, setGameMode] = useState(null);
    const [selectingMode, setSelectingMode] = useState(null);

    const handlePick = (g) => {
        if (g.modes.length === 1 && g.modes[0] === 'solo') { setActiveGame(g.id); setGameMode('solo'); }
        else if (g.modes.length === 1) { setActiveGame(g.id); setGameMode(g.modes[0]); }
        else setSelectingMode(g);
    };

    const startWithMode = (mode) => { setActiveGame(selectingMode.id); setGameMode(mode); setSelectingMode(null); };
    const goBack = () => { setActiveGame(null); setGameMode(null); };

    return (
        <div className="flex h-screen bg-[#0c0e1a] text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-[72px] bg-[#080a14] flex flex-col items-center py-3 gap-2 border-r border-white/5">
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500 cursor-pointer transition-all" title="Back to Chat">
                    <FiArrowLeft className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-0.5 bg-white/10 rounded-full mx-auto" />
                {GAMES.map(g => (
                    <motion.div key={g.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => handlePick(g)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all text-xl ${activeGame === g.id ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                        title={g.name}>
                        {g.icon}
                    </motion.div>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto relative">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
                </div>

                <AnimatePresence mode="wait">
                    {/* ─── LOBBY ─── */}
                    {!activeGame && !selectingMode && (
                        <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative max-w-5xl mx-auto px-8 py-10">
                            <div className="text-center mb-14">
                                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-6">
                                    <IoGameControllerOutline className="w-5 h-5 text-indigo-400" />
                                    <span className="text-sm font-medium text-indigo-300">Game Center</span>
                                </motion.div>
                                <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                                    className="text-6xl font-black mb-4 tracking-tight">
                                    <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">Choose Your Game</span>
                                </motion.h1>
                                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                                    className="text-white/40 text-lg max-w-md mx-auto">Challenge yourself or a friend. Track your best scores and climb the leaderboard.</motion.p>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                {GAMES.map((g, i) => (
                                    <motion.div key={g.id}
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 + i * 0.08 }}
                                        whileHover={{ y: -6, scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handlePick(g)}
                                        className={`relative rounded-2xl cursor-pointer overflow-hidden shadow-2xl ${g.glow} group`}>
                                        {/* Card bg */}
                                        <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient} opacity-90`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                        {/* Shimmer */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        {/* Large bg icon */}
                                        <div className="absolute -right-4 -top-4 text-[120px] opacity-10 group-hover:opacity-20 transition-opacity rotate-12">{g.icon}</div>

                                        <div className="relative p-8 min-h-[200px] flex flex-col justify-end">
                                            <div className="text-5xl mb-4 drop-shadow-lg">{g.icon}</div>
                                            <h3 className="text-2xl font-extrabold mb-1 tracking-tight">{g.name}</h3>
                                            <p className="text-white/60 text-sm mb-5">{g.desc}</p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold">
                                                    <FiUsers className="w-3.5 h-3.5" />
                                                    {g.modes.includes('2player') ? '1–2 Players' : g.modes.includes('cpu') ? 'vs CPU' : 'Solo'}
                                                </div>
                                                {getHighScore(g.id) > 0 && (
                                                    <div className="flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 rounded-full px-3 py-1.5 text-xs font-semibold text-amber-300">
                                                        <FiAward className="w-3.5 h-3.5" /> Best: {getHighScore(g.id)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ─── MODE SELECT ─── */}
                    {selectingMode && (
                        <motion.div key="mode" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative max-w-lg mx-auto px-8 py-20 text-center">
                            <div className="text-7xl mb-6">{selectingMode.icon}</div>
                            <h2 className="text-4xl font-black mb-2 tracking-tight">{selectingMode.name}</h2>
                            <p className="text-white/40 mb-10">Choose how you want to play</p>
                            <div className="space-y-4">
                                {selectingMode.modes.includes('cpu') && (
                                    <motion.button whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => startWithMode('cpu')}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 flex items-center gap-5 shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow text-left">
                                        <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center"><FiCpu className="w-7 h-7" /></div>
                                        <div><p className="font-bold text-lg">vs Computer</p><p className="text-white/60 text-sm">Challenge the AI opponent</p></div>
                                        <FiZap className="w-5 h-5 ml-auto text-white/30" />
                                    </motion.button>
                                )}
                                {selectingMode.modes.includes('2player') && (
                                    <motion.button whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => startWithMode('2player')}
                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 flex items-center gap-5 shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-shadow text-left">
                                        <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center"><FiUsers className="w-7 h-7" /></div>
                                        <div><p className="font-bold text-lg">2 Players</p><p className="text-white/60 text-sm">Play with a friend locally</p></div>
                                        <FiZap className="w-5 h-5 ml-auto text-white/30" />
                                    </motion.button>
                                )}
                            </div>
                            <button onClick={() => setSelectingMode(null)} className="mt-8 text-white/30 hover:text-white text-sm flex items-center gap-1 mx-auto transition-colors"><FiArrowLeft className="w-4 h-4" /> Back to Lobby</button>
                        </motion.div>
                    )}

                    {activeGame === 'ttt' && <TicTacToe key="ttt" goBack={goBack} mode={gameMode} />}
                    {activeGame === 'rps' && <RockPaperScissors key="rps" goBack={goBack} />}
                    {activeGame === 'memory' && <MemoryMatch key="memory" goBack={goBack} />}
                    {activeGame === 'snake' && <SnakeGame key="snake" goBack={goBack} />}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── GAME HEADER ────────────────────────────────────────────
function GameHeader({ title, gradient, goBack, onReset, children }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="relative max-w-lg mx-auto px-8 py-8 text-center">
            <div className="flex items-center justify-between mb-6">
                <button onClick={goBack} className="flex items-center gap-1.5 text-white/30 hover:text-white text-sm transition-colors"><FiArrowLeft className="w-4 h-4" /> Lobby</button>
                <h2 className={`text-2xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{title}</h2>
                <button onClick={onReset} className="text-white/30 hover:text-white transition-colors" title="Reset"><FiRotateCw className="w-5 h-5" /></button>
            </div>
            {children}
        </motion.div>
    );
}

// ─── SCORE PANEL ────────────────────────────────────────────
function ScorePanel({ items }) {
    return (
        <div className="flex justify-center gap-3 mb-6">
            {items.map((item, i) => (
                <div key={i} className={`rounded-xl px-5 py-3 backdrop-blur-sm border ${item.border || 'border-white/10'} ${item.bg || 'bg-white/5'}`}>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40">{item.label}</p>
                    <p className={`text-2xl font-black ${item.color || 'text-white'}`}>{item.value}</p>
                </div>
            ))}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// TIC-TAC-TOE
// ═══════════════════════════════════════════════════════════
function TicTacToe({ goBack, mode }) {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState('X');
    const [winner, setWinner] = useState(null);
    const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
    const [winLine, setWinLine] = useState(null);

    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

    const check = (b) => {
        for (const [a, c, d] of LINES) {
            if (b[a] && b[a] === b[c] && b[a] === b[d]) { setWinLine([a, c, d]); return b[a]; }
        }
        return b.every(Boolean) ? 'draw' : null;
    };

    const cpuMove = (b) => {
        const empty = b.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (!empty.length) return b;
        for (const i of empty) { const t = [...b]; t[i] = 'O'; if (check(t) === 'O') { b[i] = 'O'; return [...b]; } }
        setWinLine(null);
        for (const i of empty) { const t = [...b]; t[i] = 'X'; for (const [a, c, d] of LINES) { if (t[a] && t[a] === t[c] && t[a] === t[d]) { b[i] = 'O'; return [...b]; } } }
        if (b[4] === null) { b[4] = 'O'; return [...b]; }
        b[empty[Math.floor(Math.random() * empty.length)]] = 'O';
        return [...b];
    };

    const handleClick = (i) => {
        if (board[i] || winner) return;
        const nb = [...board]; nb[i] = turn;
        let w = check(nb);
        if (w) { setBoard(nb); setWinner(w); if (w === 'draw') setScores(s => ({ ...s, draws: s.draws + 1 })); else setScores(s => ({ ...s, [w]: s[w] + 1 })); return; }
        if (mode === 'cpu') {
            setWinLine(null);
            const after = cpuMove(nb); setBoard(after);
            w = check(after);
            if (w) { setWinner(w); if (w === 'draw') setScores(s => ({ ...s, draws: s.draws + 1 })); else setScores(s => ({ ...s, [w]: s[w] + 1 })); }
        } else { setBoard(nb); setTurn(turn === 'X' ? 'O' : 'X'); }
    };

    const reset = () => { setBoard(Array(9).fill(null)); setTurn('X'); setWinner(null); setWinLine(null); };

    return (
        <GameHeader title="Tic-Tac-Toe" gradient="from-violet-400 to-blue-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[
                { label: mode === 'cpu' ? 'You (X)' : 'Player X', value: scores.X, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                { label: 'Draws', value: scores.draws },
                { label: mode === 'cpu' ? 'CPU (O)' : 'Player O', value: scores.O, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
            ]} />
            {winner && (
                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 12 }}
                    className={`mb-5 p-4 rounded-2xl font-bold text-lg backdrop-blur-sm border ${winner === 'draw' ? 'bg-white/5 border-white/10 text-white/60' : winner === 'X' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400' : 'bg-rose-500/15 border-rose-400/30 text-rose-400'}`}>
                    {winner === 'draw' ? '🤝 Draw!' : winner === 'X' ? '🎉 X Wins!' : '🏆 O Wins!'}
                    <motion.button whileHover={{ scale: 1.05 }} onClick={reset} className="block mx-auto mt-2.5 px-5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold text-white transition-colors">Play Again</motion.button>
                </motion.div>
            )}
            {!winner && <p className="text-white/30 mb-4 text-sm font-medium">{mode === '2player' ? `${turn}'s turn` : 'Your turn (X)'}</p>}
            <div className="grid grid-cols-3 gap-3 max-w-[320px] mx-auto">
                {board.map((cell, i) => {
                    const isWin = winLine?.includes(i);
                    return (
                        <motion.button key={i} whileHover={!cell && !winner ? { scale: 1.08 } : {}} whileTap={!cell && !winner ? { scale: 0.92 } : {}}
                            onClick={() => handleClick(i)}
                            className={`aspect-square rounded-2xl text-4xl font-black flex items-center justify-center transition-all duration-200 ${isWin ? 'bg-emerald-500/20 border-2 border-emerald-400/50 shadow-lg shadow-emerald-500/20' : cell ? 'bg-white/5 border border-white/10' : 'bg-white/[0.03] border border-white/5 hover:bg-white/10 hover:border-white/20 cursor-pointer'} ${cell === 'X' ? 'text-indigo-400' : 'text-rose-400'}`}>
                            <motion.span initial={cell ? { scale: 0, rotate: -20 } : false} animate={cell ? { scale: 1, rotate: 0 } : false} transition={{ type: 'spring', damping: 10 }}>{cell}</motion.span>
                        </motion.button>
                    );
                })}
            </div>
            <p className="text-white/20 text-xs mt-5">{mode === 'cpu' ? '🤖 vs Computer' : '👥 2 Player Local'}</p>
        </GameHeader>
    );
}

// ═══════════════════════════════════════════════════════════
// ROCK PAPER SCISSORS
// ═══════════════════════════════════════════════════════════
function RockPaperScissors({ goBack }) {
    const [choice, setChoice] = useState(null);
    const [cpuChoice, setCpuChoice] = useState(null);
    const [result, setResult] = useState(null);
    const [score, setScore] = useState({ player: 0, cpu: 0 });
    const [round, setRound] = useState(1);
    const [streak, setStreak] = useState(0);

    const options = [
        { id: 'rock', emoji: '🪨', beats: 'scissors', gradient: 'from-orange-500 to-red-500' },
        { id: 'paper', emoji: '📄', beats: 'rock', gradient: 'from-sky-500 to-blue-500' },
        { id: 'scissors', emoji: '✂️', beats: 'paper', gradient: 'from-emerald-500 to-green-500' },
    ];

    const play = (c) => {
        const cpu = options[Math.floor(Math.random() * 3)];
        setChoice(c); setCpuChoice(cpu);
        if (c.id === cpu.id) { setResult('draw'); setStreak(0); }
        else if (c.beats === cpu.id) {
            setResult('win'); setScore(s => ({ ...s, player: s.player + 1 }));
            const ns = streak + 1; setStreak(ns); setHighScore('rps', ns);
        }
        else { setResult('lose'); setScore(s => ({ ...s, cpu: s.cpu + 1 })); setStreak(0); }
    };

    const next = () => { setChoice(null); setCpuChoice(null); setResult(null); setRound(r => r + 1); };
    const resetAll = () => { setChoice(null); setCpuChoice(null); setResult(null); setScore({ player: 0, cpu: 0 }); setRound(1); setStreak(0); };

    return (
        <GameHeader title="Rock Paper Scissors" gradient="from-rose-400 to-fuchsia-400" goBack={goBack} onReset={resetAll}>
            <ScorePanel items={[
                { label: 'You', value: score.player, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                { label: 'Round', value: round },
                { label: 'CPU', value: score.cpu, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
            ]} />
            {streak > 0 && <p className="text-amber-400 text-xs font-semibold mb-3">🔥 Win streak: {streak} {getHighScore('rps') > 0 && `(Best: ${getHighScore('rps')})`}</p>}

            {result ? (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 15 }}>
                    <div className="flex items-center justify-center gap-12 mb-8">
                        <motion.div initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-center">
                            <div className="w-24 h-24 rounded-2xl bg-white/5 backdrop-blur-sm border border-indigo-400/30 flex items-center justify-center text-5xl shadow-lg shadow-indigo-500/10 mb-2">{choice.emoji}</div>
                            <p className="text-xs font-bold text-indigo-300">YOU</p>
                        </motion.div>
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl font-black text-white/10">VS</motion.span>
                        <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="text-center">
                            <div className="w-24 h-24 rounded-2xl bg-white/5 backdrop-blur-sm border border-rose-400/30 flex items-center justify-center text-5xl shadow-lg shadow-rose-500/10 mb-2">{cpuChoice.emoji}</div>
                            <p className="text-xs font-bold text-rose-300">CPU</p>
                        </motion.div>
                    </div>
                    <motion.div initial={{ y: 10 }} animate={{ y: 0 }}
                        className={`p-4 rounded-2xl text-lg font-bold mb-5 backdrop-blur-sm border ${result === 'win' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400' : result === 'lose' ? 'bg-rose-500/15 border-rose-400/30 text-rose-400' : 'bg-amber-500/15 border-amber-400/30 text-amber-400'}`}>
                        {result === 'win' ? '🎉 You Win!' : result === 'lose' ? '💻 CPU Wins!' : '🤝 Draw!'}
                    </motion.div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={next}
                        className="px-10 py-3 bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-xl font-bold shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 transition-shadow">Next Round →</motion.button>
                </motion.div>
            ) : (
                <div>
                    <p className="text-white/30 mb-8 text-base">Pick your weapon</p>
                    <div className="flex justify-center gap-5">
                        {options.map(o => (
                            <motion.button key={o.id} whileHover={{ scale: 1.15, y: -10 }} whileTap={{ scale: 0.9 }} onClick={() => play(o)}
                                className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${o.gradient} flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xl hover:shadow-3xl transition-shadow`}>
                                <span className="text-5xl drop-shadow-lg">{o.emoji}</span>
                                <span className="text-[10px] text-white/70 uppercase font-bold tracking-wider">{o.id}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
        </GameHeader>
    );
}

// ═══════════════════════════════════════════════════════════
// MEMORY MATCH
// ═══════════════════════════════════════════════════════════
function MemoryMatch({ goBack }) {
    const createBoard = () => [...MEMORY_ICONS, ...MEMORY_ICONS].sort(() => Math.random() - 0.5).map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));

    const [cards, setCards] = useState(createBoard);
    const [flipped, setFlipped] = useState([]);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [lockBoard, setLockBoard] = useState(false);
    const [newBest, setNewBest] = useState(false);

    const handleFlip = (idx) => {
        if (lockBoard || cards[idx].flipped || cards[idx].matched) return;
        const nc = [...cards]; nc[idx].flipped = true; setCards(nc);
        const nf = [...flipped, idx]; setFlipped(nf);

        if (nf.length === 2) {
            setMoves(m => m + 1); setLockBoard(true);
            const [a, b] = nf;
            if (cards[a].icon === cards[b].icon) {
                setTimeout(() => {
                    const mc = [...cards]; mc[a].matched = true; mc[b].matched = true; setCards(mc); setFlipped([]); setLockBoard(false);
                    if (mc.every(c => c.matched)) {
                        setWon(true);
                        const isBest = setHighScore('memory', 1000 - (moves + 1) * 10);
                        setNewBest(isBest);
                    }
                }, 400);
            } else {
                setTimeout(() => {
                    const uf = [...cards]; uf[a].flipped = false; uf[b].flipped = false; setCards(uf); setFlipped([]); setLockBoard(false);
                }, 700);
            }
        }
    };

    const reset = () => { setCards(createBoard()); setFlipped([]); setMoves(0); setWon(false); setLockBoard(false); setNewBest(false); };

    const matchedCount = cards.filter(c => c.matched).length / 2;

    return (
        <GameHeader title="Memory Match" gradient="from-emerald-400 to-cyan-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[
                { label: 'Moves', value: moves, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
                { label: 'Pairs', value: `${matchedCount}/${MEMORY_ICONS.length}`, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                { label: 'Best', value: getHighScore('memory') > 0 ? getHighScore('memory') : '—', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ]} />

            {won && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
                    className={`mb-5 p-5 rounded-2xl font-bold backdrop-blur-sm border ${newBest ? 'bg-amber-500/15 border-amber-400/30 text-amber-400' : 'bg-emerald-500/15 border-emerald-400/30 text-emerald-400'}`}>
                    {newBest ? '🏆 New Best Score!' : '🎉 All Matched!'} • {moves} moves
                    <motion.button whileHover={{ scale: 1.05 }} onClick={reset} className="block mx-auto mt-2 px-5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors">Play Again</motion.button>
                </motion.div>
            )}

            <div className="grid grid-cols-4 gap-3 max-w-[340px] mx-auto">
                {cards.map((card, i) => (
                    <motion.button key={card.id} whileHover={!card.flipped && !card.matched ? { scale: 1.08 } : {}} whileTap={!card.flipped && !card.matched ? { scale: 0.92 } : {}}
                        onClick={() => handleFlip(i)}
                        className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 border ${card.matched ? 'bg-emerald-500/15 border-emerald-400/30 shadow-md shadow-emerald-500/10' : card.flipped ? 'bg-white/10 border-indigo-400/40 shadow-md shadow-indigo-500/10' : 'bg-white/[0.03] border-white/5 hover:bg-white/10 hover:border-white/15 cursor-pointer'}`}>
                        {(card.flipped || card.matched) ? (
                            <motion.span initial={{ rotateY: 90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.2 }}>{card.icon}</motion.span>
                        ) : (
                            <span className="text-white/10 text-lg font-bold">?</span>
                        )}
                    </motion.button>
                ))}
            </div>
        </GameHeader>
    );
}

// ═══════════════════════════════════════════════════════════
// SNAKE (FIXED)
// ═══════════════════════════════════════════════════════════
function SnakeGame({ goBack }) {
    const SIZE = 15;
    const SPEED = 130;
    const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [gameOver, setGameOver] = useState(false);
    const [running, setRunning] = useState(false);
    const [score, setScore] = useState(0);
    const [best, setBest] = useState(0);
    const [newBest, setNewBest] = useState(false);
    const dirRef = useRef({ x: 1, y: 0 });
    const snakeRef = useRef([{ x: 7, y: 7 }]);
    const foodRef = useRef({ x: 5, y: 5 });
    const runningRef = useRef(false);
    const gameOverRef = useRef(false);
    const scoreRef = useRef(0);
    const intervalRef = useRef(null);

    useEffect(() => { setBest(getHighScore('snake')); }, []);

    const spawnFood = useCallback((snk) => {
        let f;
        do { f = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) }; }
        while (snk.some(s => s.x === f.x && s.y === f.y));
        return f;
    }, []);

    const startGame = useCallback(() => {
        const init = [{ x: 7, y: 7 }];
        const fd = spawnFood(init);
        setSnake(init); snakeRef.current = init;
        setFood(fd); foodRef.current = fd;
        dirRef.current = { x: 1, y: 0 };
        setGameOver(false); gameOverRef.current = false;
        setScore(0); scoreRef.current = 0;
        setNewBest(false);
        setRunning(true); runningRef.current = true;
    }, [spawnFood]);

    // Keyboard
    useEffect(() => {
        const handleKey = (e) => {
            if (!runningRef.current) return;
            const d = dirRef.current;
            if ((e.key === 'ArrowUp' || e.key === 'w') && d.y !== 1) dirRef.current = { x: 0, y: -1 };
            if ((e.key === 'ArrowDown' || e.key === 's') && d.y !== -1) dirRef.current = { x: 0, y: 1 };
            if ((e.key === 'ArrowLeft' || e.key === 'a') && d.x !== 1) dirRef.current = { x: -1, y: 0 };
            if ((e.key === 'ArrowRight' || e.key === 'd') && d.x !== -1) dirRef.current = { x: 1, y: 0 };
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);

    // Game loop
    useEffect(() => {
        if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }

        intervalRef.current = setInterval(() => {
            if (gameOverRef.current) return;
            const prev = snakeRef.current;
            const dir = dirRef.current;
            const head = { x: prev[0].x + dir.x, y: prev[0].y + dir.y };

            if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE || prev.some(s => s.x === head.x && s.y === head.y)) {
                gameOverRef.current = true;
                setGameOver(true); setRunning(false); runningRef.current = false;
                const isBest = setHighScore('snake', scoreRef.current);
                if (isBest) { setNewBest(true); setBest(scoreRef.current); }
                return;
            }

            const ns = [head, ...prev];
            const fd = foodRef.current;
            if (head.x === fd.x && head.y === fd.y) {
                scoreRef.current += 10;
                setScore(scoreRef.current);
                const nf = spawnFood(ns);
                foodRef.current = nf;
                setFood(nf);
            } else { ns.pop(); }

            snakeRef.current = ns;
            setSnake([...ns]);
        }, SPEED);

        return () => clearInterval(intervalRef.current);
    }, [running, spawnFood]);

    const moveDir = (dx, dy) => {
        const d = dirRef.current;
        if (dx !== 0 && d.x !== -dx) dirRef.current = { x: dx, y: 0 };
        if (dy !== 0 && d.y !== -dy) dirRef.current = { x: 0, y: dy };
    };

    return (
        <GameHeader title="🐍 Snake" gradient="from-lime-400 to-emerald-400" goBack={goBack} onReset={startGame}>
            <ScorePanel items={[
                { label: 'Score', value: score, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                { label: 'Length', value: snake.length, color: 'text-emerald-400' },
                { label: 'Best', value: best || '—', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ]} />

            {!running && !gameOver && (
                <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={startGame}
                    className="mb-5 px-10 py-4 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-2xl font-bold text-lg shadow-xl shadow-green-500/20 hover:shadow-green-500/40 transition-shadow">
                    ▶ Start Game
                </motion.button>
            )}
            {gameOver && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                    className={`mb-5 p-5 rounded-2xl font-bold backdrop-blur-sm border ${newBest ? 'bg-amber-500/15 border-amber-400/30 text-amber-400' : 'bg-rose-500/15 border-rose-400/30 text-rose-400'}`}>
                    {newBest ? `🏆 New Best! Score: ${score}` : `💀 Game Over! Score: ${score}`}
                    <motion.button whileHover={{ scale: 1.05 }} onClick={startGame} className="block mx-auto mt-2 px-5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors">Try Again</motion.button>
                </motion.div>
            )}

            {/* Grid */}
            <div className="inline-grid gap-0 bg-[#0a0c16] rounded-2xl p-1.5 border border-white/5 shadow-inner" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
                {Array.from({ length: SIZE * SIZE }).map((_, i) => {
                    const x = i % SIZE, y = Math.floor(i / SIZE);
                    const isHead = snake[0]?.x === x && snake[0]?.y === y;
                    const isSnake = snake.some(s => s.x === x && s.y === y);
                    const isFood = food.x === x && food.y === y;
                    return (
                        <div key={i} className={`w-[22px] h-[22px] rounded-[3px] transition-colors duration-75 ${isHead ? 'bg-green-400 shadow-md shadow-green-400/50' : isSnake ? 'bg-green-500/70' : isFood ? 'bg-red-400 shadow-md shadow-red-400/50 animate-pulse' : 'bg-white/[0.02]'}`} />
                    );
                })}
            </div>

            {/* D-Pad controls */}
            {running && (
                <div className="mt-5 inline-grid grid-cols-3 gap-1.5">
                    <div />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => moveDir(0, -1)} className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white/50 text-lg font-bold transition-colors">↑</motion.button>
                    <div />
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => moveDir(-1, 0)} className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white/50 text-lg font-bold transition-colors">←</motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => moveDir(0, 1)} className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white/50 text-lg font-bold transition-colors">↓</motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => moveDir(1, 0)} className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white/50 text-lg font-bold transition-colors">→</motion.button>
                </div>
            )}
            <p className="text-white/15 text-xs mt-4">WASD or Arrow Keys • D-pad for mobile</p>
        </GameHeader>
    );
}
