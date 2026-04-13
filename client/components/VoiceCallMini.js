'use client';

import { useVoice } from './VoiceProvider';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiMaximize2, FiVolume2, FiUsers } from 'react-icons/fi';
import { useState, useEffect } from 'react';

export default function VoiceCallMini() {
    const router = useRouter();
    const pathname = usePathname();
    const voice = useVoice() || {};
    const {
        connectedChannel, voiceUsers, leaveVoice,
        isMuted, toggleMute,
        isVideoOn, startVideo, stopVideo,
    } = voice;

    const [callDuration, setCallDuration] = useState(0);

    // Timer
    useEffect(() => {
        if (!connectedChannel) { setCallDuration(0); return; }
        const t = setInterval(() => setCallDuration(d => d + 1), 1000);
        return () => clearInterval(t);
    }, [connectedChannel]);

    // Don't show if not connected or if on the call page
    const isOnCallPage = pathname?.startsWith('/call/');
    const show = connectedChannel && !isOnCallPage;

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 100, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="fixed bottom-4 right-4 z-[90] w-72 bg-dark-800/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <FiVolume2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400 flex-1">Voice Connected</span>
                        <span className="text-[10px] font-mono text-white/30 tabular-nums">{formatTime(callDuration)}</span>
                    </div>

                    {/* Participants preview */}
                    <div className="px-3 py-2">
                        <div className="flex items-center gap-1 mb-2">
                            <FiUsers className="w-3 h-3 text-white/30" />
                            <span className="text-[10px] text-white/40">{(voiceUsers || []).length + 1} participants</span>
                        </div>
                        <div className="flex -space-x-2 mb-2">
                            {/* Self avatar */}
                            <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-dark-800 flex items-center justify-center text-[9px] font-bold text-white z-10">
                                You
                            </div>
                            {/* Peer avatars */}
                            {(voiceUsers || []).slice(0, 4).map(u => (
                                <div key={u.userId} className="w-7 h-7 rounded-full bg-purple-500/70 border-2 border-dark-800 flex items-center justify-center text-[9px] font-bold text-white">
                                    {(u.username || 'U')[0].toUpperCase()}
                                </div>
                            ))}
                            {(voiceUsers || []).length > 4 && (
                                <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-dark-800 flex items-center justify-center text-[8px] font-bold text-white/50">
                                    +{(voiceUsers || []).length - 4}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/5">
                        {/* Mute */}
                        <button onClick={() => toggleMute?.()}
                            className={`p-2 rounded-xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/60 hover:text-white'}`}>
                            {isMuted ? <FiMicOff className="w-3.5 h-3.5" /> : <FiMic className="w-3.5 h-3.5" />}
                        </button>

                        {/* Video */}
                        <button onClick={() => isVideoOn ? stopVideo?.() : startVideo?.('user')}
                            className={`p-2 rounded-xl transition-all ${isVideoOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/60 hover:text-white'}`}>
                            {isVideoOn ? <FiVideo className="w-3.5 h-3.5" /> : <FiVideoOff className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex-1" />

                        {/* Open full call */}
                        <button onClick={() => router.push(`/call/${connectedChannel}`)}
                            className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all" title="Open call">
                            <FiMaximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Leave */}
                        <button onClick={() => leaveVoice?.(connectedChannel)}
                            className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all" title="Disconnect">
                            <FiPhoneOff className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
