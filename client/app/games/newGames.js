'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { setHighScore, getHighScore } from './gameData';

// ═══ GAME HEADER ═══
export function GameHeader({ title, gradient, goBack, onReset, children }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="relative max-w-lg mx-auto px-4 sm:px-8 py-6 text-center">
            <div className="flex items-center justify-between mb-4">
                <button onClick={goBack} className="flex items-center gap-1.5 text-white/30 hover:text-white text-sm transition-colors">← Lobby</button>
                <h2 className={`text-xl sm:text-2xl font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{title}</h2>
                <button onClick={onReset} className="text-white/30 hover:text-white transition-colors" title="Reset">🔄</button>
            </div>
            {children}
        </motion.div>
    );
}

// ═══ SCORE PANEL ═══
export function ScorePanel({ items }) {
    return (
        <div className="flex justify-center gap-2 sm:gap-3 mb-4">
            {items.map((item, i) => (
                <div key={i} className={`rounded-xl px-3 sm:px-5 py-2 backdrop-blur-sm border ${item.border || 'border-white/10'} ${item.bg || 'bg-white/5'}`}>
                    <p className="text-[9px] uppercase tracking-wider font-semibold text-white/40">{item.label}</p>
                    <p className={`text-lg sm:text-2xl font-black ${item.color || 'text-white'}`}>{item.value}</p>
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
        // Check game over
        let canMove = false;
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
            if (!b[r][c]) canMove = true;
            if (c < SIZE - 1 && b[r][c] === b[r][c + 1]) canMove = true;
            if (r < SIZE - 1 && b[r][c] === b[r + 1][c]) canMove = true;
        }
        if (!canMove) setGameOver(true);
    }, [board, score, gameOver, won]);

    useEffect(() => {
        const h = (e) => { if (e.key === 'ArrowLeft' || e.key === 'a') move('left'); if (e.key === 'ArrowRight' || e.key === 'd') move('right'); if (e.key === 'ArrowUp' || e.key === 'w') move('up'); if (e.key === 'ArrowDown' || e.key === 's') move('down'); };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [move]);

    // Touch swipe
    const touchRef = useRef(null);
    const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
    const onTouchEnd = (e) => { if (!touchRef.current) return; const dx = e.changedTouches[0].clientX - touchRef.current.x; const dy = e.changedTouches[0].clientY - touchRef.current.y; if (Math.abs(dx) > Math.abs(dy)) { move(dx > 0 ? 'right' : 'left'); } else { move(dy > 0 ? 'down' : 'up'); } touchRef.current = null; };

    const tileColor = (v) => { const c = { 2: 'bg-stone-200 text-stone-800', 4: 'bg-stone-300 text-stone-800', 8: 'bg-orange-300 text-white', 16: 'bg-orange-400 text-white', 32: 'bg-orange-500 text-white', 64: 'bg-red-500 text-white', 128: 'bg-amber-400 text-white', 256: 'bg-amber-500 text-white', 512: 'bg-amber-600 text-white', 1024: 'bg-yellow-500 text-white', 2048: 'bg-yellow-400 text-white' }; return c[v] || 'bg-purple-500 text-white'; };
    const reset = () => { setBoard(initBoard()); setScore(0); setGameOver(false); setWon(false); };

    return (
        <GameHeader title="2048" gradient="from-amber-400 to-red-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{ label: 'Score', value: score, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }, { label: 'Best', value: getHighScore('2048') || '—', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }]} />
            {(gameOver || won) && <div className={`mb-4 p-3 rounded-xl font-bold ${won ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>{won ? '🏆 You reached 2048!' : '💀 Game Over!'}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-sm text-white">Play Again</button></div>}
            <div className="inline-grid grid-cols-4 gap-2 bg-white/5 rounded-xl p-2" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                {board.flat().map((v, i) => (<div key={i} className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center font-black transition-all ${v ? tileColor(v) : 'bg-white/5'} ${v >= 1024 ? 'text-lg' : v >= 128 ? 'text-xl' : 'text-2xl'}`}>{v || ''}</div>))}
            </div>
            <p className="text-white/15 text-xs mt-3">Arrow keys / WASD / Swipe</p>
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

    const submit = () => {
        if (current.length !== 5 || gameOver) return;
        const g = [...guesses, current.toUpperCase()];
        setGuesses(g); setCurrent('');
        if (current.toUpperCase() === target) { setWon(true); setGameOver(true); const sc = (MAX - g.length + 1) * 100; setHighScore('wordle', sc); saveScoreToDb?.('wordle', sc, true); }
        else if (g.length >= MAX) { setGameOver(true); saveScoreToDb?.('wordle', 0, false); }
    };

    useEffect(() => {
        const h = (e) => { if (gameOver) return; if (e.key === 'Backspace') setCurrent(p => p.slice(0, -1)); else if (e.key === 'Enter') submit(); else if (/^[a-zA-Z]$/.test(e.key) && current.length < 5) setCurrent(p => p + e.key.toUpperCase()); };
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
    }, [current, gameOver, guesses]);

    const getColor = (letter, idx, guess) => {
        if (target[idx] === letter) return 'bg-emerald-500 border-emerald-400';
        if (target.includes(letter)) return 'bg-amber-500 border-amber-400';
        return 'bg-white/10 border-white/20';
    };
    const reset = () => { window.location.reload(); };
    const kb = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

    return (
        <GameHeader title="Wordle" gradient="from-emerald-400 to-teal-400" goBack={goBack} onReset={reset}>
            {gameOver && <div className={`mb-3 p-3 rounded-xl font-bold text-sm ${won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{won ? `🎉 Got it in ${guesses.length}!` : `💀 Answer: ${target}`}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-xs text-white">Play Again</button></div>}
            <div className="space-y-1.5 mb-4">
                {Array(MAX).fill(null).map((_, ri) => {
                    const g = guesses[ri]; const isCurrent = ri === guesses.length && !gameOver;
                    return (<div key={ri} className="flex justify-center gap-1.5">
                        {Array(5).fill(null).map((_, ci) => {
                            const letter = g ? g[ci] : (isCurrent ? current[ci] : '');
                            return (<div key={ci} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center text-lg font-black border-2 transition-all ${g ? getColor(g[ci], ci, g) : 'border-white/10 bg-white/5'}`}>{letter || ''}</div>);
                        })}
                    </div>);
                })}
            </div>
            <div className="space-y-1">
                {kb.map((row, ri) => (<div key={ri} className="flex justify-center gap-1">
                    {ri === 2 && <button onClick={submit} className="px-2 py-2 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">ENT</button>}
                    {row.split('').map(k => (<button key={k} onClick={() => { if (!gameOver && current.length < 5) setCurrent(p => p + k); }} className="w-7 h-9 sm:w-8 sm:h-10 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors">{k}</button>))}
                    {ri === 2 && <button onClick={() => setCurrent(p => p.slice(0, -1))} className="px-2 py-2 bg-white/10 rounded text-xs font-bold">⌫</button>}
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

    const reveal = (r, c) => {
        if (gameOver || board[r][c].revealed || board[r][c].flagged) return;
        const b = board.map(row => row.map(cell => ({ ...cell })));
        if (b[r][c].mine) { b.forEach(row => row.forEach(cell => { if (cell.mine) cell.revealed = true; })); setBoard(b); setGameOver(true); return; }
        const flood = (r, c) => { if (r < 0 || r >= ROWS || c < 0 || c >= COLS || b[r][c].revealed || b[r][c].flagged) return; b[r][c].revealed = true; if (b[r][c].count === 0) { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) flood(r + dr, c + dc); } };
        flood(r, c); setBoard(b);
        const unrevealed = b.flat().filter(c => !c.revealed && !c.mine).length;
        if (unrevealed === 0) { setWon(true); setGameOver(true); const sc = 1000; setHighScore('minesweeper', sc); saveScoreToDb?.('minesweeper', sc, true); }
    };
    const flag = (e, r, c) => { e.preventDefault(); if (gameOver || board[r][c].revealed) return; const b = board.map(row => row.map(cell => ({ ...cell }))); b[r][c].flagged = !b[r][c].flagged; setBoard(b); };
    const reset = () => { setBoard(initBoard()); setGameOver(false); setWon(false); };
    const numColor = ['', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-purple-400', 'text-amber-400', 'text-cyan-400', 'text-pink-400', 'text-white'];

    return (
        <GameHeader title="Minesweeper" gradient="from-slate-400 to-zinc-400" goBack={goBack} onReset={reset}>
            {gameOver && <div className={`mb-3 p-3 rounded-xl font-bold text-sm ${won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{won ? '🏆 Cleared!' : '💥 Boom!'}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-xs text-white">Retry</button></div>}
            <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {board.flat().map((cell, i) => { const r = Math.floor(i / COLS), c = i % COLS; return (
                    <button key={i} onClick={() => reveal(r, c)} onContextMenu={(e) => flag(e, r, c)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded text-xs font-bold flex items-center justify-center transition-all ${cell.revealed ? (cell.mine ? 'bg-red-500/30' : 'bg-white/10') : 'bg-white/5 hover:bg-white/15 cursor-pointer border border-white/5'}`}>
                        {cell.flagged ? '🚩' : cell.revealed ? (cell.mine ? '💣' : (cell.count > 0 ? <span className={numColor[cell.count]}>{cell.count}</span> : '')) : ''}
                    </button>
                ); })}
            </div>
            <p className="text-white/15 text-xs mt-3">Click to reveal · Right-click to flag</p>
        </GameHeader>
    );
}

// ═══ FLAPPY BIRD ═══
export function FlappyBirdGame({ goBack, saveScoreToDb }) {
    const W = 320, H = 480, GRAVITY = 0.4, JUMP = -7, PIPE_W = 50, GAP = 140, PIPE_SPEED = 2;
    const canvasRef = useRef(null);
    const stateRef = useRef({ bird: { y: H / 2, vel: 0 }, pipes: [], score: 0, running: false, gameOver: false });
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [started, setStarted] = useState(false);
    const rafRef = useRef(null);

    const start = () => {
        stateRef.current = { bird: { y: H / 2, vel: 0 }, pipes: [{ x: W + 100, gapY: 100 + Math.random() * (H - GAP - 100) }], score: 0, running: true, gameOver: false };
        setScore(0); setGameOver(false); setStarted(true);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(loop);
    };

    const jump = useCallback(() => { if (stateRef.current.gameOver) { start(); return; } stateRef.current.bird.vel = JUMP; if (!stateRef.current.running) start(); }, []);

    useEffect(() => {
        const h = (e) => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } };
        window.addEventListener('keydown', h); return () => { window.removeEventListener('keydown', h); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [jump]);

    const loop = () => {
        const s = stateRef.current; if (!s.running) return;
        s.bird.vel += GRAVITY; s.bird.y += s.bird.vel;
        // Pipes
        s.pipes.forEach(p => { p.x -= PIPE_SPEED; });
        if (s.pipes.length && s.pipes[s.pipes.length - 1].x < W - 200) s.pipes.push({ x: W, gapY: 80 + Math.random() * (H - GAP - 80) });
        s.pipes = s.pipes.filter(p => p.x > -PIPE_W);
        // Collision
        const bx = 60, by = s.bird.y, br = 12;
        if (by < 0 || by > H) { s.running = false; s.gameOver = true; setGameOver(true); setHighScore('flappy', s.score); saveScoreToDb?.('flappy', s.score, false); }
        for (const p of s.pipes) {
            if (bx + br > p.x && bx - br < p.x + PIPE_W) {
                if (by - br < p.gapY || by + br > p.gapY + GAP) { s.running = false; s.gameOver = true; setGameOver(true); setHighScore('flappy', s.score); saveScoreToDb?.('flappy', s.score, false); break; }
            }
            if (!p.scored && p.x + PIPE_W < bx) { p.scored = true; s.score++; setScore(s.score); }
        }
        // Draw
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#0c0e1a'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#6366f1'; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#22c55e';
            for (const p of s.pipes) { ctx.fillRect(p.x, 0, PIPE_W, p.gapY); ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP); }
            ctx.fillStyle = 'white'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.score, W / 2, 40);
        }
        rafRef.current = requestAnimationFrame(loop);
    };

    return (
        <GameHeader title="Flappy Bird" gradient="from-sky-400 to-cyan-400" goBack={goBack} onReset={start}>
            <ScorePanel items={[{ label: 'Score', value: score, color: 'text-sky-400' }, { label: 'Best', value: getHighScore('flappy') || '—', color: 'text-amber-400' }]} />
            <div className="relative inline-block">
                <canvas ref={canvasRef} width={W} height={H} onClick={jump} className="rounded-xl border border-white/10 cursor-pointer" style={{ maxWidth: '100%', height: 'auto' }} />
                {!started && <div className="absolute inset-0 flex items-center justify-center"><button onClick={start} className="px-6 py-3 bg-sky-500 rounded-xl font-bold text-white shadow-lg">▶ Tap to Start</button></div>}
                {gameOver && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"><div className="text-center"><p className="text-xl font-bold text-rose-400 mb-2">Game Over! Score: {score}</p><button onClick={start} className="px-5 py-2 bg-sky-500 rounded-lg font-bold text-white">Retry</button></div></div>}
            </div>
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
            {winner && <div className={`mb-3 p-3 rounded-xl font-bold text-sm ${winner === 'draw' ? 'bg-white/10 text-white/60' : winner === 'R' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{winner === 'draw' ? '🤝 Draw!' : `${winner === 'R' ? '🔴 Red' : '🟡 Yellow'} Wins!`}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-xs text-white">Again</button></div>}
            {!winner && <p className="text-white/30 text-xs mb-2">{turn === 'R' ? '🔴 Red' : '🟡 Yellow'}'s turn</p>}
            <div className="inline-grid gap-1 bg-indigo-900/40 rounded-xl p-2" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {board.flat().map((cell, i) => { const c = i % COLS; return (
                    <button key={i} onClick={() => drop(c)} className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${cell === 'R' ? 'bg-red-500 border-red-400 shadow-lg shadow-red-500/30' : cell === 'Y' ? 'bg-yellow-400 border-yellow-300 shadow-lg shadow-yellow-500/30' : 'bg-white/5 border-white/10 hover:bg-white/15 cursor-pointer'}`} />
                ); })}
            </div>
        </GameHeader>
    );
}

// ═══ PING PONG ═══
export function PongGame({ goBack, saveScoreToDb }) {
    const W = 400, H = 300;
    const canvasRef = useRef(null);
    const stateRef = useRef({ p1: H/2-30, p2: H/2-30, ball: { x: W/2, y: H/2, vx: 3, vy: 2 }, s1: 0, s2: 0, running: false });
    const [scores, setScores] = useState([0, 0]);
    const [started, setStarted] = useState(false);
    const keysRef = useRef({});
    const rafRef = useRef(null);

    const start = () => { stateRef.current = { ...stateRef.current, ball: { x: W/2, y: H/2, vx: 3*(Math.random()>0.5?1:-1), vy: 2*(Math.random()>0.5?1:-1) }, running: true }; setStarted(true); if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(loop); };

    useEffect(() => {
        const kd = (e) => { keysRef.current[e.key] = true; }; const ku = (e) => { keysRef.current[e.key] = false; };
        window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
        return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, []);

    const loop = () => {
        const s = stateRef.current; if (!s.running) return;
        const k = keysRef.current;
        if (k['w'] || k['ArrowUp']) s.p1 = Math.max(0, s.p1 - 5);
        if (k['s'] || k['ArrowDown']) s.p1 = Math.min(H - 60, s.p1 + 5);
        // CPU
        if (s.ball.y < s.p2 + 30) s.p2 = Math.max(0, s.p2 - 3.5);
        else s.p2 = Math.min(H - 60, s.p2 + 3.5);
        s.ball.x += s.ball.vx; s.ball.y += s.ball.vy;
        if (s.ball.y <= 0 || s.ball.y >= H) s.ball.vy *= -1;
        if (s.ball.x <= 15 && s.ball.y >= s.p1 && s.ball.y <= s.p1 + 60) { s.ball.vx = Math.abs(s.ball.vx) * 1.05; }
        if (s.ball.x >= W - 15 && s.ball.y >= s.p2 && s.ball.y <= s.p2 + 60) { s.ball.vx = -Math.abs(s.ball.vx) * 1.05; }
        if (s.ball.x < 0) { s.s2++; setScores([s.s1, s.s2]); s.ball = { x: W/2, y: H/2, vx: 3, vy: 2*(Math.random()>0.5?1:-1) }; }
        if (s.ball.x > W) { s.s1++; setScores([s.s1, s.s2]); s.ball = { x: W/2, y: H/2, vx: -3, vy: 2*(Math.random()>0.5?1:-1) }; setHighScore('pong', s.s1); saveScoreToDb?.('pong', s.s1, true); }
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#0c0e1a'; ctx.fillRect(0, 0, W, H);
            ctx.setLineDash([5, 5]); ctx.strokeStyle = '#ffffff20'; ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#6366f1'; ctx.fillRect(5, s.p1, 10, 60);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(W - 15, s.p2, 10, 60);
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, 6, 0, Math.PI*2); ctx.fill();
            ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${s.s1} - ${s.s2}`, W/2, 30);
        }
        rafRef.current = requestAnimationFrame(loop);
    };

    return (
        <GameHeader title="Ping Pong" gradient="from-cyan-400 to-blue-400" goBack={goBack} onReset={() => { stateRef.current.s1 = 0; stateRef.current.s2 = 0; setScores([0,0]); start(); }}>
            <canvas ref={canvasRef} width={W} height={H} onClick={() => { if (!started) start(); }} className="rounded-xl border border-white/10 cursor-pointer mx-auto block" style={{ maxWidth: '100%', height: 'auto' }} />
            {!started && <button onClick={start} className="mt-3 px-6 py-2 bg-cyan-500 rounded-xl font-bold text-white">▶ Start</button>}
            <p className="text-white/15 text-xs mt-2">W/S or ↑/↓ to move paddle</p>
        </GameHeader>
    );
}
