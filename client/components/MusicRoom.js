'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiUsers, FiMusic, FiPlus, FiSearch, FiSend, FiMessageCircle } from 'react-icons/fi';
import { getSocket } from '../services/socket';

const SAMPLE_TRACKS = [
    { id: 1, title: 'Chill Vibes', artist: 'Lo-Fi Beats', duration: '6:12', color: '#6366f1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 2, title: 'Night Drive', artist: 'Synthwave Radio', duration: '7:05', color: '#ec4899', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 3, title: 'Coffee Shop', artist: 'Jazz Hop', duration: '5:44', color: '#10b981', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 4, title: 'Sunset Dreams', artist: 'Ambient World', duration: '5:02', color: '#f59e0b', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 5, title: 'Electric Storm', artist: 'EDM Mix', duration: '6:42', color: '#ef4444', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { id: 6, title: 'Ocean Waves', artist: 'Nature Sounds', duration: '4:35', color: '#06b6d4', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { id: 7, title: 'Midnight Jazz', artist: 'Smooth Radio', duration: '5:40', color: '#8b5cf6', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { id: 8, title: 'Summer Party', artist: 'Pop Hits', duration: '4:52', color: '#f97316', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
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
    const audioRef = useRef(null);
    const playPromiseRef = useRef(null);

    useEffect(() => {
        if (serverId) joinMusicRoom(serverId);
        // Listen for chat messages
        const socket = getSocket();
        const handleChat = (msg) => setChatMessages(prev => [...prev.slice(-50), msg]);
        if (socket) socket.on('stream:chat', handleChat);
        return () => {
            if (serverId) leaveMusicRoom(serverId);
            if (socket) socket.off('stream:chat', handleChat);
        };
    }, [serverId]);

    // Volume control
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        const socket = getSocket();
        if (socket) socket.emit('stream:chat', { roomId: serverId, message: chatInput });
        setChatInput('');
    };

    // Sync from other users
    useEffect(() => {
        if (musicRoom?.track) {
            setCurrentTrack(musicRoom.track);
            setIsPlaying(musicRoom.isPlaying);
            if (Math.abs(progress - (musicRoom.currentTime || 0)) > 2) {
                setProgress(musicRoom.currentTime || 0);
                if (audioRef.current) {
                    const duration = audioRef.current.duration || 100;
                    audioRef.current.currentTime = ((musicRoom.currentTime || 0) / 100) * duration;
                }
            }
        }
    }, [musicRoom?.track, musicRoom?.isPlaying, musicRoom?.currentTime]);

    // Audio Playback Control — handles play/pause with AbortError prevention
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const doPlayback = async () => {
            if (isPlaying && currentTrack) {
                // Set src if it changed
                if (!audio.src || !audio.src.includes(currentTrack.url.split('/').pop())) {
                    audio.src = currentTrack.url;
                    audio.load();
                }
                try {
                    // Cancel any pending play promise before starting a new one
                    if (playPromiseRef.current) {
                        try { await playPromiseRef.current; } catch (e) { /* ignore */ }
                    }
                    playPromiseRef.current = audio.play();
                    await playPromiseRef.current;
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error('Audio play failed:', e);
                    }
                } finally {
                    playPromiseRef.current = null;
                }
            } else {
                // Pause safely — wait for any pending play promise first
                if (playPromiseRef.current) {
                    try { await playPromiseRef.current; } catch (e) { /* ignore */ }
                    playPromiseRef.current = null;
                }
                audio.pause();
            }
        };

        doPlayback();
    }, [isPlaying, currentTrack?.id]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            if (duration > 0) {
                setProgress((current / duration) * 100);
            }
        }
    };

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
                    className="bg-[#0c0e1a] border border-white/10 rounded-2xl w-full max-w-[600px] mx-4 max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-silver-400/10">
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

                    {/* Audio element always rendered to avoid re-creation */}
                    <audio
                        ref={audioRef}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleNext}
                        preload="auto"
                    />

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
                                            if (audioRef.current && audioRef.current.duration) {
                                                audioRef.current.currentTime = (p / 100) * audioRef.current.duration;
                                            }
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
                                    <input type="range" min="0" max="100" value={volume} onChange={(e) => { setVolume(Number(e.target.value)); }}
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

                    {/* Live Chat */}
                    <div className="border-t border-white/5">
                        <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5">
                            <FiMessageCircle className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-xs font-semibold text-white/40">Live Chat</span>
                        </div>
                        <div className="h-28 overflow-y-auto px-4 py-2 space-y-1">
                            {chatMessages.length > 0 ? chatMessages.map((cm, i) => (
                                <div key={i} className="text-xs">
                                    <span className="font-medium text-indigo-400">{cm.username || 'User'}</span>
                                    <span className="text-white/50 ml-1.5">{cm.message}</span>
                                </div>
                            )) : <p className="text-xs text-white/15 text-center py-2">No messages yet</p>}
                        </div>
                        <div className="px-4 py-2 flex items-center gap-2">
                            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                                placeholder="Say something..." className="flex-1 bg-white/5 rounded-lg px-3 py-1.5 text-xs outline-none text-white placeholder-white/20" />
                            <button onClick={sendChatMessage} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-colors">
                                <FiSend className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
