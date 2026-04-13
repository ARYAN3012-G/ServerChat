'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor, FiPhoneOff, FiMinimize2, FiMaximize2, FiUsers, FiMoreVertical, FiVolume2, FiVolumeX, FiChevronDown } from 'react-icons/fi';
import { useVoice } from '../../../components/VoiceProvider';
import { useAuth } from '../../../hooks/useAuth';
import { useSocket } from '../../../hooks/useSocket';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function CallPage() {
    const params = useParams();
    const router = useRouter();
    const channelId = params.channelId;
    const { user } = useAuth();
    const { joinVoiceChannel, leaveVoiceChannel } = useSocket();

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
        peerStreams, adminMuteUser,
    } = voice;

    const [channelInfo, setChannelInfo] = useState(null);
    const [serverInfo, setServerInfo] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(null);
    const [spotlightUser, setSpotlightUser] = useState(null);
    const joinedRef = useRef(false);
    const timerRef = useRef(null);

    // Fetch channel and server info
    useEffect(() => {
        if (!channelId) return;
        (async () => {
            try {
                const { data } = await api.get(`/channels/${channelId}`);
                setChannelInfo(data);
                if (data.server) {
                    const { data: server } = await api.get(`/servers/${data.server._id || data.server}`);
                    setServerInfo(server);
                }
            } catch (e) {
                console.error('Failed to fetch channel info:', e);
            }
        })();
    }, [channelId]);

    // Auto-join on mount
    useEffect(() => {
        if (!channelId || joinedRef.current) return;
        joinedRef.current = true;

        const doJoin = async () => {
            await joinVoice?.(channelId);
            joinVoiceChannel?.(channelId);
        };
        // Small delay to ensure socket is ready
        const t = setTimeout(doJoin, 300);
        return () => clearTimeout(t);
    }, [channelId]);

    // Call timer
    useEffect(() => {
        if (connectedChannel) {
            setCallDuration(0);
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [connectedChannel]);

    // Auto-leave on page unload
    useEffect(() => {
        const handleUnload = () => {
            leaveVoice?.(channelId);
            leaveVoiceChannel?.(channelId);
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [channelId]);

    const handleLeave = () => {
        leaveVoice?.(channelId);
        leaveVoiceChannel?.(channelId);
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

    const isOwner = serverInfo?.owner?._id === user?._id || serverInfo?.owner === user?._id;

    // Build participant list
    const allParticipants = [
        { userId: user?._id, username: user?.username, isMe: true, isMuted, isVideoOn, isScreenSharing },
        ...(voiceUsers || []).map(u => ({ ...u, isMe: false })),
    ];

    // Determine who's being spotlighted (screen share or pinned user)
    const screenSharer = allParticipants.find(p => p.isScreenSharing && !p.isMe);
    const localScreenSharer = isScreenSharing ? allParticipants[0] : null;
    const activeSpotlight = spotlightUser || screenSharer?.userId || (localScreenSharer ? user?._id : null);

    // Grid layout based on participant count
    const participantCount = allParticipants.length;
    const getGridClass = () => {
        if (activeSpotlight) return 'grid-cols-1'; // spotlight mode
        if (participantCount <= 1) return 'grid-cols-1';
        if (participantCount === 2) return 'grid-cols-1 sm:grid-cols-2';
        if (participantCount <= 4) return 'grid-cols-2';
        if (participantCount <= 6) return 'grid-cols-2 sm:grid-cols-3';
        if (participantCount <= 9) return 'grid-cols-3';
        return 'grid-cols-3 sm:grid-cols-4';
    };

    // Video ref callback
    const createVideoRef = useCallback((stream) => (el) => {
        if (el && stream && el.srcObject !== stream) {
            el.srcObject = stream;
            el.play().catch(() => {});
        }
    }, []);

    // Render a single participant tile
    const renderParticipant = (p, isSmall = false) => {
        const stream = p.isMe ? localVideoStream : peerVideoStreams?.[p.userId];
        const screenStream = p.isMe ? localScreenStream : peerScreenStreams?.[p.userId];
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
                {/* Video */}
                {hasVideo && stream ? (
                    <video
                        ref={createVideoRef(stream)}
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

                {/* Name + Status overlay */}
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
                    <span className="text-xs text-white/40 font-mono tabular-nums">{formatTime(callDuration)}</span>
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
                {/* Video Grid */}
                <div className="flex-1 p-3 sm:p-6 overflow-y-auto flex items-center justify-center">
                    {activeSpotlight ? (
                        // Spotlight mode: one big + small sidebar
                        <div className="w-full h-full flex flex-col sm:flex-row gap-3">
                            {/* Main spotlight */}
                            <div className="flex-1 min-h-0">
                                {(() => {
                                    const p = allParticipants.find(p => p.userId === activeSpotlight);
                                    if (!p) return null;
                                    const stream = p.isMe ? (isScreenSharing ? localScreenStream : localVideoStream) : (p.isScreenSharing ? peerScreenStreams?.[p.userId] : peerVideoStreams?.[p.userId]);
                                    return (
                                        <div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-white/5 w-full h-full">
                                            {stream ? (
                                                <video ref={createVideoRef(stream)} autoPlay playsInline muted={p.isMe}
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
                            {/* Side filmstrip */}
                            <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:w-44 flex-shrink-0">
                                {allParticipants.filter(p => p.userId !== activeSpotlight).map(p => renderParticipant(p, true))}
                            </div>
                        </div>
                    ) : (
                        // Normal grid
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
                                        {/* Admin controls */}
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
                    {/* Mic */}
                    <button onClick={toggleMute}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 ring-1 ring-red-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isMuted ? <FiMicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiMic className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    {/* Camera */}
                    <button onClick={() => isVideoOn ? stopVideo?.() : startVideo?.('user')}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isVideoOn ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 ring-1 ring-emerald-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isVideoOn ? <FiVideo className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiVideoOff className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    {/* Screen Share */}
                    <button onClick={() => isScreenSharing ? stopScreenShare?.() : startScreenShare?.()}
                        className={`hidden sm:block p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isScreenSharing ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 ring-1 ring-blue-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        <FiMonitor className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {/* Switch Camera (mobile) */}
                    {isVideoOn && (
                        <button onClick={() => switchCamera?.()}
                            className="sm:hidden p-3 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><polygon points="23 19 16 12 23 5"/><path d="M16 5v14"/>
                                <path d="M7 9l3 3-3 3"/>
                            </svg>
                        </button>
                    )}

                    {/* Deafen */}
                    <button onClick={toggleDeafen}
                        className={`p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isDeafened ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 ring-1 ring-amber-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}>
                        {isDeafened ? <FiVolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <FiVolume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>

                    <div className="w-px h-8 bg-white/10 mx-1" />

                    {/* Minimize */}
                    <button onClick={handleMinimize}
                        className="p-3 sm:p-4 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all duration-200" title="Minimize — stay connected">
                        <FiMinimize2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>

                    {/* Leave */}
                    <button onClick={handleLeave}
                        className="p-3 sm:p-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-lg shadow-red-500/20">
                        <FiPhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
