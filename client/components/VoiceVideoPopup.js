'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiVideo, FiVideoOff, FiMonitor, FiX, FiMinimize2, FiMaximize2, FiPhoneOff, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Google Meet-style floating popup for voice channel video/screen share.
 * Shows a grid of all participants with their video streams.
 * Supports minimize (only your own PiP bubble) and maximize (full grid).
 */
export default function VoiceVideoPopup({
    user,
    isVideoOn,
    isScreenSharing,
    localVideoStream,
    localScreenStream,
    peerVideoStreams = {},
    peerScreenStreams = {},
    voiceUsers = [],
    isMuted,
    isDeafened,
    onToggleMute,
    onToggleDeafen,
    onStartVideo,
    onStopVideo,
    onStartScreenShare,
    onStopScreenShare,
    onSwitchCamera,
    facingMode,
    onDisconnect,
    onClose,
}) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    // Pagination config: tiles per page (mobile: 4 = 2x2, desktop: 6 = 3x2)
    const TILES_PER_PAGE_MOBILE = 4;
    const TILES_PER_PAGE_DESKTOP = 6;
    const [tilesPerPage, setTilesPerPage] = useState(TILES_PER_PAGE_DESKTOP);

    // Detect viewport for tile count
    useEffect(() => {
        const updateTiles = () => setTilesPerPage(window.innerWidth < 640 ? TILES_PER_PAGE_MOBILE : TILES_PER_PAGE_DESKTOP);
        updateTiles();
        window.addEventListener('resize', updateTiles);
        return () => window.removeEventListener('resize', updateTiles);
    }, []);

    // Build participants list
    const localParticipant = {
        id: 'local',
        username: user?.username || 'You',
        isLocal: true,
        videoStream: localVideoStream,
        screenStream: localScreenStream,
        isVideoOn,
        isScreenSharing,
    };

    const remoteParticipants = voiceUsers
        .filter(u => u.userId !== user?._id)
        .map(u => ({
            id: u.userId,
            username: u.username || 'User',
            isLocal: false,
            videoStream: peerVideoStreams[u.userId] || null,
            screenStream: peerScreenStreams[u.userId] || null,
            isVideoOn: u.isVideoOn || !!peerVideoStreams[u.userId],
            isScreenSharing: u.isScreenSharing || !!peerScreenStreams[u.userId],
            isMuted: u.isMuted,
        }));

    const allParticipants = [localParticipant, ...remoteParticipants];
    const totalWithVideo = allParticipants.length;

    // Pagination
    const totalPages = Math.max(1, Math.ceil(totalWithVideo / tilesPerPage));
    const paginatedParticipants = allParticipants.slice(
        currentPage * tilesPerPage,
        (currentPage + 1) * tilesPerPage
    );
    const currentTileCount = paginatedParticipants.length;

    // Reset page when participants change
    useEffect(() => {
        if (currentPage >= totalPages) setCurrentPage(Math.max(0, totalPages - 1));
    }, [totalPages, currentPage]);

    // Grid layout for current page
    const getGridCols = (count) => {
        if (count <= 1) return 1;
        if (count <= 4) return 2;
        return 3;
    };

    // ── Minimized floating bubble ──
    if (isMinimized) {
        return (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="fixed bottom-20 right-4 z-[140] cursor-pointer group"
                onClick={() => setIsMinimized(false)}
            >
                {/* Local video pip */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-dark-800 relative">
                    {isVideoOn && localVideoStream ? (
                        <VideoElement stream={localVideoStream} muted className="w-full h-full object-cover scale-x-[-1]" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600/30 to-purple-600/30">
                            <div className="w-12 h-12 rounded-full bg-indigo-500/60 flex items-center justify-center text-lg font-bold text-white">
                                {(user?.username || 'U')[0].toUpperCase()}
                            </div>
                        </div>
                    )}
                    {/* Status indicators */}
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                        {isMuted && <div className="bg-red-500/80 p-1 rounded-full"><FiMicOff className="w-2.5 h-2.5 text-white" /></div>}
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    {/* Expand icon on hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <FiMaximize2 className="w-6 h-6 text-white" />
                    </div>
                    {/* Participant count badge */}
                    {remoteParticipants.length > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {allParticipants.length}
                        </div>
                    )}
                </div>
                {/* Quick controls */}
                <div className="flex items-center justify-center gap-1.5 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); onToggleMute?.(); }}
                        className={`p-1.5 rounded-full transition-colors ${isMuted ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white/60'}`}>
                        {isMuted ? <FiMicOff className="w-3.5 h-3.5" /> : <FiMic className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); isVideoOn ? onStopVideo?.() : onStartVideo?.(); }}
                        className={`p-1.5 rounded-full transition-colors ${!isVideoOn ? 'bg-red-500/30 text-red-400' : 'bg-white/10 text-white/60'}`}>
                        {isVideoOn ? <FiVideo className="w-3.5 h-3.5" /> : <FiVideoOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDisconnect?.(); }}
                        className="p-1.5 rounded-full bg-red-500 text-white">
                        <FiPhoneOff className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        );
    }

    // ── Full popup ──
    const cols = getGridCols(currentTileCount);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[140] p-2 sm:p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-[#0c0e1a] border border-white/10 rounded-2xl w-full max-w-[960px] max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="text-sm font-medium text-white truncate">
                                Voice Channel — {allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''}
                            </span>
                            {isScreenSharing && (
                                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium animate-pulse shrink-0 hidden sm:inline">
                                    Sharing Screen
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setIsMinimized(true)}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Minimize">
                                <FiMinimize2 className="w-4 h-4" />
                            </button>
                            <button onClick={onClose}
                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Close">
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Video Grid with Pagination */}
                    <div className="flex-1 min-h-0 relative flex items-stretch">
                        {/* Left Arrow */}
                        {totalPages > 1 && (
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className={`absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${currentPage === 0 ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20 shadow-lg'}`}
                            >
                                <FiChevronLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                            </button>
                        )}

                        {/* Grid */}
                        <div className={`flex-1 p-2 sm:p-3 ${totalPages > 1 ? 'px-10 sm:px-14' : ''}`}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentPage}
                                    initial={{ opacity: 0, x: 30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -30 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid gap-2 sm:gap-3 h-full"
                                    style={{
                                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                        gridAutoRows: currentTileCount <= 2 ? '1fr' : 'minmax(120px, 1fr)',
                                    }}
                                >
                                    {paginatedParticipants.map((p) => (
                                        <ParticipantTile key={p.id} participant={p} />
                                    ))}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Right Arrow */}
                        {totalPages > 1 && (
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage === totalPages - 1}
                                className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${currentPage === totalPages - 1 ? 'bg-white/5 text-white/10 cursor-not-allowed' : 'bg-white/10 text-white hover:bg-white/20 shadow-lg'}`}
                            >
                                <FiChevronRight className="w-4 sm:w-5 h-4 sm:h-5" />
                            </button>
                        )}
                    </div>

                    {/* Page Indicators */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 py-2 shrink-0 border-t border-white/5">
                            <div className="flex gap-1.5">
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i)}
                                        className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'bg-indigo-400 w-5' : 'bg-white/20 hover:bg-white/40'}`}
                                    />
                                ))}
                            </div>
                            <span className="text-[10px] text-white/30 ml-2">
                                {currentPage + 1} / {totalPages}
                            </span>
                        </div>
                    )}

                    {/* Controls Bar */}
                    <div className="px-3 sm:px-5 py-3 flex items-center justify-center gap-2 sm:gap-3 border-t border-white/5 bg-dark-950/30 shrink-0 flex-wrap">
                        {/* Mic */}
                        <button onClick={onToggleMute}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isMuted ? 'Unmute' : 'Mute'}>
                            {isMuted ? <FiMicOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <FiMic className="w-4 sm:w-5 h-4 sm:h-5" />}
                        </button>

                        {/* Video */}
                        <button onClick={() => isVideoOn ? onStopVideo?.() : onStartVideo?.()}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${!isVideoOn ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isVideoOn ? 'Stop Camera' : 'Start Camera'}>
                            {isVideoOn ? <FiVideo className="w-4 sm:w-5 h-4 sm:h-5" /> : <FiVideoOff className="w-4 sm:w-5 h-4 sm:h-5" />}
                        </button>

                        {/* Screen Share */}
                        <button onClick={() => isScreenSharing ? onStopScreenShare?.() : onStartScreenShare?.()}
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full items-center justify-center transition-all hidden sm:flex ${isScreenSharing ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}>
                            <FiMonitor className="w-4 sm:w-5 h-4 sm:h-5" />
                        </button>

                        {/* Switch Camera (mobile) */}
                        {isVideoOn && (
                            <button onClick={onSwitchCamera}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex sm:hidden items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all text-xs"
                                title="Switch Camera">
                                🔄
                            </button>
                        )}

                        <div className="w-px h-6 sm:h-8 bg-white/10 mx-1" />

                        {/* Disconnect */}
                        <button onClick={onDisconnect}
                            className="w-12 h-10 sm:w-14 sm:h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            title="Disconnect">
                            <FiPhoneOff className="w-4 sm:w-5 h-4 sm:h-5" />
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Individual participant tile in the video grid.
 */
