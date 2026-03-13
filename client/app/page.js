'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { FiMessageSquare, FiVideo, FiMusic, FiPlay, FiShield, FiZap, FiUsers, FiGlobe, FiArrowRight } from 'react-icons/fi';

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

// Floating particles component (reduced for performance)
function FloatingParticles() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-white/10"
                    style={{ willChange: 'transform, opacity' }}
                    initial={{
                        x: `${Math.random() * 100}vw`,
                        y: `${Math.random() * 100}vh`,
                        scale: Math.random() * 0.5 + 0.5,
                    }}
                    animate={{
                        y: [null, `${Math.random() * -60 - 20}vh`],
                        opacity: [0, 0.6, 0],
                    }}
                    transition={{
                        duration: Math.random() * 10 + 10,
                        repeat: Infinity,
                        delay: Math.random() * 5,
                        ease: 'linear',
                    }}
                />
            ))}
        </div>
    );
}

// Typewriter text
function TypewriterText({ words, className }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayed, setDisplayed] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const word = words[currentIndex];
        const timeout = setTimeout(() => {
            if (!isDeleting) {
                setDisplayed(word.substring(0, displayed.length + 1));
                if (displayed.length === word.length) {
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            } else {
                setDisplayed(word.substring(0, displayed.length - 1));
                if (displayed.length === 0) {
                    setIsDeleting(false);
                    setCurrentIndex((prev) => (prev + 1) % words.length);
                }
            }
        }, isDeleting ? 50 : 100);
        return () => clearTimeout(timeout);
    }, [displayed, isDeleting, currentIndex, words]);

    return (
        <span className={className}>
            {displayed}
            <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                className="inline-block w-[3px] h-[1em] bg-white/70 ml-1 align-middle"
            />
        </span>
    );
}

// Stats counter
function AnimatedCounter({ target, label, suffix = '' }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setInView(true); },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const end = target;
        const duration = 2000;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= end) { setCount(end); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [inView, target]);

    return (
        <div ref={ref} className="text-center">
            <div className="text-4xl md:text-5xl font-display font-bold text-white">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-silver-500 text-sm mt-1">{label}</div>
        </div>
    );
}

// Stagger animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.2 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
    visible: {
        opacity: 1, y: 0, filter: 'blur(0px)',
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
};

