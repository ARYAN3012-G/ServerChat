'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRotateCw, FiUsers, FiCpu, FiUser } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';

// ─── CONSTANTS ──────────────────────────────────────────────
const GAMES = [
    { id: 'ttt', name: 'Tic-Tac-Toe', emoji: '⭕❌', desc: 'The classic 3x3 strategy game', color: 'from-indigo-500 via-blue-500 to-cyan-400', players: '1-2 Players', icon: '🎯' },
    { id: 'rps', name: 'Rock Paper Scissors', emoji: '🪨📄✂️', desc: 'Test your luck against CPU', color: 'from-purple-500 via-pink-500 to-rose-400', players: '1 Player', icon: '⚔️' },
    { id: 'memory', name: 'Memory Match', emoji: '🧠🃏', desc: 'Find all matching pairs', color: 'from-emerald-500 via-green-500 to-teal-400', players: '1 Player', icon: '🃏' },
    { id: 'snake', name: 'Snake', emoji: '🐍🍎', desc: 'Classic snake game', color: 'from-green-500 via-lime-500 to-yellow-400', players: '1 Player', icon: '🐍' },
];

// ─── MEMORY CARDS ───────────────────────────────────────────
const MEMORY_ICONS = ['🎮', '🎲', '🎯', '🏆', '⭐', '💎', '🔥', '🚀'];

