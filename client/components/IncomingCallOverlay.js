'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiPhoneOff, FiVideo, FiX } from 'react-icons/fi';

export default function IncomingCallOverlay({ callData, onAnswer, onDecline }) {
    const [timeLeft, setTimeLeft] = useState(30);
    const audioRef = useRef(null);

    const caller = callData?.from || {};
    const callType = callData?.session?.type || 'voice';

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onDecline?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onDecline]);

    // Ring sound (using Web Audio API for a simple ring tone)
    useEffect(() => {
        let audioCtx;
        let oscillator;
        let gainNode;
        let ringInterval;

        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.connect(audioCtx.destination);
            gainNode.gain.value = 0;

            const playRing = () => {
                oscillator = audioCtx.createOscillator();
                oscillator.connect(gainNode);
                oscillator.frequency.value = 440;
                oscillator.type = 'sine';
                oscillator.start();

                gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

                setTimeout(() => {
                    try { oscillator.stop(); } catch (e) { }
                }, 900);
            };

            playRing();
            ringInterval = setInterval(playRing, 2000);
        } catch (e) {
            // Audio not supported
        }

        return () => {
            clearInterval(ringInterval);
            try { oscillator?.stop(); } catch (e) { }
            try { audioCtx?.close(); } catch (e) { }
        };
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center"
                style={{ background: 'radial-gradient(ellipse at center, rgba(79,70,229,0.15) 0%, rgba(0,0,0,0.85) 100%)' }}
            >
                {/* Backdrop blur */}
                <div className="absolute inset-0 backdrop-blur-xl" />

                {/* Content */}
                <motion.div
                    initial={{ scale: 0.8, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 30 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="relative text-center z-10"
                >
                    {/* Pulse rings */}
                    <div className="relative inline-block mb-8">
                        <motion.div
                            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                            className="absolute inset-0 rounded-full bg-indigo-500/30"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                            className="absolute inset-0 rounded-full bg-indigo-500/20"
                        />

                        {/* Avatar */}
                        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-silver-400 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-indigo-500/30 border-4 border-white/10">
                            {(caller.username || 'U')[0].toUpperCase()}
                        </div>

                        {/* Call type badge */}
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg border-3 border-dark-900">
                            {callType === 'video' ? (
                                <FiVideo className="w-5 h-5 text-white" />
                            ) : (
                                <FiPhone className="w-5 h-5 text-white" />
                            )}
                        </div>
                    </div>

                    {/* Caller info */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-2xl font-bold text-white mb-1">{caller.username || 'Someone'}</h2>
                        <p className="text-white/50 text-sm mb-1">
                            Incoming {callType === 'video' ? 'Video' : 'Voice'} Call
                        </p>
                        <p className="text-white/30 text-xs font-mono">{timeLeft}s</p>
                    </motion.div>

                    {/* Action buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-8 mt-10"
                    >
                        {/* Decline */}
                        <div className="text-center">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onDecline}
                                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/30 hover:bg-red-600 transition-colors"
                            >
                                <FiPhoneOff className="w-7 h-7 text-white" />
                            </motion.button>
                            <p className="text-xs text-white/40 mt-2 font-medium">Decline</p>
                        </div>

                        {/* Answer */}
                        <div className="text-center">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                animate={{ boxShadow: ['0 0 0 0 rgba(52,211,153,0.4)', '0 0 0 20px rgba(52,211,153,0)', '0 0 0 0 rgba(52,211,153,0.4)'] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                onClick={onAnswer}
                                className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
                            >
                                <FiPhone className="w-7 h-7 text-white" />
                            </motion.button>
                            <p className="text-xs text-white/40 mt-2 font-medium">Answer</p>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
