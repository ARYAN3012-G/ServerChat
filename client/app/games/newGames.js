'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { setHighScore, getHighScore } from './gameData';

// ═══ GAME HEADER — Premium full-width with animated background ═══
export function GameHeader({ title, gradient, goBack, onReset, children }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="relative w-full min-h-[calc(100vh-0px)] flex flex-col">
            {/* Multi-layer themed background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-[-400px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-gradient-to-br ${gradient} opacity-[0.06] rounded-full blur-[160px]`} />
                <div className={`absolute bottom-[-300px] right-[-150px] w-[600px] h-[600px] bg-gradient-to-br ${gradient} opacity-[0.04] rounded-full blur-[120px]`} />
                <div className={`absolute top-[40%] left-[-200px] w-[400px] h-[400px] bg-gradient-to-br ${gradient} opacity-[0.03] rounded-full blur-[100px]`} />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </div>
            {/* Top bar — glass effect */}
            <div className="relative flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/[0.04] backdrop-blur-md bg-white/[0.015]">
                <button onClick={goBack} className="flex items-center gap-1.5 text-white/25 hover:text-white text-sm transition-all font-medium hover:gap-2.5 group">
                    <span className="text-lg group-hover:-translate-x-0.5 transition-transform">←</span> Lobby
                </button>
                <h2 className={`text-xl sm:text-2xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent drop-shadow-sm`}>{title}</h2>
                <button onClick={onReset} className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] hover:border-white/[0.08] flex items-center justify-center text-white/25 hover:text-white transition-all hover:rotate-90 duration-300" title="Reset">🔄</button>
            </div>
            {/* Game content — centered and spacious */}
            <div className="relative flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto">
                {children}
            </div>
        </motion.div>
    );
}

// ═══ SCORE PANEL — Glassmorphism ═══
export function ScorePanel({ items }) {
    return (
        <div className="flex justify-center gap-3 sm:gap-4 mb-6">
            {items.map((item, i) => (
                <div key={i} className={`rounded-2xl px-5 sm:px-7 py-3 backdrop-blur-md border transition-all hover:scale-105 ${item.border || 'border-white/[0.06]'} ${item.bg || 'bg-white/[0.03]'}`}
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                    <p className="text-[9px] uppercase tracking-[0.15em] font-semibold text-white/30 mb-0.5">{item.label}</p>
                    <p className={`text-2xl sm:text-3xl font-black ${item.color || 'text-white'}`}>{item.value}</p>
                </div>
            ))}
        </div>
    );
}

