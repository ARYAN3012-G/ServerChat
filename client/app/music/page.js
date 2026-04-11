'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiSearch, FiHeart, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiVolumeX, FiX, FiMusic, FiTrash2, FiPlus, FiClock, FiUsers, FiRadio } from 'react-icons/fi';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MusicPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const serverIdParam = searchParams.get('serverId');
    const serverId = serverIdParam || null; // Only use explicit URL param, not Redux

    const [tab, setTab] = useState('favorites'); // favorites | sessions | search
    const [favorites, setFavorites] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);
    const [muted, setMuted] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Sessions state
    const [musicSessions, setMusicSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [showCreateSession, setShowCreateSession] = useState(false);

    const audioRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        setMounted(true);
        fetchFavorites();
        if (serverId) { setTab('sessions'); fetchSessions(); }
    }, []);

    // ── FAVORITES ──
    const fetchFavorites = async () => {
        try {
            const { data } = await api.get('/music/favorites');
            setFavorites(data.favorites || []);
        } catch (e) { console.error('Failed to fetch favorites'); }
    };

    const addToFavorites = async (song) => {
        try {
            const { data } = await api.post('/music/favorites', {
                title: song.title, artist: song.artist, url: song.url,
                thumbnail: song.image || song.thumbnail, duration: song.duration,
            });
            setFavorites(data.favorites);
            toast.success('Added to favorites!');
        } catch (e) { toast.error(e.response?.data?.message || 'Failed to add'); }
    };

    const removeFromFavorites = async (songId) => {
        try {
            const { data } = await api.delete(`/music/favorites/${songId}`);
            setFavorites(data.favorites);
            toast.success('Removed from favorites');
        } catch (e) { toast.error('Failed to remove'); }
    };

    const isFavorited = (url) => favorites.some(f => f.url === url);

    // ── SESSIONS ──
    const fetchSessions = async () => {
        if (!serverId) return;
        setLoadingSessions(true);
        try {
            const { data } = await api.get(`/music/sessions/server/${serverId}`);
            setMusicSessions(data.sessions || []);
        } catch (e) { console.error('Failed to fetch music sessions'); }
        setLoadingSessions(false);
    };

    const createSession = async () => {
        if (!newSessionName.trim() || !serverId) return;
        try {
            const { data } = await api.post('/music/sessions', { name: newSessionName.trim(), serverId });
            setMusicSessions(prev => [data.session, ...prev]);
            setNewSessionName('');
            setShowCreateSession(false);
            toast.success('Music session created!');
        } catch (e) { toast.error('Failed to create session'); }
    };

    const endSession = async (sessionId) => {
        try {
            await api.put(`/music/sessions/${sessionId}/end`);
            setMusicSessions(prev => prev.filter(s => s._id !== sessionId));
            toast.success('Session ended');
        } catch (e) { toast.error('Failed to end session'); }
    };

    const joinMusicSession = (sessionId) => {
        const socket = getSocket();
        if (!socket) return;
        // Navigate to channels and open the music room for this session
        router.push(`/channels?musicSession=${sessionId}`);
    };

    // ── SEARCH ──
    const handleSearch = useCallback((q) => {
        setSearchQuery(q);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (!q.trim()) { setSearchResults([]); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await api.get(`/music/search?query=${encodeURIComponent(q)}&limit=20`);
                setSearchResults(data.songs || []);
            } catch (e) { console.error('Search failed'); }
            setSearching(false);
        }, 400);
    }, []);

    // ── AUDIO ──
    const playSong = (song) => {
        const url = song.url;
        if (!url) { toast.error('No playable URL'); return; }
        setCurrentTrack(song);
        setIsPlaying(true);
        if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.volume = volume / 100;
            audioRef.current.play().catch(() => {});
        }
    };

    const togglePlay = () => {
        if (!audioRef.current || !currentTrack) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play().catch(() => {});
        setIsPlaying(!isPlaying);
    };

    const playNext = () => {
        if (!currentTrack) return;
        const list = tab === 'favorites' ? favorites : searchResults;
        const idx = list.findIndex(s => s.url === currentTrack.url);
        if (idx >= 0 && idx < list.length - 1) playSong(list[idx + 1]);
    };

    const playPrev = () => {
        if (!currentTrack) return;
        const list = tab === 'favorites' ? favorites : searchResults;
        const idx = list.findIndex(s => s.url === currentTrack.url);
        if (idx > 0) playSong(list[idx - 1]);
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
        const onEnd = () => { setIsPlaying(false); playNext(); };
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnd);
        return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
    }, [currentTrack]);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = muted ? 0 : volume / 100;
    }, [volume, muted]);

    const seekTo = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        if (audioRef.current && duration) audioRef.current.currentTime = pct * duration;
    };

    const formatTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    };

    const tabs = [
        { id: 'favorites', label: '❤️ My Music', count: favorites.length },
        ...(serverId ? [{ id: 'sessions', label: '🎧 Sessions', count: musicSessions.length }] : []),
        { id: 'search', label: '🔍 Search', count: searchResults.length },
    ];

    if (!mounted) return null;

    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden flex-col">
            <audio ref={audioRef} preload="auto" />

            {/* Header */}
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-indigo-500/10 flex-shrink-0">
                <button onClick={() => router.push('/channels')} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <FiArrowLeft className="w-5 h-5" />
                </button>
                <FiMusic className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                    <h1 className="text-sm sm:text-lg font-bold truncate">{serverId ? 'Server Music' : 'My Music'}</h1>
                    <p className="text-[10px] sm:text-xs text-white/30">{favorites.length} favorites{serverId ? ` • ${musicSessions.length} sessions` : ''}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 px-2 sm:px-4 bg-[#0c0e1a] flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => { setTab(t.id); if (t.id === 'sessions') fetchSessions(); }}
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
                            tab === t.id ? 'text-pink-400 border-pink-400' : 'text-white/30 border-transparent hover:text-white/60'
                        }`}>
                        {t.label}
                        {t.count > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/20'}`}>{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto" style={{ paddingBottom: currentTrack ? '100px' : '0' }}>
                <AnimatePresence mode="wait">

                    {/* ── FAVORITES TAB ── */}
                    {tab === 'favorites' && (
                        <motion.div key="fav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

                            {favorites.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-4">🎵</div>
                                    <p className="text-white/40 mb-2">No favorite songs yet</p>
                                    <p className="text-xs text-white/20 mb-6">Search and add songs to your favorites!</p>
                                    <button onClick={() => setTab('search')} className="px-6 py-2.5 bg-pink-500 rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors">
                                        🔍 Search Songs
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {favorites.map((song, i) => (
                                        <motion.div key={song._id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                            className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer group transition-all ${
                                                currentTrack?.url === song.url ? 'bg-pink-500/10 border border-pink-500/20' : 'hover:bg-white/5'
                                            }`} onClick={() => playSong(song)}>
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                                                {song.thumbnail ? <img src={song.thumbnail} alt="" className="w-full h-full object-cover" /> :
                                                    <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    {currentTrack?.url === song.url && isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{song.title}</p>
                                                <p className="text-[10px] sm:text-xs text-white/30 truncate">{song.artist}</p>
                                            </div>
                                            <span className="text-[10px] text-white/20 flex-shrink-0 hidden sm:block">{song.duration || '--'}</span>
                                            <button onClick={(e) => { e.stopPropagation(); removeFromFavorites(song._id); }}
                                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0">
                                                <FiTrash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ── SESSIONS TAB ── */}
                    {tab === 'sessions' && (
                        <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

                            {/* Create Session */}
                            <div className="mb-6">
                                {!showCreateSession ? (
                                    <button onClick={() => setShowCreateSession(true)}
                                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/10 hover:border-pink-500/30 rounded-xl text-sm text-white/30 hover:text-pink-400 transition-all">
                                        <FiPlus className="w-4 h-4" /> Create Music Room
                                    </button>
                                ) : (
                                    <div className="flex gap-2 items-center">
                                        <input type="text" value={newSessionName} onChange={e => setNewSessionName(e.target.value)}
                                            placeholder="Room name (e.g. Telugu Vibes)" autoFocus onKeyDown={e => e.key === 'Enter' && createSession()}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none text-white placeholder-white/20 focus:border-pink-500/30 min-w-0" />
                                        <button onClick={createSession} disabled={!newSessionName.trim()}
                                            className="px-4 py-2.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-30 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
                                            Create
                                        </button>
                                        <button onClick={() => { setShowCreateSession(false); setNewSessionName(''); }}
                                            className="p-2.5 rounded-xl hover:bg-white/5 text-white/30 transition-colors flex-shrink-0">
                                            <FiX className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {loadingSessions && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}

                            {!loadingSessions && musicSessions.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-5xl mb-4">🎧</div>
                                    <p className="text-white/40 mb-2">No active music sessions</p>
                                    <p className="text-xs text-white/20">Create a music room to listen with friends!</p>
                                </div>
                            )}

                            {/* Session Cards */}
                            <div className="space-y-3">
                                {musicSessions.map((session) => (
                                    <div key={session._id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-pink-500/20 transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-xl flex-shrink-0">
                                                🎵
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-sm font-bold truncate">{session.name}</h4>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold flex-shrink-0">
                                                        🟢 Live
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-white/30 mt-0.5 truncate">
                                                    Host: {session.host?.username || 'Unknown'} • {session.listeners?.length || 0} listener{(session.listeners?.length || 0) !== 1 ? 's' : ''}
                                                </p>
                                                {session.currentTrack && (
                                                    <p className="text-[10px] text-pink-400/60 mt-1 truncate flex items-center gap-1">
                                                        <FiMusic className="w-2.5 h-2.5 flex-shrink-0" /> Now: {session.currentTrack.title} — {session.currentTrack.artist}
                                                    </p>
                                                )}
                                                {session.queue?.length > 0 && (
                                                    <p className="text-[9px] text-white/20 mt-0.5">{session.queue.length} song{session.queue.length !== 1 ? 's' : ''} in queue</p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-shrink-0">
                                                <button onClick={() => joinMusicSession(session._id)}
                                                    className="px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white rounded-lg text-[10px] sm:text-xs font-medium transition-colors">
                                                    🎧 Join
                                                </button>
                                                {session.host?._id === (typeof window !== 'undefined' ? localStorage.getItem('userId') : '') && (
                                                    <button onClick={() => endSession(session._id)}
                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] sm:text-xs font-medium transition-colors border border-red-500/20">
                                                        End
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* ── SEARCH TAB ── */}
                    {tab === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

                            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border border-white/5 mb-4 sm:mb-6">
                                <FiSearch className="w-4 h-4 text-white/20 flex-shrink-0" />
                                <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                                    placeholder="Search for songs, artists..." className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20 min-w-0" autoFocus />
                                {searchQuery && (
                                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-white/20 hover:text-white">
                                        <FiX className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {searching && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}

                            {!searching && searchResults.length === 0 && searchQuery && (
                                <p className="text-center text-white/20 py-8">No results found</p>
                            )}

                            {!searching && searchResults.length === 0 && !searchQuery && (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-4">🔍</div>
                                    <p className="text-white/40">Search for any song</p>
                                    <p className="text-xs text-white/20 mt-1">Telugu, Hindi, English, Tamil & more</p>
                                </div>
                            )}

                            <div className="space-y-1">
                                {searchResults.map((song, i) => (
                                    <motion.div key={song.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                        className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer group transition-all ${
                                            currentTrack?.url === song.url ? 'bg-pink-500/10 border border-pink-500/20' : 'hover:bg-white/5'
                                        }`} onClick={() => playSong(song)}>

                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                                            {song.image ? <img src={song.image} alt="" className="w-full h-full object-cover" /> :
                                                <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                {currentTrack?.url === song.url && isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{song.title}</p>
                                            <p className="text-[10px] sm:text-xs text-white/30 truncate">{song.artist}</p>
                                        </div>

                                        <span className="text-[10px] text-white/20 flex-shrink-0 hidden sm:block">{song.duration || '--'}</span>

                                        <button onClick={(e) => { e.stopPropagation(); isFavorited(song.url) ? null : addToFavorites(song); }}
                                            className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
                                                isFavorited(song.url) ? 'text-pink-400 bg-pink-500/10' : 'opacity-0 group-hover:opacity-100 hover:bg-pink-500/20 text-white/30 hover:text-pink-400'
                                            }`}>
                                            <FiHeart className={`w-3.5 h-3.5 ${isFavorited(song.url) ? 'fill-current' : ''}`} />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Now Playing Bar */}
            <AnimatePresence>
                {currentTrack && (
                    <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
                        className="fixed bottom-0 left-0 right-0 bg-[#0c0e1a]/95 backdrop-blur-xl border-t border-white/5 z-50">
                        <div className="h-1 bg-white/5 cursor-pointer" onClick={seekTo}>
                            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-200"
                                style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
                        </div>
                        <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 sm:py-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                {(currentTrack.thumbnail || currentTrack.image) ?
                                    <img src={currentTrack.thumbnail || currentTrack.image} alt="" className="w-full h-full object-cover" /> :
                                    <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium truncate">{currentTrack.title}</p>
                                <p className="text-[9px] sm:text-[10px] text-white/30 truncate">{currentTrack.artist}</p>
                            </div>
                            <span className="text-[9px] text-white/20 flex-shrink-0 hidden sm:block">
                                {formatTime(progress)} / {formatTime(duration)}
                            </span>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                <button onClick={playPrev} className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                                    <FiSkipBack className="w-4 h-4" />
                                </button>
                                <button onClick={togglePlay} className="p-2 sm:p-2.5 rounded-full bg-pink-500 hover:bg-pink-600 text-white transition-colors">
                                    {isPlaying ? <FiPause className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiPlay className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                                <button onClick={playNext} className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                                    <FiSkipForward className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setMuted(!muted)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                    {muted || volume === 0 ? <FiVolumeX className="w-4 h-4" /> : <FiVolume2 className="w-4 h-4" />}
                                </button>
                                <input type="range" min="0" max="100" value={muted ? 0 : volume} onChange={e => { setVolume(Number(e.target.value)); setMuted(false); }}
                                    className="w-20 accent-pink-500" />
                            </div>
                            <button onClick={() => isFavorited(currentTrack.url) ? null : addToFavorites(currentTrack)}
                                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                                    isFavorited(currentTrack.url) ? 'text-pink-400' : 'text-white/30 hover:text-pink-400'
                                }`}>
                                <FiHeart className={`w-4 h-4 ${isFavorited(currentTrack.url) ? 'fill-current' : ''}`} />
                            </button>
                            <button onClick={() => { setCurrentTrack(null); setIsPlaying(false); if(audioRef.current) audioRef.current.pause(); }}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/20 hover:text-white transition-colors flex-shrink-0">
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
