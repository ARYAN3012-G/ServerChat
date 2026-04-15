'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor, FiPhoneOff, FiMinimize2, FiUsers, FiMoreVertical, FiVolume2, FiVolumeX, FiUserPlus, FiCheck, FiX } from 'react-icons/fi';
import { useVoice } from '../../../components/VoiceProvider';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function CallPage() {
    const params = useParams();
    const router = useRouter();
    const channelId = params.channelId;
    const { user } = useAuth();

    const voice = useVoice() || {};
    const {
        joinVoice, leaveVoice,
        toggleMute, toggleDeafen,
        isMuted, isDeafened,
        connectedChannel, voiceUsers,
        isVideoOn, localVideoStream, peerVideoStreams,
        startVideo, stopVideo, switchCamera, facingMode,
        isScreenSharing, localScreenStream, peerScreenStreams,
        startScreenShare, stopScreenShare,
        peerStreams, adminMuteUser, sendCallInvite,
    } = voice;

    const [channelInfo, setChannelInfo] = useState(null);
    const [serverInfo, setServerInfo] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(null);
    const [spotlightUser, setSpotlightUser] = useState(null);
    const [showAddPeople, setShowAddPeople] = useState(false);
    const [addPeopleSelected, setAddPeopleSelected] = useState([]);
    const joinedRef = useRef(false);
    const timerRef = useRef(null);
    const videoRefs = useRef({}); // { userId: HTMLVideoElement }

    // Fetch channel and server info
    useEffect(() => {
        if (!channelId) return;
        (async () => {
            try {
                const { data } = await api.get(`/channels/${channelId}`);
                // API returns { channel: {...} }
                const ch = data.channel || data;
                setChannelInfo(ch);
                if (ch.server) {
                    const serverId = ch.server._id || ch.server;
                    const { data: srv } = await api.get(`/servers/${serverId}`);
                    setServerInfo(srv);
                }
            } catch (e) {
                console.error('Failed to fetch channel info:', e);
            }
        })();
    }, [channelId]);

    // Auto-join: wait for user to be ready, then joinVoice
    useEffect(() => {
        if (!channelId || joinedRef.current) return;
        if (!user?._id) return; // Wait for auth to hydrate
        if (connectedChannel === channelId) {
            joinedRef.current = true;
            return;
        }
        joinedRef.current = true;
        const t = setTimeout(async () => {
            console.log('[CallPage] Joining:', channelId, 'as', user._id);
            await joinVoice?.(channelId);
        }, 600);
        return () => clearTimeout(t);
    }, [channelId, user?._id]); // Re-run when user hydrates

    // Call timer
    useEffect(() => {
        if (connectedChannel === channelId) {
            setCallDuration(0);
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [connectedChannel, channelId]);

    // Auto-leave on page unload (tab close)
    useEffect(() => {
        const handleUnload = () => {
            leaveVoice?.(channelId);
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [channelId]);

    const handleLeave = () => {
        leaveVoice?.(channelId);
        joinedRef.current = false;
        router.push('/channels');
    };

    const handleMinimize = () => {
        // Go back to channels — voice stays connected via VoiceProvider
        router.push('/channels');
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const isOwner = serverInfo?.owner?._id === user?._id ||
        serverInfo?.owner === user?._id ||
        serverInfo?.members?.find(m => m.user?._id === user?._id || m.user === user?._id)?.role === 'owner';

    // Document title
    useEffect(() => {
        if (channelInfo?.name && serverInfo?.name) {
            document.title = `${channelInfo.name} — ${serverInfo.name} | Voice`;
        } else if (channelInfo?.name) {
            document.title = `${channelInfo.name} | Voice`;
        }
        return () => { document.title = 'ServerChat'; };
    }, [channelInfo?.name, serverInfo?.name]);

    // Build participant list
    const allParticipants = [
        { userId: user?._id, username: user?.username, isMe: true, isMuted, isVideoOn, isScreenSharing },
        ...(voiceUsers || []).map(u => ({ ...u, isMe: false })),
    ];

    // Determine who's being spotlighted
    const screenSharer = allParticipants.find(p => p.isScreenSharing && !p.isMe);
    const localScreenSharer = isScreenSharing ? allParticipants[0] : null;
    const activeSpotlight = spotlightUser || screenSharer?.userId || (localScreenSharer ? user?._id : null);

    // Grid layout
    const participantCount = allParticipants.length;
    const getGridClass = () => {
        if (activeSpotlight) return 'grid-cols-1';
        if (participantCount <= 1) return 'grid-cols-1';
        if (participantCount === 2) return 'grid-cols-1 sm:grid-cols-2';
        if (participantCount <= 4) return 'grid-cols-2';
        if (participantCount <= 6) return 'grid-cols-2 sm:grid-cols-3';
        if (participantCount <= 9) return 'grid-cols-3';
        return 'grid-cols-3 sm:grid-cols-4';
    };

    // Attach stream to video element reliably
    const attachVideoRef = useCallback((userId, forceScreen = false) => (el) => {
        if (!el) return;
        const participant = allParticipants.find(p => p.userId === userId);
        const isMe = participant?.isMe;
        let stream;
        if (forceScreen || participant?.isScreenSharing) {
            stream = isMe ? localScreenStream : peerScreenStreams?.[userId];
        }
        if (!stream) {
            stream = isMe ? localVideoStream : peerVideoStreams?.[userId];
        }
        if (stream && el.srcObject !== stream) {
            el.srcObject = stream;
            el.play().catch(() => {});
        }
    }, [localVideoStream, localScreenStream, peerVideoStreams, peerScreenStreams]); // eslint-disable-line

    // Render a single participant tile
    const renderParticipant = (p, isSmall = false) => {
        const stream = p.isMe ? localVideoStream : peerVideoStreams?.[p.userId];
        const hasVideo = p.isMe ? isVideoOn : p.isVideoOn;
        const hasMuted = p.isMe ? isMuted : p.isMuted;

        return (
            <motion.div
                key={p.userId}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => !isSmall && setSpotlightUser(spotlightUser === p.userId ? null : p.userId)}
                className={`relative rounded-2xl overflow-hidden bg-dark-800 border border-white/5 cursor-pointer hover:border-white/15 transition-all group ${isSmall ? 'w-40 h-28 flex-shrink-0' : 'w-full aspect-video'}`}
            >
                {hasVideo ? (
                    <video
                        ref={attachVideoRef(p.userId)}
                        autoPlay
                        playsInline
                        muted={p.isMe}
                        className={`w-full h-full object-cover ${p.isMe ? 'scale-x-[-1]' : ''}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
                        <div className={`rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg ${isSmall ? 'w-12 h-12 text-lg' : 'w-20 h-20 text-3xl'}`}>
                            {(p.username || 'U')[0].toUpperCase()}
                        </div>
                    </div>
                )}

                {/* Name + Status */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-end justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className={`font-medium truncate ${isSmall ? 'text-[10px]' : 'text-xs'} text-white`}>
                            {p.username}{p.isMe && ' (You)'}
                        </span>
                        {hasMuted && <FiMicOff className={`text-red-400 ${isSmall ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />}
                    </div>
                    {/* Admin controls */}
                    {isOwner && !p.isMe && !isSmall && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowAdminMenu(showAdminMenu === p.userId ? null : p.userId); }}
                                className="p-1 rounded-lg bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-colors"
                            >
                                <FiMoreVertical className="w-3.5 h-3.5" />
                            </button>
                            <AnimatePresence>
                                {showAdminMenu === p.userId && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="absolute bottom-8 right-0 bg-dark-800 border border-white/10 rounded-xl shadow-2xl py-1 w-40 z-50"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            onClick={() => { adminMuteUser?.(p.userId, 'audio'); setShowAdminMenu(null); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <FiMicOff className="w-3.5 h-3.5 text-red-400" /> Mute Mic
                                        </button>
                                        <button
                                            onClick={() => { adminMuteUser?.(p.userId, 'video'); setShowAdminMenu(null); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            <FiVideoOff className="w-3.5 h-3.5 text-orange-400" /> Turn Off Camera
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Speaking indicator */}
                {!hasMuted && (
                    <div className="absolute top-2 left-2 flex gap-[2px]">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-[3px] bg-emerald-400 rounded-full animate-pulse"
                                style={{ height: `${6 + Math.random() * 8}px`, animationDelay: `${i * 150}ms` }} />
                        ))}
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="fixed inset-0 bg-dark-950 z-[100] flex flex-col" onClick={() => { setShowAdminMenu(null); setShowParticipants(false); }}>
            {/* Top Bar */}
            <div className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-white/5 flex-shrink-0 bg-dark-900/50 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <FiVolume2 className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-white truncate">{channelInfo?.name || 'Voice Channel'}</h1>
                        <p className="text-[10px] text-white/30">{serverInfo?.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {connectedChannel === channelId && (
                        <span className="text-xs text-emerald-400 font-mono tabular-nums">{formatTime(callDuration)}</span>
                    )}
                    {!connectedChannel && (
                        <span className="text-xs text-amber-400 animate-pulse">Connecting...</span>
                    )}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5">
                        <FiUsers className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/60">{allParticipants.length}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowParticipants(!showParticipants); }}
                        className={`p-2 rounded-lg transition-colors ${showParticipants ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                        <FiUsers className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 p-3 sm:p-6 overflow-y-auto flex items-center justify-center">
                    {activeSpotlight ? (
                        <div className="w-full h-full flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 min-h-0">
                                {(() => {
                                    const p = allParticipants.find(p => p.userId === activeSpotlight);
                                    if (!p) return null;
                                    const isSharing = p.isMe ? isScreenSharing : p.isScreenSharing;
                                    const stream = p.isMe ? (isScreenSharing ? localScreenStream : localVideoStream) : (p.isScreenSharing ? peerScreenStreams?.[p.userId] : peerVideoStreams?.[p.userId]);
                                    return (
                                        <div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-white/5 w-full h-full">
                                            {stream ? (
                                                <video ref={attachVideoRef(p.userId, isSharing)} autoPlay playsInline muted={p.isMe}
                                                    className={`w-full h-full object-contain bg-black ${p.isMe && !p.isScreenSharing ? 'scale-x-[-1]' : ''}`} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl font-bold text-white">
                                                        {(p.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-end justify-between">
                                                <span className="text-sm font-medium text-white">{p.username}{p.isMe && ' (You)'}{p.isScreenSharing && ' — Screen'}</span>
                                                {p.isMuted && <FiMicOff className="w-4 h-4 text-red-400" />}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:w-44 flex-shrink-0">
                                {allParticipants.filter(p => p.userId !== activeSpotlight).map(p => renderParticipant(p, true))}
                            </div>
                        </div>
                    ) : (
                        <div className={`grid ${getGridClass()} gap-3 w-full max-w-5xl mx-auto`}>
                            <AnimatePresence mode="popLayout">
                                {allParticipants.map(p => renderParticipant(p))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Participants Panel */}
                <AnimatePresence>
                    {showParticipants && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-l border-white/5 bg-dark-900/80 backdrop-blur-xl overflow-hidden flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-white/5">
                                <h3 className="text-sm font-bold text-white">Participants ({allParticipants.length})</h3>
                            </div>
                            <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
                                {allParticipants.map(p => (
                                    <div key={p.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
                                        <div className="relative flex-shrink-0">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                                                {(p.username || 'U')[0].toUpperCase()}
                                            </div>
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-900 ${p.isMuted ? 'bg-red-500' : 'bg-emerald-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate">{p.username}{p.isMe && ' (You)'}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                {p.isMuted && <FiMicOff className="w-2.5 h-2.5 text-red-400" />}
                                                {p.isVideoOn && <FiVideo className="w-2.5 h-2.5 text-emerald-400" />}
                                                {p.isScreenSharing && <FiMonitor className="w-2.5 h-2.5 text-blue-400" />}
                                            </div>
                                        </div>
                                        {isOwner && !p.isMe && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => adminMuteUser?.(p.userId, 'audio')}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors" title="Mute mic">
                                                    <FiMicOff className="w-3 h-3" />
                                                </button>
                                                <button onClick={() => adminMuteUser?.(p.userId, 'video')}
                                                    className="p-1.5 rounded-lg hover:bg-orange-500/20 text-white/30 hover:text-orange-400 transition-colors" title="Turn off camera">
                                                    <FiVideoOff className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Toolbar */}
            <div className="h-20 sm:h-24 flex items-center justify-center px-4 border-t border-white/5 bg-dark-900/50 backdrop-blur-xl flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button onClick={toggleMute}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isMuted ? <FiMicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiMic className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    <button onClick={() => isVideoOn ? stopVideo?.() : startVideo?.('user')}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isVideoOn ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isVideoOn ? <FiVideo className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiVideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    <button onClick={() => isScreenSharing ? stopScreenShare?.() : startScreenShare?.()}
                        className={`hidden sm:block p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isScreenSharing ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ring-1 ring-blue-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        <FiMonitor className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {isVideoOn && (
                        <button onClick={() => switchCamera?.()}
                            className="sm:hidden p-3 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all">
                            🔄
                        </button>
                    )}

                    <button onClick={toggleDeafen}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isDeafened ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 ring-1 ring-amber-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isDeafened ? <FiVolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiVolume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    <button onClick={(e) => { e.stopPropagation(); setShowAddPeople(true); }}
                        className="p-3 sm:p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all duration-200" title="Add People">
                        <FiUserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <div className="w-px h-8 bg-white/10 mx-1" />

                    <button onClick={handleMinimize}
                        className="p-3 sm:p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all duration-200" title="Minimize — stay connected">
                        <FiMinimize2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    <button onClick={handleLeave}
                        className="p-3 sm:p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-lg shadow-red-500/20">
                        <FiPhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>

            {/* Add People Modal */}
            <AnimatePresence>
                {showAddPeople && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110]"
                        onClick={() => { setShowAddPeople(false); setAddPeopleSelected([]); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-[400px] mx-4 overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                        <FiUserPlus className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Add People</h2>
                                        <p className="text-xs text-white/40">Invite members to join this call</p>
                                    </div>
                                </div>
                                <button onClick={() => { setShowAddPeople(false); setAddPeopleSelected([]); }}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                    <FiX className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                                {(serverInfo?.members || []).filter(m => {
                                    const mId = m.user?._id || m.user;
                                    // Exclude yourself and people already in the call
                                    return mId !== user?._id && !allParticipants.find(p => p.userId === mId);
                                }).map((m, i) => {
                                    const mId = m.user?._id || m.user;
                                    const mName = m.user?.username || 'User';
                                    const isSelected = addPeopleSelected.includes(mId);
                                    return (
                                        <div key={mId || i}
                                            onClick={() => setAddPeopleSelected(prev => isSelected ? prev.filter(id => id !== mId) : [...prev, mId])}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/10 border border-indigo-500/30' : 'border border-transparent hover:bg-white/5'}`}
                                        >
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-indigo-500/60 flex items-center justify-center text-sm font-bold">
                                                {mName[0].toUpperCase()}
                                            </div>
                                            <span className="text-sm text-white/80 flex-1">{mName}</span>
                                        </div>
                                    );
                                })}
                                {(serverInfo?.members || []).filter(m => {
                                    const mId = m.user?._id || m.user;
                                    return mId !== user?._id && !allParticipants.find(p => p.userId === mId);
                                }).length === 0 && (
                                    <p className="text-center text-white/30 text-sm py-6">Everyone is already in the call</p>
                                )}
                            </div>
                            <div className="p-4 border-t border-white/5 flex gap-2">
                                <button onClick={() => { setShowAddPeople(false); setAddPeopleSelected([]); }}
                                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
                                <button
                                    disabled={addPeopleSelected.length === 0}
                                    onClick={() => {
                                        sendCallInvite?.(channelId, addPeopleSelected, 'voice');
                                        toast.success(`Invited ${addPeopleSelected.length} member${addPeopleSelected.length > 1 ? 's' : ''}`);
                                        setShowAddPeople(false);
                                        setAddPeopleSelected([]);
                                    }}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${addPeopleSelected.length > 0 ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                                >
                                    <FiUserPlus className="w-4 h-4" />
                                    Invite{addPeopleSelected.length > 0 ? ` (${addPeopleSelected.length})` : ''}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
