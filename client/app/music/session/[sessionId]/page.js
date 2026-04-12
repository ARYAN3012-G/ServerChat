'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiSearch, FiPlay, FiPause, FiSkipForward, FiVolume2, FiVolumeX, FiX, FiMusic, FiPlus, FiUsers, FiMessageCircle, FiList, FiChevronDown, FiImage } from 'react-icons/fi';
import { getSocket } from '../../../../services/socket';
import { useMusicPlayer } from '../../../../components/MusicPlayerProvider';
import { useAuth } from '../../../../hooks/useAuth';
import api from '../../../../services/api';
import toast from 'react-hot-toast';

export default function MusicSessionPage() {
    const router = useRouter();
    const { sessionId } = useParams();
    const { user } = useAuth();
    const { currentServer } = useSelector(s => s.server);
    const { playSong: globalPlay, togglePlay, currentTrack, isPlaying: globalIsPlaying, stopMusic, setActiveSessionId } = useMusicPlayer();

    // Ensure mini player knows about this session
    useEffect(() => {
        if (sessionId) setActiveSessionId(sessionId);
    }, [sessionId, setActiveSessionId]);

    const [mounted, setMounted] = useState(false);
    const [session, setSession] = useState(null);
    const [tab, setTab] = useState('playing'); // playing | explore | search | queue
    const [connected, setConnected] = useState(false);

    // Room state from socket
    const [roomState, setRoomState] = useState({
        hostUserId: null, ownerUserId: null, users: [],
        track: null, queue: [], isPlaying: false, chat: [],
    });

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Explore state
    const [trendingSongs, setTrendingSongs] = useState([]);
    const [loadingTrending, setLoadingTrending] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('all');

    // Chat
    const [chatMsg, setChatMsg] = useState('');
    const chatRef = useRef(null);

    // Host transfer
    const [showHostTransfer, setShowHostTransfer] = useState(false);

    // GIF state
    const [showGifPicker, setShowGifPicker] = useState(false);
    const GIF_PRESETS = [
        'https://media.tenor.com/x8v1oNUOmg4AAAAd/rickroll-roll.gif',
        'https://media.tenor.com/jxcxI4jAiy0AAAAC/vibing-cat.gif',
        'https://media.tenor.com/UtbpeGzK9r0AAAAC/dance.gif',
        'https://media.tenor.com/gK2R02U0a0YAAAAC/pepe-dance.gif',
        'https://media.tenor.com/R_vQy3L73qMAAAAd/giga-chad-chad.gif',
        'https://media.tenor.com/4N9e7G4ZqFMAAAAC/chill-music.gif',
        'https://media.tenor.com/_q1A1xXmJcwAAAAd/homer-simpson-homer.gif',
        'https://media.tenor.com/XqU0c0G7yJ0AAAAC/party-parrot.gif',
    ];

    const LANGUAGES = [
        { id: 'all', label: 'All', emoji: '🌍' },
        { id: 'telugu', label: 'Telugu', emoji: '🇮🇳' },
        { id: 'hindi', label: 'Hindi', emoji: '🇮🇳' },
        { id: 'english', label: 'English', emoji: '🇬🇧' },
        { id: 'tamil', label: 'Tamil', emoji: '🇮🇳' },
        { id: 'punjabi', label: 'Punjabi', emoji: '🇮🇳' },
    ];

    // Derived
    const isServerOwner = session?.server?.owner === user?._id || session?.server?.owner?._id === user?._id || (currentServer?.owner?._id || currentServer?.owner)?.toString() === user?._id?.toString();
    const amIHost = roomState.hostUserId === user?._id;
    const amIOwner = roomState.ownerUserId === user?._id;
    const amIHostOrOwner = amIHost || amIOwner || isServerOwner;

    // ── Fetch session info ──
    useEffect(() => {
        setMounted(true);
        if (sessionId) {
            api.get(`/music/sessions/${sessionId}`).then(({ data }) => {
                setSession(data.session);
            }).catch(() => toast.error('Session not found'));
        }
    }, [sessionId]);

    // ── Join socket room + set up listeners ──
    useEffect(() => {
        if (!sessionId || !user?._id) return;
        const socket = getSocket();
        if (!socket) return;

        // Join the room (Backend handles host/owner extraction securely)
        socket.emit('stream:join', { roomId: sessionId });
        setConnected(true);

        const handleSync = (data) => {
            setRoomState(prev => ({
                ...prev,
                users: data.users || prev.users,
                hostUserId: data.hostUserId || prev.hostUserId,
                ownerUserId: data.ownerUserId || prev.ownerUserId,
                track: data.track !== undefined ? data.track : prev.track,
                isPlaying: data.isPlaying !== undefined ? data.isPlaying : prev.isPlaying,
                queue: data.queue || prev.queue,
            }));
        };
        const handleHostChanged = ({ hostUserId, users }) => {
            setRoomState(prev => ({ ...prev, hostUserId, users: users || prev.users }));
            if (hostUserId === user?._id) toast('You are now the host! 🎤', { icon: '👑' });
        };
        const handleUserJoined = ({ users, hostUserId, ownerUserId }) => {
            setRoomState(prev => ({ ...prev, users, hostUserId: hostUserId || prev.hostUserId, ownerUserId: ownerUserId || prev.ownerUserId }));
        };
        const handleUserLeft = ({ userId }) => {
            setRoomState(prev => ({ ...prev, users: prev.users.filter(u => u.userId !== userId) }));
        };
        const handleChat = (msg) => {
            // Also fetch current users state if missing username but we shouldn't ordinarily miss it.
            setRoomState(prev => ({ ...prev, chat: [...prev.chat.slice(-100), msg] }));
        };
        const handleQueueUpdated = ({ queue }) => {
            setRoomState(prev => ({ ...prev, queue: queue || prev.queue }));
        };

        socket.on('music:sync', handleSync);
        socket.on('music:host-changed', handleHostChanged);
        socket.on('stream:user-joined', handleUserJoined);
        socket.on('stream:user-left', handleUserLeft);
        socket.on('stream:chat', handleChat);
        socket.on('music:queue-updated', handleQueueUpdated);

        return () => {
            socket.emit('stream:leave', { roomId: sessionId });
            socket.off('music:sync', handleSync);
            socket.off('music:host-changed', handleHostChanged);
            socket.off('stream:user-joined', handleUserJoined);
            socket.off('stream:user-left', handleUserLeft);
            socket.off('stream:chat', handleChat);
            socket.off('music:queue-updated', handleQueueUpdated);
        };
    }, [sessionId, user?._id]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [roomState.chat]);

    // ── Auto-sync Listeners with Host's Music ──
    useEffect(() => {
        if (!amIHostOrOwner && roomState.track) {
            if (currentTrack?.url !== roomState.track.url) {
                globalPlay(roomState.track);
            }
        }
    }, [roomState.track, amIHostOrOwner, currentTrack?.url, globalPlay]);

    useEffect(() => {
        if (!amIHostOrOwner && roomState.track) {
            if (roomState.isPlaying && !globalIsPlaying) togglePlay();
            if (!roomState.isPlaying && globalIsPlaying) togglePlay();
        }
    }, [roomState.isPlaying, amIHostOrOwner, globalIsPlaying, togglePlay, roomState.track]);

    // ── Music Controls ──
    const playSong = (song) => {
        const socket = getSocket();
        if (!socket) return;
        if (!amIHostOrOwner) {
            socket.emit('music:queue-request', { roomId: sessionId, track: song });
            toast.success('Song requested!');
            return;
        }
        socket.emit('music:sync', { roomId: sessionId, track: song, currentTime: 0, isPlaying: true });
        setRoomState(prev => ({ ...prev, track: song, isPlaying: true }));
        globalPlay(song);
    };

    const togglePlayback = () => {
        const socket = getSocket();
        if (!socket || !amIHostOrOwner) return;
        const newPlaying = !roomState.isPlaying;
        socket.emit('music:sync', { roomId: sessionId, track: roomState.track, currentTime: 0, isPlaying: newPlaying });
        setRoomState(prev => ({ ...prev, isPlaying: newPlaying }));
        if (newPlaying && roomState.track) globalPlay(roomState.track); else togglePlay();
    };

    const voteSkip = () => {
        const socket = getSocket();
        if (socket) socket.emit('music:vote-skip', { roomId: sessionId });
        toast('Vote skip submitted', { icon: '⏭' });
    };

    // ── Search ──
    const searchSongs = async (q) => {
        if (!q.trim()) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const { data } = await api.get(`/music/search?query=${encodeURIComponent(q)}&limit=20`);
            setSearchResults(data.songs || []);
        } catch (e) { console.error('Search failed'); }
        setSearching(false);
    };

    // ── Explore ──
    const fetchTrending = async (lang = 'all') => {
        setLoadingTrending(true);
        try {
            const query = lang === 'all' ? 'trending' : `trending ${lang}`;
            const { data } = await api.get(`/music/search?query=${encodeURIComponent(query)}&limit=30`);
            setTrendingSongs(data.songs || []);
        } catch (e) { console.error('Failed to fetch trending'); }
        setLoadingTrending(false);
    };

    useEffect(() => {
        if (tab === 'explore' && trendingSongs.length === 0) fetchTrending(selectedLanguage);
    }, [tab, selectedLanguage]);

    // ── Chat ──
    const sendChat = (gifUrl = null) => {
        const socket = getSocket();
        const msg = typeof gifUrl === 'string' ? gifUrl : chatMsg;
        if (!socket || !msg.trim()) return;
        socket.emit('stream:chat', { roomId: sessionId, message: msg, isGif: typeof gifUrl === 'string' });
        if (typeof gifUrl !== 'string') setChatMsg('');
        setShowGifPicker(false);
    };

    // ── Session Actions ──
    const leaveSession = () => {
        if (amIHost && roomState.users.length > 1) {
            setShowHostTransfer(true);
            return;
        }
        stopMusic();
        router.push(session?.server ? `/music?serverId=${session.server._id || session.server}` : '/music');
    };

    const endSession = async () => {
        try {
            await api.put(`/music/sessions/${sessionId}/end`);
            toast.success('Session ended');
            stopMusic();
            router.push(session?.server ? `/music?serverId=${session.server._id || session.server}` : '/music');
        } catch (e) { toast.error('Failed to end session'); }
    };

    const transferHost = (newHostUserId) => {
        const socket = getSocket();
        if (socket) socket.emit('music:transfer-host', { roomId: sessionId, newHostUserId });
        toast.success('Host transferred!');
        setShowHostTransfer(false);
    };

    const transferAndLeave = (newHostUserId) => {
        transferHost(newHostUserId);
        stopMusic();
        setTimeout(() => router.push(session?.server ? `/music?serverId=${session.server._id || session.server}` : '/music'), 500);
    };

    const roomApproveTrack = (trackId) => {
        const socket = getSocket();
        if (socket) socket.emit('music:queue-action', { roomId: sessionId, trackId, action: 'approve' });
    };

    if (!mounted) return null;

    const sessionName = session?.name || 'Music Room';

    const tabs = [
        { id: 'playing', label: '🎵 Now Playing' },
        { id: 'explore', label: '🌍 Explore' },
        { id: 'search', label: '🔍 Search' },
        { id: 'queue', label: `📋 Queue (${roomState.queue?.length || 0})` },
        { id: 'chat', label: `💬 Chat` },
    ];



    return (
        <div className="flex h-[100dvh] bg-[#0c0e1a] text-white overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/5 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-indigo-500/10 flex-shrink-0">
                    <button onClick={leaveSession}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm sm:text-lg font-bold truncate">{sessionName}</h1>
                        <div className="flex items-center gap-2 text-[10px] text-white/30">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            <span>{roomState.users.length} listening</span>
                            {amIHost && <span className="text-amber-400">• 👑 You are Host</span>}
                            {amIOwner && !amIHost && <span className="text-indigo-400">• 🔑 Server Owner</span>}
                        </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                        {amIHostOrOwner && (
                            <button onClick={endSession}
                                className="px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-medium hover:bg-red-500/20 transition-colors hidden sm:block">
                                End Session
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/5 px-2 sm:px-4 bg-[#0c0e1a] flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                                tab === t.id ? 'border-pink-500 text-pink-400' : 'border-transparent text-white/30 hover:text-white/50'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                    <AnimatePresence mode="wait">

                        {/* ── NOW PLAYING ── */}
                        {tab === 'playing' && (
                            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

                                {/* Now Playing Card */}
                                <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-pink-500/8 via-purple-500/5 to-indigo-500/8 border border-white/5 mb-6">
                                    {roomState.track ? (
                                        <div className="flex flex-col items-center text-center">
                                            <div className="w-40 h-40 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-white/5 shadow-2xl shadow-pink-500/10 mb-5">
                                                {(roomState.track.image || roomState.track.thumbnail) ?
                                                    <img src={roomState.track.image || roomState.track.thumbnail} alt="" className="w-full h-full object-cover" /> :
                                                    <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>}
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold truncate max-w-full">{roomState.track.title}</h2>
                                            <p className="text-sm text-white/40 mt-1 truncate max-w-full">{roomState.track.artist}</p>

                                            {/* Controls */}
                                            <div className="flex items-center gap-4 mt-6">
                                                {amIHostOrOwner ? (
                                                    <button onClick={togglePlayback}
                                                        className="w-14 h-14 rounded-full bg-pink-500 hover:bg-pink-600 flex items-center justify-center text-white transition-all shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95">
                                                        {roomState.isPlaying ? <FiPause className="w-6 h-6" /> : <FiPlay className="w-6 h-6 ml-0.5" />}
                                                    </button>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
                                                        {roomState.isPlaying ?
                                                            <><FiVolume2 className="w-4 h-4 text-emerald-400" /><span className="text-xs text-emerald-400">Playing</span></> :
                                                            <><FiPause className="w-4 h-4 text-white/30" /><span className="text-xs text-white/30">Paused</span></>}
                                                    </div>
                                                )}
                                                <button onClick={voteSkip}
                                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/40 rounded-full text-xs transition-colors flex items-center gap-1.5">
                                                    <FiSkipForward className="w-3.5 h-3.5" /> Vote Skip
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="text-6xl mb-4">🎵</div>
                                            <h3 className="text-lg font-bold text-white/60">No track playing</h3>
                                            <p className="text-sm text-white/25 mt-1">
                                                {amIHostOrOwner
                                                    ? 'Go to Explore or Search tab to pick a song!'
                                                    : 'Waiting for the host to play music...'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Info Cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Listeners</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {roomState.users.map((u, i) => (
                                                <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                                                    u.userId === roomState.hostUserId ? 'bg-amber-500/20 text-amber-400' :
                                                    u.userId === roomState.ownerUserId ? 'bg-indigo-500/20 text-indigo-400' :
                                                    'bg-white/5 text-white/30'
                                                }`}>
                                                    {u.userId === roomState.hostUserId && '👑 '}{u.username || 'User'}
                                                    {u.userId === user?._id && ' (you)'}
                                                </span>
                                            ))}
                                            {roomState.users.length === 0 && <span className="text-[10px] text-white/15">Connecting...</span>}
                                        </div>
                                        {amIHostOrOwner && roomState.users.length > 1 && (
                                            <button onClick={() => setShowHostTransfer(true)} className="text-[9px] text-amber-400 mt-2 hover:underline">👑 Transfer Host</button>
                                        )}
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">Queue</p>
                                        {roomState.queue?.length > 0 ? roomState.queue.slice(0, 3).map((q, i) => (
                                            <p key={i} className="text-[10px] text-white/40 truncate">{q.title}</p>
                                        )) : <p className="text-[10px] text-white/15">No songs queued</p>}
                                        {roomState.queue?.length > 3 && <p className="text-[9px] text-pink-400 mt-1">+{roomState.queue.length - 3} more</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ── EXPLORE TAB ── */}
                        {tab === 'explore' && (
                            <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
                                <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                                    {LANGUAGES.map(lang => (
                                        <button key={lang.id} onClick={() => { setSelectedLanguage(lang.id); fetchTrending(lang.id); }}
                                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                                                selectedLanguage === lang.id ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-white/30 hover:bg-white/10'
                                            }`}>
                                            {lang.emoji} {lang.label}
                                        </button>
                                    ))}
                                </div>
                                {loadingTrending ? (
                                    <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
                                ) : (
                                    <div className="space-y-0.5">
                                        {trendingSongs.map((song, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                                onClick={() => playSong(song)}
                                                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl cursor-pointer transition-all">
                                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                                                    {song.image || song.thumbnail ?
                                                        <img src={song.image || song.thumbnail} alt="" className="w-full h-full object-cover" /> :
                                                        <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                        <FiPlay className="w-4 h-4" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{song.title}</p>
                                                    <p className="text-[10px] text-white/30 truncate">{song.artist}</p>
                                                </div>
                                                <span className="text-[10px] text-white/20 flex-shrink-0 hidden sm:block">{song.duration || '--'}</span>
                                                <span className="text-[9px] text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    {amIHostOrOwner ? '▶ Play' : '+ Request'}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── SEARCH TAB ── */}
                        {tab === 'search' && (
                            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
                                    <FiSearch className="w-4 h-4 text-white/20 flex-shrink-0" />
                                    <input type="text" value={searchQuery}
                                        onChange={e => { setSearchQuery(e.target.value); searchSongs(e.target.value); }}
                                        placeholder={amIHostOrOwner ? 'Search songs to play...' : 'Search songs to request...'}
                                        className="flex-1 bg-transparent text-sm outline-none text-white placeholder-white/20" autoFocus />
                                    {searchQuery && <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}><FiX className="w-4 h-4 text-white/20" /></button>}
                                </div>
                                {searching && <div className="text-center py-4 text-[11px] text-white/20">Searching...</div>}
                                <div className="space-y-0.5">
                                    {searchResults.map((song, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                                            onClick={() => playSong(song)}
                                            className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-xl cursor-pointer transition-all">
                                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
                                                {song.image || song.thumbnail ?
                                                    <img src={song.image || song.thumbnail} alt="" className="w-full h-full object-cover" /> :
                                                    <div className="w-full h-full flex items-center justify-center text-lg">🎵</div>}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <FiPlay className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{song.title}</p>
                                                <p className="text-[10px] text-white/30 truncate">{song.artist}</p>
                                            </div>
                                            <span className="text-[10px] text-white/20 flex-shrink-0 hidden sm:block">{song.duration || '--'}</span>
                                            <span className="text-[9px] text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                {amIHostOrOwner ? '▶ Play' : '+ Request'}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                                {!searching && searchResults.length === 0 && searchQuery && (
                                    <div className="text-center py-8 text-white/20 text-sm">No results found</div>
                                )}
                                {!searchQuery && (
                                    <div className="text-center py-12">
                                        <FiSearch className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                        <p className="text-white/20 text-sm">Search for any song</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── QUEUE TAB ── */}
                        {tab === 'queue' && (
                            <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
                                <h3 className="text-sm font-bold text-white/50 mb-3">🎶 Song Queue</h3>
                                {(!roomState.queue || roomState.queue.length === 0) ? (
                                    <div className="text-center py-8">
                                        <FiList className="w-8 h-8 text-white/10 mx-auto mb-2" />
                                        <p className="text-white/20 text-sm">Queue is empty</p>
                                        <p className="text-[10px] text-white/10 mt-1">Songs requested by listeners will appear here</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {roomState.queue.map((q, i) => (
                                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                                                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-xs text-white/20 flex-shrink-0">{i + 1}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{q.title}</p>
                                                    <p className="text-[10px] text-white/30 truncate">
                                                        {q.artist} • by {q.requestedBy?.username || '?'}
                                                        {q.status === 'pending' && <span className="text-amber-400 ml-1">⏳ Pending</span>}
                                                    </p>
                                                </div>
                                                {amIHostOrOwner && (
                                                    <div className="flex gap-1.5 flex-shrink-0">
                                                        <button onClick={() => playSong(q)}
                                                            className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-[9px] hover:bg-pink-500/30">▶ Play</button>
                                                        {q.status === 'pending' && (
                                                            <button onClick={() => roomApproveTrack(q.id)}
                                                                className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[9px] hover:bg-emerald-500/30">✓</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                            </motion.div>
                        )}

                        {/* ── CHAT TAB ── */}
                        {tab === 'chat' && (
                            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 h-[calc(100vh-160px)]">
                                
                                {/* Left Side: Chat UI */}
                                <div className="flex-1 flex flex-col rounded-xl bg-white/[0.02] border border-white/5 relative">
                                    <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white/50">💬 Room Chat</h3>
                                    </div>
                                    <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                        {roomState.chat.length === 0 && <p className="text-xs text-white/15 text-center mt-10">No messages yet — start typing or send a GIF!</p>}
                                        {roomState.chat.map((msg, i) => (
                                            <div key={i} className="flex flex-col mb-1.5">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xs font-bold text-pink-400/80">{msg.username}</span>
                                                    <span className="text-[9px] text-white/20">{new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                {msg.isGif ? (
                                                    <img src={msg.message} alt="GIF" className="max-w-[200px] rounded-lg mt-1 border border-white/5" />
                                                ) : (
                                                    <span className="text-sm text-white/70 leading-relaxed mt-0.5">{msg.message}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-white/5 bg-[#0c0e1a]/50 relative">
                                        <AnimatePresence>
                                            {showGifPicker && (
                                                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="absolute bottom-full left-3 mb-2 p-3 bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl w-64 grid grid-cols-2 gap-2 z-10">
                                                    {GIF_PRESETS.map((url, i) => (
                                                        <button key={i} onClick={() => sendChat(url)} className="rounded-lg overflow-hidden border border-transparent hover:border-pink-500 transition-colors">
                                                            <img src={url} alt="gif" className="w-full h-20 object-cover" />
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowGifPicker(!showGifPicker)}
                                                className={`p-2.5 rounded-xl transition-colors ${showGifPicker ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                                                <FiImage className="w-4 h-4" />
                                            </button>
                                            <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && sendChat()}
                                                placeholder="Type a message..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none text-white placeholder-white/20 focus:border-pink-500/40 transition-all" />
                                            <button onClick={() => sendChat()} disabled={!chatMsg.trim()}
                                                className="px-5 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 disabled:opacity-30 transition-colors shadow-lg shadow-pink-500/20">
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Members Sidebar */}
                                <div className="hidden sm:flex w-64 flex-col rounded-xl bg-white/[0.02] border border-white/5 flex-shrink-0 relative overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/5 bg-black/20 flex-shrink-0">
                                        <h3 className="text-xs font-bold text-white/50 tracking-wider uppercase"><FiUsers className="w-3 h-3 inline mr-1.5 -mt-0.5" />Room Members — {roomState.users.length}</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                        {roomState.users.map((u, i) => (
                                            <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0 ${u.userId === roomState.hostUserId ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : u.userId === roomState.ownerUserId ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-[#1a1d2e] text-white/50 border border-white/10 group-hover:border-white/20'}`}>
                                                    {(u.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate text-white/90">
                                                        {u.username}{u.userId === user?._id ? <span className="text-white/30 font-normal ml-1">(you)</span> : ''}
                                                    </p>
                                                    <p className="text-[10px] uppercase tracking-wider mt-0.5 font-medium truncate">
                                                        {u.userId === roomState.hostUserId ? <span className="text-amber-400 flex items-center gap-1">👑 Room Host</span> : u.userId === roomState.ownerUserId ? <span className="text-indigo-400 flex items-center gap-1">🔑 Server Owner</span> : <span className="text-white/30 flex items-center gap-1">🎧 Listener</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>

            {/* Host Transfer Modal */}
            <AnimatePresence>
                {showHostTransfer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                        onClick={() => setShowHostTransfer(false)}>
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-[#1a1d2e] border border-white/10 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
                            onClick={e => e.stopPropagation()}>
                            <div className="px-4 py-3 border-b border-white/5">
                                <h3 className="text-sm font-bold">👑 Transfer Host</h3>
                                <p className="text-[10px] text-white/30 mt-0.5">Pick someone to become the new host</p>
                            </div>
                            <div className="p-2 max-h-48 overflow-y-auto">
                                {roomState.users.filter(u => u.userId !== roomState.hostUserId).map((u, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5">
                                        <span className="text-xs text-white/70">
                                            {u.username || 'User'} {u.userId === user?._id && <span className="text-white/30 ml-1">(Take Host)</span>}
                                        </span>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => transferHost(u.userId)}
                                                className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-[10px] hover:bg-amber-500/30">Make Host</button>
                                            <button onClick={() => transferAndLeave(u.userId)}
                                                className="px-2.5 py-1 bg-pink-500/20 text-pink-400 rounded-lg text-[10px] hover:bg-pink-500/30">Transfer & Leave</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-3 border-t border-white/5 flex justify-between">
                                <button onClick={() => setShowHostTransfer(false)} className="text-white/30 text-xs">Cancel</button>
                                <button onClick={() => router.push(session?.server ? `/music?serverId=${session.server._id || session.server}` : '/music')}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs hover:bg-red-500/20">Leave anyway</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