function ParticipantTile({ participant }) {
    const { username, isLocal, videoStream, screenStream, isVideoOn, isScreenSharing, isMuted } = participant;

    // Show screen share as primary if active, otherwise show camera
    const activeStream = isScreenSharing && screenStream ? screenStream : (isVideoOn && videoStream ? videoStream : null);

    return (
        <div className="relative rounded-xl overflow-hidden bg-dark-800 border border-white/5 flex items-center justify-center min-h-[120px] sm:min-h-[160px]">
            {activeStream ? (
                <VideoElement
                    stream={activeStream}
                    muted={isLocal}
                    className={`w-full h-full object-cover ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-400/30 flex items-center justify-center text-xl sm:text-2xl font-bold text-indigo-400 border-2 border-indigo-500/20">
                        {(username || 'U')[0].toUpperCase()}
                    </div>
                </div>
            )}

            {/* Name badge */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-dark-900/70 backdrop-blur-sm px-2 py-1 rounded-lg">
                {isMuted && <FiMicOff className="w-3 h-3 text-red-400" />}
                <span className="text-[11px] text-white font-medium truncate max-w-[100px]">
                    {isLocal ? 'You' : username}
                </span>
                {isScreenSharing && <span className="text-[9px] bg-red-500/30 text-red-300 px-1 rounded">Screen</span>}
            </div>

            {/* Camera PiP when screen sharing */}
            {isScreenSharing && isVideoOn && videoStream && (
                <div className="absolute top-2 right-2 w-20 sm:w-28 aspect-video rounded-lg overflow-hidden border border-white/10 shadow-lg bg-dark-800">
                    <VideoElement stream={videoStream} muted={isLocal} className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} />
                </div>
            )}
        </div>
    );
}

/**
 * Reusable video element that properly binds a MediaStream.
 */
function VideoElement({ stream, muted = false, className = '' }) {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => {});
        }
    }, [stream]);

    return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}
