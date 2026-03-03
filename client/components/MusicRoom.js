'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiUsers, FiMusic, FiPlus, FiSearch } from 'react-icons/fi';

const SAMPLE_TRACKS = [
    { id: 1, title: 'Chill Vibes', artist: 'Lo-Fi Beats', duration: '3:24', color: '#6366f1' },
    { id: 2, title: 'Night Drive', artist: 'Synthwave Radio', duration: '4:12', color: '#ec4899' },
    { id: 3, title: 'Coffee Shop', artist: 'Jazz Hop', duration: '2:58', color: '#10b981' },
    { id: 4, title: 'Sunset Dreams', artist: 'Ambient World', duration: '5:01', color: '#f59e0b' },
    { id: 5, title: 'Electric Storm', artist: 'EDM Mix', duration: '3:45', color: '#ef4444' },
    { id: 6, title: 'Ocean Waves', artist: 'Nature Sounds', duration: '6:30', color: '#06b6d4' },
    { id: 7, title: 'Midnight Jazz', artist: 'Smooth Radio', duration: '4:18', color: '#8b5cf6' },
    { id: 8, title: 'Summer Party', artist: 'Pop Hits', duration: '3:32', color: '#f97316' },
];

export default function MusicRoom({ serverId, serverName, onClose, joinMusicRoom, syncMusic, leaveMusicRoom, musicRoom }) {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(80);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const progressRef = useRef(null);

    useEffect(() => {
        if (serverId) joinMusicRoom(serverId);
        return () => { if (serverId) leaveMusicRoom(serverId); };
    }, [serverId]);

    // Sync from other users
    useEffect(() => {
        if (musicRoom?.track) {
            setCurrentTrack(musicRoom.track);
            setIsPlaying(musicRoom.isPlaying);
            setProgress(musicRoom.currentTime || 0);
        }
    }, [musicRoom?.track, musicRoom?.isPlaying, musicRoom?.currentTime]);

    // Progress simulation
    useEffect(() => {
        if (!isPlaying || !currentTrack) return;
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    handleNext();
                    return 0;
                }
                return prev + 0.5;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlaying, currentTrack]);

    const handlePlay = (track) => {
        setCurrentTrack(track);
        setIsPlaying(true);
        setProgress(0);
        syncMusic(serverId, track, 0, true);
    };

    const handleTogglePlay = () => {
        const newState = !isPlaying;
        setIsPlaying(newState);
        syncMusic(serverId, currentTrack, progress, newState);
    };

    const handleNext = () => {
        const idx = SAMPLE_TRACKS.findIndex(t => t.id === currentTrack?.id);
        const next = SAMPLE_TRACKS[(idx + 1) % SAMPLE_TRACKS.length];
        handlePlay(next);
    };

    const handlePrev = () => {
        const idx = SAMPLE_TRACKS.findIndex(t => t.id === currentTrack?.id);
        const prev = SAMPLE_TRACKS[(idx - 1 + SAMPLE_TRACKS.length) % SAMPLE_TRACKS.length];
        handlePlay(prev);
    };

    const filteredTracks = SAMPLE_TRACKS.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#0c0e1a] border border-white/10 rounded-2xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                <FiMusic className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Music Room</h2>
                                <p className="text-xs text-white/30">{serverName} • {musicRoom?.users?.length || 1} listening</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                                {(musicRoom?.users || []).slice(0, 4).map((u, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-indigo-500/60 border-2 border-[#0c0e1a] flex items-center justify-center text-[8px] font-bold">
                                        {(u.username || 'U')[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Now Playing */}
                    {currentTrack && (
                        <div className="px-6 py-4 border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                                    style={{ background: `linear-gradient(135deg, ${currentTrack.color}40, ${currentTrack.color}10)`, border: `1px solid ${currentTrack.color}30` }}>
                                    🎵
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white truncate">{currentTrack.title}</h3>
                                    <p className="text-sm text-white/40">{currentTrack.artist}</p>
                                    {/* Progress Bar */}
                                    <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const p = ((e.clientX - rect.left) / rect.width) * 100;
                                            setProgress(p);
                                            syncMusic(serverId, currentTrack, p, isPlaying);
                                        }}>
                                        <div className="h-full rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%`, background: currentTrack.color }} />
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4 mt-3">
                                <button onClick={handlePrev} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                                    <FiSkipBack className="w-4 h-4" />
                                </button>
                                <button onClick={handleTogglePlay}
                                    className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                    {isPlaying ? <FiPause className="w-5 h-5" /> : <FiPlay className="w-5 h-5 ml-0.5" />}
                                </button>
                                <button onClick={handleNext} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                                    <FiSkipForward className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2 ml-4">
                                    <FiVolume2 className="w-4 h-4 text-white/30" />
                                    <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(e.target.value)}
                                        className="w-20 h-1 accent-indigo-500 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Track List */}
                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: currentTrack ? '280px' : '400px' }}>
                        {/* Search */}
                        <div className="px-6 py-3 sticky top-0 bg-[#0c0e1a] border-b border-white/5">
                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                <FiSearch className="w-4 h-4 text-white/20" />
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search tracks..." className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20" />
                            </div>
                        </div>

                        <div className="px-3 py-2 space-y-1">
                            {filteredTracks.map((track) => (
                                <motion.div key={track.id} whileHover={{ x: 4 }}
                                    onClick={() => handlePlay(track)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group
                                        ${currentTrack?.id === track.id ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5'}`}>
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg relative"
                                        style={{ background: `${track.color}15`, border: `1px solid ${track.color}20` }}>
                                        {currentTrack?.id === track.id && isPlaying ? (
                                            <div className="flex gap-0.5 items-end h-4">
                                                <div className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                                                <div className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '200ms' }} />
                                                <div className="w-1 bg-indigo-400 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '400ms' }} />
                                            </div>
                                        ) : '🎵'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${currentTrack?.id === track.id ? 'text-indigo-400' : 'text-white/80'}`}>{track.title}</p>
                                        <p className="text-xs text-white/30">{track.artist}</p>
                                    </div>
                                    <span className="text-xs text-white/20">{track.duration}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
