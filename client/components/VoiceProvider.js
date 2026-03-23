'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '../services/socket';
import toast from 'react-hot-toast';

const VoiceContext = createContext(null);

export function useVoice() {
    return useContext(VoiceContext);
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

export default function VoiceProvider({ children }) {
    const peersRef = useRef({});
    const localStreamRef = useRef(null);
    const channelIdRef = useRef(null);
    const videoTrackRef = useRef(null);
    const screenTrackRef = useRef(null);

    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [connectedChannel, setConnectedChannel] = useState(null);
    const [peerStreams, setPeerStreams] = useState({});
    const [voiceUsers, setVoiceUsers] = useState([]);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [peerVideoStreams, setPeerVideoStreams] = useState({});
    const [peerScreenStreams, setPeerScreenStreams] = useState({});
    const [localVideoStream, setLocalVideoStream] = useState(null);
    const [localScreenStream, setLocalScreenStream] = useState(null);
    const [facingMode, setFacingMode] = useState('user');

    // Get local audio stream
    const getLocalAudio = useCallback(async () => {
        if (localStreamRef.current) {
            const tracks = localStreamRef.current.getAudioTracks();
            if (tracks.length > 0 && tracks.some(t => t.readyState === 'live')) {
                return localStreamRef.current;
            }
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error('[VoiceProvider] Failed to get audio:', err);
            return null;
        }
    }, []);

    // Create a peer connection for a specific user
    const createPeer = useCallback((targetUserId, targetSocketId, isInitiator) => {
        const socket = getSocket();
        if (!socket) return null;

        console.log(`[VoiceProvider] Creating peer for ${targetUserId} (initiator=${isInitiator})`);

        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('voice:ice-candidate', {
                    targetSocketId,
                    candidate: event.candidate,
                    channelId: channelIdRef.current,
                });
            }
        };

        pc.ontrack = (event) => {
            const track = event.track;
            console.log(`[VoiceProvider] Got remote track from ${targetUserId}: ${track.kind}`);

            if (track.kind === 'audio') {
                const remoteStream = event.streams[0] || new MediaStream([track]);
                setPeerStreams(prev => ({ ...prev, [targetUserId]: remoteStream }));
            } else if (track.kind === 'video') {
                const videoStream = new MediaStream([track]);
                // Check transceiver metadata to distinguish video from screen
                const transceiver = pc.getTransceivers().find(t => t.receiver.track === track);
                const mid = transceiver?.mid;
                // We'll use a convention: even mid = camera, odd mid = screen
                // But simpler: just use peerVideoStreams for all video from peers
                setPeerVideoStreams(prev => ({ ...prev, [targetUserId]: videoStream }));
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[VoiceProvider] ICE state for ${targetUserId}:`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                removePeer(targetUserId);
            }
        };

        // Add local audio tracks
        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }

        // If we have a video track active, add it
        if (videoTrackRef.current) {
            const videoStream = new MediaStream([videoTrackRef.current]);
            pc.addTrack(videoTrackRef.current, videoStream);
        }

        // If we have a screen track active, add it
        if (screenTrackRef.current) {
            const screenStream = new MediaStream([screenTrackRef.current]);
            pc.addTrack(screenTrackRef.current, screenStream);
        }

        peersRef.current[targetUserId] = { pc, socketId: targetSocketId };
        return pc;
    }, []);

    const removePeer = useCallback((userId) => {
        const peer = peersRef.current[userId];
        if (peer) {
            peer.pc.close();
            delete peersRef.current[userId];
        }
        setPeerStreams(prev => { const next = { ...prev }; delete next[userId]; return next; });
        setPeerVideoStreams(prev => { const next = { ...prev }; delete next[userId]; return next; });
        setPeerScreenStreams(prev => { const next = { ...prev }; delete next[userId]; return next; });
        setVoiceUsers(prev => prev.filter(u => u.userId !== userId));
    }, []);

    // Join a voice channel
    const joinVoice = useCallback(async (channelId) => {
        const socket = getSocket();
        if (!socket) return;

        const stream = await getLocalAudio();
        if (!stream) {
            console.error('[VoiceProvider] No audio stream available');
            return;
        }

        channelIdRef.current = channelId;
        setConnectedChannel(channelId);
        socket.emit('voice:join', { channelId });
    }, [getLocalAudio]);

    // Leave voice channel
    const leaveVoice = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('voice:leave', { channelId: channelId || channelIdRef.current });
        }

        Object.keys(peersRef.current).forEach(userId => {
            peersRef.current[userId].pc.close();
        });
        peersRef.current = {};
        setPeerStreams({});
        setPeerVideoStreams({});
        setPeerScreenStreams({});
        setVoiceUsers([]);

        // Stop local media
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        if (videoTrackRef.current) { videoTrackRef.current.stop(); videoTrackRef.current = null; }
        if (screenTrackRef.current) { screenTrackRef.current.stop(); screenTrackRef.current = null; }
        setLocalVideoStream(null);
        setLocalScreenStream(null);
        setIsVideoOn(false);
        setIsScreenSharing(false);

        channelIdRef.current = null;
        setConnectedChannel(null);
        setIsMuted(false);
        setIsDeafened(false);
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newMuted = !prev;
            localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
            // Broadcast state to peers
            const socket = getSocket();
            if (socket) socket.emit('voice:user-state', { channelId: channelIdRef.current, isMuted: newMuted });
            return newMuted;
        });
    }, []);

    // Toggle deafen
    const toggleDeafen = useCallback(() => {
        setIsDeafened(prev => {
            const newDeafened = !prev;
            document.querySelectorAll('.voice-remote-audio').forEach(el => {
                el.muted = newDeafened;
            });
            return newDeafened;
        });
    }, []);

    // Renegotiate with all peers (needed after adding tracks)
    const renegotiateAll = useCallback(async () => {
        const socket = getSocket();
        if (!socket) return;
        for (const [userId, { pc, socketId }] of Object.entries(peersRef.current)) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('voice:offer', {
                    targetSocketId: socketId,
                    offer,
                    channelId: channelIdRef.current,
                });
            } catch (err) {
                console.error(`[VoiceProvider] Renegotiation error for ${userId}:`, err);
            }
        }
    }, []);

    // Start video (camera)
    const startVideo = useCallback(async (facing = 'user') => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } }
            });
            const videoTrack = stream.getVideoTracks()[0];
            videoTrackRef.current = videoTrack;
            setLocalVideoStream(stream);
            setIsVideoOn(true);
            setFacingMode(facing);

            // Add track to all existing peer connections
            Object.values(peersRef.current).forEach(({ pc }) => {
                const existingSenders = pc.getSenders();
                const videoSender = existingSenders.find(s => s.track?.kind === 'video' && !s._isScreen);
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                } else {
                    const sender = pc.addTrack(videoTrack, stream);
                    sender._isScreen = false;
                }
            });

            // Notify peers
            const socket = getSocket();
            if (socket) socket.emit('voice:user-state', { channelId: channelIdRef.current, isVideoOn: true });

            // Renegotiate with all peers
            await renegotiateAll();
        } catch (err) {
            console.error('[VoiceProvider] Video error:', err);
            if (err.name === 'NotAllowedError') {
                toast.error('Camera access denied. Please check permissions.');
            } else if (err.name === 'NotFoundError') {
                toast.error('No camera found on this device.');
            } else {
                toast.error('Failed to start camera.');
            }
        }
    }, [renegotiateAll]);

    // Stop video
    const stopVideo = useCallback(() => {
        if (videoTrackRef.current) {
            videoTrackRef.current.stop();
            // Remove track from peer connections
            Object.values(peersRef.current).forEach(({ pc }) => {
                const senders = pc.getSenders();
                const videoSender = senders.find(s => s.track === videoTrackRef.current);
                if (videoSender) pc.removeTrack(videoSender);
            });
            videoTrackRef.current = null;
        }
        setLocalVideoStream(null);
        setIsVideoOn(false);
        const socket = getSocket();
        if (socket) socket.emit('voice:user-state', { channelId: channelIdRef.current, isVideoOn: false });
    }, []);

    // Switch camera (front/back)
    const switchCamera = useCallback(async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user';
        if (isVideoOn) {
            // Stop current video track
            if (videoTrackRef.current) videoTrackRef.current.stop();
            // Get new camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } }
                });
                const newTrack = stream.getVideoTracks()[0];
                videoTrackRef.current = newTrack;
                setLocalVideoStream(stream);
                setFacingMode(newFacing);

                // Replace track in all peer connections
                Object.values(peersRef.current).forEach(({ pc }) => {
                    const senders = pc.getSenders();
                    const videoSender = senders.find(s => s.track?.kind === 'video' && !s._isScreen);
                    if (videoSender) videoSender.replaceTrack(newTrack);
                });
            } catch (err) {
                console.error('[VoiceProvider] Camera switch error:', err);
                toast.error('Failed to switch camera.');
            }
        }
        setFacingMode(newFacing);
    }, [facingMode, isVideoOn]);

    // Start screen sharing
    const startScreenShare = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                toast.error('Screen sharing is not supported on this browser/device.');
                return;
            }
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = stream.getVideoTracks()[0];
            screenTrackRef.current = screenTrack;
            setLocalScreenStream(stream);
            setIsScreenSharing(true);

            // Auto-stop when user ends share from browser UI
            screenTrack.onended = () => {
                stopScreenShare();
            };

            // Add to all peer connections
            Object.values(peersRef.current).forEach(({ pc }) => {
                const sender = pc.addTrack(screenTrack, stream);
                sender._isScreen = true;
            });

            const socket = getSocket();
            if (socket) socket.emit('voice:user-state', { channelId: channelIdRef.current, isScreenSharing: true });

            await renegotiateAll();
        } catch (err) {
            console.error('[VoiceProvider] Screen share error:', err);
            if (err.name === 'NotAllowedError') {
                toast.error('Screen share permission denied.');
            } else {
                toast.error('Failed to start screen share.');
            }
        }
    }, [renegotiateAll]);

    // Stop screen sharing
    const stopScreenShare = useCallback(() => {
        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            Object.values(peersRef.current).forEach(({ pc }) => {
                const senders = pc.getSenders();
                const screenSender = senders.find(s => s.track === screenTrackRef.current);
                if (screenSender) pc.removeTrack(screenSender);
            });
            screenTrackRef.current = null;
        }
        setLocalScreenStream(null);
        setIsScreenSharing(false);
        const socket = getSocket();
        if (socket) socket.emit('voice:user-state', { channelId: channelIdRef.current, isScreenSharing: false });
    }, []);



    // Socket event handlers
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleExistingUsers = async ({ channelId, users }) => {
            console.log(`[VoiceProvider] Existing users in ${channelId}:`, users.length);
            // Track users for UI
            setVoiceUsers(prev => {
                const existing = [...prev];
                users.forEach(u => {
                    if (!existing.find(e => e.userId === u.userId)) {
                        existing.push({ userId: u.userId, username: u.username, isMuted: false, isVideoOn: false, isScreenSharing: false });
                    }
                });
                return existing;
            });

            for (const u of users) {
                const pc = createPeer(u.userId, u.socketId, true);
                if (!pc) continue;

                try {
                    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                    await pc.setLocalDescription(offer);
                    socket.emit('voice:offer', {
                        targetSocketId: u.socketId,
                        offer,
                        channelId,
                    });
                } catch (err) {
                    console.error(`[VoiceProvider] Error creating offer for ${u.userId}:`, err);
                }
            }
        };

        const handleUserJoined = ({ userId, username, socketId }) => {
            if (!channelIdRef.current) return;
            console.log(`[VoiceProvider] User joined: ${username} (${userId})`);
            setVoiceUsers(prev => {
                if (prev.find(u => u.userId === userId)) return prev;
                return [...prev, { userId, username, isMuted: false, isVideoOn: false, isScreenSharing: false }];
            });
        };

        const handleVoiceOffer = async ({ offer, from, fromSocketId, channelId }) => {
            console.log(`[VoiceProvider] Received offer from ${from}`);
            const pc = createPeer(from, fromSocketId, false);
            if (!pc) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('voice:answer', {
                    targetSocketId: fromSocketId,
                    answer,
                    channelId,
                });
            } catch (err) {
                console.error(`[VoiceProvider] Error handling offer from ${from}:`, err);
            }
        };

        const handleVoiceAnswer = async ({ answer, from }) => {
            console.log(`[VoiceProvider] Received answer from ${from}`);
            const peer = peersRef.current[from];
            if (peer && peer.pc.signalingState !== 'stable') {
                try {
                    await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (err) {
                    console.error(`[VoiceProvider] Error setting answer from ${from}:`, err);
                }
            }
        };

        const handleIceCandidate = async ({ candidate, from }) => {
            const peer = peersRef.current[from];
            if (peer && candidate) {
                try {
                    await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    // Ignore late ICE candidates
                }
            }
        };

        const handlePeerLeft = ({ userId }) => {
            console.log(`[VoiceProvider] Peer left: ${userId}`);
            removePeer(userId);
        };

        // Handle peer state changes (mute/video/screen)
        const handleUserState = ({ userId, isMuted: muted, isVideoOn: video, isScreenSharing: screen }) => {
            setVoiceUsers(prev => prev.map(u => {
                if (u.userId !== userId) return u;
                const updates = {};
                if (muted !== undefined) updates.isMuted = muted;
                if (video !== undefined) updates.isVideoOn = video;
                if (screen !== undefined) updates.isScreenSharing = screen;
                return { ...u, ...updates };
            }));
        };

        socket.on('voice:existing-users', handleExistingUsers);
        socket.on('voice:user-joined', handleUserJoined);
        socket.on('voice:offer', handleVoiceOffer);
        socket.on('voice:answer', handleVoiceAnswer);
        socket.on('voice:ice-candidate', handleIceCandidate);
        socket.on('voice:peer-left', handlePeerLeft);
        socket.on('voice:user-state', handleUserState);

        return () => {
            socket.off('voice:existing-users', handleExistingUsers);
            socket.off('voice:user-joined', handleUserJoined);
            socket.off('voice:offer', handleVoiceOffer);
            socket.off('voice:answer', handleVoiceAnswer);
            socket.off('voice:ice-candidate', handleIceCandidate);
            socket.off('voice:peer-left', handlePeerLeft);
            socket.off('voice:user-state', handleUserState);
        };
    }, [createPeer, removePeer]);

    // Render hidden audio elements for all peer streams
    const audioElements = Object.entries(peerStreams).map(([userId, stream]) => (
        <audio
            key={userId}
            className="voice-remote-audio"
            autoPlay
            playsInline
            ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
            muted={isDeafened}
        />
    ));

    const value = {
        joinVoice,
        leaveVoice,
        toggleMute,
        toggleDeafen,
        isMuted,
        isDeafened,
        connectedChannel,
        peerStreams,
        voiceUsers,
        // Video
        isVideoOn,
        localVideoStream,
        peerVideoStreams,
        startVideo,
        stopVideo,
        switchCamera,
        facingMode,
        // Screen sharing
        isScreenSharing,
        localScreenStream,
        peerScreenStreams,
        startScreenShare,
        stopScreenShare,
    };

    return (
        <VoiceContext.Provider value={value}>
            {children}
            {audioElements}
        </VoiceContext.Provider>
    );
}