// ═══ 2048 ═══
export function Game2048({ goBack, saveScoreToDb }) {
    const SIZE = 4;
    const newTile = (b) => { const empty = []; b.forEach((r, ri) => r.forEach((c, ci) => { if (!c) empty.push([ri, ci]); })); if (!empty.length) return b; const [r, c] = empty[Math.floor(Math.random() * empty.length)]; b[r][c] = Math.random() < 0.9 ? 2 : 4; return b; };
    const initBoard = () => { const b = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)); newTile(b); newTile(b); return b; };
    const [board, setBoard] = useState(initBoard);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);

    const slide = (row) => { let a = row.filter(v => v); let s = 0; for (let i = 0; i < a.length - 1; i++) { if (a[i] === a[i + 1]) { a[i] *= 2; s += a[i]; a[i + 1] = 0; } } a = a.filter(v => v); while (a.length < SIZE) a.push(0); return { row: a, score: s }; };
    const move = useCallback((dir) => {
        if (gameOver) return;
        let b = board.map(r => [...r]); let sc = 0; let moved = false;
        const transpose = (m) => m[0].map((_, i) => m.map(r => r[i]));
        if (dir === 'left') { b = b.map(r => { const { row, score: s } = slide(r); sc += s; if (row.join() !== r.join()) moved = true; return row; }); }
        else if (dir === 'right') { b = b.map(r => { const rev = [...r].reverse(); const { row, score: s } = slide(rev); sc += s; const res = row.reverse(); if (res.join() !== r.join()) moved = true; return res; }); }
        else if (dir === 'up') { b = transpose(b); b = b.map(r => { const { row, score: s } = slide(r); sc += s; if (row.join() !== r.join()) moved = true; return row; }); b = transpose(b); }
        else if (dir === 'down') { b = transpose(b); b = b.map(r => { const rev = [...r].reverse(); const { row, score: s } = slide(rev); sc += s; const res = row.reverse(); if (res.join() !== r.join()) moved = true; return res; }); b = transpose(b); }
        if (!moved) return;
        newTile(b); const ns = score + sc; setScore(ns); setBoard(b);
        if (b.flat().includes(2048) && !won) setWon(true);
        setHighScore('2048', ns); saveScoreToDb?.('2048', ns, b.flat().includes(2048));
        let canMove = false;
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (!b[r][c]) canMove = true;
            if (c < SIZE - 1 && b[r][c] === b[r][c + 1]) canMove = true;
            if (r < SIZE - 1 && b[r][c] === b[r + 1][c]) canMove = true;
        }
        if (!canMove) setGameOver(true);
    }, [board, score, gameOver, won]);

    useEffect(() => {
        const h = (e) => { if (['ArrowLeft','a'].includes(e.key)) move('left'); if (['ArrowRight','d'].includes(e.key)) move('right'); if (['ArrowUp','w'].includes(e.key)) move('up'); if (['ArrowDown','s'].includes(e.key)) move('down'); };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [move]);

    const touchRef = useRef(null);
    const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchEnd = (e) => { if (!touchRef.current) return; const dx = e.changedTouches[0].clientX - touchRef.current.x; const dy = e.changedTouches[0].clientY - touchRef.current.y; if (Math.abs(dx) > Math.abs(dy)) { move(dx > 0 ? 'right' : 'left'); } else { move(dy > 0 ? 'down' : 'up'); } touchRef.current = null; };

    const tileColor = (v) => { const c = { 2: 'bg-stone-200 text-stone-800', 4: 'bg-stone-300 text-stone-800', 8: 'bg-orange-300 text-white', 16: 'bg-orange-400 text-white', 32: 'bg-orange-500 text-white', 64: 'bg-red-500 text-white', 128: 'bg-amber-400 text-white', 256: 'bg-amber-500 text-white', 512: 'bg-amber-600 text-white', 1024: 'bg-yellow-500 text-white', 2048: 'bg-yellow-400 text-white' }; return c[v] || 'bg-purple-500 text-white'; };
    const reset = () => { setBoard(initBoard()); setScore(0); setGameOver(false); setWon(false); };

    return (
        <GameHeader title="2048" gradient="from-amber-400 to-red-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{ label: 'Score', value: score, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }, { label: 'Best', value: getHighScore('2048') || '—', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }]} />
            {(gameOver || won) && <div className={`mb-6 p-4 rounded-xl font-bold text-center ${won ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{won ? '🏆 You reached 2048!' : '💀 Game Over!'}<button onClick={reset} className="block mx-auto mt-2 px-6 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white transition-colors">Play Again</button></div>}
            <div className="inline-grid grid-cols-4 gap-2.5 bg-white/[0.04] backdrop-blur-sm rounded-2xl p-3 border border-white/5" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                {board.flat().map((v, i) => (<div key={i} className={`w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] rounded-xl flex items-center justify-center font-black transition-all duration-150 ${v ? tileColor(v) : 'bg-white/[0.04]'} ${v >= 1024 ? 'text-lg sm:text-xl' : v >= 128 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>{v || ''}</div>))}
            </div>
            <p className="text-white/20 text-xs mt-4">Arrow keys / WASD / Swipe to move</p>
        </GameHeader>
    );
}

