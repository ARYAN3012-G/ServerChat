'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiRotateCw } from 'react-icons/fi';

export default function GamesPage() {
    const router = useRouter();
    const [activeGame, setActiveGame] = useState(null);

    // Tic-Tac-Toe state
    const [tttBoard, setTttBoard] = useState(Array(9).fill(null));
    const [tttTurn, setTttTurn] = useState('X');
    const [tttWinner, setTttWinner] = useState(null);

    // RPS state
    const [rpsChoice, setRpsChoice] = useState(null);
    const [rpsOpponent, setRpsOpponent] = useState(null);
    const [rpsResult, setRpsResult] = useState(null);
    const [rpsScore, setRpsScore] = useState({ player: 0, cpu: 0 });

    const checkTTTWinner = (board) => {
        const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of lines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(Boolean) ? 'draw' : null;
    };

    const handleTTTClick = (i) => {
        if (tttBoard[i] || tttWinner) return;
        const newBoard = [...tttBoard];
        newBoard[i] = tttTurn;
        setTttBoard(newBoard);
        const winner = checkTTTWinner(newBoard);
        if (winner) { setTttWinner(winner); return; }
        // CPU move
        const empty = newBoard.map((v, idx) => v === null ? idx : null).filter(v => v !== null);
        if (empty.length > 0) {
            const cpuIdx = empty[Math.floor(Math.random() * empty.length)];
            newBoard[cpuIdx] = 'O';
            setTttBoard(newBoard);
            const w2 = checkTTTWinner(newBoard);
            if (w2) setTttWinner(w2);
        }
    };

    const resetTTT = () => { setTttBoard(Array(9).fill(null)); setTttTurn('X'); setTttWinner(null); };

    const handleRPS = (choice) => {
        const options = ['rock', 'paper', 'scissors'];
        const cpu = options[Math.floor(Math.random() * 3)];
        setRpsChoice(choice); setRpsOpponent(cpu);
        if (choice === cpu) { setRpsResult('draw'); }
        else if ((choice === 'rock' && cpu === 'scissors') || (choice === 'paper' && cpu === 'rock') || (choice === 'scissors' && cpu === 'paper')) {
            setRpsResult('win'); setRpsScore(s => ({ ...s, player: s.player + 1 }));
        } else {
            setRpsResult('lose'); setRpsScore(s => ({ ...s, cpu: s.cpu + 1 }));
        }
    };

    const resetRPS = () => { setRpsChoice(null); setRpsOpponent(null); setRpsResult(null); };

    const rpsEmoji = { rock: '🪨', paper: '📄', scissors: '✂️' };

    const games = [
        { id: 'ttt', name: 'Tic-Tac-Toe', emoji: '❌⭕', desc: 'Classic 3x3 grid game', color: 'from-blue-500 to-blue-700' },
        { id: 'rps', name: 'Rock Paper Scissors', emoji: '🪨📄✂️', desc: 'Best of pure luck!', color: 'from-purple-500 to-purple-700' },
    ];

    return (
        <div className="flex h-screen bg-dark-800 text-white">
            <div className="w-[72px] bg-dark-900 flex flex-col items-center py-3 gap-2">
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-primary-400 hover:text-white hover:bg-primary-500 cursor-pointer transition-all">
                    <FiArrowLeft className="w-6 h-6" />
                </motion.div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {!activeGame ? (
                    <div className="max-w-4xl mx-auto p-8">
                        <h1 className="text-3xl font-bold mb-2">🎮 Games Lobby</h1>
                        <p className="text-dark-400 mb-8">Pick a game and start playing!</p>
                        <div className="grid grid-cols-2 gap-6">
                            {games.map(g => (
                                <motion.div key={g.id} whileHover={{ scale: 1.03 }} onClick={() => setActiveGame(g.id)}
                                    className={`bg-gradient-to-br ${g.color} rounded-xl p-6 cursor-pointer shadow-xl`}>
                                    <div className="text-4xl mb-3">{g.emoji}</div>
                                    <h3 className="text-xl font-bold mb-1">{g.name}</h3>
                                    <p className="text-white/70 text-sm">{g.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ) : activeGame === 'ttt' ? (
                    <div className="max-w-md mx-auto p-8 text-center">
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={() => setActiveGame(null)} className="text-dark-300 hover:text-white transition-colors text-sm flex items-center gap-1"><FiArrowLeft /> Back</button>
                            <h2 className="text-2xl font-bold">Tic-Tac-Toe</h2>
                            <button onClick={resetTTT} className="text-dark-300 hover:text-white transition-colors"><FiRotateCw className="w-5 h-5" /></button>
                        </div>
                        {tttWinner && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className={`mb-4 p-3 rounded-lg text-lg font-bold ${tttWinner === 'draw' ? 'bg-dark-600 text-dark-300' : tttWinner === 'X' ? 'bg-discord-green/20 text-discord-green' : 'bg-red-500/20 text-red-400'}`}>
                                {tttWinner === 'draw' ? "It's a Draw!" : tttWinner === 'X' ? '🎉 You Win!' : '💻 CPU Wins!'}
                            </motion.div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {tttBoard.map((cell, i) => (
                                <motion.button key={i} whileHover={!cell && !tttWinner ? { scale: 1.05 } : {}} whileTap={!cell && !tttWinner ? { scale: 0.95 } : {}}
                                    onClick={() => handleTTTClick(i)}
                                    className={`aspect-square rounded-xl text-4xl font-bold flex items-center justify-center transition-colors ${cell ? 'bg-dark-600' : 'bg-dark-700 hover:bg-dark-600 cursor-pointer'} ${cell === 'X' ? 'text-primary-400' : 'text-red-400'}`}>
                                    {cell}
                                </motion.button>
                            ))}
                        </div>
                        <p className="text-dark-400 text-sm">You are <span className="text-primary-400 font-bold">X</span> • CPU is <span className="text-red-400 font-bold">O</span></p>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto p-8 text-center">
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={() => setActiveGame(null)} className="text-dark-300 hover:text-white transition-colors text-sm flex items-center gap-1"><FiArrowLeft /> Back</button>
                            <h2 className="text-2xl font-bold">Rock Paper Scissors</h2>
                            <div className="text-sm text-dark-400">You {rpsScore.player} - {rpsScore.cpu} CPU</div>
                        </div>
                        {rpsResult ? (
                            <div className="mb-6">
                                <div className="flex items-center justify-center gap-8 mb-4">
                                    <div className="text-center"><p className="text-6xl mb-2">{rpsEmoji[rpsChoice]}</p><p className="text-sm text-dark-400">You</p></div>
                                    <p className="text-2xl text-dark-500">vs</p>
                                    <div className="text-center"><p className="text-6xl mb-2">{rpsEmoji[rpsOpponent]}</p><p className="text-sm text-dark-400">CPU</p></div>
                                </div>
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className={`p-3 rounded-lg text-lg font-bold mb-4 ${rpsResult === 'win' ? 'bg-discord-green/20 text-discord-green' : rpsResult === 'lose' ? 'bg-red-500/20 text-red-400' : 'bg-dark-600 text-dark-300'}`}>
                                    {rpsResult === 'win' ? '🎉 You Win!' : rpsResult === 'lose' ? '💻 CPU Wins!' : "Draw!"}
                                </motion.div>
                                <button onClick={resetRPS} className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 transition-colors">Play Again</button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-dark-400 mb-6">Choose your weapon!</p>
                                <div className="flex justify-center gap-6">
                                    {['rock', 'paper', 'scissors'].map(c => (
                                        <motion.button key={c} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => handleRPS(c)}
                                            className="w-24 h-24 rounded-2xl bg-dark-700 hover:bg-dark-600 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer">
                                            <span className="text-4xl">{rpsEmoji[c]}</span>
                                            <span className="text-xs text-dark-400 capitalize">{c}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
