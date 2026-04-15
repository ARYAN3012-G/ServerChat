'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiRotateCw, FiUsers, FiCpu, FiAward, FiZap, FiTrendingUp, FiMenu, FiSearch } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import api from '../../services/api';
import { GAMES, CATEGORIES, MEMORY_ICONS, getHighScore, setHighScore, syncHighScoresFromServer } from './gameData';
import { GameHeader, ScorePanel, Game2048, WordleGame, MinesweeperGame, FlappyBirdGame, Connect4Game, PongGame } from './newGames';
import { TetrisGame, ChessGame, CheckersGame, BattleshipGame, LudoGame } from './moreGames';

export default function GamesPage() {
    const router = useRouter();
    const [activeGame, setActiveGame] = useState(null);
    const [gameMode, setGameMode] = useState(null);
    const [selectingMode, setSelectingMode] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { setMounted(true); syncHighScoresFromServer(api); }, []);

    const handlePick = (g) => {
        if (!g.modes || g.modes.length === 0) { setActiveGame(g.id); setGameMode('solo'); setSelectingMode(null); }
        else if (g.modes.length === 1) { setActiveGame(g.id); setGameMode(g.modes[0]); setSelectingMode(null); }
        else { setSelectingMode(g); setActiveGame(null); setGameMode(null); }
    };

    const startWithMode = (mode) => { setActiveGame(selectingMode.id); setGameMode(mode); setSelectingMode(null); };
    const goBack = () => { setActiveGame(null); setGameMode(null); fetchLeaderboard(); };

    const [leaderboard, setLeaderboard] = useState([]);
    const fetchLeaderboard = async () => { try { const { data } = await api.get('/games/leaderboard'); setLeaderboard(data.leaderboard || []); } catch (e) {} };
    useEffect(() => { if (mounted) fetchLeaderboard(); }, [mounted]);

    const saveScoreToDb = async (game, score, won = false) => {
        try { await api.post('/games/save-score', { game, score, won }); } catch (e) {}
    };

    const filteredGames = GAMES.filter(g => {
        const matchCat = activeCategory === 'all' || g.category === activeCategory;
        const matchSearch = !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden">
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static z-40 w-[72px] bg-[#080a14] flex flex-col items-center py-3 gap-2 border-r border-white/5 h-full transition-transform duration-200`}>
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500 cursor-pointer transition-all" title="Back to Chat">
                    <FiArrowLeft className="w-6 h-6" />
                </motion.div>
                <div className="w-8 h-0.5 bg-white/10 rounded-full mx-auto" />
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    {GAMES.map(g => (
                        <motion.div key={g.id} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => { handlePick(g); setSidebarOpen(false); }}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all text-xl ${activeGame === g.id ? 'bg-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-white/5 hover:bg-white/10'}`}
                            title={g.name}>
                            {g.icon}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto relative">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
                </div>

                <AnimatePresence mode="wait">
                    {/* LOBBY */}
                    {!activeGame && !selectingMode && (
                        <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
                            <button onClick={() => setSidebarOpen(true)} className="md:hidden mb-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                                <FiMenu className="w-5 h-5" />
                            </button>
                            <div className="text-center mb-6 sm:mb-10">
                                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-5 py-2 mb-4">
                                    <IoGameControllerOutline className="w-5 h-5 text-indigo-400" />
                                    <span className="text-sm font-medium text-indigo-300">Game Center</span>
                                    <span className="text-xs text-white/20 ml-1">{GAMES.length} games</span>
                                </motion.div>
                                <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                                    className="text-3xl sm:text-5xl font-black mb-3 tracking-tight">
                                    <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">Choose Your Game</span>
                                </motion.h1>
                            </div>

                            {/* Search + Categories */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 flex-1 border border-white/5">
                                    <FiSearch className="w-4 h-4 text-white/20" />
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search games..." className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20" />
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                                    {CATEGORIES.map(cat => (
                                        <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                                            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === cat.id ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-white/30 hover:text-white border border-transparent'}`}>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Game Grid */}
                            <div className="grid grid-cols-1 min-[440px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {filteredGames.map((g, i) => (
                                    <motion.div key={g.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03 }}
                                        whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handlePick(g)}
                                        className={`relative rounded-2xl cursor-pointer overflow-hidden shadow-xl ${g.glow} group`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient} opacity-90`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <div className="absolute -right-2 -top-2 text-[60px] sm:text-[80px] opacity-10 group-hover:opacity-20 transition-opacity rotate-12">{g.icon}</div>
                                        <div className="relative p-4 sm:p-5 min-h-[140px] sm:min-h-[160px] flex flex-col justify-end">
                                            <div className="text-3xl sm:text-4xl mb-2 drop-shadow-lg">{g.icon}</div>
                                            <h3 className="text-sm sm:text-base font-extrabold mb-0.5 tracking-tight">{g.name}</h3>
                                            <p className="text-white/60 text-[10px] sm:text-xs mb-2">{g.desc}</p>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <div className="flex items-center gap-1 bg-black/25 backdrop-blur-sm rounded-full px-2 py-1 text-[9px] font-semibold">
                                                    <FiUsers className="w-2.5 h-2.5" /> {g.players}P
                                                </div>
                                                {mounted && getHighScore(g.id) > 0 && (
                                                    <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-400/30 rounded-full px-2 py-1 text-[9px] font-semibold text-amber-300">
                                                        <FiAward className="w-2.5 h-2.5" /> {getHighScore(g.id)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {filteredGames.length === 0 && <p className="text-center text-white/20 py-10">No games found</p>}

                            {/* Leaderboard */}
                            {mounted && leaderboard.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                    className="mt-8 bg-white/[0.03] rounded-2xl border border-white/5 p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <FiTrendingUp className="w-5 h-5 text-amber-400" />
                                        <h3 className="text-base font-bold">Global Leaderboard</h3>
                                    </div>
                                    <div className="space-y-1.5">
                                        {leaderboard.slice(0, 8).map((entry, i) => (
                                            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${i < 3 ? 'bg-white/[0.04]' : ''}`}>
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${i===0?'bg-amber-500/20 text-amber-400':i===1?'bg-gray-300/20 text-gray-300':i===2?'bg-orange-500/20 text-orange-400':'text-white/20'}`}>{i+1}</div>
                                                <div className="flex-1"><p className="font-semibold text-sm">{entry.user?.username || 'Unknown'}</p><p className="text-[10px] text-white/30">{entry.gamesPlayed} games · {entry.wins} wins</p></div>
                                                <div className="text-right"><p className="font-bold text-sm text-indigo-400">{entry.totalScore}</p></div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* MODE SELECT */}
                    {selectingMode && (
                        <motion.div key="mode" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="relative max-w-lg mx-auto px-6 py-16 text-center">
                            <div className="text-6xl mb-4">{selectingMode.icon}</div>
                            <h2 className="text-3xl font-black mb-2">{selectingMode.name}</h2>
                            <p className="text-white/40 mb-8">Choose how you want to play</p>
                            <div className="space-y-3">
                                {selectingMode.modes?.includes('cpu') && (
                                    <motion.button whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => startWithMode('cpu')}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-5 flex items-center gap-4 shadow-xl text-left">
                                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center"><FiCpu className="w-6 h-6" /></div>
                                        <div><p className="font-bold">vs Computer</p><p className="text-white/60 text-sm">Challenge the AI</p></div>
                                        <FiZap className="w-5 h-5 ml-auto text-white/30" />
                                    </motion.button>
                                )}
                                {selectingMode.modes?.includes('2player') && (
                                    <motion.button whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => startWithMode('2player')}
                                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 rounded-2xl p-5 flex items-center gap-4 shadow-xl text-left">
                                        <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center"><FiUsers className="w-6 h-6" /></div>
                                        <div><p className="font-bold">2 Players</p><p className="text-white/60 text-sm">Play with a friend</p></div>
                                        <FiZap className="w-5 h-5 ml-auto text-white/30" />
                                    </motion.button>
                                )}
                            </div>
                            <button onClick={() => setSelectingMode(null)} className="mt-6 text-white/30 hover:text-white text-sm flex items-center gap-1 mx-auto">← Back</button>
                        </motion.div>
                    )}

                    {/* GAME RENDERS */}
                    {activeGame === 'ttt' && <TicTacToe key="ttt" goBack={goBack} mode={gameMode} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'rps' && <RockPaperScissors key="rps" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'memory' && <MemoryMatch key="memory" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'snake' && <SnakeGame key="snake" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === '2048' && <Game2048 key="2048" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'wordle' && <WordleGame key="wordle" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'minesweeper' && <MinesweeperGame key="mine" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'flappy' && <FlappyBirdGame key="flappy" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'tetris' && <TetrisGame key="tetris" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'connect4' && <Connect4Game key="c4" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'pong' && <PongGame key="pong" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'chess' && <ChessGame key="chess" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'checkers' && <CheckersGame key="chk" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'battleship' && <BattleshipGame key="bs" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                    {activeGame === 'ludo' && <LudoGame key="ludo" goBack={goBack} saveScoreToDb={saveScoreToDb} />}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ═══ ORIGINAL GAMES (kept inline) ═══

function TicTacToe({ goBack, mode, saveScoreToDb }) {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [turn, setTurn] = useState('X');
    const [winner, setWinner] = useState(null);
    const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
    const [winLine, setWinLine] = useState(null);
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    // Pure check — no side effects (used by CPU analysis)
    const checkWinner = (b) => { for (const [a,c,d] of LINES) { if (b[a]&&b[a]===b[c]&&b[a]===b[d]) return { winner: b[a], line: [a,c,d] }; } return b.every(Boolean) ? { winner: 'draw', line: null } : null; };
    // UI check — sets win line for rendering
    const check = (b) => { const result = checkWinner(b); if (result) { setWinLine(result.line); return result.winner; } return null; };
    const cpuMove = (b) => {
        const nb = [...b]; const empty = nb.map((v,i)=>v===null?i:null).filter(v=>v!==null);
        if (!empty.length) return nb;
        // Try to win
        for (const i of empty) { const t=[...nb]; t[i]='O'; const r=checkWinner(t); if (r?.winner==='O') { nb[i]='O'; return nb; } }
        // Block player
        for (const i of empty) { const t=[...nb]; t[i]='X'; const r=checkWinner(t); if (r?.winner==='X') { nb[i]='O'; return nb; } }
        // Center
        if (nb[4]===null) { nb[4]='O'; return nb; }
        // Random
        nb[empty[Math.floor(Math.random()*empty.length)]]='O'; return nb;
    };
    const handleClick = (i) => { if(board[i]||winner) return; const nb=[...board];nb[i]=turn; let w=check(nb); if(w){setBoard(nb);setWinner(w);if(w==='draw')setScores(s=>({...s,draws:s.draws+1}));else{setScores(s=>({...s,[w]:s[w]+1}));if(w==='X')saveScoreToDb?.('tic-tac-toe',1,true);} return;} if(mode==='cpu'){setWinLine(null);const after=cpuMove(nb);setBoard(after);w=check(after);if(w){setWinner(w);if(w==='draw')setScores(s=>({...s,draws:s.draws+1}));else setScores(s=>({...s,[w]:s[w]+1}));}}else{setBoard(nb);setTurn(turn==='X'?'O':'X');} };
    const reset = () => { setBoard(Array(9).fill(null));setTurn('X');setWinner(null);setWinLine(null); };
    return (
        <GameHeader title="Tic-Tac-Toe" gradient="from-violet-400 to-blue-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{label:mode==='cpu'?'You (X)':'Player X',value:scores.X,color:'text-indigo-400',bg:'bg-indigo-500/10',border:'border-indigo-500/20'},{label:'Draws',value:scores.draws},{label:mode==='cpu'?'CPU (O)':'Player O',value:scores.O,color:'text-rose-400',bg:'bg-rose-500/10',border:'border-rose-500/20'}]} />
            {winner&&<motion.div initial={{scale:0}} animate={{scale:1}} className={`mb-4 p-3 rounded-xl font-bold ${winner==='draw'?'bg-white/5 text-white/60':winner==='X'?'bg-emerald-500/15 text-emerald-400':'bg-rose-500/15 text-rose-400'}`}>{winner==='draw'?'🤝 Draw!':winner==='X'?'🎉 X Wins!':'🏆 O Wins!'}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-sm text-white">Again</button></motion.div>}
            {!winner&&<p className="text-white/30 mb-3 text-sm">{mode==='2player'?`${turn}'s turn`:'Your turn (X)'}</p>}
            <div className="grid grid-cols-3 gap-3 max-w-[320px] mx-auto">
                {board.map((cell,i)=>{const isWin=winLine?.includes(i);return(<motion.button key={i} whileHover={!cell&&!winner?{scale:1.05}:{}} whileTap={!cell&&!winner?{scale:0.95}:{}} onClick={()=>handleClick(i)} className={`aspect-square rounded-2xl text-4xl font-black flex items-center justify-center transition-all ${isWin?'bg-emerald-500/30 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20':cell?'bg-white/15 border-2 border-white/20':'bg-white/10 border-2 border-white/20 hover:bg-white/20 hover:border-indigo-400/50 cursor-pointer'} ${cell==='X'?'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]':'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}>{cell}</motion.button>);})}
            </div>
        </GameHeader>
    );
}

function RockPaperScissors({ goBack, saveScoreToDb }) {
    const [choice, setChoice] = useState(null); const [cpuChoice, setCpuChoice] = useState(null); const [result, setResult] = useState(null); const [score, setScore] = useState({player:0,cpu:0}); const [round, setRound] = useState(1); const [streak, setStreak] = useState(0);
    const options = [{id:'rock',emoji:'🪨',beats:'scissors',gradient:'from-orange-500 to-red-500'},{id:'paper',emoji:'📄',beats:'rock',gradient:'from-sky-500 to-blue-500'},{id:'scissors',emoji:'✂️',beats:'paper',gradient:'from-emerald-500 to-green-500'}];
    const play = (c) => { const cpu=options[Math.floor(Math.random()*3)]; setChoice(c);setCpuChoice(cpu); if(c.id===cpu.id){setResult('draw');setStreak(0);}else if(c.beats===cpu.id){setResult('win');setScore(s=>({...s,player:s.player+1}));const ns=streak+1;setStreak(ns);setHighScore('rps',ns);saveScoreToDb?.('rock-paper-scissors',ns,true);}else{setResult('lose');setScore(s=>({...s,cpu:s.cpu+1}));setStreak(0);} };
    const next = () => { setChoice(null);setCpuChoice(null);setResult(null);setRound(r=>r+1); };
    const resetAll = () => { setChoice(null);setCpuChoice(null);setResult(null);setScore({player:0,cpu:0});setRound(1);setStreak(0); };
    return (
        <GameHeader title="Rock Paper Scissors" gradient="from-rose-400 to-fuchsia-400" goBack={goBack} onReset={resetAll}>
            <ScorePanel items={[{label:'You',value:score.player,color:'text-indigo-400',bg:'bg-indigo-500/10',border:'border-indigo-500/20'},{label:'Round',value:round},{label:'CPU',value:score.cpu,color:'text-rose-400',bg:'bg-rose-500/10',border:'border-rose-500/20'}]} />
            {result?(<motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}>
                <div className="flex items-center justify-center gap-8 mb-6">{[{c:choice,label:'YOU',col:'indigo'},{c:cpuChoice,label:'CPU',col:'rose'}].map((p,i)=>(<div key={i} className="text-center"><div className={`w-20 h-20 rounded-xl bg-white/5 border border-${p.col}-400/30 flex items-center justify-center text-4xl mb-1`}>{p.c.emoji}</div><p className={`text-xs font-bold text-${p.col}-300`}>{p.label}</p></div>))}</div>
                <div className={`p-3 rounded-xl font-bold mb-4 ${result==='win'?'bg-emerald-500/15 text-emerald-400':result==='lose'?'bg-rose-500/15 text-rose-400':'bg-amber-500/15 text-amber-400'}`}>{result==='win'?'🎉 You Win!':result==='lose'?'💻 CPU Wins!':'🤝 Draw!'}</div>
                <button onClick={next} className="px-8 py-2.5 bg-gradient-to-r from-rose-500 to-fuchsia-500 rounded-xl font-bold shadow-lg">Next →</button>
            </motion.div>):(<div><p className="text-white/30 mb-6">Pick your weapon</p><div className="flex justify-center gap-4">{options.map(o=>(<motion.button key={o.id} whileHover={{scale:1.15,y:-8}} whileTap={{scale:0.9}} onClick={()=>play(o)} className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${o.gradient} flex flex-col items-center justify-center gap-1 cursor-pointer shadow-2xl`}><span className="text-4xl">{o.emoji}</span><span className="text-[9px] text-white/70 uppercase font-bold">{o.id}</span></motion.button>))}</div></div>)}
        </GameHeader>
    );
}