// ═══ WORDLE ═══
const WORDS = ['CRANE', 'BRAVE', 'GHOST', 'FLAME', 'PROUD', 'SHEEP', 'PIANO', 'GRAPE', 'OCEAN', 'STONE', 'RIVER', 'CLOUD', 'TIGER', 'DREAM', 'LIGHT', 'PLANT', 'QUEEN', 'BEACH', 'WORLD', 'CHAIR', 'DANCE', 'EARTH', 'FEAST', 'GUARD', 'HEART', 'JUICE', 'MAGIC', 'PAINT', 'SMELL', 'TRAIN'];
export function WordleGame({ goBack, saveScoreToDb }) {
    const [target] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
    const [guesses, setGuesses] = useState([]);
    const [current, setCurrent] = useState('');
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const MAX = 6;

    const submit = useCallback(() => {
        if (current.length !== 5 || gameOver) return;
        const g = [...guesses, current.toUpperCase()];
        setGuesses(g); setCurrent('');
        if (current.toUpperCase() === target) { setWon(true); setGameOver(true); const sc = (MAX - g.length + 1) * 100; setHighScore('wordle', sc); saveScoreToDb?.('wordle', sc, true); }
        else if (g.length >= MAX) { setGameOver(true); saveScoreToDb?.('wordle', 0, false); }
    }, [current, gameOver, guesses, target]);

    useEffect(() => {
        const h = (e) => { if (gameOver) return; if (e.key === 'Backspace') setCurrent(p => p.slice(0, -1)); else if (e.key === 'Enter') submit(); else if (/^[a-zA-Z]$/.test(e.key) && current.length < 5) setCurrent(p => p + e.key.toUpperCase()); };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [current, gameOver, submit]);

    const getColor = (letter, idx) => {
        if (target[idx] === letter) return 'bg-emerald-500 border-emerald-400';
        if (target.includes(letter)) return 'bg-amber-500 border-amber-400';
        return 'bg-white/10 border-white/20';
    };
    const reset = () => { window.location.reload(); };
    const kb = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

    return (
        <GameHeader title="Wordle" gradient="from-emerald-400 to-teal-400" goBack={goBack} onReset={reset}>
            {gameOver && <div className={`mb-4 p-4 rounded-xl font-bold text-center ${won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{won ? `🎉 Got it in ${guesses.length}!` : `💀 Answer: ${target}`}<button onClick={reset} className="block mx-auto mt-2 px-6 py-2 bg-white/10 rounded-lg text-xs text-white">Play Again</button></div>}
            <div className="space-y-2 mb-6">
                {Array(MAX).fill(null).map((_, ri) => {
                    const g = guesses[ri]; const isCurrent = ri === guesses.length && !gameOver;
                    return (<div key={ri} className="flex justify-center gap-2">
                        {Array(5).fill(null).map((_, ci) => {
                            const letter = g ? g[ci] : (isCurrent ? current[ci] : '');
                            return (<div key={ci} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl font-black border-2 transition-all ${g ? getColor(g[ci], ci) : isCurrent && current[ci] ? 'border-indigo-400 bg-white/5' : 'border-white/10 bg-white/[0.03]'}`}>{letter || ''}</div>);
                        })}
                    </div>);
                })}
            </div>
            <div className="space-y-1.5 w-full max-w-md">
                {kb.map((row, ri) => (<div key={ri} className="flex justify-center gap-1">
                    {ri === 2 && <button onClick={submit} className="px-3 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-bold transition-colors">ENT</button>}
                    {row.split('').map(k => (<button key={k} onClick={() => { if (!gameOver && current.length < 5) setCurrent(p => p + k); }} className="w-8 h-11 sm:w-9 sm:h-12 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">{k}</button>))}
                    {ri === 2 && <button onClick={() => setCurrent(p => p.slice(0, -1))} className="px-3 py-3 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-bold transition-colors">⌫</button>}
                </div>))}
            </div>
        </GameHeader>
    );
}

