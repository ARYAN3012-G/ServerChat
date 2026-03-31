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
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) { if (board[r].every(c => c)) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); cleared++; r++; } }
        s.lines += cleared; s.score += cleared * cleared * 100;
        setScore(s.score); setLines(s.lines);
        const np = newPiece(); const npos = { x: Math.floor((COLS - np.shape[0].length) / 2), y: 0 };
        if (!valid(board, np, npos)) { s.running = false; s.gameOver = true; setGameOver(true); setHighScore('tetris', s.score); saveScoreToDb?.('tetris', s.score, false); return; }
        s.piece = np; s.pos = npos;
    };

    const tick = () => { const s = stateRef.current; if (!s.running) return; const npos = { ...s.pos, y: s.pos.y + 1 }; if (valid(s.board, s.piece, npos)) { s.pos = npos; } else { place(s); } draw(); };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
        const s = stateRef.current; const CW = 24;
        const bg = ctx.createLinearGradient(0, 0, 0, ROWS * CW);
        bg.addColorStop(0, '#0c0e1a'); bg.addColorStop(1, '#111827');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, COLS * CW, ROWS * CW);
        ctx.strokeStyle = '#ffffff06';
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            ctx.strokeRect(c * CW, r * CW, CW, CW);
            if (s.board[r][c]) { ctx.fillStyle = s.board[r][c]; ctx.beginPath(); ctx.roundRect(c * CW + 1, r * CW + 1, CW - 2, CW - 2, 3); ctx.fill(); }
        }
        if (s.piece) { ctx.fillStyle = s.piece.color; for (let r = 0; r < s.piece.shape.length; r++) for (let c = 0; c < s.piece.shape[r].length; c++) { if (s.piece.shape[r][c]) { ctx.beginPath(); ctx.roundRect((s.pos.x + c) * CW + 1, (s.pos.y + r) * CW + 1, CW - 2, CW - 2, 3); ctx.fill(); } } }
    };

    const start = useCallback(() => {
        const np = newPiece();
        stateRef.current = { board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)), piece: np, pos: { x: Math.floor((COLS - np.shape[0].length) / 2), y: 0 }, score: 0, lines: 0, running: true, gameOver: false };
        setScore(0); setLines(0); setGameOver(false); setStarted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(tick, SPEED); draw();
    }, []);

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
            <div className="relative inline-block rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10">
                <canvas ref={canvasRef} width={240} height={480} className="block" style={{ maxWidth: '100%', height: 'auto' }} />
                {!started && <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"><button onClick={start} className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl font-bold text-white shadow-xl text-lg">▶ Start</button></div>}
                {gameOver && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="text-center bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10"><p className="text-xl font-bold text-rose-400 mb-1">Game Over!</p><p className="text-3xl font-black text-white mb-4">{score} pts</p><button onClick={start} className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl font-bold text-white">Retry</button></div></div>}
            </div>
            <div className="flex justify-center gap-2 mt-4">
                {[['←', () => { const s = stateRef.current; if (!s.running) return; const np = {...s.pos, x:s.pos.x-1}; if (valid(s.board,s.piece,np)) s.pos=np; draw(); }],
                  ['↻', () => { const s = stateRef.current; if (!s.running) return; const rot = {...s.piece, shape:rotate(s.piece.shape)}; if (valid(s.board,rot,s.pos)) s.piece=rot; draw(); }],
                  ['↓', () => { const s = stateRef.current; if (!s.running) return; const np = {...s.pos, y:s.pos.y+1}; if (valid(s.board,s.piece,np)) s.pos=np; draw(); }],
                  ['→', () => { const s = stateRef.current; if (!s.running) return; const np = {...s.pos, x:s.pos.x+1}; if (valid(s.board,s.piece,np)) s.pos=np; draw(); }]
                ].map(([l, fn]) => <button key={l} onClick={fn} className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-white/50 text-lg transition-colors">{l}</button>)}
            </div>
        </GameHeader>
    );
}

// ═══ CHESS — Full featured with settings, timers, move history ═══
export function ChessGame({ goBack, saveScoreToDb }) {
    const INIT = [
        ['br','bn','bb','bq','bk','bb','bn','br'],
        ['bp','bp','bp','bp','bp','bp','bp','bp'],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        ['wp','wp','wp','wp','wp','wp','wp','wp'],
        ['wr','wn','wb','wq','wk','wb','wn','wr'],
    ];
    const pieceSymbols = { wk:'♔', wq:'♕', wr:'♖', wb:'♗', wn:'♘', wp:'♙', bk:'♚', bq:'♛', br:'♜', bb:'♝', bn:'♞', bp:'♟' };
    const pieceNames = { k:'King', q:'Queen', r:'Rook', b:'Bishop', n:'Knight', p:'Pawn' };
    const pieceValues = { p:1, n:3, b:3, r:5, q:9, k:0 };
    const colNames = 'abcdefgh';

    // Settings state
    const [settings, setSettings] = useState(null); // null = show settings screen
    const TIME_OPTS = [
        { label: '⚡ Bullet', desc: '1 min', seconds: 60 },
        { label: '🔥 Blitz', desc: '3 min', seconds: 180 },
        { label: '⏱️ Rapid', desc: '10 min', seconds: 600 },
        { label: '🏛️ Classical', desc: '30 min', seconds: 1800 },
        { label: '♾️ Unlimited', desc: 'No limit', seconds: 0 },
    ];
    const DIFF_OPTS = [
        { label: 'Easy', desc: 'Random moves', depth: 0, color: 'text-emerald-400' },
        { label: 'Medium', desc: 'Smart captures', depth: 1, color: 'text-amber-400' },
        { label: 'Hard', desc: 'Strategic play', depth: 2, color: 'text-rose-400' },
    ];

    // Game state
    const [board, setBoard] = useState(INIT.map(r => [...r]));
    const [selected, setSelected] = useState(null);
    const [turn, setTurn] = useState('w');
    const [captured, setCaptured] = useState({ w: [], b: [] });
    const [status, setStatus] = useState('');
    const [validMoves, setValidMoves] = useState([]);
    const [moveHistory, setMoveHistory] = useState([]);
    const [selTime, setSelTime] = useState(2);
    const [selDiff, setSelDiff] = useState(1);
    const [boardHistory, setBoardHistory] = useState([]);
    const [whiteTime, setWhiteTime] = useState(0);
    const [blackTime, setBlackTime] = useState(0);
    const timerRef = useRef(null);

    const side = (p) => p?.[0];
    const isOwn = (p, t) => side(p) === t;
    const isEnemy = (p, t) => p && side(p) !== t;

    // Timer
    useEffect(() => {
        if (!settings || settings.time === 0 || status) return;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            if (turn === 'w') {
                setWhiteTime(t => { if (t <= 1) { setStatus('⏰ White ran out of time!'); return 0; } return t - 1; });
            } else {
                setBlackTime(t => { if (t <= 1) { setStatus('⏰ Black ran out of time!'); return 0; } return t - 1; });
            }
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [turn, settings, status]);

    const formatTime = (s) => { const m = Math.floor(s/60); const sec = s%60; return `${m}:${sec.toString().padStart(2,'0')}`; };

    const getValidMoves = (b, r, c) => {
        const p = b[r][c]; if (!p) return [];
        const t = side(p); const type = p[1]; const moves = [];
        const addIf = (tr, tc) => { if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return false; if (isOwn(b[tr][tc], t)) return false; moves.push([tr, tc]); return !b[tr][tc]; };
        if (type === 'p') {
            const d = t === 'w' ? -1 : 1; const startRow = t === 'w' ? 6 : 1;
            if (r+d>=0 && r+d<=7 && !b[r+d][c]) { moves.push([r+d,c]); if (r===startRow && !b[r+d*2]?.[c] === undefined ? false : !b[r+d*2][c]) moves.push([r+d*2,c]); }
            if (c>0 && isEnemy(b[r+d]?.[c-1], t)) moves.push([r+d,c-1]);
            if (c<7 && isEnemy(b[r+d]?.[c+1], t)) moves.push([r+d,c+1]);
        }
        if (type === 'n') { for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) addIf(r+dr,c+dc); }
        if (type === 'b' || type === 'q') { for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) { for (let i=1;i<8;i++) { if (!addIf(r+dr*i,c+dc*i)) break; } } }
        if (type === 'r' || type === 'q') { for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) { for (let i=1;i<8;i++) { if (!addIf(r+dr*i,c+dc*i)) break; } } }
        if (type === 'k') { for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) { if (dr||dc) addIf(r+dr,c+dc); } }
        return moves;
    };

    const addMoveNotation = (piece, fr, fc, tr, tc, capture) => {
        const name = piece[1] === 'p' ? '' : pieceNames[piece[1]]?.[0] || '';
        const from = colNames[fc] + (8 - fr);
        const to = colNames[tc] + (8 - tr);
        const cap = capture ? 'x' : '';
        const prefix = side(piece) === 'w' ? '' : '';
        return `${name}${from}${cap}${to}`;
    };

    const handleClick = (r, c) => {
        if (turn !== 'w' || status) return;
        const piece = board[r][c];
        if (selected) {
            const [sr, sc] = selected;
            const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c);
            if (isValid) {
                setBoardHistory(h => [...h, { board: board.map(row => [...row]), captured: { w: [...captured.w], b: [...captured.b] }, turn }]);
                const nb = board.map(row => [...row]);
                const target = nb[r][c];
                const movingPiece = nb[sr][sc];
                if (target && side(target) === 'b') setCaptured(p => ({...p, w: [...p.w, target]}));
                if (target?.[1] === 'k') { setStatus('🏆 White wins!'); saveScoreToDb?.('chess', 1, true); }
                nb[r][c] = nb[sr][sc]; nb[sr][sc] = null;
                if (nb[r][c] === 'wp' && r === 0) nb[r][c] = 'wq';
                const notation = addMoveNotation(movingPiece, sr, sc, r, c, target);
                setMoveHistory(h => [...h, notation]);
                setBoard(nb); setSelected(null); setValidMoves([]); setTurn('b');
                setTimeout(() => cpuMove(nb), settings?.difficulty === 2 ? 600 : 300);
            } else if (isOwn(piece, 'w')) { setSelected([r, c]); setValidMoves(getValidMoves(board, r, c)); }
            else { setSelected(null); setValidMoves([]); }
        } else if (piece && isOwn(piece, 'w')) { setSelected([r, c]); setValidMoves(getValidMoves(board, r, c)); }
    };

    const cpuMove = (b) => {
        const diff = settings?.difficulty || 0;
        const allMoves = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (isOwn(b[r][c], 'b')) {
                getValidMoves(b, r, c).forEach(([tr, tc]) => {
                    let val = 0;
                    if (b[tr][tc]) { val = (pieceValues[b[tr][tc][1]] || 0) * 10; }
                    // Center control bonus (medium+)
                    if (diff >= 1) { if (tr >= 3 && tr <= 4 && tc >= 3 && tc <= 4) val += 2; if (tr >= 2 && tr <= 5 && tc >= 2 && tc <= 5) val += 1; }
                    // Attack near king (hard)
                    if (diff >= 2) {
                        for (let kr = 0; kr < 8; kr++) for (let kc = 0; kc < 8; kc++) {
                            if (b[kr][kc] === 'wk') { const dist = Math.abs(tr-kr) + Math.abs(tc-kc); if (dist <= 2) val += 5; if (dist <= 3) val += 2; }
                        }
                    }
                    allMoves.push({ fr: r, fc: c, tr, tc, capture: b[tr][tc], val });
                });
            }
        }
        if (!allMoves.length) { setStatus('♟ Stalemate!'); return; }
        allMoves.sort((a,b) => b.val - a.val);
        let m;
        if (diff === 0) { m = allMoves[Math.floor(Math.random() * allMoves.length)]; }
        else if (diff === 1) { m = allMoves[0].val > 0 ? allMoves[0] : allMoves[Math.floor(Math.random() * allMoves.length)]; }
        else { const top = allMoves.slice(0, Math.min(3, allMoves.length)); m = top[Math.floor(Math.random() * top.length)]; }
        setBoardHistory(h => [...h, { board: b.map(row => [...row]), captured: { w: [...captured.w], b: [...captured.b] }, turn: 'b' }]);
        const nb = b.map(row => [...row]);
        const movingPiece = nb[m.fr][m.fc];
        if (m.capture) setCaptured(p => ({...p, b: [...p.b, m.capture]}));
        if (m.capture?.[1] === 'k') setStatus('💀 Black wins!');
        nb[m.tr][m.tc] = nb[m.fr][m.fc]; nb[m.fr][m.fc] = null;
        if (nb[m.tr][m.tc] === 'bp' && m.tr === 7) nb[m.tr][m.tc] = 'bq';
        const notation = addMoveNotation(movingPiece, m.fr, m.fc, m.tr, m.tc, m.capture);
        setMoveHistory(h => [...h, notation]);
        setBoard(nb); setTurn('w');
    };

    const undoMove = () => {
        if (boardHistory.length < 2 || status) return;
        const prev = boardHistory[boardHistory.length - 2];
        setBoard(prev.board.map(r => [...r]));
        setCaptured({ w: [...prev.captured.w], b: [...prev.captured.b] });
        setTurn('w');
        setBoardHistory(h => h.slice(0, -2));
        setMoveHistory(h => h.slice(0, -2));
        setSelected(null); setValidMoves([]);
    };

    const startGame = (timeOpt, diffOpt) => {
        setSettings({ time: timeOpt.seconds, difficulty: diffOpt.depth, timeName: timeOpt.label, diffName: diffOpt.label });
        setBoard(INIT.map(r => [...r])); setSelected(null); setTurn('w');
        setCaptured({ w: [], b: [] }); setStatus(''); setValidMoves([]);
        setMoveHistory([]); setBoardHistory([]);
        setWhiteTime(timeOpt.seconds); setBlackTime(timeOpt.seconds);
    };

    const reset = () => { setSettings(null); if (timerRef.current) clearInterval(timerRef.current); };
    const isValidTarget = (r, c) => validMoves.some(([vr, vc]) => vr === r && vc === c);
    const getAdvantage = () => {
        const wVal = captured.w.reduce((s, p) => s + (pieceValues[p[1]] || 0), 0);
        const bVal = captured.b.reduce((s, p) => s + (pieceValues[p[1]] || 0), 0);
        return wVal - bVal;
    };

    // Settings Screen
    if (!settings) {
        return (
            <GameHeader title="Chess" gradient="from-violet-400 to-indigo-500" goBack={goBack} onReset={() => {}}>
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center mb-2">
                        <span className="text-5xl">♔</span>
                        <p className="text-white/40 text-sm mt-2">Configure your match</p>
                    </div>
                    {/* Time control */}
                    <div>
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">⏱ Time Control</p>
                        <div className="grid grid-cols-5 gap-2">
                            {TIME_OPTS.map((t, i) => (
                                <button key={i} onClick={() => setSelTime(i)}
                                    className={`rounded-xl py-3 px-2 text-center transition-all border ${i === selTime ? 'bg-violet-500/20 border-violet-500/40 text-violet-300 scale-105' : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:bg-white/[0.06]'}`}>
                                    <p className="text-xs font-bold">{t.label.split(' ')[0]}</p>
                                    <p className="text-[10px] opacity-60 mt-0.5">{t.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Difficulty */}
                    <div>
                        <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">🎯 CPU Difficulty</p>
                        <div className="grid grid-cols-3 gap-3">
                            {DIFF_OPTS.map((d, i) => (
                                <button key={i} onClick={() => setSelDiff(i)}
                                    className={`rounded-xl py-4 px-3 text-center transition-all border ${i === selDiff ? 'bg-violet-500/20 border-violet-500/40 scale-105' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'}`}>
                                    <p className={`text-sm font-bold ${d.color}`}>{d.label}</p>
                                    <p className="text-[10px] text-white/30 mt-1">{d.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Start */}
                    <button onClick={() => startGame(TIME_OPTS[selTime], DIFF_OPTS[selDiff])}
                        className="w-full py-4 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-400 hover:to-indigo-400 rounded-2xl font-bold text-white text-lg shadow-xl shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        ♟ Start Game
                    </button>
                </div>
            </GameHeader>
        );
    }

    return (
        <GameHeader title="Chess" gradient="from-violet-400 to-indigo-500" goBack={goBack} onReset={reset}>
            {status && <div className={`mb-5 py-4 px-8 rounded-2xl font-bold text-center text-lg backdrop-blur-sm border ${status.includes('White') || status.includes('Black ran') ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : status.includes('Black') || status.includes('White ran') ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' : 'bg-white/10 text-white/60 border-white/10'}`}>{status}<button onClick={reset} className="block mx-auto mt-3 px-6 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white transition-colors">New Game</button></div>}

            <div className="flex flex-col lg:flex-row items-start justify-center gap-4 w-full max-w-5xl">
                {/* Left panel — captured pieces + info */}
                <div className="hidden lg:flex flex-col gap-3 w-48 shrink-0">
                    {/* Settings info */}
                    <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl p-3 border border-white/[0.06]">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1">Settings</p>
                        <p className="text-xs text-violet-300">{settings.timeName} · {settings.diffName}</p>
                    </div>
                    {/* Your captured */}
                    <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl p-3 border border-white/[0.06]">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5">♔ You captured</p>
                        <div className="flex flex-wrap gap-1">{captured.w.length ? captured.w.map((p,i) => <span key={i} className="text-xl" style={{ color: '#f5c542' }}>{pieceSymbols[p]}</span>) : <span className="text-white/10 text-xs">None yet</span>}</div>
                        {getAdvantage() > 0 && <p className="text-emerald-400 text-xs mt-1.5 font-bold">+{getAdvantage()} material</p>}
                    </div>
                    {/* CPU captured */}
                    <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl p-3 border border-white/[0.06]">
                        <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5">♚ CPU captured</p>
                        <div className="flex flex-wrap gap-1">{captured.b.length ? captured.b.map((p,i) => <span key={i} className="text-xl" style={{ color: '#e8e8f0' }}>{pieceSymbols[p]}</span>) : <span className="text-white/10 text-xs">None yet</span>}</div>
                        {getAdvantage() < 0 && <p className="text-rose-400 text-xs mt-1.5 font-bold">+{Math.abs(getAdvantage())} material</p>}
                    </div>
                    {/* Undo */}
                    <button onClick={undoMove} disabled={boardHistory.length < 2 || !!status} className="w-full py-2 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-white/40 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed">↩ Undo Move</button>
                </div>

                {/* Center — board */}
                <div className="flex flex-col items-center">
                    {/* Timers */}
                    <div className="flex justify-between w-full max-w-[420px] sm:max-w-[500px] mb-3 gap-4">
                        <div className={`flex-1 flex items-center gap-2 rounded-xl px-4 py-2 border ${turn === 'b' && settings.time > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                            <span className="text-amber-400 text-lg">♚</span>
                            <span className="text-xs text-white/40">CPU</span>
                            {settings.time > 0 && <span className={`ml-auto font-mono font-bold text-sm ${turn === 'b' ? 'text-amber-400' : 'text-white/30'}`}>{formatTime(blackTime)}</span>}
                        </div>
                        <div className={`flex-1 flex items-center gap-2 rounded-xl px-4 py-2 border ${turn === 'w' && settings.time > 0 ? 'bg-violet-500/10 border-violet-500/20' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                            <span className="text-violet-300 text-lg">♔</span>
                            <span className="text-xs text-white/40">You</span>
                            {settings.time > 0 && <span className={`ml-auto font-mono font-bold text-sm ${turn === 'w' ? 'text-violet-300' : 'text-white/30'}`}>{formatTime(whiteTime)}</span>}
                        </div>
                    </div>
                    {/* Mobile captured bar */}
                    <div className="lg:hidden flex justify-center gap-3 mb-3 w-full">
                        <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg px-3 py-1.5 border border-white/[0.06]">
                            <span className="text-[10px] text-white/30">YOU</span>
                            <div className="flex gap-0.5">{captured.w.map((p,i) => <span key={i} className="text-base" style={{ color: '#f5c542' }}>{pieceSymbols[p]}</span>)}</div>
                            {getAdvantage() > 0 && <span className="text-emerald-400 text-[10px] font-bold">+{getAdvantage()}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/[0.03] rounded-lg px-3 py-1.5 border border-white/[0.06]">
                            <span className="text-[10px] text-white/30">CPU</span>
                            <div className="flex gap-0.5">{captured.b.map((p,i) => <span key={i} className="text-base" style={{ color: '#e8e8f0' }}>{pieceSymbols[p]}</span>)}</div>
                            {getAdvantage() < 0 && <span className="text-rose-400 text-[10px] font-bold">+{Math.abs(getAdvantage())}</span>}
                        </div>
                    </div>
                    {/* Turn indicator */}
                    <div className={`mb-3 text-sm font-semibold px-5 py-2 rounded-full ${turn === 'w' ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'}`}>{turn === 'w' ? '♔ Your turn' : '♚ CPU thinking...'}</div>
                    {/* Board */}
                    <div className="relative">
                        <div className="inline-grid grid-cols-8 gap-0 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-violet-500/10" style={{ boxShadow: '0 0 60px rgba(124,58,237,0.08), 0 25px 50px rgba(0,0,0,0.4)' }}>
                            {board.flat().map((cell, i) => { const r = Math.floor(i / 8), c = i % 8; const isDark = (r + c) % 2 === 1;
                                const isValid = isValidTarget(r, c); const isSel = selected?.[0]===r&&selected?.[1]===c;
                                const lastMove = moveHistory.length > 0;
                                return (<button key={i} onClick={() => handleClick(r, c)}
                                    className={`w-[44px] h-[44px] sm:w-[56px] sm:h-[56px] md:w-[60px] md:h-[60px] flex items-center justify-center text-2xl sm:text-3xl md:text-[2.1rem] transition-all duration-150 relative ${isDark ? 'bg-[#2d3250]' : 'bg-[#424769]'} ${isSel ? 'brightness-150 ring-1 ring-inset ring-violet-400/60' : ''} hover:brightness-125`}
                                    style={isSel ? { boxShadow: 'inset 0 0 20px rgba(139,92,246,0.3)' } : {}}>
                                    {isValid && <div className="absolute inset-0 flex items-center justify-center z-10"><div className={`rounded-full transition-all ${cell ? 'w-[90%] h-[90%] ring-[3px] ring-inset ring-cyan-400/50' : 'w-4 h-4 bg-cyan-400/30 shadow-[0_0_8px_rgba(34,211,238,0.3)]'}`}/></div>}
                                    {cell && <span className="relative z-0 select-none" style={{
                                        color: side(cell) === 'w' ? '#e8e8f0' : '#f5c542',
                                        textShadow: side(cell) === 'w' ? '0 0 12px rgba(200,200,255,0.4), 0 2px 4px rgba(0,0,0,0.5)' : '0 0 10px rgba(245,197,66,0.3), 0 2px 4px rgba(0,0,0,0.5)',
                                        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))',
                                    }}>{pieceSymbols[cell]}</span>}
                                </button>);
                            })}
                        </div>
                    </div>
                    {/* Mobile undo */}
                    <button onClick={undoMove} disabled={boardHistory.length < 2 || !!status} className="lg:hidden mt-3 px-5 py-2 text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-white/40 hover:text-white transition-all disabled:opacity-30">↩ Undo Move</button>
                </div>

                {/* Right panel — move history */}
                <div className="hidden lg:block w-52 shrink-0">
                    <div className="bg-white/[0.03] backdrop-blur-sm rounded-xl border border-white/[0.06] overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/[0.06]">
                            <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">📜 Move History</p>
                        </div>
                        <div className="max-h-[360px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10">
                            {moveHistory.length === 0 && <p className="text-white/10 text-xs text-center py-4">No moves yet</p>}
                            {moveHistory.map((m, i) => (
                                <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs ${i === moveHistory.length - 1 ? 'bg-violet-500/10' : ''} ${i % 2 === 0 ? 'text-violet-300' : 'text-amber-300/70'}`}>
                                    <span className="text-white/20 w-5 text-right font-mono">{Math.floor(i/2)+1}{i%2===0 ? '.' : '…'}</span>
                                    <span className="font-medium">{m}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
    const [validMoves, setValidMoves] = useState([]);

    const getMoves = (b, r, c) => {
        const p = b[r][c]; if (!p) return [];
        const moves = []; const isKing = p === p.toUpperCase();
        const dirs = p.toLowerCase() === 'r' ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]];
        const allDirs = isKing ? [[-1,-1],[-1,1],[1,-1],[1,1]] : dirs;
        for (const [dr, dc] of allDirs) {
            const nr = r+dr, nc = c+dc;
            if (nr>=0&&nr<8&&nc>=0&&nc<8&&!b[nr][nc]) moves.push({ tr: nr, tc: nc, jump: false });
            const jr = r+dr*2, jc = c+dc*2;
            if (jr>=0&&jr<8&&jc>=0&&jc<8&&!b[jr][jc]&&nr>=0&&nr<8&&nc>=0&&nc<8&&b[nr][nc]&&b[nr][nc].toLowerCase()!==p.toLowerCase())
                moves.push({ tr: jr, tc: jc, mr: nr, mc: nc, jump: true });
        }
        return moves;
    };

    const handleClick = (r, c) => {
        if (turn !== 'r' || status) return;
        if (selected) {
            const move = validMoves.find(m => m.tr === r && m.tc === c);
            if (move) {
                const nb = board.map(row => [...row]);
                nb[r][c] = nb[selected[0]][selected[1]]; nb[selected[0]][selected[1]] = null;
                if (move.jump) nb[move.mr][move.mc] = null;
                if (r === 0 && nb[r][c] === 'r') nb[r][c] = 'R';
                setBoard(nb); setSelected(null); setValidMoves([]);
                if (!nb.flat().some(p => p && p.toLowerCase() === 'b')) { setStatus('🏆 You win!'); saveScoreToDb?.('checkers', 1, true); return; }
                setTurn('b'); setTimeout(() => cpuMove(nb), 400);
            } else if (board[r][c]?.toLowerCase() === 'r') {
                setSelected([r, c]); setValidMoves(getMoves(board, r, c));
            } else { setSelected(null); setValidMoves([]); }
        } else if (board[r][c]?.toLowerCase() === 'r') { setSelected([r, c]); setValidMoves(getMoves(board, r, c)); }
    };

    const cpuMove = (b) => {
        const allMoves = [];
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
            if (b[r][c]?.toLowerCase() === 'b') {
                getMoves(b, r, c).forEach(m => allMoves.push({ ...m, fr: r, fc: c }));
            }
        }
        if (!allMoves.length) { setStatus('🏆 You win!'); saveScoreToDb?.('checkers', 1, true); return; }
        const jumps = allMoves.filter(m => m.jump);
        const m = jumps.length ? jumps[Math.floor(Math.random()*jumps.length)] : allMoves[Math.floor(Math.random()*allMoves.length)];
        const nb = b.map(row => [...row]);
        nb[m.tr][m.tc] = nb[m.fr][m.fc]; nb[m.fr][m.fc] = null;
        if (m.jump) nb[m.mr][m.mc] = null;
        if (m.tr === 7 && nb[m.tr][m.tc] === 'b') nb[m.tr][m.tc] = 'B';
        if (!nb.flat().some(p => p?.toLowerCase() === 'r')) setStatus('💀 CPU wins!');
        setBoard(nb); setTurn('r');
    };

    const reset = () => { setBoard(initBoard()); setSelected(null); setTurn('r'); setStatus(''); setValidMoves([]); };
    const isValidTarget = (r, c) => validMoves.some(m => m.tr === r && m.tc === c);

    return (
        <GameHeader title="Checkers" gradient="from-rose-400 to-orange-400" goBack={goBack} onReset={reset}>
            {status && <div className={`mb-5 py-4 px-8 rounded-2xl font-bold text-center text-lg backdrop-blur-sm border ${status.includes('You') ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border-rose-500/20'}`}>{status}<button onClick={reset} className="block mx-auto mt-3 px-6 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm text-white transition-colors">New Game</button></div>}
            <div className={`mb-4 text-sm font-semibold px-5 py-2 rounded-full ${turn === 'r' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' : 'bg-slate-500/15 text-slate-300 border border-slate-500/20'}`}>{turn === 'r' ? '🔴 Your turn' : '⚫ CPU thinking...'}</div>
            <div className="inline-grid grid-cols-8 gap-0 rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl" style={{ boxShadow: '0 0 60px rgba(244,63,94,0.06), 0 25px 50px rgba(0,0,0,0.4)' }}>
                {board.flat().map((cell, i) => { const r = Math.floor(i/8), c = i%8; const isDark = (r+c)%2===1;
                    const isValid = isValidTarget(r, c); const isSel = selected?.[0]===r&&selected?.[1]===c;
                    return (<button key={i} onClick={() => handleClick(r, c)}
                        className={`w-[52px] h-[52px] sm:w-[62px] sm:h-[62px] flex items-center justify-center transition-all duration-150 relative ${isDark ? 'bg-[#2d3250]' : 'bg-[#424769]'} ${isSel ? 'brightness-150' : ''} hover:brightness-125`}>
                        {isValid && <div className="absolute inset-0 flex items-center justify-center z-10"><div className="w-4 h-4 rounded-full bg-cyan-400/30 shadow-[0_0_8px_rgba(34,211,238,0.3)]"/></div>}
                        {cell?.toLowerCase()==='r' ? <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${cell==='R' ? 'bg-gradient-to-br from-rose-400 to-red-600 ring-2 ring-amber-300/60' : 'bg-gradient-to-br from-rose-500 to-red-700'} shadow-[0_0_15px_rgba(244,63,94,0.3)]`} style={{ boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.3), 0 0 12px rgba(244,63,94,0.2)' }}/> :
                         cell?.toLowerCase()==='b' ? <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${cell==='B' ? 'bg-gradient-to-br from-slate-500 to-slate-800 ring-2 ring-amber-300/60' : 'bg-gradient-to-br from-slate-600 to-slate-900'}`} style={{ boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(100,116,139,0.15)' }}/> : ''}
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
            {won && <div className="mb-4 p-4 rounded-xl font-bold text-center bg-emerald-500/20 text-emerald-400 text-lg">🏆 Fleet sunk in {moves} shots!</div>}
            <div className="inline-grid gap-1 bg-blue-900/20 backdrop-blur-sm rounded-xl p-2 border border-blue-500/10" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
                {shots.flat().map((cell, i) => { const r = Math.floor(i/SIZE), c = i%SIZE;
                    return (<button key={i} onClick={() => shoot(r, c)}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-sm font-bold flex items-center justify-center transition-all border ${cell === 'hit' ? 'bg-red-500/30 border-red-500/40 text-red-400' : cell === 'miss' ? 'bg-white/5 border-white/5 text-white/15' : 'bg-blue-900/30 border-blue-500/10 hover:bg-blue-500/20 cursor-pointer'}`}>
                        {cell === 'hit' ? '💥' : cell === 'miss' ? '·' : '~'}
                    </button>);
                })}
            </div>
        </GameHeader>
    );
}

// ═══ LUDO ═══
export function LudoGame({ goBack }) {
    const [dice, setDice] = useState(null);
    const [turn, setTurn] = useState(0);
    const [positions, setPositions] = useState([[0,0],[0,0],[0,0],[0,0]]);
    const [rolling, setRolling] = useState(false);
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
    const gradients = ['from-red-500 to-rose-600', 'from-blue-500 to-indigo-600', 'from-green-500 to-emerald-600', 'from-yellow-500 to-amber-600'];
    const names = ['🔴 Red', '🔵 Blue', '🟢 Green', '🟡 Yellow'];
    const [winner, setWinner] = useState(null);

    const roll = () => {
        if (winner || rolling) return;
        setRolling(true);
        let count = 0;
        const anim = setInterval(() => {
            setDice(Math.floor(Math.random()*6)+1);
            count++;
            if (count >= 8) {
                clearInterval(anim);
                const d = Math.floor(Math.random()*6)+1;
                setDice(d); setRolling(false);
                const np = [...positions]; const newP = np[turn][0] + d;
                if (newP >= 30) { setWinner(turn); return; }
                np[turn] = [newP, np[turn][1]]; setPositions(np);
                setTurn((turn + 1) % 4);
            }
        }, 80);
    };
    const reset = () => { setDice(null); setTurn(0); setPositions([[0,0],[0,0],[0,0],[0,0]]); setWinner(null); };

    return (
        <GameHeader title="Ludo" gradient="from-yellow-400 to-orange-400" goBack={goBack} onReset={reset}>
            {winner !== null && <div className="mb-4 p-4 rounded-xl font-bold text-center bg-amber-500/20 text-amber-400 text-lg">🏆 {names[winner]} wins!<button onClick={reset} className="block mx-auto mt-2 px-6 py-2 bg-white/10 rounded-lg text-sm text-white">New Game</button></div>}
            {/* Dice */}
            <div className={`w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center text-5xl font-black mb-6 transition-transform ${rolling ? 'animate-bounce' : ''}`}>
                {dice || '🎲'}
            </div>
            <p className="text-white/30 text-sm mb-6 font-medium">{names[turn]}'s turn</p>
            {/* Progress bars */}
            <div className="w-full max-w-md space-y-3 mb-8">
                {positions.map((pos, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${turn === i ? 'bg-white/5 border border-white/10' : ''}`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradients[i]} shadow-lg flex-shrink-0`} />
                        <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${(pos[0]/30)*100}%` }} className={`h-full bg-gradient-to-r ${gradients[i]} rounded-full`} transition={{ type: 'spring', stiffness: 100 }} />
                        </div>
                        <span className="text-sm text-white/30 w-12 text-right font-mono">{pos[0]}/30</span>
                    </div>
                ))}
            </div>
            <button onClick={roll} disabled={!!winner || rolling}
                className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl font-bold text-white shadow-xl text-lg disabled:opacity-30 hover:shadow-2xl hover:shadow-amber-500/30 transition-all">
                🎲 Roll Dice
            </button>
        </GameHeader>
    );
}
