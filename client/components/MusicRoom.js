'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiUsers, FiMusic, FiSearch, FiSend, FiMessageCircle, FiLock, FiStar, FiSmile, FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import { getSocket } from '../services/socket';
import api from '../services/api';
import toast from 'react-hot-toast';

const FALLBACK_TRACKS = [
    { id: 'fb1', title: 'Chill Vibes', artist: 'Lo-Fi Beats', duration: '6:12', color: '#6366f1', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', image: '' },
    { id: 'fb2', title: 'Night Drive', artist: 'Synthwave Radio', duration: '7:05', color: '#ec4899', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', image: '' },
    { id: 'fb3', title: 'Coffee Shop', artist: 'Jazz Hop', duration: '5:44', color: '#10b981', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', image: '' },
    { id: 'fb4', title: 'Sunset Dreams', artist: 'Ambient World', duration: '5:02', color: '#f59e0b', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', image: '' },
    { id: 'fb5', title: 'Electric Storm', artist: 'EDM Mix', duration: '6:42', color: '#ef4444', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', image: '' },
    { id: 'fb6', title: 'Ocean Waves', artist: 'Nature Sounds', duration: '4:35', color: '#06b6d4', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', image: '' },
    { id: 'fb7', title: 'Midnight Jazz', artist: 'Smooth Radio', duration: '5:40', color: '#8b5cf6', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', image: '' },
    { id: 'fb8', title: 'Summer Party', artist: 'Pop Hits', duration: '4:52', color: '#f97316', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', image: '' },
];

const LANGUAGE_TABS = [
    { id: 'all', label: '🔥 All' },
    { id: 'telugu', label: '🇮🇳 Telugu' },
    { id: 'tamil', label: '🇮🇳 Tamil' },
    { id: 'hindi', label: '🇮🇳 Hindi' },
    { id: 'english', label: '🇬🇧 English' },
    { id: 'kannada', label: '🇮🇳 Kannada' },
    { id: 'malayalam', label: '🇮🇳 Malayalam' },
];

const EMOJI_LIST = ['😀','😂','❤️','🔥','🎵','🎶','👏','🙌','💃','🕺','✨','🎧','🎤','🎸','🥁','🎹','💯','👑','⭐','🌟','😍','🤩','😎','🥰','💜','💙','💚','🧡','🎉','🎊'];

export default function MusicRoom({ serverId, serverName, onClose, joinMusicRoom, syncMusic, leaveMusicRoom, musicRoom, userId, isServerOwner }) {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(80);
    const [searchQuery, setSearchQuery] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [activeLanguage, setActiveLanguage] = useState('all');
    const [showFallback, setShowFallback] = useState(false);
    const [activeView, setActiveView] = useState('tracks'); // 'tracks' | 'chat' | 'users'
    const [showEmojis, setShowEmojis] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const progressRef = useRef(null);
    const audioRef = useRef(null);
    const playPromiseRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const chatEndRef = useRef(null);

    // Host state
    const hostUserId = musicRoom?.hostUserId;
    const ownerUserId = musicRoom?.ownerUserId;
    const amHost = userId === hostUserId || userId === ownerUserId;
    const roomUsers = musicRoom?.users || [];

    useEffect(() => {
        if (serverId) joinMusicRoom(serverId, isServerOwner);
        const socket = getSocket();
        const handleChat = (msg) => setChatMessages(prev => [...prev.slice(-100), msg]);
        const handleError = (err) => toast.error(err.message);
        if (socket) {
            socket.on('stream:chat', handleChat);
            socket.on('music:error', handleError);
        }
        loadTrending('all');
        return () => {
            if (serverId) leaveMusicRoom(serverId);
            if (socket) {
                socket.off('stream:chat', handleChat);
                socket.off('music:error', handleError);
            }
        };
    }, [serverId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
    }, [volume]);

    const loadTrending = async (lang) => {
        setSearching(true);
        try {
            const res = await api.get(`/music/trending?language=${lang === 'all' ? 'hindi,english,telugu' : lang}`);
            if (res.data.songs?.length > 0) {
                setSearchResults(res.data.songs);
                setShowFallback(false);
            } else {
                setSearchResults([]);
                setShowFallback(true);
            }
        } catch {
            setSearchResults([]);
            setShowFallback(true);
        }
        setSearching(false);
    };

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        clearTimeout(searchTimeoutRef.current);
        if (!query.trim()) {
            loadTrending(activeLanguage);
            return;
        }
        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const langSuffix = activeLanguage !== 'all' ? ` ${activeLanguage}` : '';
                const res = await api.get(`/music/search?query=${encodeURIComponent(query + langSuffix)}&limit=20`);
                if (res.data.songs?.length > 0) {
                    setSearchResults(res.data.songs);
                    setShowFallback(false);
                } else {
                    setSearchResults([]);
                    setShowFallback(true);
                }
            } catch {
                setSearchResults([]);
                setShowFallback(true);
            }
            setSearching(false);
        }, 400);
    }, [activeLanguage]);

    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        const socket = getSocket();
        if (socket) socket.emit('stream:chat', { roomId: serverId, message: chatInput });
        setChatInput('');
        setShowEmojis(false);
    };

    const addEmoji = (emoji) => {
        setChatInput(prev => prev + emoji);
    };

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

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const doPlayback = async () => {
            if (isPlaying && currentTrack) {
                if (!audio.src || !audio.src.includes(currentTrack.url?.split('/').pop())) {
                    audio.src = currentTrack.url;
                    audio.load();
                }
                try {
                    if (playPromiseRef.current) { try { await playPromiseRef.current; } catch (e) { } }
                    playPromiseRef.current = audio.play();
                    await playPromiseRef.current;
                } catch (e) {
                    if (e.name !== 'AbortError') console.error('Audio play failed:', e);
                } finally { playPromiseRef.current = null; }
            } else {
                if (playPromiseRef.current) { try { await playPromiseRef.current; } catch (e) { } playPromiseRef.current = null; }
                audio.pause();
            }
        };
        doPlayback();
    }, [isPlaying, currentTrack?.id]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration;
            if (duration > 0) setProgress((current / duration) * 100);
        }
    };

    const handlePlay = (track) => {
        if (!amHost) {
            toast.error('Only the host can change tracks. Request in chat!');
            return;
        }
        setCurrentTrack(track);
        setIsPlaying(true);
        setProgress(0);
        syncMusic(serverId, track, 0, true);
    };

    const handleTogglePlay = () => {
        if (!amHost) return;
        const newState = !isPlaying;
        setIsPlaying(newState);
        syncMusic(serverId, currentTrack, progress, newState);
    };

    const handleNext = () => {
        if (!amHost) return;
        const allTracks = searchResults.length > 0 ? searchResults : FALLBACK_TRACKS;
        const idx = allTracks.findIndex(t => t.id === currentTrack?.id);
        const next = allTracks[(idx + 1) % allTracks.length];
        handlePlay(next);
    };

    const handlePrev = () => {
        if (!amHost) return;
        const allTracks = searchResults.length > 0 ? searchResults : FALLBACK_TRACKS;
        const idx = allTracks.findIndex(t => t.id === currentTrack?.id);
        const prev = allTracks[(idx - 1 + allTracks.length) % allTracks.length];
        handlePlay(prev);
    };

    const displayTracks = showFallback ? FALLBACK_TRACKS : searchResults;

    // ─── MINIMIZED MINI PLAYER ───
    if (minimized) {
        return (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 right-4 z-50 bg-[#0c0e1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 w-[340px] sm:w-[380px] overflow-hidden"
            >
                <div className="p-3 flex items-center gap-3">
                    {/* Album Art */}
                    {currentTrack?.image ? (
                        <img src={currentTrack.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg flex-shrink-0">🎵</div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{currentTrack?.title || 'No track'}</p>
                        <p className="text-[10px] text-white/30 truncate">{currentTrack?.artist || '—'}</p>
                        {/* Mini progress bar */}
                        <div className="mt-1 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                    {/* Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={handleTogglePlay} disabled={!amHost}
                            className={`w-9 h-9 rounded-full flex items-center justify-center ${amHost ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-white/10 text-white/20'} transition-colors`}>
                            {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4 ml-0.5" />}
                        </button>
                        <button onClick={handleNext} disabled={!amHost} className={`p-1.5 ${amHost ? 'text-white/40 hover:text-white' : 'text-white/10'}`}>
                            <FiSkipForward className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setMinimized(false)} className="p-1.5 text-white/40 hover:text-white transition-colors" title="Expand">
                            <FiMaximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onClose} className="p-1.5 text-white/40 hover:text-red-400 transition-colors" title="Close">
                            <FiX className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
                {/* Users count */}
                <div className="px-3 pb-2 flex items-center gap-1.5 text-[10px] text-white/20">
                    <FiUsers className="w-3 h-3" />
                    <span>{roomUsers.length || 1} listening</span>
                    <span className="text-white/10">•</span>
                    <span className="text-indigo-400">{serverName}</span>
                </div>
            </motion.div>
        );
    }

    // ─── FULL MUSIC ROOM ───
    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#0c0e1a] border border-white/10 rounded-2xl w-full max-w-[760px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-purple-400/10 flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <FiMusic className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-bold text-white truncate">Music Room</h2>
                                <p className="text-[10px] text-white/30 truncate">{serverName} • {roomUsers.length || 1} listening</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {amHost && (
                                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[9px] font-bold flex items-center gap-1">
                                    <FiStar className="w-2.5 h-2.5" /> HOST
                                </span>
                            )}
                            {/* User avatars */}
                            <div className="flex -space-x-1.5">
                                {roomUsers.slice(0, 4).map((u, i) => (
                                    <div key={i} className={`w-7 h-7 rounded-full border-2 border-[#0c0e1a] flex items-center justify-center text-[9px] font-bold ${u.isHost ? 'bg-amber-500/60 text-amber-100' : 'bg-indigo-500/50 text-indigo-100'}`}
                                        title={`${u.username}${u.isHost ? ' (Host)' : ''}`}>
                                        {(u.username || 'U')[0].toUpperCase()}
                                    </div>
                                ))}
                                {roomUsers.length > 4 && (
                                    <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#0c0e1a] flex items-center justify-center text-[9px] text-white/50">
                                        +{roomUsers.length - 4}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setMinimized(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Minimize">
                                <FiMinimize2 className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Audio element */}
                    <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleNext} preload="auto" />

                    {/* Now Playing */}
                    {currentTrack && (
                        <div className="px-4 sm:px-5 py-3 border-b border-white/5 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                {currentTrack.image ? (
                                    <img src={currentTrack.image} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 shadow-lg" />
                                ) : (
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                        style={{ background: `linear-gradient(135deg, ${currentTrack.color}40, ${currentTrack.color}10)`, border: `1px solid ${currentTrack.color}30` }}>
                                        🎵
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-white text-sm truncate">{currentTrack.title}</h3>
                                    <p className="text-xs text-white/40 truncate">{currentTrack.artist}</p>
                                    {currentTrack.language && <p className="text-[10px] text-indigo-400/60 mt-0.5 capitalize">{currentTrack.language}</p>}
                                    {/* Progress Bar */}
                                    <div className="mt-1.5 w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                                        onClick={(e) => {
                                            if (!amHost) return;
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const p = ((e.clientX - rect.left) / rect.width) * 100;
                                            setProgress(p);
                                            if (audioRef.current?.duration) audioRef.current.currentTime = (p / 100) * audioRef.current.duration;
                                            syncMusic(serverId, currentTrack, p, isPlaying);
                                        }}>
                                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: currentTrack.color || '#6366f1' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-3 mt-2">
                                <button onClick={handlePrev} disabled={!amHost} className={`p-2 rounded-full transition-colors ${amHost ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'text-white/10 cursor-not-allowed'}`}>
                                    <FiSkipBack className="w-4 h-4" />
                                </button>
                                <button onClick={handleTogglePlay} disabled={!amHost}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-lg ${amHost ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}>
                                    {isPlaying ? <FiPause className="w-5 h-5" /> : <FiPlay className="w-5 h-5 ml-0.5" />}
                                </button>
                                <button onClick={handleNext} disabled={!amHost} className={`p-2 rounded-full transition-colors ${amHost ? 'hover:bg-white/10 text-white/40 hover:text-white' : 'text-white/10 cursor-not-allowed'}`}>
                                    <FiSkipForward className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1.5 ml-3">
                                    <FiVolume2 className="w-3.5 h-3.5 text-white/30" />
                                    <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                                        className="w-16 sm:w-20 h-1 accent-indigo-500 cursor-pointer" />
                                </div>
                            </div>
                            {!amHost && (
                                <p className="text-center text-[10px] text-amber-400/60 mt-1.5 flex items-center justify-center gap-1">
                                    <FiLock className="w-2.5 h-2.5" /> Only the host can control playback
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tab Toggle (Mobile: 3 tabs, Desktop: tracks visible + side panels) */}
                    <div className="flex border-b border-white/5 sm:hidden flex-shrink-0">
                        <button onClick={() => setActiveView('tracks')} className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeView === 'tracks' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/30'}`}>
                            <FiMusic className="w-3 h-3 inline mr-1" />Tracks
                        </button>
                        <button onClick={() => setActiveView('chat')} className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeView === 'chat' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/30'}`}>
                            <FiMessageCircle className="w-3 h-3 inline mr-1" />Chat
                        </button>
                        <button onClick={() => setActiveView('users')} className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${activeView === 'users' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/30'}`}>
                            <FiUsers className="w-3 h-3 inline mr-1" />{roomUsers.length || 1}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex min-h-0 overflow-hidden">
                        {/* Track List */}
                        <div className={`${activeView === 'tracks' ? 'flex' : 'hidden'} sm:flex flex-col flex-1 min-w-0`}>
                            {/* Language Tabs */}
                            <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-white/5 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                                {LANGUAGE_TABS.map(tab => (
                                    <button key={tab.id} onClick={() => { setActiveLanguage(tab.id); if (!searchQuery) loadTrending(tab.id); else handleSearch(searchQuery); }}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${activeLanguage === tab.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/30 hover:text-white'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
                                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                                    <FiSearch className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                                    <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                                        placeholder="Search songs, artists..." className="flex-1 bg-transparent text-xs outline-none text-white placeholder-white/20" />
                                    {searching && <div className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />}
                                </div>
                            </div>

                            {/* Track list */}
                            <div className="flex-1 overflow-y-auto px-2 py-1">
                                {showFallback && <p className="text-[10px] text-amber-400/50 text-center py-1">Showing sample tracks (API unavailable)</p>}
                                {displayTracks.map((track) => (
                                    <motion.div key={track.id} whileHover={{ x: 2 }}
                                        onClick={() => handlePlay(track)}
                                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all group ${!amHost ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                            ${currentTrack?.id === track.id ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/5'}`}>
                                        {/* Album art thumbnail */}
                                        {track.image ? (
                                            <img src={track.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: `${track.color || '#6366f1'}15` }}>
                                                {currentTrack?.id === track.id && isPlaying ? (
                                                    <div className="flex gap-0.5 items-end h-3">
                                                        <div className="w-0.5 bg-indigo-400 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0ms' }} />
                                                        <div className="w-0.5 bg-indigo-400 rounded-full animate-bounce" style={{ height: '100%', animationDelay: '200ms' }} />
                                                        <div className="w-0.5 bg-indigo-400 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '400ms' }} />
                                                    </div>
                                                ) : '🎵'}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-medium truncate ${currentTrack?.id === track.id ? 'text-indigo-400' : 'text-white/80'}`}>{track.title}</p>
                                            <p className="text-[10px] text-white/30 truncate">{track.artist}</p>
                                        </div>
                                        <span className="text-[10px] text-white/20 flex-shrink-0">{track.duration}</span>
                                    </motion.div>
                                ))}
                                {displayTracks.length === 0 && !searching && <p className="text-xs text-white/15 text-center py-6">No songs found</p>}
                            </div>
                        </div>

                        {/* Right Panel: Chat + Users (Desktop shows both stacked, Mobile shows via tabs) */}
                        <div className={`${activeView !== 'tracks' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-56 sm:border-l border-white/5`}>
                            
                            {/* Users Panel (Desktop: always visible header, Mobile: full panel) */}
                            <div className={`${activeView === 'users' ? 'flex flex-1' : 'hidden'} sm:flex flex-col border-b border-white/5`}>
                                <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/5 flex-shrink-0">
                                    <FiUsers className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[10px] font-semibold text-white/40">Listeners — {roomUsers.length || 1}</span>
                                </div>
                                <div className="overflow-y-auto px-2 py-1.5 sm:max-h-[120px]" style={{ scrollbarWidth: 'thin' }}>
                                    {roomUsers.length > 0 ? roomUsers.map((u, i) => (
                                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${u.isHost ? 'bg-gradient-to-br from-amber-500/60 to-orange-500/60 text-white' : 'bg-indigo-500/30 text-indigo-300'}`}>
                                                {(u.username || 'U')[0].toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-medium text-white/70 truncate">{u.username || 'User'}</p>
                                            </div>
                                            {u.isHost && (
                                                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[8px] font-bold flex-shrink-0">HOST</span>
                                            )}
                                            {u.userId === userId && !u.isHost && (
                                                <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[8px] font-bold flex-shrink-0">YOU</span>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="flex items-center gap-2 px-2 py-1.5">
                                            <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300">Y</div>
                                            <p className="text-[11px] text-white/40">Just you</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Chat Panel */}
                            <div className={`${activeView === 'chat' ? 'flex flex-1' : 'hidden'} sm:flex flex-col flex-1 min-h-0`}>
                                <div className="px-3 py-2 hidden sm:flex items-center gap-1.5 border-b border-white/5 flex-shrink-0">
                                    <FiMessageCircle className="w-3 h-3 text-indigo-400" />
                                    <span className="text-[10px] font-semibold text-white/40">Live Chat</span>
                                </div>
                                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                                    {chatMessages.length > 0 ? chatMessages.map((cm, i) => (
                                        <div key={i} className="group">
                                            <div className="flex items-start gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center text-[8px] font-bold text-indigo-300 flex-shrink-0 mt-0.5">
                                                    {(cm.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-semibold text-indigo-400 text-[10px]">{cm.username || 'User'}</span>
                                                    <p className="text-white/60 text-[11px] break-words leading-relaxed">{cm.message}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-6">
                                            <FiMessageCircle className="w-6 h-6 text-white/10 mx-auto mb-2" />
                                            <p className="text-[10px] text-white/15">No messages yet</p>
                                            <p className="text-[9px] text-white/10">Request songs here!</p>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Enhanced Chat Input */}
                                <div className="px-2 py-2 border-t border-white/5 flex-shrink-0 relative">
                                    {/* Emoji Picker */}
                                    <AnimatePresence>
                                        {showEmojis && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                                className="absolute bottom-full left-0 right-0 mb-1 bg-[#0c0e1a] border border-white/10 rounded-xl p-2 shadow-2xl mx-1">
                                                <div className="grid grid-cols-10 gap-0.5">
                                                    {EMOJI_LIST.map(emoji => (
                                                        <button key={emoji} onClick={() => addEmoji(emoji)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 text-sm transition-colors">
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div className="flex items-center gap-1.5 bg-white/5 rounded-xl px-2 py-1">
                                        <button onClick={() => setShowEmojis(!showEmojis)}
                                            className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${showEmojis ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/20 hover:text-white/50'}`}>
                                            <FiSmile className="w-4 h-4" />
                                        </button>
                                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-transparent text-xs outline-none text-white placeholder-white/20 py-1" />
                                        <button onClick={sendChatMessage}
                                            className={`p-2 rounded-lg transition-all flex-shrink-0 ${chatInput.trim() ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/15'}`}>
                                            <FiSend className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