function MemoryMatch({ goBack, saveScoreToDb }) {
    const createBoard = () => [...MEMORY_ICONS,...MEMORY_ICONS].sort(()=>Math.random()-0.5).map((icon,i)=>({id:i,icon,flipped:false,matched:false}));
    const [cards, setCards] = useState(createBoard); const [flipped, setFlipped] = useState([]); const [moves, setMoves] = useState(0); const [won, setWon] = useState(false); const [lockBoard, setLockBoard] = useState(false);
    const handleFlip = (idx) => { if(lockBoard||cards[idx].flipped||cards[idx].matched) return; const nc=[...cards];nc[idx].flipped=true;setCards(nc); const nf=[...flipped,idx];setFlipped(nf);
        if(nf.length===2){setMoves(m=>m+1);setLockBoard(true);const[a,b]=nf; if(cards[a].icon===cards[b].icon){setTimeout(()=>{const mc=[...cards];mc[a].matched=true;mc[b].matched=true;setCards(mc);setFlipped([]);setLockBoard(false);if(mc.every(c=>c.matched)){setWon(true);const s=1000-(moves+1)*10;setHighScore('memory',s);saveScoreToDb?.('memory',s,true);}},400);}else{setTimeout(()=>{const uf=[...cards];uf[a].flipped=false;uf[b].flipped=false;setCards(uf);setFlipped([]);setLockBoard(false);},700);}} };
    const reset = () => { setCards(createBoard());setFlipped([]);setMoves(0);setWon(false);setLockBoard(false); };
    return (
        <GameHeader title="Memory Match" gradient="from-emerald-400 to-cyan-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{label:'Moves',value:moves,color:'text-teal-400'},{label:'Pairs',value:`${cards.filter(c=>c.matched).length/2}/${MEMORY_ICONS.length}`,color:'text-emerald-400'}]} />
            {won&&<div className="mb-4 p-3 rounded-xl font-bold bg-emerald-500/15 text-emerald-400">🎉 All Matched! {moves} moves<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-sm text-white">Again</button></div>}
            <div className="grid grid-cols-4 gap-2.5 max-w-[300px] mx-auto">
                {cards.map((card,i)=>(<motion.button key={card.id} whileHover={!card.flipped&&!card.matched?{scale:1.08}:{}} onClick={()=>handleFlip(i)}
                    className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all border ${card.matched?'bg-emerald-500/15 border-emerald-400/30':card.flipped?'bg-white/10 border-indigo-400/40':'bg-white/[0.03] border-white/5 hover:bg-white/10 cursor-pointer'}`}>
                    {(card.flipped||card.matched)?card.icon:<span className="text-white/10">?</span>}
                </motion.button>))}
            </div>
        </GameHeader>
    );
}

function SnakeGame({ goBack, saveScoreToDb }) {
    const SIZE=15,SPEED=130;
    const [displaySnake,setDisplaySnake]=useState([{x:7,y:7}]);const [displayFood,setDisplayFood]=useState({x:5,y:5});const [gameOver,setGameOver]=useState(false);const [running,setRunning]=useState(false);const [score,setScore]=useState(0);const [best,setBest]=useState(0);
    const gameState=useRef({snake:[{x:7,y:7}],food:{x:5,y:5},dir:{x:1,y:0},running:false,gameOver:false,score:0});const rafRef=useRef(null);const lastTickRef=useRef(0);
    useEffect(()=>{setBest(getHighScore('snake'));},[]);
    const spawnFood=(snk)=>{let f;do{f={x:Math.floor(Math.random()*SIZE),y:Math.floor(Math.random()*SIZE)};}while(snk.some(s=>s.x===f.x&&s.y===f.y));return f;};
    const tick=()=>{const gs=gameState.current;if(!gs.running||gs.gameOver)return;const head={x:gs.snake[0].x+gs.dir.x,y:gs.snake[0].y+gs.dir.y};if(head.x<0||head.x>=SIZE||head.y<0||head.y>=SIZE||gs.snake.some(s=>s.x===head.x&&s.y===head.y)){gs.gameOver=true;gs.running=false;setGameOver(true);setRunning(false);const isBest=setHighScore('snake',gs.score);if(isBest)setBest(gs.score);saveScoreToDb?.('snake',gs.score,false);return;}const ns=[head,...gs.snake];if(head.x===gs.food.x&&head.y===gs.food.y){gs.score+=10;setScore(gs.score);gs.food=spawnFood(ns);setDisplayFood({...gs.food});}else ns.pop();gs.snake=ns;setDisplaySnake([...ns]);};
    const gameLoop=useCallback((timestamp)=>{const gs=gameState.current;if(!gs.running)return;if(timestamp-lastTickRef.current>=SPEED){lastTickRef.current=timestamp;tick();}rafRef.current=requestAnimationFrame(gameLoop);},[]);
    const startGame=useCallback(()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);const init=[{x:7,y:7}];const fd=spawnFood(init);gameState.current={snake:init,food:fd,dir:{x:1,y:0},running:true,gameOver:false,score:0};setDisplaySnake([...init]);setDisplayFood({...fd});setGameOver(false);setScore(0);setRunning(true);lastTickRef.current=performance.now();rafRef.current=requestAnimationFrame(gameLoop);},[gameLoop]);
    useEffect(()=>{const h=(e)=>{const gs=gameState.current;if(!gs.running)return;const d=gs.dir;if((e.key==='ArrowUp'||e.key==='w')&&d.y!==1)gs.dir={x:0,y:-1};if((e.key==='ArrowDown'||e.key==='s')&&d.y!==-1)gs.dir={x:0,y:1};if((e.key==='ArrowLeft'||e.key==='a')&&d.x!==1)gs.dir={x:-1,y:0};if((e.key==='ArrowRight'||e.key==='d')&&d.x!==-1)gs.dir={x:1,y:0};};window.addEventListener('keydown',h);return()=>{window.removeEventListener('keydown',h);if(rafRef.current)cancelAnimationFrame(rafRef.current);};},[]);
    const moveDir=(dx,dy)=>{const gs=gameState.current;if(dx!==0&&gs.dir.x!==-dx)gs.dir={x:dx,y:0};if(dy!==0&&gs.dir.y!==-dy)gs.dir={x:0,y:dy};};
    return (
        <GameHeader title="🐍 Snake" gradient="from-lime-400 to-emerald-400" goBack={goBack} onReset={startGame}>
            <ScorePanel items={[{label:'Score',value:score,color:'text-green-400'},{label:'Best',value:best||'—',color:'text-amber-400'}]} />
            {!running&&!gameOver&&<button onClick={startGame} className="mb-4 px-8 py-3 bg-gradient-to-r from-lime-500 to-emerald-500 rounded-xl font-bold shadow-xl">▶ Start</button>}
            {gameOver&&<div className="mb-4 p-3 rounded-xl font-bold bg-rose-500/15 text-rose-400">💀 Game Over! {score}<button onClick={startGame} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-sm text-white">Retry</button></div>}
            <div className="inline-grid gap-0 bg-[#0a0c16] rounded-xl p-1 border border-white/5" style={{gridTemplateColumns:`repeat(${SIZE},1fr)`}}>
                {Array.from({length:SIZE*SIZE}).map((_,i)=>{const x=i%SIZE,y=Math.floor(i/SIZE);const isHead=displaySnake[0]?.x===x&&displaySnake[0]?.y===y;const isSnake=displaySnake.some(s=>s.x===x&&s.y===y);const isFood=displayFood.x===x&&displayFood.y===y;return(<div key={i} className={`w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] rounded-[2px] transition-colors duration-75 ${isHead?'bg-green-400 shadow-md shadow-green-400/50':isSnake?'bg-green-500/70':isFood?'bg-red-400 animate-pulse':'bg-white/[0.02]'}`}/>);})}
            </div>
            {running&&<div className="mt-3 inline-grid grid-cols-3 gap-1"><div/><button onClick={()=>moveDir(0,-1)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg font-bold text-white/50">↑</button><div/><button onClick={()=>moveDir(-1,0)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg font-bold text-white/50">←</button><button onClick={()=>moveDir(0,1)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg font-bold text-white/50">↓</button><button onClick={()=>moveDir(1,0)} className="w-10 h-10 bg-white/5 border border-white/10 rounded-lg font-bold text-white/50">→</button></div>}
        </GameHeader>
    );
}
