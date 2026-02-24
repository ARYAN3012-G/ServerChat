'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiGrid, FiAward } from 'react-icons/fi';
import Link from 'next/link';

const games = [
    { id: 'tic-tac-toe', name: 'Tic Tac Toe', emoji: '❌⭕', desc: 'Classic 3x3 grid battle', players: '2 Players', color: 'from-blue-500 to-cyan-500' },
    { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', emoji: '✊✋✌️', desc: 'The ultimate showdown', players: '2 Players', color: 'from-purple-500 to-pink-500' },
    { id: 'quiz', name: 'Quiz Game', emoji: '🧠', desc: 'Test your knowledge', players: '2-10 Players', color: 'from-green-500 to-emerald-500' },
    { id: 'word-guess', name: 'Word Guess', emoji: '📝', desc: 'Guess the hidden word', players: '2-8 Players', color: 'from-amber-500 to-orange-500' },
];

export default function GamesPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-dark-950">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/channels')} className="text-dark-400 hover:text-white transition-colors">
                            <FiArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
                                <FiGrid className="w-8 h-8 text-primary-400" /> Game Center
                            </h1>
                            <p className="text-dark-400 mt-1">Play games with friends in real-time</p>
                        </div>
                    </div>
                    <Link href="/games/leaderboard">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors">
                            <FiAward className="w-4 h-4" /> Leaderboard
                        </motion.button>
                    </Link>
                </div>

                {/* Games grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {games.map((game, i) => (
                        <motion.div
                            key={game.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="glass p-6 cursor-pointer group"
                            onClick={() => router.push(`/games/${game.id}`)}
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                                {game.emoji.slice(0, 2)}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-1">{game.name}</h3>
                            <p className="text-dark-400 mb-3">{game.desc}</p>
                            <span className="text-xs px-2 py-1 rounded-full bg-dark-700 text-dark-300">{game.players}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
