'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameHeader, ScorePanel } from './newGames';
import { setHighScore, getHighScore } from './gameData';

// ═══ TETRIS ═══
const TETRIS_SHAPES = [
    { shape: [[1,1,1,1]], color: '#06b6d4' },
    { shape: [[1,1],[1,1]], color: '#eab308' },
    { shape: [[0,1,0],[1,1,1]], color: '#a855f7' },
    { shape: [[1,0],[1,0],[1,1]], color: '#f97316' },
    { shape: [[0,1],[0,1],[1,1]], color: '#3b82f6' },
    { shape: [[1,1,0],[0,1,1]], color: '#22c55e' },
    { shape: [[0,1,1],[1,1,0]], color: '#ef4444' },
];

export function TetrisGame({ goBack, saveScoreToDb }) {
    const COLS = 10, ROWS = 20, SPEED = 500;
    const canvasRef = useRef(null);
    const stateRef = useRef({ board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), piece: null, pos: { x: 0, y: 0 }, score: 0, lines: 0, running: false, gameOver: false });
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [started, setStarted] = useState(false);
    const intervalRef = useRef(null);

    const newPiece = () => { const t = TETRIS_SHAPES[Math.floor(Math.random() * TETRIS_SHAPES.length)]; return { shape: t.shape.map(r => [...r]), color: t.color }; };
    const rotate = (shape) => shape[0].map((_, i) => shape.map(r => r[i]).reverse());
    const valid = (board, piece, pos) => { for (let r = 0; r < piece.shape.length; r++) for (let c = 0; c < piece.shape[r].length; c++) { if (!piece.shape[r][c]) continue; const nr = pos.y + r, nc = pos.x + c; if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc]) return false; } return true; };

    const place = (s) => {
        const { board, piece, pos } = s;
        for (let r = 0; r < piece.shape.length; r++) for (let c = 0; c < piece.shape[r].length; c++) { if (piece.shape[r][c]) board[pos.y + r][pos.x + c] = piece.color; }
        // Clear lines
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) { if (board[r].every(c => c)) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); cleared++; r++; } }
        s.lines += cleared; s.score += cleared * cleared * 100;
        setScore(s.score); setLines(s.lines);
        // New piece
        const np = newPiece(); const npos = { x: Math.floor((COLS - np.shape[0].length) / 2), y: 0 };
        if (!valid(board, np, npos)) { s.running = false; s.gameOver = true; setGameOver(true); setHighScore('tetris', s.score); saveScoreToDb?.('tetris', s.score, false); return; }
        s.piece = np; s.pos = npos;
    };

    const tick = () => {
        const s = stateRef.current; if (!s.running) return;
        const npos = { ...s.pos, y: s.pos.y + 1 };
        if (valid(s.board, s.piece, npos)) { s.pos = npos; } else { place(s); }
        draw();
    };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
        const s = stateRef.current; const CW = 20;
        ctx.fillStyle = '#0c0e1a'; ctx.fillRect(0, 0, COLS * CW, ROWS * CW);
        // Grid
        ctx.strokeStyle = '#ffffff08';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { ctx.strokeRect(c * CW, r * CW, CW, CW); if (s.board[r][c]) { ctx.fillStyle = s.board[r][c]; ctx.fillRect(c * CW + 1, r * CW + 1, CW - 2, CW - 2); } }
        // Piece
        if (s.piece) { ctx.fillStyle = s.piece.color; for (let r = 0; r < s.piece.shape.length; r++) for (let c = 0; c < s.piece.shape[r].length; c++) { if (s.piece.shape[r][c]) ctx.fillRect((s.pos.x + c) * CW + 1, (s.pos.y + r) * CW + 1, CW - 2, CW - 2); } }
    };

    const start = () => {
        const np = newPiece();
        stateRef.current = { board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), piece: np, pos: { x: Math.floor((COLS - np.shape[0].length) / 2), y: 0 }, score: 0, lines: 0, running: true, gameOver: false };
        setScore(0); setLines(0); setGameOver(false); setStarted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, SPEED);
        draw();
    };

    useEffect(() => {
        const h = (e) => {
            const s = stateRef.current; if (!s.running) return;
            if (e.key === 'ArrowLeft' || e.key === 'a') { const np = { ...s.pos, x: s.pos.x - 1 }; if (valid(s.board, s.piece, np)) s.pos = np; }
            if (e.key === 'ArrowRight' || e.key === 'd') { const np = { ...s.pos, x: s.pos.x + 1 }; if (valid(s.board, s.piece, np)) s.pos = np; }
            if (e.key === 'ArrowDown' || e.key === 's') { const np = { ...s.pos, y: s.pos.y + 1 }; if (valid(s.board, s.piece, np)) s.pos = np; }
            if (e.key === 'ArrowUp' || e.key === 'w') { const rotated = { ...s.piece, shape: rotate(s.piece.shape) }; if (valid(s.board, rotated, s.pos)) s.piece = rotated; }
            if (e.key === ' ') { while (valid(s.board, s.piece, { ...s.pos, y: s.pos.y + 1 })) s.pos.y++; place(s); }
            draw();
        };
        window.addEventListener('keydown', h);
        return () => { window.removeEventListener('keydown', h); if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    return (
        <GameHeader title="Tetris" gradient="from-purple-400 to-indigo-400" goBack={goBack} onReset={start}>
            <ScorePanel items={[{ label: 'Score', value: score, color: 'text-purple-400' }, { label: 'Lines', value: lines, color: 'text-indigo-400' }, { label: 'Best', value: getHighScore('tetris') || '—', color: 'text-amber-400' }]} />
            <div className="relative inline-block">
                <canvas ref={canvasRef} width={200} height={400} className="rounded-xl border border-white/10" style={{ maxWidth: '100%', height: 'auto' }} />
                {!started && <div className="absolute inset-0 flex items-center justify-center"><button onClick={start} className="px-6 py-3 bg-purple-500 rounded-xl font-bold text-white">▶ Start</button></div>}
                {gameOver && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"><div className="text-center"><p className="text-lg font-bold text-rose-400 mb-2">Game Over! {score} pts</p><button onClick={start} className="px-5 py-2 bg-purple-500 rounded-lg font-bold text-white">Retry</button></div></div>}
            </div>
            <div className="flex justify-center gap-2 mt-3">
                {[['←', () => { const s = stateRef.current; const np = {...s.pos, x: s.pos.x-1}; if (valid(s.board, s.piece, np)) s.pos = np; draw(); }],
                  ['↻', () => { const s = stateRef.current; const rot = {...s.piece, shape: rotate(s.piece.shape)}; if (valid(s.board, rot, s.pos)) s.piece = rot; draw(); }],
                  ['↓', () => { const s = stateRef.current; const np = {...s.pos, y: s.pos.y+1}; if (valid(s.board, s.piece, np)) s.pos = np; draw(); }],
                  ['→', () => { const s = stateRef.current; const np = {...s.pos, x: s.pos.x+1}; if (valid(s.board, s.piece, np)) s.pos = np; draw(); }]
                ].map(([l, fn]) => <button key={l} onClick={fn} className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-bold text-white/50">{l}</button>)}
            </div>
        </GameHeader>
    );
}

// ═══ CHESS (Simplified vs CPU) ═══
export function ChessGame({ goBack, saveScoreToDb }) {
    const INIT = [
        ['♜','♞','♝','♛','♚','♝','♞','♜'],
        ['♟','♟','♟','♟','♟','♟','♟','♟'],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        ['♙','♙','♙','♙','♙','♙','♙','♙'],
        ['♖','♘','♗','♕','♔','♗','♘','♖'],
    ];
    const WHITE = ['♔','♕','♖','♗','♘','♙'];
    const BLACK = ['♚','♛','♜','♝','♞','♟'];

    const [board, setBoard] = useState(INIT.map(r => [...r]));
    const [selected, setSelected] = useState(null);
    const [turn, setTurn] = useState('white');
    const [captured, setCaptured] = useState({ white: [], black: [] });
    const [status, setStatus] = useState('');

    const isWhite = (p) => p && WHITE.includes(p);
    const isBlack = (p) => p && BLACK.includes(p);

    const handleClick = (r, c) => {
        if (turn !== 'white') return;
        const piece = board[r][c];
        if (selected) {
            const [sr, sc] = selected;
            const sp = board[sr][sc];
            if (r === sr && c === sc) { setSelected(null); return; }
            // Simple move (no validation beyond basic)
            if (isWhite(sp)) {
                const target = board[r][c];
                if (isWhite(target)) { setSelected([r, c]); return; }
                const nb = board.map(row => [...row]);
                if (target && isBlack(target)) setCaptured(p => ({...p, white: [...p.white, target]}));
                nb[r][c] = sp; nb[sr][sc] = null;
                // Check if king captured
                if (target === '♚') { setStatus('White wins!'); saveScoreToDb?.('chess', 1, true); }
                setBoard(nb); setSelected(null); setTurn('black');
                // CPU move after delay
                setTimeout(() => cpuMove(nb), 500);
            }
        } else if (piece && isWhite(piece)) { setSelected([r, c]); }
    };

    const cpuMove = (b) => {
        const moves = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (isBlack(b[r][c])) {
                for (let tr = 0; tr < 8; tr++) for (let tc = 0; tc < 8; tc++) {
                    if (tr === r && tc === c) continue;
                    if (!isBlack(b[tr][tc])) moves.push({ fr: r, fc: c, tr, tc, capture: b[tr][tc] });
                }
            }
        }
        if (!moves.length) { setStatus('Stalemate!'); return; }
        // Prefer captures
        const captures = moves.filter(m => m.capture);
        const m = captures.length ? captures[Math.floor(Math.random() * captures.length)] : moves[Math.floor(Math.random() * moves.length)];
        const nb = b.map(row => [...row]);
        if (m.capture) setCaptured(p => ({...p, black: [...p.black, m.capture]}));
        if (m.capture === '♔') { setStatus('Black wins!'); }
        nb[m.tr][m.tc] = nb[m.fr][m.fc]; nb[m.fr][m.fc] = null;
        setBoard(nb); setTurn('white');
    };

    const reset = () => { setBoard(INIT.map(r => [...r])); setSelected(null); setTurn('white'); setCaptured({ white: [], black: [] }); setStatus(''); };

    return (
        <GameHeader title="Chess" gradient="from-neutral-400 to-stone-400" goBack={goBack} onReset={reset}>
            {status && <div className="mb-3 p-3 rounded-xl font-bold text-sm bg-amber-500/20 text-amber-400">{status}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-xs text-white">New Game</button></div>}
            <p className="text-white/30 text-xs mb-2">{turn === 'white' ? '⬜ Your turn' : '⬛ CPU thinking...'}</p>
            <div className="inline-grid grid-cols-8 gap-0 rounded-lg overflow-hidden border border-white/10">
                {board.flat().map((cell, i) => { const r = Math.floor(i / 8), c = i % 8; const isDark = (r + c) % 2 === 1;
                    return (<button key={i} onClick={() => handleClick(r, c)}
                        className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-lg sm:text-2xl transition-all ${isDark ? 'bg-stone-600' : 'bg-stone-300'} ${selected?.[0]===r&&selected?.[1]===c ? 'ring-2 ring-indigo-400 ring-inset' : ''} hover:brightness-110`}>
                        {cell || ''}
                    </button>);
                })}
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs text-white/30">
                <span>⬜ {captured.white.join('')}</span>
                <span>⬛ {captured.black.join('')}</span>
            </div>
        </GameHeader>
    );
}

// ═══ CHECKERS ═══
export function CheckersGame({ goBack, saveScoreToDb }) {
    const initBoard = () => {
        const b = Array(8).fill(null).map(() => Array(8).fill(null));
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { if ((r+c)%2===1) b[r][c] = 'b'; }
        for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) { if ((r+c)%2===1) b[r][c] = 'r'; }
        return b;
    };
    const [board, setBoard] = useState(initBoard);
    const [selected, setSelected] = useState(null);
    const [turn, setTurn] = useState('r');
    const [status, setStatus] = useState('');

    const handleClick = (r, c) => {
        if (turn !== 'r' || status) return;
        if (selected) {
            const [sr, sc] = selected;
            const dr = r - sr, dc = c - sc;
            if (Math.abs(dr) === 1 && Math.abs(dc) === 1 && !board[r][c]) {
                const nb = board.map(row => [...row]); nb[r][c] = nb[sr][sc]; nb[sr][sc] = null;
                if (r === 0) nb[r][c] = 'R'; // King
                setBoard(nb); setSelected(null); setTurn('b');
                setTimeout(() => cpuMove(nb), 400);
            } else if (Math.abs(dr) === 2 && Math.abs(dc) === 2) {
                const mr = sr + dr/2, mc = sc + dc/2;
                if (board[mr][mc] && board[mr][mc].toLowerCase() === 'b' && !board[r][c]) {
                    const nb = board.map(row => [...row]); nb[r][c] = nb[sr][sc]; nb[sr][sc] = null; nb[mr][mc] = null;
                    if (r === 0) nb[r][c] = 'R';
                    setBoard(nb); setSelected(null); setTurn('b');
                    if (!nb.flat().some(p => p && p.toLowerCase() === 'b')) { setStatus('🏆 You win!'); saveScoreToDb?.('checkers', 1, true); return; }
                    setTimeout(() => cpuMove(nb), 400);
                } else { setSelected(board[r][c]?.toLowerCase() === 'r' ? [r, c] : null); }
            } else { setSelected(board[r][c]?.toLowerCase() === 'r' ? [r, c] : null); }
        } else if (board[r][c]?.toLowerCase() === 'r') { setSelected([r, c]); }
    };

    const cpuMove = (b) => {
        const moves = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (b[r][c]?.toLowerCase() === 'b') {
                for (const [dr, dc] of [[1,-1],[1,1],[-1,-1],[-1,1]]) {
                    const nr = r+dr, nc = c+dc;
                    if (nr>=0&&nr<8&&nc>=0&&nc<8&&!b[nr][nc]) moves.push({fr:r,fc:c,tr:nr,tc:nc,jump:false});
                    const jr = r+dr*2, jc = c+dc*2;
                    if (jr>=0&&jr<8&&jc>=0&&jc<8&&!b[jr][jc]&&b[nr]?.[nc]?.toLowerCase()==='r') moves.push({fr:r,fc:c,tr:jr,tc:jc,mr:nr,mc:nc,jump:true});
                }
            }
        }
        if (!moves.length) { setStatus('🏆 You win!'); saveScoreToDb?.('checkers', 1, true); return; }
        const jumps = moves.filter(m => m.jump);
        const m = jumps.length ? jumps[Math.floor(Math.random()*jumps.length)] : moves[Math.floor(Math.random()*moves.length)];
        const nb = b.map(row => [...row]);
        nb[m.tr][m.tc] = nb[m.fr][m.fc]; nb[m.fr][m.fc] = null;
        if (m.jump) nb[m.mr][m.mc] = null;
        if (m.tr === 7) nb[m.tr][m.tc] = 'B';
        if (!nb.flat().some(p => p?.toLowerCase() === 'r')) { setStatus('💀 CPU wins!'); }
        setBoard(nb); setTurn('r');
    };

    const reset = () => { setBoard(initBoard()); setSelected(null); setTurn('r'); setStatus(''); };

    return (
        <GameHeader title="Checkers" gradient="from-orange-400 to-amber-400" goBack={goBack} onReset={reset}>
            {status && <div className="mb-3 p-3 rounded-xl font-bold text-sm bg-amber-500/20 text-amber-400">{status}<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-xs text-white">New Game</button></div>}
            <p className="text-white/30 text-xs mb-2">{turn === 'r' ? '🔴 Your turn' : '⚫ CPU...'}</p>
            <div className="inline-grid grid-cols-8 gap-0 rounded-lg overflow-hidden border border-white/10">
                {board.flat().map((cell, i) => { const r = Math.floor(i/8), c = i%8; const isDark = (r+c)%2===1;
                    return (<button key={i} onClick={() => handleClick(r, c)}
                        className={`w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center transition-all ${isDark ? 'bg-stone-700' : 'bg-stone-300'} ${selected?.[0]===r&&selected?.[1]===c ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}>
                        {cell?.toLowerCase()==='r' ? <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${cell==='R' ? 'bg-red-400 ring-2 ring-amber-300' : 'bg-red-500'} shadow-lg`}/> :
                         cell?.toLowerCase()==='b' ? <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full ${cell==='B' ? 'bg-gray-800 ring-2 ring-amber-300' : 'bg-gray-900'} shadow-lg`}/> : ''}
                    </button>);
                })}
            </div>
        </GameHeader>
    );
}

// ═══ BATTLESHIP ═══
export function BattleshipGame({ goBack, saveScoreToDb }) {
    const SIZE = 8, SHIPS = [4, 3, 3, 2];
    const placeShips = () => {
        const b = Array(SIZE).fill(null).map(() => Array(SIZE).fill(null));
        for (const len of SHIPS) {
            let placed = false;
            while (!placed) {
                const h = Math.random() > 0.5; const r = Math.floor(Math.random() * (h ? SIZE : SIZE - len)); const c = Math.floor(Math.random() * (h ? SIZE - len : SIZE));
                let ok = true;
                for (let i = 0; i < len; i++) { if (b[h ? r : r+i][h ? c+i : c]) { ok = false; break; } }
                if (ok) { for (let i = 0; i < len; i++) b[h ? r : r+i][h ? c+i : c] = 'ship'; placed = true; }
            }
        }
        return b;
    };
    const [cpuBoard] = useState(placeShips);
    const [shots, setShots] = useState(Array(SIZE).fill(null).map(() => Array(SIZE).fill(null)));
    const [hits, setHits] = useState(0);
    const [moves, setMoves] = useState(0);
    const [won, setWon] = useState(false);
    const TOTAL = SHIPS.reduce((a,b)=>a+b,0);

    const shoot = (r, c) => {
        if (shots[r][c] || won) return;
        const ns = shots.map(row => [...row]);
        if (cpuBoard[r][c] === 'ship') { ns[r][c] = 'hit'; const nh = hits + 1; setHits(nh); if (nh >= TOTAL) { setWon(true); setHighScore('battleship', 1000 - moves * 10); saveScoreToDb?.('battleship', 1000 - moves * 10, true); } }
        else ns[r][c] = 'miss';
        setShots(ns); setMoves(m => m + 1);
    };
    const reset = () => { window.location.reload(); };

    return (
        <GameHeader title="Battleship" gradient="from-blue-400 to-indigo-400" goBack={goBack} onReset={reset}>
            <ScorePanel items={[{ label: 'Hits', value: `${hits}/${TOTAL}`, color: 'text-red-400' }, { label: 'Shots', value: moves, color: 'text-blue-400' }]} />
            {won && <div className="mb-3 p-3 rounded-xl font-bold text-sm bg-emerald-500/20 text-emerald-400">🏆 Fleet sunk in {moves} shots!</div>}
            <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
                {shots.flat().map((cell, i) => { const r = Math.floor(i/SIZE), c = i%SIZE;
                    return (<button key={i} onClick={() => shoot(r, c)}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded text-xs font-bold flex items-center justify-center transition-all border ${cell === 'hit' ? 'bg-red-500/30 border-red-500/50 text-red-400' : cell === 'miss' ? 'bg-white/5 border-white/10 text-white/20' : 'bg-blue-900/20 border-blue-500/10 hover:bg-blue-500/20 cursor-pointer'}`}>
                        {cell === 'hit' ? '💥' : cell === 'miss' ? '•' : ''}
                    </button>);
                })}
            </div>
        </GameHeader>
    );
}

// ═══ LUDO (Simplified) ═══
export function LudoGame({ goBack }) {
    const [dice, setDice] = useState(null);
    const [turn, setTurn] = useState(0);
    const [positions, setPositions] = useState([[0,0],[0,0],[0,0],[0,0]]);
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
    const names = ['🔴 Red', '🔵 Blue', '🟢 Green', '🟡 Yellow'];
    const [winner, setWinner] = useState(null);

    const roll = () => {
        if (winner) return;
        const d = Math.floor(Math.random()*6)+1; setDice(d);
        const np = [...positions]; const [p1, p2] = np[turn];
        const newP1 = p1 + d;
        if (newP1 >= 30) { setWinner(turn); return; }
        np[turn] = [newP1, p2]; setPositions(np);
        setTurn((turn + 1) % 4);
    };
    const reset = () => { setDice(null); setTurn(0); setPositions([[0,0],[0,0],[0,0],[0,0]]); setWinner(null); };

    return (
        <GameHeader title="Ludo" gradient="from-yellow-400 to-orange-400" goBack={goBack} onReset={reset}>
            {winner !== null && <div className="mb-3 p-3 rounded-xl font-bold text-sm bg-amber-500/20 text-amber-400">🏆 {names[winner]} wins!<button onClick={reset} className="block mx-auto mt-2 px-4 py-1 bg-white/10 rounded-lg text-xs text-white">New Game</button></div>}
            <p className="text-white/30 text-xs mb-3">{names[turn]}'s turn {dice && `· Rolled: ${dice}`}</p>
            <div className="space-y-2 mb-4">
                {positions.map((pos, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full ${colors[i]}`} />
                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[i]} rounded-full transition-all duration-500`} style={{ width: `${(pos[0]/30)*100}%` }} />
                        </div>
                        <span className="text-xs text-white/30 w-8 text-right">{pos[0]}/30</span>
                    </div>
                ))}
            </div>
            <button onClick={roll} disabled={!!winner} className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl font-bold text-white shadow-lg disabled:opacity-30">
                🎲 Roll Dice
            </button>
        </GameHeader>
    );
}
