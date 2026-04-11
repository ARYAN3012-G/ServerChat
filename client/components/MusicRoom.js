'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlay, FiPause, FiSkipForward, FiSkipBack, FiVolume2, FiUsers, FiMusic, FiSearch, FiSend, FiMessageCircle, FiLock, FiStar, FiSmile, FiMinimize2, FiMaximize2, FiVolumeX, FiLink, FiCopy, FiClock, FiCheck, FiPlus } from 'react-icons/fi';
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

export default function MusicRoom({ serverId, serverName, onClose, joinMusicRoom, syncMusic, leaveMusicRoom, musicRoom, userId, isServerOwner, inviteCode }) {
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
    const [mobileTab, setMobileTab] = useState('tracks'); // 'tracks' | 'chat' | 'users' | 'queue'
    const [showEmojis, setShowEmojis] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [needsInteraction, setNeedsInteraction] = useState(false);
    const [queue, setQueue] = useState([]);
    const [skipVotes, setSkipVotes] = useState(0);
    const [skipNeeded, setSkipNeeded] = useState(0);
    const audioRef = useRef(null);
    const playPromiseRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const chatEndRef = useRef(null);

    const hostUserId = musicRoom?.hostUserId;
    const ownerUserId = musicRoom?.ownerUserId;
    const amHost = userId === hostUserId || userId === ownerUserId;
    const roomUsers = musicRoom?.users || [];

    // ── Lifecycle ──
    useEffect(() => {
        if (serverId) joinMusicRoom(serverId, isServerOwner);
        const socket = getSocket();
        const handleChat = (msg) => setChatMessages(prev => [...prev.slice(-100), msg]);
        const handleError = (err) => toast.error(err.message);
        const handleQueueUpdate = (data) => { setQueue(data.queue || []); if (data.action === 'request') toast(`🎵 Song requested: ${data.track?.title}`, { icon: '🎶' }); };
        const handleSkipVote = (data) => { setSkipVotes(data.votes); setSkipNeeded(data.needed); if (data.passed) toast('⏭️ Skipped by vote!'); };
        if (socket) {
            socket.on('stream:chat', handleChat);
            socket.on('music:error', handleError);
            socket.on('music:queue-updated', handleQueueUpdate);
            socket.on('music:skip-vote', handleSkipVote);
        }
        loadTrending('all');
        return () => {
            if (serverId) leaveMusicRoom(serverId);
            if (socket) {
                socket.off('stream:chat', handleChat);
                socket.off('music:error', handleError);
                socket.off('music:queue-updated', handleQueueUpdate);
                socket.off('music:skip-vote', handleSkipVote);
            }
        };
    }, [serverId]);

    // Sync queue from music:sync data
    useEffect(() => {
        if (musicRoom?.queue) setQueue(musicRoom.queue);
        if (musicRoom?.skipVotes !== undefined) setSkipVotes(musicRoom.skipVotes);
    }, [musicRoom?.queue, musicRoom?.skipVotes]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
    useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);

    // ── Music API ──
    const loadTrending = async (lang) => {
        setSearching(true);
        try {
            const res = await api.get(`/music/trending?language=${lang === 'all' ? 'hindi,english,telugu' : lang}`);
            if (res.data.songs?.length > 0) { setSearchResults(res.data.songs); setShowFallback(false); }
            else { setSearchResults([]); setShowFallback(true); }
        } catch { setSearchResults([]); setShowFallback(true); }
        setSearching(false);
    };

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        clearTimeout(searchTimeoutRef.current);
        if (!query.trim()) { loadTrending(activeLanguage); return; }
        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const langSuffix = activeLanguage !== 'all' ? ` ${activeLanguage}` : '';
                const res = await api.get(`/music/search?query=${encodeURIComponent(query + langSuffix)}&limit=20`);
                if (res.data.songs?.length > 0) { setSearchResults(res.data.songs); setShowFallback(false); }
                else { setSearchResults([]); setShowFallback(true); }
            } catch { setSearchResults([]); setShowFallback(true); }
            setSearching(false);
        }, 400);
    }, [activeLanguage]);

    // ── Queue & Skip ──
    const requestSongToQueue = (track) => {
        const socket = getSocket();
        if (socket) socket.emit('music:queue-request', { roomId: serverId, track });
    };

    const handleQueueAction = (trackId, action) => {
        const socket = getSocket();
        if (socket) socket.emit('music:queue-action', { roomId: serverId, trackId, action });
    };

    const playNextFromQueue = () => {
        const socket = getSocket();
        if (socket) socket.emit('music:play-next', { roomId: serverId });
    };

    const voteToSkip = () => {
        const socket = getSocket();
        if (socket) socket.emit('music:vote-skip', { roomId: serverId });
    };

    // ── Chat ──
    const sendChatMessage = () => {
        if (!chatInput.trim()) return;
        const socket = getSocket();
        if (socket) socket.emit('stream:chat', { roomId: serverId, message: chatInput });
        setChatInput('');
        setShowEmojis(false);
    };

    // ── Sync from other users ──
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

    // ── Audio Playback (always active — survives minimize) ──
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
                    if (playPromiseRef.current) { try { await playPromiseRef.current; } catch (e) {} }
                    playPromiseRef.current = audio.play();
                    await playPromiseRef.current;
                    setNeedsInteraction(false); // play succeeded
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error('Audio playback blocked or failed:', e);
                        setNeedsInteraction(true);
                    }
                } finally { playPromiseRef.current = null; }
            } else {
                if (playPromiseRef.current) { try { await playPromiseRef.current; } catch (e) {} playPromiseRef.current = null; }
                audio.pause();
            }
        };
        doPlayback();
    }, [isPlaying, currentTrack?.id]);

    // Unlock audio with user gesture
    const unlockAudio = async () => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        try {
            if (!audio.src || !audio.src.includes(currentTrack.url?.split('/').pop())) {
                audio.src = currentTrack.url;
                audio.load();
            }
            // Seek to correct position
            if (audioRef.current.duration && progress > 0) {
                audioRef.current.currentTime = (progress / 100) * audioRef.current.duration;
            }
            await audio.play();
            setNeedsInteraction(false);
            setIsPlaying(true);
        } catch (e) {
            console.error('Manual play failed:', e);
            toast.error('Could not play audio. Try again.');
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const c = audioRef.current.currentTime, d = audioRef.current.duration;
            if (d > 0) setProgress((c / d) * 100);
        }
    };

    const handlePlay = (track) => {
        if (!amHost) { toast.error('Only the host can change tracks. Request in chat!'); return; }
        setCurrentTrack(track); setIsPlaying(true); setProgress(0);
        syncMusic(serverId, track, 0, true);
    };
    const handleTogglePlay = () => { if (!amHost) return; const ns = !isPlaying; setIsPlaying(ns); syncMusic(serverId, currentTrack, progress, ns); };
    const handleNext = () => { if (!amHost) return; const t = searchResults.length > 0 ? searchResults : FALLBACK_TRACKS; const i = t.findIndex(x => x.id === currentTrack?.id); handlePlay(t[(i + 1) % t.length]); };
    const handlePrev = () => { if (!amHost) return; const t = searchResults.length > 0 ? searchResults : FALLBACK_TRACKS; const i = t.findIndex(x => x.id === currentTrack?.id); handlePlay(t[(i - 1 + t.length) % t.length]); };

    const displayTracks = showFallback ? FALLBACK_TRACKS : searchResults;

    // Helper: album art image with referrer fix
    const AlbumArt = ({ src, size = 'w-10 h-10', rounded = 'rounded-lg', fallbackColor = '#6366f1' }) => (
        src ? <img src={src} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" className={`${size} ${rounded} object-cover flex-shrink-0 shadow`} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }} />
        : <div className={`${size} ${rounded} flex items-center justify-center text-sm flex-shrink-0`} style={{ background: `${fallbackColor}20` }}>🎵</div>
    );

    return (
        <>
            {/* ── PERSISTENT AUDIO — never unmounts ── */}
            <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleNext} preload="auto" />

            {/* ── MINIMIZED MINI-PLAYER ── */}
            <AnimatePresence>
                {minimized && (
                    <motion.div key="miniplayer"
                        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-4 right-4 z-50 bg-[#0c0e1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 w-[320px] sm:w-[360px] overflow-hidden"
                    >
                        <div className="p-3 flex items-center gap-3">
                            {currentTrack?.image ? (
                                <img src={currentTrack.image} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-lg" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-lg flex-shrink-0">🎵</div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{currentTrack?.title || 'No track'}</p>
                                <p className="text-[10px] text-white/30 truncate">{currentTrack?.artist || '—'}</p>
                                <div className="mt-1 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button onClick={handleTogglePlay} disabled={!amHost}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center ${amHost ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-white/10 text-white/20'} transition-colors`}>
                                    {isPlaying ? <FiPause className="w-3.5 h-3.5" /> : <FiPlay className="w-3.5 h-3.5 ml-0.5" />}
                                </button>
                                <button onClick={handleNext} disabled={!amHost} className={`p-1.5 ${amHost ? 'text-white/40 hover:text-white' : 'text-white/10'}`}><FiSkipForward className="w-3 h-3" /></button>
                                <button onClick={() => setMinimized(false)} className="p-1.5 text-white/30 hover:text-indigo-400 transition-colors" title="Expand"><FiMaximize2 className="w-3 h-3" /></button>
                                <button onClick={onClose} className="p-1.5 text-white/30 hover:text-red-400 transition-colors" title="Close"><FiX className="w-3 h-3" /></button>
                            </div>
                        </div>
                        {needsInteraction && (
                            <div className="px-3 pb-1.5">
                                <button onClick={unlockAudio} className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-center gap-1">
                                    <FiVolume2 className="w-3 h-3" /> Tap to Listen
                                </button>
                            </div>
                        )}
                        <div className="px-3 pb-2 flex items-center gap-1.5 text-[9px] text-white/20">
                            <FiUsers className="w-2.5 h-2.5" />
                            <span>{roomUsers.length || 1} listening</span>
                            <span className="text-white/10">•</span>
                            <span className="text-indigo-400/60">{serverName}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── FULL MUSIC ROOM ── */}
            <AnimatePresence>
                {!minimized && (
                    <motion.div key="fullroom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
                        <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            className="bg-[#0c0e1a] border border-white/10 rounded-2xl w-full max-w-[900px] h-[85vh] max-h-[680px] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>

                            {/* ── HEADER ── */}
                            <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-pink-500/10 flex-shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                        <FiMusic className="w-3.5 h-3.5 text-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-bold text-white truncate">Music Room</h2>
                                        <p className="text-[10px] text-white/25 truncate">{serverName} • {roomUsers.length || 1} listening</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {amHost && (
                                        <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full text-[9px] font-bold flex items-center gap-1">
                                            <FiStar className="w-2.5 h-2.5" /> HOST
                                        </span>
                                    )}
                                    <div className="hidden sm:flex -space-x-1.5 ml-1">
                                        {roomUsers.slice(0, 3).map((u, i) => (
                                            <div key={i} className={`w-6 h-6 rounded-full border-2 border-[#0c0e1a] flex items-center justify-center text-[8px] font-bold ${u.isHost ? 'bg-amber-500/50 text-amber-100' : 'bg-indigo-500/40 text-indigo-200'}`}
                                                title={`${u.username}${u.isHost ? ' (Host)' : ''}`}>
                                                {(u.username || 'U')[0].toUpperCase()}
                                            </div>
                                        ))}
                                        {roomUsers.length > 3 && <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#0c0e1a] flex items-center justify-center text-[8px] text-white/40">+{roomUsers.length - 3}</div>}
                                    </div>
                                    {inviteCode && (
                                        <button onClick={() => { const url = `${window.location.origin}/invite/${inviteCode}?room=music`; navigator.clipboard?.writeText(url); toast.success('Music room invite copied!'); }}
                                            className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-white/25 hover:text-indigo-400 transition-colors ml-0.5" title="Copy Invite Link">
                                            <FiLink className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button onClick={() => setMinimized(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/25 hover:text-white transition-colors" title="Minimize">
                                        <FiMinimize2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/25 hover:text-white transition-colors">
                                        <FiX className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* ── NOW PLAYING BAR ── */}
                            {currentTrack && (
                                <div className="px-4 sm:px-5 py-2.5 border-b border-white/5 flex-shrink-0 bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        {currentTrack.image ? (
                                            <img src={currentTrack.image} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover flex-shrink-0 shadow-lg" />
                                        ) : (
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                                style={{ background: `linear-gradient(135deg, ${currentTrack.color}40, ${currentTrack.color}10)` }}>🎵</div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white text-sm truncate">{currentTrack.title}</h3>
                                            <p className="text-[11px] text-white/35 truncate">{currentTrack.artist}{currentTrack.language ? ` • ${currentTrack.language}` : ''}</p>
                                            <div className="mt-1.5 w-full h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group"
                                                onClick={(e) => {
                                                    if (!amHost) return;
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const p = ((e.clientX - rect.left) / rect.width) * 100;
                                                    setProgress(p);
                                                    if (audioRef.current?.duration) audioRef.current.currentTime = (p / 100) * audioRef.current.duration;
                                                    syncMusic(serverId, currentTrack, p, isPlaying);
                                                }}>
                                                <div className="h-full rounded-full transition-all duration-200 group-hover:h-2" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${currentTrack.color || '#6366f1'}, ${currentTrack.color || '#6366f1'}cc)` }} />
                                            </div>
                                        </div>
                                        {/* Inline controls */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button onClick={handlePrev} disabled={!amHost} className={`p-1.5 rounded-full ${amHost ? 'text-white/30 hover:text-white hover:bg-white/10' : 'text-white/10'} transition-colors`}><FiSkipBack className="w-3.5 h-3.5" /></button>
                                            <button onClick={handleTogglePlay} disabled={!amHost}
                                                className={`w-9 h-9 rounded-full flex items-center justify-center ${amHost ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25' : 'bg-white/10 text-white/15'} transition-all`}>
                                                {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4 ml-0.5" />}
                                            </button>
                                            <button onClick={handleNext} disabled={!amHost} className={`p-1.5 rounded-full ${amHost ? 'text-white/30 hover:text-white hover:bg-white/10' : 'text-white/10'} transition-colors`}><FiSkipForward className="w-3.5 h-3.5" /></button>
                                            {/* Vote to Skip */}
                                            {!amHost && currentTrack && (
                                                <button onClick={voteToSkip} className="px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] font-semibold hover:bg-orange-500/20 transition-colors ml-1 whitespace-nowrap"
                                                    title={`Vote to skip (${skipVotes}/${skipNeeded || '?'})`}>
                                                    ⏭ Skip {skipVotes > 0 ? `(${skipVotes}/${skipNeeded})` : ''}
                                                </button>
                                            )}
                                            {amHost && queue.filter(q => q.status === 'approved').length > 0 && (
                                                <button onClick={playNextFromQueue} className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-semibold hover:bg-emerald-500/20 transition-colors ml-1 whitespace-nowrap">
                                                    ▶ Next in Queue
                                                </button>
                                            )}
                                            <div className="hidden sm:flex items-center gap-1 ml-2 pl-2 border-l border-white/5">
                                                <button onClick={() => setVolume(v => v > 0 ? 0 : 80)} className="text-white/25 hover:text-white/60 transition-colors">
                                                    {volume === 0 ? <FiVolumeX className="w-3 h-3" /> : <FiVolume2 className="w-3 h-3" />}
                                                </button>
                                                <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                                                    className="w-14 h-1 accent-indigo-500 cursor-pointer" />
                                            </div>
                                        </div>
                                    </div>
                                    {!amHost && <p className="text-center text-[9px] text-amber-400/40 mt-1 flex items-center justify-center gap-1"><FiLock className="w-2 h-2" /> Only the host can control playback</p>}
                    {needsInteraction && (
                        <motion.button
                            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            onClick={unlockAudio}
                            className="mt-2 w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                            <FiVolume2 className="w-3.5 h-3.5" /> Click to Start Listening 🎧
                        </motion.button>
                    )}
                                </div>
                            )}

                            {/* ── MOBILE TABS ── */}
                            <div className="flex border-b border-white/5 sm:hidden flex-shrink-0">
                                {[{ id: 'tracks', icon: FiMusic, label: 'Tracks' }, { id: 'queue', icon: FiClock, label: `Queue${queue.length ? ` (${queue.length})` : ''}` }, { id: 'users', icon: FiUsers, label: `${roomUsers.length || 1}` }, { id: 'chat', icon: FiMessageCircle, label: 'Chat' }].map(t => (
                                    <button key={t.id} onClick={() => setMobileTab(t.id)}
                                        className={`flex-1 py-2 text-[11px] font-medium text-center transition-colors flex items-center justify-center gap-1 ${mobileTab === t.id ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/25'}`}>
                                        <t.icon className="w-3 h-3" />{t.label}
                                    </button>
                                ))}
                            </div>

                            {/* ══════ 3-COLUMN LAYOUT ══════ */}
                            <div className="flex-1 flex min-h-0 overflow-hidden">

                                {/* ── LEFT: LISTENERS PANEL ── */}
                                <div className={`${mobileTab === 'users' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-44 sm:border-r border-white/5 flex-shrink-0`}>
                                    <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/5 flex-shrink-0">
                                        <FiUsers className="w-3 h-3 text-emerald-400" />
                                        <span className="text-[10px] font-semibold text-white/30">Listeners — {roomUsers.length || 1}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-1.5 py-1" style={{ scrollbarWidth: 'thin' }}>
                                        {roomUsers.length > 0 ? roomUsers.map((u, i) => (
                                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${u.isHost ? 'bg-gradient-to-br from-amber-500/50 to-orange-600/50 text-white ring-1 ring-amber-400/30' : 'bg-indigo-500/25 text-indigo-300'}`}>
                                                    {(u.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-medium text-white/60 truncate">{u.username || 'User'}</p>
                                                    {u.isHost && <p className="text-[8px] text-amber-400/60 font-bold">HOST</p>}
                                                </div>
                                                {u.userId === userId && !u.isHost && (
                                                    <span className="px-1 py-0.5 bg-indigo-500/10 text-indigo-400/60 rounded text-[7px] font-bold flex-shrink-0">YOU</span>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="flex items-center gap-2 px-2 py-3">
                                                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300">Y</div>
                                                <p className="text-[11px] text-white/30">Just you</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── QUEUE PANEL ── */}
                                <div className={`${mobileTab === 'queue' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-48 sm:border-r border-white/5 flex-shrink-0`}>
                                    <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/5 flex-shrink-0">
                                        <FiClock className="w-3 h-3 text-purple-400" />
                                        <span className="text-[10px] font-semibold text-white/30">Queue — {queue.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto px-1.5 py-1" style={{ scrollbarWidth: 'thin' }}>
                                        {queue.length > 0 ? queue.map((item, i) => (
                                            <div key={item.id || i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg mb-0.5 ${item.status === 'pending' ? 'bg-amber-500/5' : 'bg-emerald-500/5'}`}>
                                                <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center text-[9px] flex-shrink-0">🎵</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-medium text-white/60 truncate">{item.title}</p>
                                                    <p className="text-[8px] text-white/20 truncate">{item.requestedBy?.username || 'Unknown'}</p>
                                                </div>
                                                {amHost && item.status === 'pending' && (
                                                    <div className="flex gap-0.5 flex-shrink-0">
                                                        <button onClick={() => handleQueueAction(item.id, 'approve')}
                                                            className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors">
                                                            <FiCheck className="w-2.5 h-2.5" />
                                                        </button>
                                                        <button onClick={() => handleQueueAction(item.id, 'reject')}
                                                            className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                                                            <FiX className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                {item.status === 'approved' && (
                                                    <span className="text-[8px] text-emerald-400/60 font-bold px-1 flex-shrink-0">✓</span>
                                                )}
                                                {!amHost && item.status === 'pending' && (
                                                    <span className="text-[8px] text-amber-400/60 font-bold px-1 flex-shrink-0">⏳</span>
                                                )}
                                            </div>
                                        )) : (
                                            <div className="text-center py-6">
                                                <FiClock className="w-6 h-6 text-white/[0.06] mx-auto mb-1.5" />
                                                <p className="text-[10px] text-white/15">Queue is empty</p>
                                                <p className="text-[8px] text-white/10 mt-0.5">Request songs from tracks!</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* ── CENTER: TRACK LIST ── */}
                                <div className={`${mobileTab === 'tracks' ? 'flex' : 'hidden'} sm:flex flex-col flex-1 min-w-0`}>
                                    {/* Language Tabs */}
                                    <div className="flex gap-1 px-3 py-1.5 overflow-x-auto border-b border-white/5 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                                        {LANGUAGE_TABS.map(tab => (
                                            <button key={tab.id} onClick={() => { setActiveLanguage(tab.id); if (!searchQuery) loadTrending(tab.id); else handleSearch(searchQuery); }}
                                                className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${activeLanguage === tab.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/25 hover:text-white/60'}`}>
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Search */}
                                    <div className="px-3 py-1.5 border-b border-white/5 flex-shrink-0">
                                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                                            <FiSearch className="w-3 h-3 text-white/15 flex-shrink-0" />
                                            <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                                                placeholder="Search songs, artists..." className="flex-1 bg-transparent text-xs outline-none text-white placeholder-white/15" />
                                            {searching && <div className="w-3 h-3 border border-white/30 border-t-transparent rounded-full animate-spin" />}
                                        </div>
                                    </div>
                                    {/* Tracks */}
                                    <div className="flex-1 overflow-y-auto px-1.5 py-0.5">
                                        {showFallback && <p className="text-[10px] text-amber-400/40 text-center py-1">Showing sample tracks (API unavailable)</p>}
                                        {displayTracks.map((track) => (
                                            <motion.div key={track.id} whileHover={{ x: 2 }} onClick={() => amHost ? handlePlay(track) : null}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${amHost ? 'cursor-pointer' : 'cursor-default'}
                                                    ${currentTrack?.id === track.id ? 'bg-indigo-500/10 border border-indigo-500/20' : 'hover:bg-white/[0.04]'}`}>
                                                {track.image ? (
                                                    <img src={track.image} alt="" referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs flex-shrink-0" style={{ background: `${track.color || '#6366f1'}12` }}>
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
                                                    <p className={`text-[11px] font-medium truncate ${currentTrack?.id === track.id ? 'text-indigo-400' : 'text-white/70'}`}>{track.title}</p>
                                                    <p className="text-[10px] text-white/25 truncate">{track.artist}</p>
                                                </div>
                                                <span className="text-[10px] text-white/15 flex-shrink-0">{track.duration}</span>
                                                {!amHost && (
                                                    <button onClick={(e) => { e.stopPropagation(); requestSongToQueue(track); }}
                                                        className="p-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-[9px] font-medium transition-colors flex-shrink-0" title="Request this song">
                                                        <FiPlus className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        ))}
                                        {displayTracks.length === 0 && !searching && <p className="text-xs text-white/10 text-center py-6">No songs found</p>}
                                    </div>
                                </div>

                                {/* ── RIGHT: CHAT PANEL ── */}
                                <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-72 sm:border-l border-white/5 flex-shrink-0`}>
                                    <div className="px-3 py-2 flex items-center gap-1.5 border-b border-white/5 flex-shrink-0">
                                        <FiMessageCircle className="w-3 h-3 text-indigo-400" />
                                        <span className="text-[10px] font-semibold text-white/30">Live Chat</span>
                                    </div>
                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2">
                                        {chatMessages.length > 0 ? chatMessages.map((cm, i) => (
                                            <div key={i} className="flex items-start gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-indigo-500/25 flex items-center justify-center text-[7px] font-bold text-indigo-300 flex-shrink-0 mt-0.5">
                                                    {(cm.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-semibold text-indigo-400/80">{cm.username || 'User'}</p>
                                                    <p className="text-[11px] text-white/50 break-words leading-relaxed">{cm.message}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-8">
                                                <FiMessageCircle className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />
                                                <p className="text-[10px] text-white/15">No messages yet</p>
                                                <p className="text-[9px] text-white/10 mt-0.5">Request songs here!</p>
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* ── CHAT INPUT ── */}
                                    <div className="border-t border-white/5 flex-shrink-0 relative">
                                        {/* Emoji Picker */}
                                        <AnimatePresence>
                                            {showEmojis && (
                                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                                                    className="absolute bottom-full left-0 right-0 mb-1 bg-[#12142a] border border-white/10 rounded-xl p-2 shadow-2xl mx-1 z-10">
                                                    <div className="grid grid-cols-6 sm:grid-cols-5 gap-0.5 max-h-[120px] overflow-y-auto">
                                                        {EMOJI_LIST.map(e => (
                                                            <button key={e} onClick={() => setChatInput(p => p + e)}
                                                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-sm transition-colors">{e}</button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <div className="p-2.5 flex items-center gap-1.5">
                                            <button onClick={() => setShowEmojis(!showEmojis)}
                                                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${showEmojis ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/20 hover:text-white/50 hover:bg-white/5'}`}>
                                                <FiSmile className="w-3.5 h-3.5" />
                                            </button>
                                            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') sendChatMessage(); }}
                                                placeholder="Type a message..."
                                                className="flex-1 bg-white/5 rounded-lg px-2.5 py-2 text-xs outline-none text-white placeholder-white/20 min-w-0" />
                                            <button onClick={sendChatMessage}
                                                className={`p-2 rounded-lg transition-all flex-shrink-0 ${chatInput.trim()
                                                    ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25'
                                                    : 'bg-white/5 text-white/10'}`}>
                                                <FiSend className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
