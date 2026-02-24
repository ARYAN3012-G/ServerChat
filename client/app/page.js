'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiMessageSquare, FiVideo, FiMusic, FiPlay, FiShield, FiZap, FiUsers, FiGlobe } from 'react-icons/fi';

const features = [
    { icon: FiMessageSquare, title: 'Real-Time Chat', desc: 'Instant messaging with channels, threads, reactions, and rich media sharing' },
    { icon: FiVideo, title: 'Voice & Video', desc: 'Crystal-clear voice and HD video calls with screen sharing capabilities' },
    { icon: FiPlay, title: 'Built-in Games', desc: 'Play Tic-Tac-Toe, Quiz, Word Guess, and more with friends in chat' },
    { icon: FiMusic, title: 'Watch Parties', desc: 'Listen to music or watch videos together with synced playback' },
    { icon: FiShield, title: 'Secure', desc: 'End-to-end encrypted with 2FA, face recognition, and session management' },
    { icon: FiZap, title: 'Lightning Fast', desc: 'Powered by WebSocket technology for zero-lag communication' },
    { icon: FiUsers, title: 'Rich Social', desc: 'Friend system, profiles, online presence, and activity tracking' },
    { icon: FiGlobe, title: 'Cross Platform', desc: 'Works on desktop, tablet, and mobile with PWA support' },
];

export default function HomePage() {
    return (
        <div className="min-h-screen bg-dark-950 overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 bg-mesh opacity-50" />
            <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
            <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                        <FiMessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-2xl font-display font-bold text-white">ServerChat</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <Link href="/login" className="text-dark-300 hover:text-white transition-colors font-medium">
                        Log In
                    </Link>
                    <Link href="/register" className="btn-primary">
                        Get Started
                    </Link>
                </motion.div>
            </nav>

            {/* Hero */}
            <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-8">
                        <FiZap className="w-4 h-4" />
                        <span>Real-time • Secure • Feature-rich</span>
                    </div>

                    <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-extrabold text-white mb-6 leading-tight">
                        Where Teams
                        <br />
                        <span className="text-gradient">Come Together</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-dark-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                        The ultimate communication platform with real-time chat, voice & video calls,
                        built-in games, watch parties, and so much more.
                    </p>

                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <Link href="/register">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold py-4 px-10 rounded-2xl text-lg shadow-2xl shadow-primary-500/30 hover:shadow-primary-500/50 transition-shadow"
                            >
                                Start for Free
                            </motion.button>
                        </Link>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white/5 backdrop-blur-sm border border-white/10 text-white font-bold py-4 px-10 rounded-2xl text-lg hover:bg-white/10 transition-colors"
                        >
                            Learn More
                        </motion.button>
                    </div>
                </motion.div>

                {/* Mock UI Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="mt-20 max-w-5xl mx-auto"
                >
                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-discord-lighter">
                        <div className="flex h-[500px]">
                            {/* Sidebar */}
                            <div className="w-16 bg-discord-darkest flex flex-col items-center py-3 gap-2">
                                <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-bold hover:rounded-xl transition-all cursor-pointer">
                                    SC
                                </div>
                                <div className="w-8 h-0.5 bg-dark-600 rounded-full my-1" />
                                {['🎮', '🎵', '💻', '🎨'].map((emoji, i) => (
                                    <div key={i} className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-lg hover:rounded-xl hover:bg-primary-500 transition-all cursor-pointer">
                                        {emoji}
                                    </div>
                                ))}
                            </div>

                            {/* Channel list */}
                            <div className="w-56 bg-discord-sidebar p-3">
                                <div className="text-white font-bold text-lg mb-4 px-2">ServerChat</div>
                                <div className="text-xs text-dark-400 font-semibold uppercase mb-1 px-2">Text Channels</div>
                                {['# general', '# gaming', '# music', '# random'].map((ch, i) => (
                                    <div key={i} className={`channel-item ${i === 0 ? 'active' : ''}`}>
                                        {ch}
                                    </div>
                                ))}
                                <div className="text-xs text-dark-400 font-semibold uppercase mt-4 mb-1 px-2">Voice Channels</div>
                                {['🔊 Lounge', '🔊 Gaming'].map((ch, i) => (
                                    <div key={i} className="channel-item">{ch}</div>
                                ))}
                            </div>

                            {/* Chat area  */}
                            <div className="flex-1 bg-discord-chatbg flex flex-col">
                                <div className="h-12 border-b border-black/20 flex items-center px-4 text-white font-semibold">
                                    # general
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                    {[
                                        { user: 'Alex', msg: 'Hey everyone! 👋 Welcome to ServerChat!', color: 'text-blue-400' },
                                        { user: 'Sam', msg: 'This platform is amazing! Love the games feature 🎮', color: 'text-green-400' },
                                        { user: 'Maya', msg: 'Anyone up for a tic-tac-toe match?', color: 'text-pink-400' },
                                        { user: 'Alex', msg: "Let's go! Starting a game now...", color: 'text-blue-400' },
                                    ].map((m, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + i * 0.2 }}
                                            className="message-item"
                                        >
                                            <div className="avatar text-sm">{m.user[0]}</div>
                                            <div>
                                                <span className={`font-semibold ${m.color}`}>{m.user}</span>
                                                <span className="text-dark-500 text-xs ml-2">Today at {12 + i}:{30 + i * 5}</span>
                                                <p className="text-dark-200 mt-0.5">{m.msg}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="p-4">
                                    <div className="input-field flex items-center gap-2 cursor-text">
                                        <span className="text-dark-400">Message #general</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features */}
            <section className="relative z-10 max-w-7xl mx-auto px-8 py-24">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                        Everything You Need
                    </h2>
                    <p className="text-xl text-dark-400 max-w-2xl mx-auto">
                        Built for communities, teams, and friends who want the best communication experience
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="glass p-6 group cursor-pointer"
                        >
                            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500 transition-colors">
                                <feature.icon className="w-6 h-6 text-primary-400 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-dark-400 text-sm leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 max-w-4xl mx-auto px-8 py-24 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="glass p-12 md:p-16"
                >
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                        Ready to Get Started?
                    </h2>
                    <p className="text-xl text-dark-400 mb-8">
                        Join thousands of users already on ServerChat
                    </p>
                    <Link href="/register">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold py-4 px-12 rounded-2xl text-lg shadow-2xl shadow-primary-500/30"
                        >
                            Create Your Account
                        </motion.button>
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/5 py-8 text-center text-dark-500 text-sm">
                <p>© 2024 ServerChat. Built with ❤️ using Next.js, Express, and Socket.io</p>
            </footer>
        </div>
    );
}
