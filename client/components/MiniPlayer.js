'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlay, FiPause, FiSkipForward, FiSkipBack, FiX, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useMusicPlayer } from './MusicPlayerProvider';

export default function MiniPlayer() {
    const pathname = usePathname();
    const router = useRouter();
    const { currentTrack, isPlaying, progress, duration, togglePlay, playNext, playPrev, seekTo, stopMusic, activeSessionId } = useMusicPlayer();
    const [expanded, setExpanded] = useState(false);

    // Only hide if currently looking at the fullscreen music room itself
    if (pathname.startsWith('/music/session')) return null;
    if (!currentTrack) return null;

    const pct = duration ? (progress / duration) * 100 : 0;
    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pctClick = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(pctClick);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                className="fixed bottom-4 right-4 z-[9999]"
                style={{ maxWidth: expanded ? '340px' : '300px', width: '90vw' }}
            >
                <div className="bg-[#12141f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                    {/* Progress bar */}
                    <div className="h-1 bg-white/5 cursor-pointer" onClick={handleSeek}>
                        <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                            style={{ width: `${pct}%` }} />
                    </div>

                    {/* Main row */}
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                        {/* Thumbnail + Track info — click to return safely to active room if exists */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onClick={() => router.push(activeSessionId ? `/music/session/${activeSessionId}` : '/music')}>
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                                {(currentTrack.thumbnail || currentTrack.image) ?
                                    <img src={currentTrack.thumbnail || currentTrack.image} alt="" className="w-full h-full object-cover" /> :
                                    <div className="w-full h-full flex items-center justify-center text-sm">🎵</div>}
                                {isPlaying && (
                                    <div className="absolute bottom-0.5 right-0.5 flex gap-[1px]">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-[2px] bg-pink-400 rounded-full animate-pulse"
                                                style={{ height: `${6 + Math.random() * 6}px`, animationDelay: `${i * 150}ms` }} />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-white truncate">{currentTrack.title}</p>
                                <p className="text-[9px] text-white/30 truncate">{currentTrack.artist}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button onClick={playPrev} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                <FiSkipBack className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={togglePlay} className="p-2 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-colors">
                                {isPlaying ? <FiPause className="w-3.5 h-3.5" /> : <FiPlay className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={playNext} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                <FiSkipForward className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Close */}
                        <button onClick={stopMusic} className="p-1 rounded-lg hover:bg-white/10 text-white/15 hover:text-white transition-colors flex-shrink-0">
                            <FiX className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Time display */}
                    <div className="flex items-center justify-between px-3 pb-2 text-[8px] text-white/20">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