// ═══ MINESWEEPER ═══
export function MinesweeperGame({ goBack, saveScoreToDb }) {
    const ROWS = 9, COLS = 9, MINES = 10;
    const initBoard = () => {
        const b = Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ mine: false, revealed: false, flagged: false, count: 0 })));
        let placed = 0;
        while (placed < MINES) { const r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS); if (!b[r][c].mine) { b[r][c].mine = true; placed++; } }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (b[r][c].mine) continue; let cnt = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && b[nr][nc].mine) cnt++; } b[r][c].count = cnt; }
        return b;
    };
    const [board, setBoard] = useState(initBoard);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [flagCount, setFlagCount] = useState(0);

    const reveal = (r, c) => {
        if (gameOver || board[r][c].revealed || board[r][c].flagged) return;
        const b = board.map(row => row.map(cell => ({ ...cell })));
        if (b[r][c].mine) { b.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; })); setBoard(b); setGameOver(true); return; }
        const flood = (r, c) => { if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c].revealed || b[r][c].flagged) return; b[r][c].revealed = true; if (b[r][c].count === 0) { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(r + dr, c + dc); } };
        flood(r, c); setBoard(b);
        const unrevealed = b.flat().filter(c => !c.revealed && !c.mine).length;
        if (unrevealed === 0) { setWon(true); setGameOver(true); const sc = 1000; setHighScore('minesweeper', sc); saveScoreToDb?.('minesweeper', sc, true); }
    };
    const flag = (e, r, c) => { e.preventDefault(); if (gameOver || board[r][c].revealed) return; const b = board.map(row => row.map(cell => ({ ...cell }))); b[r][c].flagged = !b[r][c].flagged; setBoard(b); setFlagCount(b.flat().filter(c => c.flagged).length); };
    const reset = () => { setBoard(initBoard()); setGameOver(false); setWon(false); setFlagCount(0); };
    const numColor = ['', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-amber-400', 'text-cyan-400', 'text-pink-400', 'text-white'];

    return (
        <GameHeader title="Minesweeper" gradient="from-slate-400 to-zinc-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{ label: '💣 Mines', value: MINES, color: 'text-red-400' }, { label: '🚩 Flags', value: flagCount, color: 'text-amber-400' }]} />
            {gameOver && <div className={`mb-4 p-4 rounded-xl font-bold text-center ${won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{won ? '🏆 Cleared!' : '💥 Boom!'}<button onClick={reset} className="block mx-auto mt-2 px-6 py-2 bg-white/10 rounded-lg text-xs text-white">Retry</button></div>}
            <div className="inline-grid gap-1 bg-white/[0.03] backdrop-blur-sm rounded-xl p-2 border border-white/5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {board.flat().map((cell, i) => { const r = Math.floor(i / COLS), c = i % COLS; return (
                    <button key={i} onClick={() => reveal(r, c)} onContextMenu={(e) => flag(e, r, c)}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-sm font-bold flex items-center justify-center transition-all ${cell.revealed ? (cell.mine ? 'bg-red-500/30 border border-red-500/30' : 'bg-white/10 border border-white/5') : 'bg-white/[0.04] hover:bg-white/10 cursor-pointer border border-white/5'}`}>
                        {cell.flagged ? '🚩' : cell.revealed ? (cell.mine ? '💣' : (cell.count > 0 ? <span className={numColor[cell.count]}>{cell.count}</span> : '')) : ''}
                    </button>
                ); })}
            </div>
            <p className="text-white/20 text-xs mt-4">Click to reveal · Right-click to flag</p>
        </GameHeader>
    );
}

