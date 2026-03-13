'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { connectSocket, getSocket } from '../services/socket';
import CallModal from './CallModal';
import IncomingCallOverlay from './IncomingCallOverlay';

const CallContext = createContext(null);

export function useCall() {
    return useContext(CallContext);
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
};

export default function CallProvider({ children }) {
    const { user, token } = useSelector((s) => s.auth);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [callType, setCallType] = useState('voice');
    const [callStatus, setCallStatus] = useState('idle'); // idle | ringing | connecting | active
    const [remoteStream, setRemoteStream] = useState(null);

    const peerRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const incomingTimeoutRef = useRef(null);

    // ── RTCPeerConnection factory ──
    const createPeerConnection = useCallback((targetUserId) => {
        const socket = getSocket();
        const pc = new RTCPeerConnection(ICE_SERVERS);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('call:ice-candidate', {
                    targetUserId,
                    candidate: event.candidate,
                    sessionId: activeCall?._id,
                });
            }
        };

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            setCallStatus('active');
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                cleanupCall();
            }
        };

        return pc;
    }, [activeCall]);

    // ── Get local media ──
    const getLocalMedia = useCallback(async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video',
            });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error('Media access error:', err);
            // Fallback to audio only
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = stream;
                return stream;
            } catch (e) {
                console.error('Audio fallback failed:', e);
                return null;
            }
        }
    }, []);

    const initiateCall = useCallback(async (targetUserId, channelId, type = 'voice') => {
        const socket = getSocket();
        console.log('[CallProvider] initiateCall called!', { targetUserId, channelId, type, socketExists: !!socket });

        if (!socket) {
            console.error('[CallProvider] ABORTING: Socket is null!');
            return;
        }
        if (!targetUserId) {
            console.error('[CallProvider] ABORTING: Target userId is missing!');
            return;
        }

        setCallType(type);
        setCallStatus('ringing');

        // Get local media first
        await getLocalMedia(type);

        console.log('[CallProvider] Emitting call:initiate...');
        socket.emit('call:initiate', { targetUserId, channelId, type });

        // Set a temporary active call to show the modal
        setActiveCall({
            _id: 'pending',
            participants: [{ user: { _id: user?._id, username: user?.username } }],
            type,
            status: 'ringing',
        });

        // Listen for answered to create offer
        const onAnswered = async ({ session }) => {
            setActiveCall(session);

            try {
                const pc = createPeerConnection(targetUserId);
                peerRef.current = pc;

                const stream = localStreamRef.current;
                if (stream) {
                    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                }

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('call:offer', {
                    targetUserId,
                    offer,
                    sessionId: session._id,
                });

                setCallStatus('connecting');
            } catch (err) {
                console.error('Create offer error:', err);
            }

            socket.off('call:answered', onAnswered);
        };

        socket.on('call:answered', onAnswered);
    }, [user, getLocalMedia, createPeerConnection]);

    // ── Answer a call ──
    const answerCall = useCallback(async (sessionId) => {
        const socket = getSocket();
        if (!socket) return;

        clearTimeout(incomingTimeoutRef.current);

        const type = incomingCall?.session?.type || 'voice';
        setCallType(type);
        setCallStatus('connecting');

        // Get local media
        await getLocalMedia(type);

        // Tell the server
        socket.emit('call:answer', { sessionId });

        setActiveCall(incomingCall?.session || { _id: sessionId, participants: [] });
        setIncomingCall(null);
    }, [incomingCall, getLocalMedia]);

    // ── Reject a call ──
    const rejectCall = useCallback((sessionId) => {
        const socket = getSocket();
        if (!socket) return;

        clearTimeout(incomingTimeoutRef.current);
        socket.emit('call:reject', { sessionId });
        setIncomingCall(null);
        setCallStatus('idle');
    }, []);

    // ── End the active call ──
    const endCall = useCallback((sessionId) => {
        const socket = getSocket();
        if (socket && sessionId && sessionId !== 'pending') {
            socket.emit('call:end', { sessionId });
        }
        cleanupCall();
    }, []);

    // ── Toggle media ──
    const toggleMedia = useCallback((sessionId, type, enabled) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('call:toggle-media', { sessionId, type, enabled });
        }
    }, []);

    // ── Replace video track with screen share ──
    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: true,
            });
            screenStreamRef.current = screenStream;

            // Replace video track in peer connection
            const videoTrack = screenStream.getVideoTracks()[0];
            if (peerRef.current) {
                const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }

            videoTrack.onended = () => {
                stopScreenShare();
            };

            return screenStream;
        } catch (err) {
            console.error('Screen share error:', err);
            return null;
        }
    }, []);

    const stopScreenShare = useCallback(async () => {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;

        // Restore camera track
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack && peerRef.current) {
            const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }
        }
    }, []);

    // ── Cleanup ──
    const cleanupCall = useCallback(() => {
        peerRef.current?.close();
        peerRef.current = null;
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setRemoteStream(null);
        setActiveCall(null);
        setIncomingCall(null);
        setCallStatus('idle');
        setCallType('voice');
        clearTimeout(incomingTimeoutRef.current);
    }, []);

    // ── Socket listeners ──
    useEffect(() => {
        if (!token) {
            console.log('[CallProvider] No token found, skipping socket attachment');
            return;
        }
        const socket = connectSocket(token);
        if (!socket) {
            console.log('[CallProvider] connectSocket returned null!');
            return;
        }

        console.log('[CallProvider] Attaching socket listeners for:', user?.username, socket.id);

        const handleIncoming = (data) => {
            console.log('[CallProvider] INCOMING CALL RECEIVED!', data);
            setIncomingCall(data);
            setCallStatus('ringing');

            // Auto-dismiss after 30s
            incomingTimeoutRef.current = setTimeout(() => {
                rejectCall(data.session?._id);
            }, 30000);
        };

        const handleAnswered = ({ session, userId }) => {
            setActiveCall(session);
            setIncomingCall(null);
            setCallStatus('connecting');
            clearTimeout(incomingTimeoutRef.current);
        };

        const handleEnded = () => {
            cleanupCall();
        };

        const handleRejected = () => {
            cleanupCall();
            // Could add a toast notification "Call rejected"
        };

        const handleOffer = async ({ offer, sessionId, from }) => {
            try {
                const pc = createPeerConnection(from);
                peerRef.current = pc;

                await pc.setRemoteDescription(new RTCSessionDescription(offer));

                const stream = localStreamRef.current;
                if (stream) {
                    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('call:sdp-answer', {
                    targetUserId: from,
                    answer,
                    sessionId,
                });
            } catch (err) {
                console.error('Handle offer error:', err);
            }
        };

        const handleSdpAnswer = async ({ answer }) => {
            try {
                if (peerRef.current) {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (err) {
                console.error('Handle answer error:', err);
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            try {
                if (peerRef.current && candidate) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                console.error('Handle ICE candidate error:', err);
            }
        };

        const handleMediaToggled = ({ userId, type, enabled }) => {
            // Could update UI to show remote user muted/video off
        };

        socket.on('call:incoming', handleIncoming);
        socket.on('call:answered', handleAnswered);
        socket.on('call:ended', handleEnded);
        socket.on('call:rejected', handleRejected);
        socket.on('call:offer', handleOffer);
        socket.on('call:sdp-answer', handleSdpAnswer);
        socket.on('call:ice-candidate', handleIceCandidate);
        socket.on('call:media-toggled', handleMediaToggled);

        return () => {
            socket.off('call:incoming', handleIncoming);
            socket.off('call:answered', handleAnswered);
            socket.off('call:ended', handleEnded);
            socket.off('call:rejected', handleRejected);
            socket.off('call:offer', handleOffer);
            socket.off('call:sdp-answer', handleSdpAnswer);
            socket.off('call:ice-candidate', handleIceCandidate);
            socket.off('call:media-toggled', handleMediaToggled);
        };
    }, [token, cleanupCall, createPeerConnection]);

    const value = {
        incomingCall,
        activeCall,
        callType,
        callStatus,
        remoteStream,
        localStreamRef,
        screenStreamRef,
        initiateCall,
        answerCall,
        rejectCall,
        endCall,
        toggleMedia,
        startScreenShare,
        stopScreenShare,
    };

    return (
        <CallContext.Provider value={value}>
            {children}

            {/* Global Incoming Call Overlay */}
            {incomingCall && callStatus === 'ringing' && !activeCall && (
                <IncomingCallOverlay
                    callData={incomingCall}
                    onAnswer={() => answerCall(incomingCall.session?._id)}
                    onDecline={() => rejectCall(incomingCall.session?._id)}
                />
            )}

            {/* Global Call Modal */}
            {activeCall && (
                <CallModal
                    callSession={activeCall}
                    user={user}
                    type={callType}
                    callStatus={callStatus}
                    remoteStream={remoteStream}
                    localStreamRef={localStreamRef}
                    screenStreamRef={screenStreamRef}
                    onEnd={(id) => endCall(id)}
                    onToggleMedia={toggleMedia}
                    onStartScreenShare={startScreenShare}
                    onStopScreenShare={stopScreenShare}
                />
            )}
        </CallContext.Provider>
    );
}