// ─── MAIN COMPONENT ────────────────────────────────────────
export default function GamesPage() {
    const router = useRouter();
    const [activeGame, setActiveGame] = useState(null);
    const [gameMode, setGameMode] = useState(null); // 'cpu' or '2player'
    const [showModeSelect, setShowModeSelect] = useState(null); // which game to pick mode for

    const handleSelectGame = (gameId) => {
        if (gameId === 'ttt') {
            setShowModeSelect(gameId);
        } else {
            setActiveGame(gameId);
            setGameMode('cpu');
        }
    };

    const startGame = (mode) => {
        setGameMode(mode);
        setActiveGame(showModeSelect);
        setShowModeSelect(null);
    };

    const goBack = () => { setActiveGame(null); setGameMode(null); };

    return (
        <div className="flex h-screen bg-dark-800 text-white overflow-hidden">
            {/* Left nav */}
            <div className="w-[72px] bg-dark-900 flex flex-col items-center py-3 gap-2">
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-primary-400 hover:text-white hover:bg-primary-500 cursor-pointer transition-all" title="Back to Chat">
                    <FiArrowLeft className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-0.5 bg-dark-700 rounded-full mx-auto" />
                {GAMES.map(g => (
                    <motion.div key={g.id} whileHover={{ borderRadius: '35%' }} onClick={() => handleSelectGame(g.id)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all text-lg ${activeGame === g.id ? 'bg-primary-500 rounded-[35%]' : 'bg-dark-700 hover:bg-primary-500'}`}
                        title={g.name}>
                        {g.icon}
                    </motion.div>
                ))}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {!activeGame && !showModeSelect && (
                        <motion.div key="lobby" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="max-w-5xl mx-auto p-8">
                            {/* Lobby Header */}
                            <div className="text-center mb-12">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}
                                    className="inline-flex items-center gap-3 bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-500/30 rounded-full px-6 py-2 mb-6">
                                    <IoGameControllerOutline className="w-5 h-5 text-primary-400" />
                                    <span className="text-primary-300 text-sm font-medium">Game Center</span>
                                </motion.div>
                                <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-white via-primary-200 to-purple-300 bg-clip-text text-transparent">
                                    🎮 Games Lobby
                                </h1>
                                <p className="text-dark-400 text-lg">Choose a game and challenge yourself or a friend!</p>
                            </div>

                            {/* Game Cards Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                {GAMES.map((g, i) => (
                                    <motion.div key={g.id}
                                        initial={{ opacity: 0, y: 40 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1, type: 'spring' }}
                                        whileHover={{ scale: 1.03, y: -5 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => handleSelectGame(g.id)}
                                        className={`relative bg-gradient-to-br ${g.color} rounded-2xl p-8 cursor-pointer shadow-2xl overflow-hidden group`}>
                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <div className="absolute top-4 right-4 text-5xl opacity-20 group-hover:opacity-40 transition-opacity">{g.icon}</div>
                                        <div className="relative">
                                            <div className="text-4xl mb-4">{g.emoji}</div>
                                            <h3 className="text-2xl font-bold mb-1">{g.name}</h3>
                                            <p className="text-white/70 text-sm mb-4">{g.desc}</p>
                                            <div className="inline-flex items-center gap-1.5 bg-black/20 rounded-full px-3 py-1 text-xs font-medium">
                                                <FiUsers className="w-3 h-3" /> {g.players}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Stats bar */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className="mt-10 bg-dark-700/50 rounded-xl p-6 flex items-center justify-between border border-dark-600/50">
                                <div className="text-center flex-1"><p className="text-2xl font-bold text-primary-400">4</p><p className="text-xs text-dark-400 mt-1">Games Available</p></div>
                                <div className="w-px h-10 bg-dark-600" />
                                <div className="text-center flex-1"><p className="text-2xl font-bold text-discord-green">∞</p><p className="text-xs text-dark-400 mt-1">Replays</p></div>
                                <div className="w-px h-10 bg-dark-600" />
                                <div className="text-center flex-1"><p className="text-2xl font-bold text-amber-400">2</p><p className="text-xs text-dark-400 mt-1">Max Players</p></div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Mode Selection for TTT */}
                    {showModeSelect && (
                        <motion.div key="mode" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="max-w-lg mx-auto p-8 mt-20">
                            <div className="text-center mb-8">
                                <div className="text-6xl mb-4">🎯</div>
                                <h2 className="text-3xl font-bold mb-2">Tic-Tac-Toe</h2>
                                <p className="text-dark-400">Choose your game mode</p>
                            </div>
                            <div className="space-y-4">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => startGame('cpu')}
                                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 flex items-center gap-4 shadow-lg hover:shadow-blue-500/25 transition-shadow">
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center"><FiCpu className="w-7 h-7" /></div>
                                    <div className="text-left"><p className="font-bold text-lg">vs Computer</p><p className="text-white/70 text-sm">Play against CPU opponent</p></div>
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => startGame('2player')}
                                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 flex items-center gap-4 shadow-lg hover:shadow-purple-500/25 transition-shadow">
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center"><FiUsers className="w-7 h-7" /></div>
                                    <div className="text-left"><p className="font-bold text-lg">2 Players</p><p className="text-white/70 text-sm">Play with a friend on same screen</p></div>
                                </motion.button>
                            </div>
                            <button onClick={() => setShowModeSelect(null)} className="mt-6 text-dark-400 hover:text-white text-sm flex items-center gap-1 mx-auto transition-colors"><FiArrowLeft className="w-4 h-4" /> Back to Lobby</button>
                        </motion.div>
                    )}

                    {/* TTT Game */}
                    {activeGame === 'ttt' && <TicTacToe goBack={goBack} mode={gameMode} />}

                    {/* RPS Game */}
                    {activeGame === 'rps' && <RockPaperScissors goBack={goBack} />}

                    {/* Memory Match */}
                    {activeGame === 'memory' && <MemoryMatch goBack={goBack} />}

                    {/* Snake */}
                    {activeGame === 'snake' && <SnakeGame goBack={goBack} />}
                </AnimatePresence>
            </div>
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

    const check = (b) => {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, c, d] of lines) {
            if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
        }
        return b.every(Boolean) ? 'draw' : null;
    };

    const cpuMove = (b) => {
        const empty = b.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (empty.length === 0) return b;
        // Try to win
        for (const i of empty) { const t = [...b]; t[i] = 'O'; if (check(t) === 'O') { t[i] = 'O'; return t; } }
        // Block player
        for (const i of empty) { const t = [...b]; t[i] = 'X'; if (check(t) === 'X') { t[i] = 'O'; b[i] = 'O'; return [...b]; } }
        // Take center or random
        if (b[4] === null) { b[4] = 'O'; return [...b]; }
        const pick = empty[Math.floor(Math.random() * empty.length)];
        b[pick] = 'O';
        return [...b];
    };

    const handleClick = (i) => {
        if (board[i] || winner) return;
        const newBoard = [...board];
        newBoard[i] = turn;
        let w = check(newBoard);
        if (w) {
            setBoard(newBoard); setWinner(w);
            if (w === 'draw') setScores(s => ({ ...s, draws: s.draws + 1 }));
            else setScores(s => ({ ...s, [w]: s[w] + 1 }));
            return;
        }

        if (mode === 'cpu') {
            const afterCpu = cpuMove(newBoard);
            setBoard(afterCpu);
            w = check(afterCpu);
            if (w) {
                setWinner(w);
                if (w === 'draw') setScores(s => ({ ...s, draws: s.draws + 1 }));
                else setScores(s => ({ ...s, [w]: s[w] + 1 }));
            }
        } else {
            setBoard(newBoard);
            setTurn(turn === 'X' ? 'O' : 'X');
        }
    };

    const reset = () => { setBoard(Array(9).fill(null)); setTurn('X'); setWinner(null); };

    return (
        <motion.div key="ttt" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="max-w-md mx-auto p-8 text-center">
            <div className="flex items-center justify-between mb-6">
                <button onClick={goBack} className="text-dark-300 hover:text-white transition-colors text-sm flex items-center gap-1"><FiArrowLeft /> Back</button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Tic-Tac-Toe</h2>
                <button onClick={reset} className="text-dark-300 hover:text-white transition-colors"><FiRotateCw className="w-5 h-5" /></button>
            </div>

            {/* Score */}
            <div className="flex justify-center gap-3 mb-6">
                <div className="bg-primary-500/20 border border-primary-500/30 rounded-lg px-4 py-2">
                    <p className="text-xs text-primary-300">{mode === 'cpu' ? 'You (X)' : 'Player X'}</p>
                    <p className="text-xl font-bold text-primary-400">{scores.X}</p>
                </div>
                <div className="bg-dark-700 border border-dark-600 rounded-lg px-4 py-2">
                    <p className="text-xs text-dark-400">Draw</p>
                    <p className="text-xl font-bold text-dark-300">{scores.draws}</p>
                </div>
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2">
                    <p className="text-xs text-red-300">{mode === 'cpu' ? 'CPU (O)' : 'Player O'}</p>
                    <p className="text-xl font-bold text-red-400">{scores.O}</p>
                </div>
            </div>

            {winner && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                    className={`mb-4 p-4 rounded-xl text-lg font-bold ${winner === 'draw' ? 'bg-dark-600 text-dark-300' : winner === 'X' ? 'bg-discord-green/20 text-discord-green border border-discord-green/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {winner === 'draw' ? "🤝 It's a Draw!" : winner === 'X' ? '🎉 X Wins!' : '🏆 O Wins!'}
                    <button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-md text-sm hover:bg-white/20 transition-colors">Play Again</button>
                </motion.div>
            )}

            {!winner && <p className="text-dark-400 mb-3 text-sm">
                {mode === '2player' ? `${turn}'s turn` : (turn === 'X' ? 'Your turn' : 'CPU thinking...')}
            </p>}

            <div className="grid grid-cols-3 gap-3 mb-4">
                {board.map((cell, i) => (
                    <motion.button key={i} whileHover={!cell && !winner ? { scale: 1.05 } : {}} whileTap={!cell && !winner ? { scale: 0.95 } : {}}
                        onClick={() => handleClick(i)}
                        className={`aspect-square rounded-2xl text-5xl font-bold flex items-center justify-center transition-all shadow-lg ${cell ? 'bg-dark-600/80' : 'bg-dark-700 hover:bg-dark-600 cursor-pointer hover:shadow-xl'} ${cell === 'X' ? 'text-primary-400' : 'text-red-400'}`}>
                        <motion.span initial={cell ? { scale: 0 } : {}} animate={cell ? { scale: 1 } : {}} transition={{ type: 'spring' }}>{cell}</motion.span>
                    </motion.button>
                ))}
            </div>

            <p className="text-dark-500 text-xs">{mode === 'cpu' ? '🤖 Playing vs Computer' : '👥 2 Player Mode'}</p>
        </motion.div>
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

    const options = [
        { id: 'rock', emoji: '🪨', beats: 'scissors', color: 'from-orange-500 to-red-500' },
        { id: 'paper', emoji: '📄', beats: 'rock', color: 'from-blue-500 to-indigo-500' },
        { id: 'scissors', emoji: '✂️', beats: 'paper', color: 'from-green-500 to-emerald-500' },
    ];

    const play = (c) => {
        const cpu = options[Math.floor(Math.random() * 3)];
        setChoice(c); setCpuChoice(cpu);
        if (c.id === cpu.id) setResult('draw');
        else if (c.beats === cpu.id) { setResult('win'); setScore(s => ({ ...s, player: s.player + 1 })); }
        else { setResult('lose'); setScore(s => ({ ...s, cpu: s.cpu + 1 })); }
    };

    const nextRound = () => { setChoice(null); setCpuChoice(null); setResult(null); setRound(r => r + 1); };
    const resetAll = () => { setChoice(null); setCpuChoice(null); setResult(null); setScore({ player: 0, cpu: 0 }); setRound(1); };

    return (
        <motion.div key="rps" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="max-w-lg mx-auto p-8 text-center">
            <div className="flex items-center justify-between mb-6">
                <button onClick={goBack} className="text-dark-300 hover:text-white transition-colors text-sm flex items-center gap-1"><FiArrowLeft /> Back</button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Rock Paper Scissors</h2>
                <button onClick={resetAll} className="text-dark-300 hover:text-white transition-colors"><FiRotateCw className="w-5 h-5" /></button>
            </div>

            {/* Score & Round */}
            <div className="flex justify-center gap-4 mb-8">
                <div className="bg-primary-500/20 border border-primary-500/30 rounded-lg px-5 py-3">
                    <p className="text-xs text-primary-300">You</p>
                    <p className="text-2xl font-bold text-primary-400">{score.player}</p>
                </div>
                <div className="bg-dark-700 border border-dark-600 rounded-lg px-5 py-3">
                    <p className="text-xs text-dark-400">Round</p>
                    <p className="text-2xl font-bold text-dark-300">{round}</p>
                </div>
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-5 py-3">
                    <p className="text-xs text-red-300">CPU</p>
                    <p className="text-2xl font-bold text-red-400">{score.cpu}</p>
                </div>
            </div>

            {result ? (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
                    <div className="flex items-center justify-center gap-10 mb-6">
                        <motion.div initial={{ x: -50 }} animate={{ x: 0 }} className="text-center">
                            <div className="w-24 h-24 rounded-2xl bg-dark-700 flex items-center justify-center text-5xl mb-2 shadow-lg border border-primary-500/30">{choice.emoji}</div>
                            <p className="text-sm text-primary-300 font-medium">You</p>
                        </motion.div>
                        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-3xl font-bold text-dark-500">⚡</motion.p>
                        <motion.div initial={{ x: 50 }} animate={{ x: 0 }} className="text-center">
                            <div className="w-24 h-24 rounded-2xl bg-dark-700 flex items-center justify-center text-5xl mb-2 shadow-lg border border-red-500/30">{cpuChoice.emoji}</div>
                            <p className="text-sm text-red-300 font-medium">CPU</p>
                        </motion.div>
                    </div>
                    <motion.div initial={{ y: 20 }} animate={{ y: 0 }}
                        className={`p-4 rounded-xl text-lg font-bold mb-4 ${result === 'win' ? 'bg-discord-green/20 text-discord-green border border-discord-green/30' : result === 'lose' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                        {result === 'win' ? '🎉 You Win!' : result === 'lose' ? '💻 CPU Wins!' : '🤝 Draw!'}
                    </motion.div>
                    <button onClick={nextRound} className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all">Next Round</button>
                </motion.div>
            ) : (
                <div>
                    <p className="text-dark-400 mb-6 text-lg">Choose your weapon!</p>
                    <div className="flex justify-center gap-6">
                        {options.map(o => (
                            <motion.button key={o.id} whileHover={{ scale: 1.15, y: -8 }} whileTap={{ scale: 0.9 }} onClick={() => play(o)}
                                className={`w-28 h-28 rounded-2xl bg-gradient-to-br ${o.color} flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xl hover:shadow-2xl transition-shadow`}>
                                <span className="text-5xl">{o.emoji}</span>
                                <span className="text-xs text-white/80 capitalize font-medium">{o.id}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════
// MEMORY MATCH GAME
// ═══════════════════════════════════════════════════════════
function MemoryMatch({ goBack }) {
    const createBoard = () => {
        const pairs = [...MEMORY_ICONS, ...MEMORY_ICONS]
            .sort(() => Math.random() - 0.5)
            .map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
        return pairs;
    };

    const [cards, setCards] = useState(createBoard);
    const [flipped, setFlipped] = useState([]);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const [lockBoard, setLockBoard] = useState(false);

    const handleFlip = (idx) => {
        if (lockBoard || cards[idx].flipped || cards[idx].matched) return;

        const newCards = [...cards];
        newCards[idx].flipped = true;
        setCards(newCards);

        const newFlipped = [...flipped, idx];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            setLockBoard(true);
            const [a, b] = newFlipped;
            if (cards[a].icon === cards[b].icon) {
                setTimeout(() => {
                    const matched = [...cards];
                    matched[a].matched = true;
                    matched[b].matched = true;
                    setCards(matched);
                    setFlipped([]);
                    setLockBoard(false);
                    if (matched.every(c => c.matched)) setWon(true);
                }, 400);
            } else {
                setTimeout(() => {
                    const unflipped = [...cards];
                    unflipped[a].flipped = false;
                    unflipped[b].flipped = false;
                    setCards(unflipped);
                    setFlipped([]);
                    setLockBoard(false);
                }, 800);
            }
        }
    };

    const reset = () => { setCards(createBoard()); setFlipped([]); setMoves(0); setWon(false); setLockBoard(false); };

    return (
        <motion.div key="memory" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="max-w-md mx-auto p-8 text-center">
            <div className="flex items-center justify-between mb-6">
                <button onClick={goBack} className="text-dark-300 hover:text-white transition-colors text-sm flex items-center gap-1"><FiArrowLeft /> Back</button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Memory Match</h2>
                <button onClick={reset} className="text-dark-300 hover:text-white transition-colors"><FiRotateCw className="w-5 h-5" /></button>
            </div>

            <div className="flex justify-center gap-4 mb-6">
                <div className="bg-dark-700 rounded-lg px-4 py-2"><p className="text-xs text-dark-400">Moves</p><p className="text-xl font-bold text-emerald-400">{moves}</p></div>
                <div className="bg-dark-700 rounded-lg px-4 py-2"><p className="text-xs text-dark-400">Pairs</p><p className="text-xl font-bold text-emerald-400">{cards.filter(c => c.matched).length / 2}/{MEMORY_ICONS.length}</p></div>
            </div>

            {won && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 p-4 rounded-xl bg-discord-green/20 text-discord-green border border-discord-green/30 font-bold text-lg">
                    🎉 You matched all pairs in {moves} moves!
                    <button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-md text-sm hover:bg-white/20 transition-colors">Play Again</button>
                </motion.div>
            )}

            <div className="grid grid-cols-4 gap-3">
                {cards.map((card, i) => (
                    <motion.button key={card.id} whileHover={!card.flipped && !card.matched ? { scale: 1.05 } : {}} whileTap={!card.flipped && !card.matched ? { scale: 0.95 } : {}}
                        onClick={() => handleFlip(i)}
                        className={`aspect-square rounded-xl text-3xl flex items-center justify-center transition-all duration-300 shadow-md ${card.matched ? 'bg-emerald-500/20 border-2 border-emerald-500/50' : card.flipped ? 'bg-dark-600 border-2 border-primary-500/50' : 'bg-dark-700 hover:bg-dark-600 cursor-pointer border-2 border-dark-600'}`}>
                        <motion.span initial={false} animate={{ rotateY: card.flipped || card.matched ? 0 : 180, opacity: card.flipped || card.matched ? 1 : 0 }}>
                            {(card.flipped || card.matched) ? card.icon : ''}
                        </motion.span>
                        {!card.flipped && !card.matched && <span className="text-dark-500 text-lg">?</span>}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════
// SNAKE GAME
// ═══════════════════════════════════════════════════════════
function SnakeGame({ goBack }) {
    const SIZE = 15;
    const [snake, setSnake] = useState([{ x: 7, y: 7 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [direction, setDirection] = useState({ x: 1, y: 0 });
    const [gameOver, setGameOver] = useState(false);
    const [running, setRunning] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const intervalRef = useState(null);

    const spawnFood = (snk) => {
        let f;
        do {
            f = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
        } while (snk.some(s => s.x === f.x && s.y === f.y));
        return f;
    };

    const startGame = () => {
        const initial = [{ x: 7, y: 7 }];
        setSnake(initial);
        setFood(spawnFood(initial));
        setDirection({ x: 1, y: 0 });
        setGameOver(false);
        setScore(0);
        setRunning(true);
    };

    // Game loop
    useState(() => {
        const handleKey = (e) => {
            if (['ArrowUp', 'w', 'W'].includes(e.key)) setDirection(d => d.y !== 1 ? { x: 0, y: -1 } : d);
            if (['ArrowDown', 's', 'S'].includes(e.key)) setDirection(d => d.y !== -1 ? { x: 0, y: 1 } : d);
            if (['ArrowLeft', 'a', 'A'].includes(e.key)) setDirection(d => d.x !== 1 ? { x: -1, y: 0 } : d);
            if (['ArrowRight', 'd', 'D'].includes(e.key)) setDirection(d => d.x !== -1 ? { x: 1, y: 0 } : d);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    });

    useState(() => {
        const tick = setInterval(() => {
            if (!running || gameOver) return;
            setSnake(prev => {
                const head = { x: prev[0].x + direction.x, y: prev[0].y + direction.y };
                // Wall collision
                if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) { setGameOver(true); setRunning(false); return prev; }
                // Self collision
                if (prev.some(s => s.x === head.x && s.y === head.y)) { setGameOver(true); setRunning(false); return prev; }
                const newSnake = [head, ...prev];
                if (head.x === food.x && head.y === food.y) {
                    setScore(s => { const ns = s + 10; if (ns > highScore) setHighScore(ns); return ns; });
                    setFood(spawnFood(newSnake));
                } else {
                    newSnake.pop();
                }
                return newSnake;
            });
        }, 150);
        return () => clearInterval(tick);
    });

    // Mobile controls
    const moveDir = (dx, dy) => {
        setDirection(d => {
            if (dx !== 0 && d.x !== -dx) return { x: dx, y: 0 };
            if (dy !== 0 && d.y !== -dy) return { x: 0, y: dy };
            return d;
        });
    };

    return (
        <motion.div key="snake" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="max-w-lg mx-auto p-8 text-center">
            <div className="flex items-center justify-between mb-4">
                <button onClick={goBack} className="text-dark-300 hover:text-white transition-colors text-sm flex items-center gap-1"><FiArrowLeft /> Back</button>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-lime-400 bg-clip-text text-transparent">🐍 Snake</h2>
                <div className="text-sm text-dark-400">Best: {highScore}</div>
            </div>

            <div className="flex justify-center gap-4 mb-4">
                <div className="bg-dark-700 rounded-lg px-4 py-2"><p className="text-xs text-dark-400">Score</p><p className="text-xl font-bold text-green-400">{score}</p></div>
                <div className="bg-dark-700 rounded-lg px-4 py-2"><p className="text-xs text-dark-400">Length</p><p className="text-xl font-bold text-green-400">{snake.length}</p></div>
            </div>

            {!running && !gameOver && (
                <motion.button initial={{ scale: 0.9 }} animate={{ scale: 1 }} whileHover={{ scale: 1.05 }} onClick={startGame}
                    className="mb-4 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-green-500/25 transition-shadow">
                    ▶ Start Game
                </motion.button>
            )}
            {gameOver && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 p-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                    💀 Game Over! Score: {score}
                    <button onClick={startGame} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-md text-sm hover:bg-white/20 transition-colors">Try Again</button>
                </motion.div>
            )}

            {/* Grid */}
            <div className="inline-grid gap-0 bg-dark-900 rounded-xl p-1 border border-dark-600" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
                {Array.from({ length: SIZE * SIZE }).map((_, i) => {
                    const x = i % SIZE, y = Math.floor(i / SIZE);
                    const isSnake = snake.some(s => s.x === x && s.y === y);
                    const isHead = snake[0]?.x === x && snake[0]?.y === y;
                    const isFood = food.x === x && food.y === y;
                    return (
                        <div key={i} className={`w-5 h-5 rounded-sm transition-colors ${isHead ? 'bg-green-400' : isSnake ? 'bg-green-500/60' : isFood ? 'bg-red-400' : 'bg-dark-800'}`} />
                    );
                })}
            </div>

            {/* Controls */}
            {running && (
                <div className="mt-4 inline-grid grid-cols-3 gap-1">
                    <div />
                    <button onClick={() => moveDir(0, -1)} className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-600 transition-colors text-lg">↑</button>
                    <div />
                    <button onClick={() => moveDir(-1, 0)} className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-600 transition-colors text-lg">←</button>
                    <button onClick={() => moveDir(0, 1)} className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-600 transition-colors text-lg">↓</button>
                    <button onClick={() => moveDir(1, 0)} className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-600 transition-colors text-lg">→</button>
                </div>
            )}

            <p className="text-dark-500 text-xs mt-3">Use WASD or Arrow Keys to move</p>
        </motion.div>
    );
}