// ═══ FLAPPY BIRD (easy physics, big canvas) ═══
export function FlappyBirdGame({ goBack, saveScoreToDb }) {
    const W = 500, H = 680, GRAVITY = 0.08, JUMP = -3.8, PIPE_W = 58, GAP = 220, PIPE_SPEED = 1.5;
    const canvasRef = useRef(null);
    const stateRef = useRef({ bird: { y: H / 3, vel: -3 }, pipes: [], score: 0, running: false, gameOver: false, frame: 0 });
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [started, setStarted] = useState(false);
    const rafRef = useRef(null);
    const saveRef = useRef(saveScoreToDb);
    saveRef.current = saveScoreToDb;

    const gameLoop = useCallback(() => {
        const s = stateRef.current; if (!s.running) return;
        s.frame++;
        s.bird.vel += GRAVITY; s.bird.y += s.bird.vel;
        s.pipes.forEach(p => { p.x -= PIPE_SPEED; });
        if (s.pipes.length && s.pipes[s.pipes.length - 1].x < W - 280) s.pipes.push({ x: W, gapY: 100 + Math.random() * (H - GAP - 160) });
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
        const bx = 90, by = s.bird.y, br = 16;
        const die = () => { s.running = false; s.gameOver = true; setGameOver(true); setHighScore('flappy', s.score); saveRef.current?.('flappy', s.score, false); };
        if (by < 0 || by > H - 10) { die(); }
        for (const p of s.pipes) {
            if (bx + br > p.x && bx - br < p.x + PIPE_W) {
                if (by - br < p.gapY || by + br > p.gapY + GAP) { die(); break; }
            }
            if (!p.scored && p.x + PIPE_W < bx) { p.scored = true; s.score++; setScore(s.score); }
        }
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
            skyGrad.addColorStop(0, '#0f172a'); skyGrad.addColorStop(0.6, '#1e293b'); skyGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            for (let i = 0; i < 30; i++) { const sx = (i * 73 + s.frame * 0.1) % W; const sy = (i * 47) % (H * 0.5); ctx.fillRect(sx, sy, 1.5, 1.5); }
            ctx.fillStyle = '#1a2744'; ctx.fillRect(0, H - 10, W, 10);
            for (const p of s.pipes) {
                const pGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
                pGrad.addColorStop(0, '#22c55e'); pGrad.addColorStop(0.5, '#16a34a'); pGrad.addColorStop(1, '#15803d');
                ctx.fillStyle = pGrad;
                ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
                ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(p.x - 3, p.gapY - 16, PIPE_W + 6, 16);
                ctx.fillRect(p.x - 3, p.gapY + GAP, PIPE_W + 6, 16);
            }
            ctx.save(); ctx.translate(bx, by);
            const rot = Math.min(Math.max(s.bird.vel * 3, -30), 70) * Math.PI / 180;
            ctx.rotate(rot);
            ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.ellipse(-2, -4, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(6, -3, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(7, -4, 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(22, -2); ctx.lineTo(22, 4); ctx.closePath(); ctx.fill();
            ctx.restore();
            ctx.fillStyle = 'white'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8;
            ctx.fillText(s.score, W / 2, 50);
            ctx.shadowBlur = 0;
        }
        if (s.running) rafRef.current = requestAnimationFrame(gameLoop);
    }, []);

    const start = useCallback(() => {
        stateRef.current = { bird: { y: H / 3, vel: -3 }, pipes: [{ x: W + 250, gapY: 120 + Math.random() * (H - GAP - 180) }], score: 0, running: true, gameOver: false, frame: 0 };
        setScore(0); setGameOver(false); setStarted(true);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(gameLoop);
    }, [gameLoop]);

    const jump = useCallback(() => {
        if (stateRef.current.gameOver) { start(); return; }
        stateRef.current.bird.vel = JUMP;
        if (!stateRef.current.running) start();
    }, [start]);

    useEffect(() => {
        const h = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } };
        window.addEventListener('keydown', h);
        return () => { window.removeEventListener('keydown', h); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [jump]);

    return (
        <GameHeader title="Flappy Bird" gradient="from-sky-400 to-cyan-400" goBack={goBack} onReset={start}>
            <ScorePanel items={[{ label: 'Score', value: score, color: 'text-sky-400' }, { label: 'Best', value: getHighScore('flappy') || '—', color: 'text-amber-400' }]} />
            <div className="relative inline-block rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-sky-500/10">
                <canvas ref={canvasRef} width={W} height={H} onClick={jump} className="cursor-pointer block" style={{ maxWidth: '100%', height: 'auto' }} />
                {!started && <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"><button onClick={start} className="px-8 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl font-bold text-white shadow-xl text-lg">▶ Tap to Start</button></div>}
                {gameOver && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"><p className="text-2xl font-bold text-rose-400 mb-1">Game Over!</p><p className="text-4xl font-black text-white mb-4">{score}</p><button onClick={start} className="px-8 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-xl font-bold text-white">Retry</button></div></div>}
            </div>
            <p className="text-white/20 text-xs mt-4">Spacebar / Click / Tap to flap</p>
        </GameHeader>
    );
}

// ═══ CONNECT 4 ═══
export function Connect4Game({ goBack, saveScoreToDb }) {
    const ROWS = 6, COLS = 7;
    const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    const [turn, setTurn] = useState('R');
    const [winner, setWinner] = useState(null);
    const [scores, setScores] = useState({ R: 0, Y: 0 });

    const checkWin = (b, r, c, col) => {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (const [dr, dc] of dirs) {
            let cnt = 1;
            for (let i = 1; i < 4; i++) { const nr = r+dr*i, nc = c+dc*i; if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&b[nr][nc]===col) cnt++; else break; }
            for (let i = 1; i < 4; i++) { const nr = r-dr*i, nc = c-dc*i; if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&b[nr][nc]===col) cnt++; else break; }
            if (cnt >= 4) return true;
        }
        return false;
    };

    const drop = (col) => {
        if (winner) return;
        const b = board.map(r => [...r]);
        let row = -1;
        for (let r = ROWS - 1; r >= 0; r--) { if (!b[r][col]) { row = r; break; } }
        if (row === -1) return;
        b[row][col] = turn;
        if (checkWin(b, row, col, turn)) { setWinner(turn); setScores(s => ({...s, [turn]: s[turn]+1})); setHighScore('connect4', scores[turn]+1); saveScoreToDb?.('connect4', 1, true); }
        else if (b[0].every(c => c)) { setWinner('draw'); }
        setBoard(b); setTurn(turn === 'R' ? 'Y' : 'R');
    };

    const reset = () => { setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null))); setTurn('R'); setWinner(null); };

    return (
        <GameHeader title="Connect 4" gradient="from-red-400 to-pink-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{ label: '🔴 Red', value: scores.R, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }, { label: '🟡 Yellow', value: scores.Y, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }]} />
            {winner && <div className={`mb-4 p-4 rounded-xl font-bold text-center ${winner === 'draw' ? 'bg-white/10 text-white/60' : winner === 'R' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{winner === 'draw' ? '🤝 Draw!' : `${winner === 'R' ? '🔴 Red' : '🟡 Yellow'} Wins!`}<button onClick={reset} className="block mx-auto mt-2 px-6 py-2 bg-white/10 rounded-lg text-xs text-white">Again</button></div>}
            {!winner && <p className="text-white/30 text-sm mb-3 font-medium">{turn === 'R' ? '🔴 Red' : '🟡 Yellow'}'s turn</p>}
            <div className="inline-grid gap-1.5 bg-indigo-900/40 backdrop-blur-sm rounded-2xl p-3 border border-indigo-500/20" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {board.flat().map((cell, i) => { const c = i % COLS; return (
                    <button key={i} onClick={() => drop(c)} className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 transition-all ${cell === 'R' ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30' : cell === 'Y' ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/30' : 'bg-white/5 border-white/10 hover:bg-white/15 cursor-pointer'}`} />
                ); })}
            </div>
        </GameHeader>
    );
}