export default function HomePage() {
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <div className="min-h-screen bg-dark-950 overflow-hidden">
            {/* Animated Background */}
            <FloatingParticles />
            <div className="fixed inset-0 bg-mesh opacity-50" />

            {/* Subtle grid pattern */}
            <div className="fixed inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Glowing orbs */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px]"
            />
            <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.03, 0.08, 0.03] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-silver-400/5 rounded-full blur-[100px]"
            />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-3"
                >
                    <motion.div
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-silver-400 flex items-center justify-center shadow-lg shadow-white/10"
                    >
                        <FiMessageSquare className="w-5 h-5 text-dark-900" />
                    </motion.div>
                    <span className="text-2xl font-display font-bold text-white">ServerChat</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-4"
                >
                    <Link href="/login" className="text-silver-400 hover:text-white transition-colors font-medium">
                        Log In
                    </Link>
                    <Link href="/register">
                        <motion.button
                            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(255,255,255,0.15)' }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-white text-dark-900 font-semibold py-2.5 px-6 rounded-lg transition-all"
                        >
                            Get Started
                        </motion.button>
                    </Link>
                </motion.div>
            </nav>

            {/* Hero */}
            <section ref={heroRef} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-32 text-center">
                <motion.div style={{ y: heroY, opacity: heroOpacity }}>
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div variants={itemVariants}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-silver-300 text-sm font-medium mb-8 backdrop-blur-sm"
                        >
                            <motion.div
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 rounded-full bg-green-400"
                            />
                            <span>Real-time • Secure • Feature-rich</span>
                        </motion.div>

                        <motion.h1 variants={itemVariants}
                            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-extrabold text-white mb-6 leading-tight"
                        >
                            Where Teams
                            <br />
                            <TypewriterText
                                words={['Come Together', 'Build Ideas', 'Have Fun', 'Connect']}
                                className="text-gradient"
                            />
                        </motion.h1>

                        <motion.p variants={itemVariants}
                            className="text-base sm:text-xl md:text-2xl text-silver-500 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed"
                        >
                            The ultimate communication platform with real-time chat, voice & video calls,
                            built-in games, watch parties, and so much more.
                        </motion.p>

                        <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 flex-wrap">
                            <Link href="/register">
                                <motion.button
                                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,255,255,0.2)' }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-white text-dark-900 font-bold py-4 px-10 rounded-2xl text-lg shadow-2xl shadow-white/10 transition-shadow flex items-center gap-2 group"
                                >
                                    Start for Free
                                    <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </Link>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white/[0.04] backdrop-blur-sm border border-white/10 text-white font-bold py-4 px-10 rounded-2xl text-lg hover:bg-white/[0.08] transition-colors"
                            >
                                Learn More
                            </motion.button>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Mock UI Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 80, rotateX: 10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-20 max-w-5xl mx-auto perspective-1000"
                >
                    <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60 bg-dark-900 relative">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                        <div className="flex h-[300px] sm:h-[500px]">
                            {/* Sidebar - hidden on mobile */}
                            <div className="hidden sm:flex w-16 bg-dark-950 flex-col items-center py-3 gap-2 border-r border-white/[0.05]">
                                <motion.div
                                    whileHover={{ borderRadius: '12px' }}
                                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white to-silver-400 flex items-center justify-center text-dark-900 font-bold cursor-pointer transition-all"
                                >
                                    SC
                                </motion.div>
                                <div className="w-8 h-0.5 bg-white/10 rounded-full my-1" />
                                {['🎮', '🎵', '💻', '🎨'].map((emoji, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.2 + i * 0.1 }}
                                        whileHover={{ borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.1)' }}
                                        className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-lg cursor-pointer transition-all"
                                    >
                                        {emoji}
                                    </motion.div>
                                ))}
                            </div>

                            {/* Channel list - hidden on mobile */}
                            <div className="hidden md:block w-56 bg-dark-900/50 p-3 border-r border-white/[0.05]">
                                <div className="text-white font-bold text-lg mb-4 px-2">ServerChat</div>
                                <div className="text-xs text-silver-600 font-semibold uppercase mb-1 px-2">Text Channels</div>
                                {['# general', '# gaming', '# music', '# random'].map((ch, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.8 + i * 0.1 }}
                                        className={`px-2 py-1.5 rounded text-sm cursor-pointer transition-all ${i === 0 ? 'bg-white/[0.06] text-white' : 'text-silver-600 hover:text-silver-300 hover:bg-white/[0.03]'}`}
                                    >
                                        {ch}
                                    </motion.div>
                                ))}
                                <div className="text-xs text-silver-600 font-semibold uppercase mt-4 mb-1 px-2">Voice Channels</div>
                                {['🔊 Lounge', '🔊 Gaming'].map((ch, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1.2 + i * 0.1 }}
                                        className="px-2 py-1.5 rounded text-sm text-silver-600 hover:text-silver-300 hover:bg-white/[0.03] cursor-pointer transition-all"
                                    >
                                        {ch}
                                    </motion.div>
                                ))}
                            </div>

                            {/* Chat area */}
                            <div className="flex-1 bg-dark-800/30 flex flex-col">
                                <div className="h-12 border-b border-white/[0.05] flex items-center px-4 text-white font-semibold">
                                    # general
                                </div>
                                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                                    {[
                                        { user: 'Alex', msg: 'Hey everyone! 👋 Welcome to ServerChat!', color: 'text-blue-400' },
                                        { user: 'Sam', msg: 'This platform is amazing! Love the games feature 🎮', color: 'text-emerald-400' },
                                        { user: 'Maya', msg: 'Anyone up for a tic-tac-toe match?', color: 'text-pink-400' },
                                        { user: 'Alex', msg: "Let's go! Starting a game now...", color: 'text-blue-400' },
                                    ].map((m, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 1.4 + i * 0.3, duration: 0.5 }}
                                            className="flex gap-3 items-start group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs text-silver-300 font-semibold shrink-0">
                                                {m.user[0]}
                                            </div>
                                            <div>
                                                <span className={`font-semibold text-sm ${m.color}`}>{m.user}</span>
                                                <span className="text-silver-700 text-xs ml-2">Today at {12 + i}:{30 + i * 5}</span>
                                                <p className="text-silver-300 text-sm mt-0.5">{m.msg}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="p-4">
                                    <div className="px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-silver-600 text-sm">
                                        Message #general
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Stats Section */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
                <div className="grid grid-cols-3 gap-4 sm:gap-8">
                    <AnimatedCounter target={10000} suffix="+" label="Active Users" />
                    <AnimatedCounter target={5000} suffix="+" label="Servers Created" />
                    <AnimatedCounter target={99} suffix="%" label="Uptime" />
                </div>
            </section>

            {/* Features */}
            <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-12 sm:py-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
                        Everything You Need
                    </h2>
                    <p className="text-xl text-silver-500 max-w-2xl mx-auto">
                        Built for communities, teams, and friends who want the best communication experience
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                            whileHover={{ y: -8, transition: { duration: 0.3 } }}
                            className="relative group"
                        >
                            <div className="glass p-6 h-full relative overflow-hidden">
                                {/* Hover shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />

                                <div className="relative z-10">
                                    <motion.div
                                        whileHover={{ rotate: -10, scale: 1.1 }}
                                        className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors border border-white/[0.05]"
                                    >
                                        <feature.icon className="w-6 h-6 text-silver-300 group-hover:text-white transition-colors" />
                                    </motion.div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                    <p className="text-silver-600 text-sm leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-24 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative overflow-hidden rounded-2xl"
                >
                    {/* CTA card with premium border */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/10 via-transparent to-white/10 p-[1px]">
                        <div className="w-full h-full rounded-2xl bg-dark-900" />
                    </div>

                    <div className="relative glass p-12 md:p-16 border-0">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
                        >
                            Ready to Get Started?
                        </motion.h2>
                        <p className="text-xl text-silver-500 mb-8">
                            Join thousands of users already on ServerChat
                        </p>
                        <Link href="/register">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(255,255,255,0.15)' }}
                                whileTap={{ scale: 0.95 }}
                                className="bg-white text-dark-900 font-bold py-4 px-12 rounded-2xl text-lg shadow-2xl shadow-white/10 inline-flex items-center gap-2 group"
                            >
                                Create Your Account
                                <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/[0.05] py-8 text-center text-silver-700 text-sm">
                <p>© 2026 ServerChat. Built using Next.js, Express, and Socket.io</p>
            </footer>
        </div>
    );
}
