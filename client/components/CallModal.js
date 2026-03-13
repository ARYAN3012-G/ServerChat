'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor, FiX, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

export default function CallModal({
    callSession,
    user,
    type = 'voice',
    callStatus = 'active',
    remoteStream,
    localStreamRef,
    screenStreamRef,
    onEnd,
    onToggleMedia,
    onStartScreenShare,
    onStopScreenShare,
}) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(type === 'video');
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const timerRef = useRef(null);

    // Start call timer once active
    useEffect(() => {
        if (callStatus === 'active' || callStatus === 'connecting') {
            timerRef.current = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerRef.current);
    }, [callStatus]);

    // Attach local stream to local video element
    useEffect(() => {
        const stream = localStreamRef?.current;
        if (localVideoRef.current && stream) {
            localVideoRef.current.srcObject = stream;
            // Explicitly play to bypass autoplay policies
            localVideoRef.current.play().catch(e => console.error("Local video play failed:", e));
        }
    }, [localStreamRef?.current, isScreenSharing]);

    // Attach remote stream
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            // Explicitly play remote stream to ensure audio works
            remoteVideoRef.current.play().catch(e => console.error("Remote video play failed:", e));
        }
    }, [remoteStream]);

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'ringing': return 'Ringing...';
            case 'connecting': return 'Connecting...';
            case 'active': return formatDuration(callDuration);
            default: return formatDuration(callDuration);
        }
    };

    const handleToggleMute = () => {
        const stream = localStreamRef?.current;
        const audio = stream?.getAudioTracks()[0];
        if (audio) {
            audio.enabled = isMuted;
            setIsMuted(!isMuted);
            onToggleMedia?.(callSession?._id, 'audio', isMuted);
        }
    };

    const handleToggleVideo = async () => {
        const stream = localStreamRef?.current;
        const video = stream?.getVideoTracks()[0];
        if (video) {
            video.enabled = !isVideoOn;
            setIsVideoOn(!isVideoOn);
            onToggleMedia?.(callSession?._id, 'video', !isVideoOn);
        } else if (!isVideoOn) {
            // No video track yet, try getting one
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newTrack = newStream.getVideoTracks()[0];
                if (stream) {
                    stream.addTrack(newTrack);
                }
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream || newStream;
                }
                setIsVideoOn(true);
                onToggleMedia?.(callSession?._id, 'video', true);
            } catch (err) {
                console.error('Could not enable video:', err);
            }
        }
    };

    const handleScreenShare = async () => {
        if (isScreenSharing) {
            await onStopScreenShare?.();
            setIsScreenSharing(false);
            // Restore local camera to PiP
            if (localVideoRef.current && localStreamRef?.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
            }
        } else {
            const screenStream = await onStartScreenShare?.();
            if (screenStream) {
                setIsScreenSharing(true);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }
            }
        }
    };

    const handleEndCall = () => {
        clearInterval(timerRef.current);
        onEnd?.(callSession?._id);
    };

    if (!callSession) return null;

    // ── Minimized floating bar ──
    if (isMinimized) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed bottom-4 right-4 z-[150] bg-gradient-to-r from-dark-800 to-dark-900 border border-white/10 rounded-2xl shadow-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-white/20 transition-colors"
                onClick={() => setIsMinimized(false)}
            >
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm text-white font-medium font-mono">{getStatusText()}</span>
                <div className="flex gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                        className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/50 hover:text-white'}`}
                    >
                        {isMuted ? <FiMicOff className="w-3.5 h-3.5" /> : <FiMic className="w-3.5 h-3.5" />}
                    </button>
                    {type === 'video' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleToggleVideo(); }}
                            className={`p-1.5 rounded-lg transition-colors ${!isVideoOn ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/50 hover:text-white'}`}
                        >
                            {isVideoOn ? <FiVideo className="w-3.5 h-3.5" /> : <FiVideoOff className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEndCall(); }}
                        className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                        <FiPhoneOff className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Full call modal ──
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[150]"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-[#0c0e1a] border border-white/10 rounded-2xl w-[720px] max-h-[85vh] overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full animate-pulse ${callStatus === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            <span className="text-sm font-medium text-white">
                                {type === 'video' ? 'Video Call' : 'Voice Call'} — {getStatusText()}
                            </span>
                            {isScreenSharing && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
                                    Screen Sharing
                                </span>
                            )}
                            {callStatus === 'ringing' && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                                    Ringing
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            >
                                <FiMinimize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Video Area */}
                    <div className="relative w-full aspect-video bg-dark-950">
                        {/* Remote Video (main) */}
                        <div className="w-full h-full flex items-center justify-center">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className={`w-full h-full object-cover ${!remoteStream ? 'hidden' : ''}`}
                            />
                            {!remoteStream && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/30 to-silver-400/30 flex items-center justify-center text-3xl font-bold text-indigo-400 mb-4 border-2 border-indigo-500/20">
                                        {(callSession.participants?.[0]?.user?.username || 'U')[0].toUpperCase()}
                                    </div>
                                    <p className="text-white/50 text-sm">
                                        {callStatus === 'ringing' ? 'Calling...' : callStatus === 'connecting' ? 'Connecting...' : type === 'video' ? 'Waiting for video...' : 'Voice call in progress'}
                                    </p>
                                    {(callStatus === 'ringing' || callStatus === 'connecting') && (
                                        <div className="flex gap-1 mt-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '200ms' }} />
                                            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '400ms' }} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Local Video (draggable PiP) */}
                        <motion.div
                            drag
                            dragConstraints={{ top: -200, bottom: 200, left: -400, right: 0 }}
                            className="absolute bottom-4 right-4 w-40 aspect-video rounded-xl overflow-hidden border-2 border-white/10 shadow-xl bg-dark-800 cursor-move"
                        >
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${!isVideoOn && !isScreenSharing ? 'hidden' : ''}`}
                            />
                            {!isVideoOn && !isScreenSharing && (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/60 flex items-center justify-center text-sm font-bold">
                                        {(user?.username || 'U')[0].toUpperCase()}
                                    </div>
                                </div>
                            )}
                            <div className="absolute bottom-1 left-1 flex gap-1">
                                {isMuted && <div className="bg-red-500/80 rounded px-1 py-0.5 text-[8px] text-white">MUTED</div>}
                                {isScreenSharing && <div className="bg-indigo-500/80 rounded px-1 py-0.5 text-[8px] text-white">SCREEN</div>}
                            </div>
                        </motion.div>
                    </div>

                    {/* Controls */}
                    <div className="px-5 py-4 flex items-center justify-center gap-3 border-t border-white/5 bg-dark-950/30">
                        <button
                            onClick={handleToggleMute}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <FiMicOff className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={handleToggleVideo}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${!isVideoOn ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                        >
                            {isVideoOn ? <FiVideo className="w-5 h-5" /> : <FiVideoOff className="w-5 h-5" />}
                        </button>

                        <button
                            onClick={handleScreenShare}
                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                        >
                            <FiMonitor className="w-5 h-5" />
                        </button>

                        <div className="w-px h-8 bg-white/10 mx-2" />

                        <button
                            onClick={handleEndCall}
                            className="w-14 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            title="End call"
                        >
                            <FiPhoneOff className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