// ═══ PING PONG ═══
export function PongGame({ goBack, saveScoreToDb }) {
    const W = 600, H = 420, MAX_SPEED = 10;
    const canvasRef = useRef(null);
    const stateRef = useRef({ p1: H/2-30, p2: H/2-30, ball: { x: W/2, y: H/2, vx: 3, vy: 2 }, s1: 0, s2: 0, running: false });
    const [scores, setScores] = useState([0, 0]);
    const [started, setStarted] = useState(false);
    const keysRef = useRef({});
    const rafRef = useRef(null);
    const saveRef = useRef(saveScoreToDb);
    saveRef.current = saveScoreToDb;

    const drawRoundRect = (ctx, x, y, w, h, r) => {
        ctx.beginPath(); ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath(); ctx.fill();
    };

    const start = useCallback(() => { stateRef.current = { ...stateRef.current, ball: { x: W/2, y: H/2, vx: 3*(Math.random()>0.5?1:-1), vy: 2*(Math.random()>0.5?1:-1) }, running: true }; setStarted(true); if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(loop); }, []);

    useEffect(() => {
        const kd = (e) => { keysRef.current[e.key] = true; }; const ku = (e) => { keysRef.current[e.key] = false; };
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
        return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    const loop = useCallback(() => {
        const s = stateRef.current; if (!s.running) return;
        const k = keysRef.current;
        if (k['w'] || k['ArrowUp']) s.p1 = Math.max(0, s.p1 - 5);
        if (k['s'] || k['ArrowDown']) s.p1 = Math.min(H - 60, s.p1 + 5);
        // CPU AI with slight delay for fairness
        const cpuTarget = s.ball.y - 30;
        if (s.p2 < cpuTarget) s.p2 = Math.min(H - 60, s.p2 + 3.5);
        else if (s.p2 > cpuTarget) s.p2 = Math.max(0, s.p2 - 3.5);
        s.ball.x += s.ball.vx; s.ball.y += s.ball.vy;
        if (s.ball.y <= 0 || s.ball.y >= H) s.ball.vy *= -1;
        // Left paddle collision
        if (s.ball.x <= 18 && s.ball.y >= s.p1 && s.ball.y <= s.p1 + 60) {
            const speed = Math.min(Math.abs(s.ball.vx) * 1.05, MAX_SPEED);
            s.ball.vx = speed;
            s.ball.x = 19; // prevent double-hit
        }
        // Right paddle collision
        if (s.ball.x >= W - 18 && s.ball.y >= s.p2 && s.ball.y <= s.p2 + 60) {
            const speed = Math.min(Math.abs(s.ball.vx) * 1.05, MAX_SPEED);
            s.ball.vx = -speed;
            s.ball.x = W - 19; // prevent double-hit
        }
        if (s.ball.x < 0) { s.s2++; setScores([s.s1, s.s2]); s.ball = { x: W/2, y: H/2, vx: 3, vy: 2*(Math.random()>0.5?1:-1) }; }
        if (s.ball.x > W) { s.s1++; setScores([s.s1, s.s2]); s.ball = { x: W/2, y: H/2, vx: -3, vy: 2*(Math.random()>0.5?1:-1) }; setHighScore('pong', s.s1); saveRef.current?.('pong', s.s1, true); }
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            const bg = ctx.createLinearGradient(0, 0, 0, H);
            bg.addColorStop(0, '#0c0e1a'); bg.addColorStop(1, '#111827');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            ctx.setLineDash([6, 6]); ctx.strokeStyle = '#ffffff15'; ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke(); ctx.setLineDash([]);
            // Paddles with glow (using cross-browser drawRoundRect)
            ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 15;
            ctx.fillStyle = '#6366f1'; drawRoundRect(ctx, 6, s.p1, 12, 60, 6);
            ctx.shadowColor = '#ef4444'; ctx.fillStyle = '#ef4444'; drawRoundRect(ctx, W - 18, s.p2, 12, 60, 6);
            ctx.shadowBlur = 0;
            // Ball with trail
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath(); ctx.arc(s.ball.x - s.ball.vx * 2, s.ball.y - s.ball.vy * 2, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, 7, 0, Math.PI*2); ctx.fill();
            ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(s.s1, W/2 - 50, 40); ctx.fillText(s.s2, W/2 + 50, 40);
        }
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    return (
        <GameHeader title="Ping Pong" gradient="from-cyan-400 to-blue-400" goBack={goBack} onReset={() => { stateRef.current.s1 = 0; stateRef.current.s2 = 0; setScores([0,0]); start(); }}>
            <div className="relative inline-block rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <canvas ref={canvasRef} width={W} height={H} onClick={() => { if (!started) start(); }} className="cursor-pointer block" style={{ maxWidth: '100%', height: 'auto' }} />
                {!started && <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"><button onClick={start} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl font-bold text-white shadow-xl text-lg">▶ Start</button></div>}
            </div>
            <p className="text-white/20 text-xs mt-4">W/S or ↑/↓ to move paddle</p>
        </GameHeader>
    );
}
