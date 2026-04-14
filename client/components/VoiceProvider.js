'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
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
        { urls: 'stun:stun2.l.google.com:19302' },
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
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

export default function VoiceProvider({ children }) {
    const peersRef = useRef({});       // { userId: { pc, socketId } }
    const localStreamRef = useRef(null);
    const channelIdRef = useRef(null);
    const videoTrackRef = useRef(null);
    const screenTrackRef = useRef(null);
    const myUserIdRef = useRef(null);

    // Use a ref for user._id to avoid stale closures in socket handlers
    const userIdRef = useRef(null);
    const user = useSelector(state => state.auth.user);

    useEffect(() => {
        if (user?._id) {
            userIdRef.current = user._id;
            myUserIdRef.current = user._id;
        }
    }, [user?._id]);

    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [connectedChannel, setConnectedChannel] = useState(null);
    const [peerStreams, setPeerStreams] = useState({});       // audio streams
    const [voiceUsers, setVoiceUsers] = useState([]);
    const [isVideoOn, setIsVideoOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [peerVideoStreams, setPeerVideoStreams] = useState({});
    const [peerScreenStreams, setPeerScreenStreams] = useState({});
    const [localVideoStream, setLocalVideoStream] = useState(null);
    const [localScreenStream, setLocalScreenStream] = useState(null);
    const [facingMode, setFacingMode] = useState('user');
    const [callInvite, setCallInvite] = useState(null);
    const callInviteTimeoutRef = useRef(null);

    // Get local audio stream (retry on failure)
    const getLocalAudio = useCallback(async () => {
        if (localStreamRef.current) {
            const tracks = localStreamRef.current.getAudioTracks();
            if (tracks.length > 0 && tracks.some(t => t.readyState === 'live')) {
                return localStreamRef.current;
            }
            // Stale stream — clean up
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.warn('[VoiceProvider] Mic access denied:', err.name);
            return null;
        }
    }, []);

    // Remove a peer and clean up
    const removePeer = useCallback((userId) => {
        const peer = peersRef.current[userId];
        if (peer) {
            try { peer.pc.close(); } catch (e) {}
            delete peersRef.current[userId];
        }
        setPeerStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
        setPeerVideoStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
        setPeerScreenStreams(prev => { const n = { ...prev }; delete n[userId]; return n; });
        setVoiceUsers(prev => prev.filter(u => u.userId !== userId));
    }, []);

    // Create a peer connection
    const createPeer = useCallback((targetUserId, targetSocketId, isInitiator) => {
        const socket = getSocket();
        if (!socket) return null;

        // Close any existing peer for this user
        if (peersRef.current[targetUserId]) {
            try { peersRef.current[targetUserId].pc.close(); } catch (e) {}
            delete peersRef.current[targetUserId];
        }

        console.log(`[VP] Creating peer for ${targetUserId} (initiator=${isInitiator})`);
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // ICE candidates
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('voice:ice-candidate', {
                    targetSocketId,
                    candidate,
                    channelId: channelIdRef.current,
                });
            }
        };

        // ─── CRITICAL: ontrack — handle incoming audio & video ───
        pc.ontrack = ({ track, streams }) => {
            console.log(`[VP] ontrack from ${targetUserId}: kind=${track.kind}, streams=${streams.length}`);

            if (track.kind === 'audio') {
                // Use the stream from the event if available, else wrap the track
                const audioStream = streams[0] || new MediaStream([track]);
                setPeerStreams(prev => ({ ...prev, [targetUserId]: audioStream }));
            } else if (track.kind === 'video') {
                // Create a dedicated MediaStream for this video track
                // This ensures React re-renders when the video stream changes
                const videoStream = new MediaStream([track]);
                setPeerVideoStreams(prev => ({ ...prev, [targetUserId]: videoStream }));

                // Listen for track end (remote user turned off video)
                track.onended = () => {
                    setPeerVideoStreams(prev => {
                        const n = { ...prev };
                        delete n[targetUserId];
                        return n;
                    });
                };
            }
        };

        // ICE state changes
        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log(`[VP] ICE ${targetUserId}: ${state}`);
            if (state === 'failed') {
                console.log(`[VP] ICE failed for ${targetUserId}, restarting...`);
                try {
                    pc.restartIce();
                    pc.createOffer({ iceRestart: true })
                        .then(o => pc.setLocalDescription(o))
                        .then(() => {
                            socket.emit('voice:offer', {
                                targetSocketId,
                                offer: pc.localDescription,
                                channelId: channelIdRef.current,
                                from: userIdRef.current,
                            });
                        })
                        .catch(() => removePeer(targetUserId));
                } catch (e) { removePeer(targetUserId); }
            } else if (state === 'closed') {
                removePeer(targetUserId);
            }
        };

        // Add local audio tracks
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }
        // Add active video track
        if (videoTrackRef.current) {
            const vs = new MediaStream([videoTrackRef.current]);
            pc.addTrack(videoTrackRef.current, vs);
        }
        // Add active screen track
        if (screenTrackRef.current) {
            const ss = new MediaStream([screenTrackRef.current]);
            pc.addTrack(screenTrackRef.current, ss);
        }

        peersRef.current[targetUserId] = { pc, socketId: targetSocketId };
        return pc;
    }, [removePeer]);

    // Renegotiate with all existing peers (after adding/removing tracks)
    const renegotiateAll = useCallback(async () => {
        const socket = getSocket();
        if (!socket) return;
        for (const [userId, { pc, socketId }] of Object.entries(peersRef.current)) {
            try {
                if (pc.signalingState === 'closed') continue;
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('voice:offer', {
                    targetSocketId: socketId,
                    offer,
                    channelId: channelIdRef.current,
                    from: userIdRef.current,
                });
            } catch (err) {
                console.error(`[VP] Renegotiation error for ${userId}:`, err);
            }
        }
    }, []);

    // ─── Join a voice channel ───
    const joinVoice = useCallback(async (channelId) => {
        const socket = getSocket();
        if (!socket) {
            console.error('[VP] No socket!');
            toast.error('Not connected to server. Please refresh.');
            return;
        }

        // Wait for socket to actually be connected
        if (!socket.connected) {
            console.log('[VP] Socket not connected, waiting...');
            await new Promise(resolve => {
                const timeout = setTimeout(() => resolve(), 5000);
                socket.once('connect', () => { clearTimeout(timeout); resolve(); });
            });
        }

        // Auto-leave previous channel
        if (channelIdRef.current && channelIdRef.current !== channelId) {
            console.log(`[VP] Auto-leaving ${channelIdRef.current}`);
            socket.emit('voice:leave', { channelId: channelIdRef.current });
            Object.keys(peersRef.current).forEach(uid => {
                try { peersRef.current[uid].pc.close(); } catch (e) {}
            });
            peersRef.current = {};
            setPeerStreams({});
            setPeerVideoStreams({});
            setPeerScreenStreams({});
            setVoiceUsers([]);
        }

        // Get audio (join even without mic)
        const stream = await getLocalAudio();
        if (!stream) {
            toast('🔇 No microphone — joined as listener', { duration: 4000 });
        }

        // Set state BEFORE emitting so socket handlers see correct channelId
        channelIdRef.current = channelId;
        myUserIdRef.current = userIdRef.current || user?._id;
        setConnectedChannel(channelId);
        setIsMuted(!stream);
        setIsDeafened(false);

        console.log(`[VP] Emitting voice:join — channel=${channelId} user=${userIdRef.current || user?._id}`);
        socket.emit('voice:join', { channelId });
    }, [getLocalAudio, user?._id]);

    // ─── Leave a voice channel ───
    const leaveVoice = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('voice:leave', { channelId: channelId || channelIdRef.current });
        }
        Object.keys(peersRef.current).forEach(uid => {
            try { peersRef.current[uid].pc.close(); } catch (e) {}
        });
        peersRef.current = {};
        setPeerStreams({});
        setPeerVideoStreams({});
        setPeerScreenStreams({});
        setVoiceUsers([]);

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
            const muted = !prev;
            localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
            const socket = getSocket();
            if (socket) socket.emit('voice:user-state', { channelId: channelIdRef.current, isMuted: muted });
            return muted;
        });
    }, []);

    // Toggle deafen
    const toggleDeafen = useCallback(() => {
        setIsDeafened(prev => {
            const deafened = !prev;
            document.querySelectorAll('.voice-remote-audio').forEach(el => { el.muted = deafened; });
            return deafened;
        });
    }, []);

    // Start video
    const startVideo = useCallback(async (facing = 'user') => {
        try {
            if (navigator.permissions) {
                try {
                    const perm = await navigator.permissions.query({ name: 'camera' });
                    if (perm.state === 'denied') {
                        toast.error('Camera is blocked. Click 🔒 in address bar → Allow Camera → Refresh', { duration: 6000 });
                        return;
                    }
                } catch (e) { /* Not all browsers support this */ }
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            const videoTrack = stream.getVideoTracks()[0];

            if (!videoTrack || videoTrack.readyState !== 'live') {
                toast.error('Camera not available. Another app may be using it.');
                return;
            }

            videoTrackRef.current = videoTrack;
            setLocalVideoStream(stream);
            setIsVideoOn(true);
            setFacingMode(facing);

            videoTrack.onended = () => {
                setIsVideoOn(false);
                setLocalVideoStream(null);
                videoTrackRef.current = null;
                getSocket()?.emit('voice:user-state', { channelId: channelIdRef.current, isVideoOn: false });
            };

            // Add video track to all existing peer connections
            for (const { pc } of Object.values(peersRef.current)) {
                const senders = pc.getSenders();
                const existing = senders.find(s => s.track?.kind === 'video' && !s._isScreen);
                if (existing) {
                    await existing.replaceTrack(videoTrack);
                } else {
                    const sender = pc.addTrack(videoTrack, stream);
                    sender._isScreen = false;
                }
            }

            getSocket()?.emit('voice:user-state', { channelId: channelIdRef.current, isVideoOn: true });
            await renegotiateAll();
        } catch (err) {
            console.error('[VP] Video error:', err);
            setIsVideoOn(false);
            setLocalVideoStream(null);
            if (err.name === 'NotAllowedError') {
                toast.error('Camera denied. Click 🔒 in address bar → Allow Camera → Refresh', { duration: 6000 });
            } else if (err.name === 'NotFoundError') {
                toast.error('No camera found on this device.');
            } else if (err.name === 'NotReadableError') {
                toast.error('Camera is in use by another app. Close it and retry.');
            } else {
                toast.error('Failed to start camera: ' + err.message);
            }
        }
    }, [renegotiateAll]);

    // Stop video
    const stopVideo = useCallback(() => {
        if (videoTrackRef.current) {
            videoTrackRef.current.stop();
            Object.values(peersRef.current).forEach(({ pc }) => {
                const sender = pc.getSenders().find(s => s.track === videoTrackRef.current);
                if (sender) pc.removeTrack(sender);
            });
            videoTrackRef.current = null;
        }
        setLocalVideoStream(null);
        setIsVideoOn(false);
        getSocket()?.emit('voice:user-state', { channelId: channelIdRef.current, isVideoOn: false });
        renegotiateAll();
    }, [renegotiateAll]);

    // Switch camera
    const switchCamera = useCallback(async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user';
        if (isVideoOn && videoTrackRef.current) {
            videoTrackRef.current.stop();
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: newFacing, width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                const newTrack = stream.getVideoTracks()[0];
                videoTrackRef.current = newTrack;
                setLocalVideoStream(stream);
                Object.values(peersRef.current).forEach(({ pc }) => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video' && !s._isScreen);
                    if (sender) sender.replaceTrack(newTrack);
                });
            } catch (err) {
                toast.error('Failed to switch camera.');
            }
        }
        setFacingMode(newFacing);
    }, [facingMode, isVideoOn]);

    // Start screen share
    const startScreenShare = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.getDisplayMedia) {
                toast.error('Screen sharing not supported on this browser.');
                return;
            }
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            const screenTrack = stream.getVideoTracks()[0];
            screenTrackRef.current = screenTrack;
            setLocalScreenStream(stream);
            setIsScreenSharing(true);

            screenTrack.onended = () => stopScreenShare();

            Object.values(peersRef.current).forEach(({ pc }) => {
                const sender = pc.addTrack(screenTrack, stream);
                sender._isScreen = true;
            });

            getSocket()?.emit('voice:user-state', { channelId: channelIdRef.current, isScreenSharing: true });
            await renegotiateAll();
        } catch (err) {
            if (err.name !== 'NotAllowedError') toast.error('Failed to start screen share.');
        }
    }, [renegotiateAll]);

    // Stop screen share
    const stopScreenShare = useCallback(() => {
        if (screenTrackRef.current) {
            screenTrackRef.current.stop();
            Object.values(peersRef.current).forEach(({ pc }) => {
                const sender = pc.getSenders().find(s => s.track === screenTrackRef.current);
                if (sender) pc.removeTrack(sender);
            });
            screenTrackRef.current = null;
        }
        setLocalScreenStream(null);
        setIsScreenSharing(false);
        getSocket()?.emit('voice:user-state', { channelId: channelIdRef.current, isScreenSharing: false });
        renegotiateAll();
    }, [renegotiateAll]);

    // Admin: force mute another user
    const adminMuteUser = useCallback((targetUserId, type = 'audio') => {
        getSocket()?.emit('voice:admin-mute', {
            channelId: channelIdRef.current,
            targetUserId,
            type,
        });
    }, []);

    // Send call invite to users
    const sendCallInvite = useCallback((channelId, targetUserIds, callType = 'voice') => {
        const socket = getSocket();
        if (socket) {
            socket.emit('voice:invite', { channelId, targetUserIds, callType });
        }
    }, []);

    // Dismiss incoming invite
    const dismissCallInvite = useCallback(() => {
        clearTimeout(callInviteTimeoutRef.current);
        setCallInvite(null);
    }, []);

    // ─── Socket event handlers — wait for socket to be available ───
    useEffect(() => {
        let socket = null;
        let pollInterval = null;
        let registered = false;

        const registerHandlers = (s) => {
            if (registered) return;
            registered = true;
            socket = s;
            console.log('[VP] Registering socket handlers on', s.id);

            // Existing users in channel when we join — we (the joiner) initiate offers to all
            const handleExistingUsers = async ({ channelId, users }) => {
                if (channelId !== channelIdRef.current) return;
                const myId = userIdRef.current;
                console.log(`[VP] existing-users in ${channelId}: ${users.length}, myId=${myId}`);

                setVoiceUsers(prev => {
                    const next = [...prev];
                    users.forEach(u => {
                        if (u.userId !== myId && !next.find(e => e.userId === u.userId)) {
                            next.push({ userId: u.userId, username: u.username, isMuted: false, isVideoOn: false, isScreenSharing: false });
                        }
                    });
                    return next;
                });

                await new Promise(r => setTimeout(r, 500));

                for (const u of users) {
                    if (u.userId === myId) continue;
                    const pc = createPeer(u.userId, u.socketId, true);
                    if (!pc) continue;
                    try {
                        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
                        await pc.setLocalDescription(offer);
                        console.log(`[VP] Sending offer to ${u.userId}`);
                        s.emit('voice:offer', { targetSocketId: u.socketId, offer, channelId, from: myId });
                    } catch (err) {
                        console.error(`[VP] Offer error for ${u.userId}:`, err);
                    }
                }
            };

            const handleUserJoined = ({ userId, username, socketId }) => {
                if (!channelIdRef.current) return;
                if (userId === userIdRef.current) return;
                console.log(`[VP] User joined: ${username} (${userId})`);
                setVoiceUsers(prev => {
                    if (prev.find(u => u.userId === userId)) return prev;
                    return [...prev, { userId, username, isMuted: false, isVideoOn: false, isScreenSharing: false }];
                });
            };

            const handleVoiceOffer = async ({ offer, from, fromSocketId, channelId }) => {
                const myId = userIdRef.current;
                if (from === myId) return;
                console.log(`[VP] Got offer from ${from}`);
                const existingPeer = peersRef.current[from];
                if (existingPeer && existingPeer.pc.signalingState === 'have-local-offer') {
                    const iAmPolite = (myId || '') < from;
                    if (iAmPolite) {
                        try {
                            await existingPeer.pc.setLocalDescription({ type: 'rollback' });
                            await existingPeer.pc.setRemoteDescription(new RTCSessionDescription(offer));
                            const answer = await existingPeer.pc.createAnswer();
                            await existingPeer.pc.setLocalDescription(answer);
                            s.emit('voice:answer', { targetSocketId: fromSocketId, answer, channelId, from: myId });
                        } catch (err) { console.error('[VP] Glare rollback:', err); }
                    }
                    return;
                }
                const pc = createPeer(from, fromSocketId, false);
                if (!pc) return;
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    s.emit('voice:answer', { targetSocketId: fromSocketId, answer, channelId, from: myId });
                } catch (err) {
                    console.error(`[VP] Error answering from ${from}:`, err);
                }
            };

            const handleVoiceAnswer = async ({ answer, from }) => {
                if (from === userIdRef.current) return;
                const peer = peersRef.current[from];
                if (peer && peer.pc.signalingState === 'have-local-offer') {
                    try { await peer.pc.setRemoteDescription(new RTCSessionDescription(answer)); }
                    catch (err) { console.error(`[VP] Answer error from ${from}:`, err); }
                }
            };

            const handleIceCandidate = async ({ candidate, from }) => {
                const peer = peersRef.current[from];
                if (peer && candidate) {
                    try { await peer.pc.addIceCandidate(new RTCIceCandidate(candidate)); }
                    catch (e) { /* ignore late candidates */ }
                }
            };

            const handlePeerLeft = ({ userId }) => {
                console.log(`[VP] Peer left: ${userId}`);
                removePeer(userId);
            };

            const handleUserState = ({ userId, isMuted: muted, isVideoOn: video, isScreenSharing: screen }) => {
                setVoiceUsers(prev => prev.map(u => {
                    if (u.userId !== userId) return u;
                    const upd = {};
                    if (muted !== undefined) upd.isMuted = muted;
                    if (video !== undefined) upd.isVideoOn = video;
                    if (screen !== undefined) upd.isScreenSharing = screen;
                    return { ...u, ...upd };
                }));
            };

            const handleAdminMuted = ({ type }) => {
                if (type === 'audio') {
                    setIsMuted(true);
                    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = false; });
                    toast('🔇 Mic muted by host', { icon: '⚠️' });
                } else if (type === 'video') {
                    if (videoTrackRef.current) {
                        videoTrackRef.current.stop();
                        Object.values(peersRef.current).forEach(({ pc }) => {
                            const sender = pc.getSenders().find(s2 => s2.track === videoTrackRef.current);
                            if (sender) pc.removeTrack(sender);
                        });
                        videoTrackRef.current = null;
                    }
                    setLocalVideoStream(null);
                    setIsVideoOn(false);
                    toast('📹 Camera off by host', { icon: '⚠️' });
                }
            };

            // Handle incoming call invite
            const handleCallInvite = (data) => {
                console.log('[VP] Call invite received:', data);
                setCallInvite(data);
                // Auto-dismiss after 30s
                if (callInviteTimeoutRef.current) clearTimeout(callInviteTimeoutRef.current);
                callInviteTimeoutRef.current = setTimeout(() => setCallInvite(null), 30000);
            };

            s.on('voice:existing-users', handleExistingUsers);
            s.on('voice:user-joined', handleUserJoined);
            s.on('voice:offer', handleVoiceOffer);
            s.on('voice:answer', handleVoiceAnswer);
            s.on('voice:ice-candidate', handleIceCandidate);
            s.on('voice:peer-left', handlePeerLeft);
            s.on('voice:user-state', handleUserState);
            s.on('voice:admin-muted', handleAdminMuted);
            s.on('voice:call-invite', handleCallInvite);

            // On reconnect, re-join the channel if we were connected
            s.on('connect', () => {
                console.log('[VP] Socket reconnected:', s.id);
                if (channelIdRef.current) {
                    console.log('[VP] Re-joining channel after reconnect:', channelIdRef.current);
                    s.emit('voice:join', { channelId: channelIdRef.current });
                }
            });

            // Store cleanup function
            s._voiceCleanup = () => {
                s.off('voice:existing-users', handleExistingUsers);
                s.off('voice:user-joined', handleUserJoined);
                s.off('voice:offer', handleVoiceOffer);
                s.off('voice:answer', handleVoiceAnswer);
                s.off('voice:ice-candidate', handleIceCandidate);
                s.off('voice:peer-left', handlePeerLeft);
                s.off('voice:user-state', handleUserState);
                s.off('voice:admin-muted', handleAdminMuted);
                s.off('voice:call-invite', handleCallInvite);
            };
        };

        // Poll until socket is available (it may not exist yet on mount)
        const tryRegister = () => {
            const s = getSocket();
            if (s) {
                clearInterval(pollInterval);
                registerHandlers(s);
            }
        };

        tryRegister();
        if (!registered) {
            pollInterval = setInterval(tryRegister, 300);
        }

        return () => {
            clearInterval(pollInterval);
            if (socket?._voiceCleanup) {
                socket._voiceCleanup();
                delete socket._voiceCleanup;
            }
        };
    }, [createPeer, removePeer]); // stable — deps never change

    // Hidden audio players for peer audio streams
    const audioElements = Object.entries(peerStreams).map(([userId, stream]) => (
        <audio
            key={userId}
            className="voice-remote-audio"
            autoPlay
            playsInline
            ref={(el) => { if (el && el.srcObject !== stream) { el.srcObject = stream; el.play().catch(() => {}); } }}
            muted={isDeafened}
        />
    ));

    const value = {
        joinVoice, leaveVoice,
        toggleMute, toggleDeafen,
        isMuted, isDeafened,
        connectedChannel,
        peerStreams, voiceUsers,
        isVideoOn, localVideoStream, peerVideoStreams,
        startVideo, stopVideo, switchCamera, facingMode,
        isScreenSharing, localScreenStream, peerScreenStreams,
        startScreenShare, stopScreenShare,
        adminMuteUser,
        callInvite, dismissCallInvite, sendCallInvite,
    };

    return (
        <VoiceContext.Provider value={value}>
            {children}
            {audioElements}

            {/* Global Incoming Call Invite */}
            {callInvite && (
                <div className="fixed top-4 right-4 z-[200] animate-in slide-in-from-top-2">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl shadow-2xl p-4 w-80">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <span className="text-lg">{callInvite.callType === 'video' ? '📹' : '📞'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">
                                    {callInvite.from?.username} is calling
                                </p>
                                <p className="text-xs text-white/40">{callInvite.serverName} • {callInvite.channelName}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => dismissCallInvite()}
                                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 text-sm transition-colors"
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = `/call/${callInvite.channelId}`;
                                    dismissCallInvite();
                                }}
                                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                            >
                                Join Call
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </VoiceContext.Provider>
    );
}
