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

export default function CallProvider({ children }) {
    const { user, token } = useSelector((s) => s.auth);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [callType, setCallType] = useState('voice');
    const [callStatus, setCallStatus] = useState('idle');
    const [remoteStream, setRemoteStream] = useState(null);

    const peerRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const incomingTimeoutRef = useRef(null);

    // Use refs to avoid stale closures in callbacks
    const activeCallRef = useRef(null);
    const callStatusRef = useRef('idle');
    const incomingCallRef = useRef(null);

    // Keep refs in sync with state
    useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

    // ── RTCPeerConnection factory ──
    const createPeerConnection = useCallback((targetUserId) => {
        const socket = getSocket();
        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Collect ALL ICE candidates and send them (use ref to avoid stale closure)
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('call:ice-candidate', {
                    targetUserId,
                    candidate: event.candidate,
                    sessionId: activeCallRef.current?._id,
                });
            }
        };

        pc.ontrack = (event) => {
            console.log('[CallProvider] ontrack received!', event.streams.length, 'streams');
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            } else {
                // Fallback: create a new MediaStream from the track
                const stream = new MediaStream([event.track]);
                setRemoteStream(stream);
            }
            setCallStatus('active');
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[CallProvider] ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setCallStatus('active');
            }
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                cleanupCall();
            }
        };

        pc.onnegotiationneeded = async () => {
            console.log('[CallProvider] Negotiation needed');
        };

        return pc;
    }, []);

    // ── Get local media ──
    const getLocalMedia = useCallback(async (type) => {
        // If we already have a stream, return it
        if (localStreamRef.current) {
            const tracks = localStreamRef.current.getTracks();
            if (tracks.length > 0 && tracks.some(t => t.readyState === 'live')) {
                return localStreamRef.current;
            }
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: type === 'video',
            });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error('Media access error:', err);
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

    // ── Initiate a call ──
    const initiateCall = useCallback(async (targetUserId, channelId, type = 'voice') => {
        const socket = getSocket();
        console.log('[CallProvider] initiateCall', { targetUserId, channelId, type, socketExists: !!socket });

        if (!socket || !targetUserId) {
            console.error('[CallProvider] ABORTING: Missing socket or targetUserId');
            return;
        }

        setCallType(type);
        setCallStatus('ringing');

        // Get local media first
        const stream = await getLocalMedia(type);
        console.log('[CallProvider] Got local media:', stream?.getTracks().map(t => t.kind));

        // Tell the server to initiate
        socket.emit('call:initiate', { targetUserId, channelId, type });

        // Set a temporary active call
        const tempCall = {
            _id: 'pending',
            participants: [{ user: { _id: user?._id, username: user?.username } }],
            type,
            status: 'ringing',
            targetUserId,
        };
        setActiveCall(tempCall);

        // The `call:answered` handler in useEffect will handle creating the peer connection
    }, [user, getLocalMedia]);

    // ── Answer a call ──
    const answerCall = useCallback(async (sessionId) => {
        const socket = getSocket();
        if (!socket) return;

        clearTimeout(incomingTimeoutRef.current);

        const type = incomingCallRef.current?.session?.type || 'voice';
        setCallType(type);
        setCallStatus('connecting');

        // Get local media BEFORE telling server we answered
        const stream = await getLocalMedia(type);
        console.log('[CallProvider] Answerer got local media:', stream?.getTracks().map(t => t.kind));

        // Tell the server we answered
        socket.emit('call:answer', { sessionId });

        setActiveCall(incomingCallRef.current?.session || { _id: sessionId, participants: [] });
        setIncomingCall(null);
    }, [getLocalMedia]);

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

    // ── Screen share ──
    const startScreenShare = useCallback(async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: true,
            });
            screenStreamRef.current = screenStream;

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
        console.log('[CallProvider] cleanupCall');
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
        if (!token) return;
        const socket = connectSocket(token);
        if (!socket) return;

        console.log('[CallProvider] Attaching socket listeners for:', user?.username);

        const handleIncoming = (data) => {
            console.log('[CallProvider] INCOMING CALL!', data);
            setIncomingCall(data);
            setCallStatus('ringing');
            incomingTimeoutRef.current = setTimeout(() => {
                rejectCall(data.session?._id);
            }, 30000);
        };

        // When the callee answers → caller creates the WebRTC offer
        const handleAnswered = async ({ session, userId }) => {
            console.log('[CallProvider] CALL ANSWERED!', { session, userId });
            setActiveCall(session);
            setIncomingCall(null);
            setCallStatus('connecting');
            clearTimeout(incomingTimeoutRef.current);

            // Only the CALLER creates the offer (the one who initiated)
            const currentCall = activeCallRef.current;
            const targetUserId = currentCall?.targetUserId || userId;

            if (targetUserId) {
                try {
                    const pc = createPeerConnection(targetUserId);
                    peerRef.current = pc;

                    // Add local tracks to the connection
                    const stream = localStreamRef.current;
                    if (stream) {
                        stream.getTracks().forEach((track) => {
                            console.log('[CallProvider] Caller adding track:', track.kind);
                            pc.addTrack(track, stream);
                        });
                    }

                    const offer = await pc.createOffer({
                        offerToReceiveAudio: true,
                        offerToReceiveVideo: true,
                    });
                    await pc.setLocalDescription(offer);

                    console.log('[CallProvider] Sending offer to:', targetUserId);
                    socket.emit('call:offer', {
                        targetUserId,
                        offer,
                        sessionId: session._id,
                    });

                    setCallStatus('connecting');
                } catch (err) {
                    console.error('[CallProvider] Create offer error:', err);
                }
            }
        };

        const handleEnded = () => {
            console.log('[CallProvider] CALL ENDED');
            cleanupCall();
        };

        const handleRejected = () => {
            console.log('[CallProvider] CALL REJECTED');
            cleanupCall();
        };

        // Answerer receives the offer → creates answer
        const handleOffer = async ({ offer, sessionId, from }) => {
            console.log('[CallProvider] RECEIVED OFFER from:', from);
            try {
                const pc = createPeerConnection(from);
                peerRef.current = pc;

                // Set remote description first
                await pc.setRemoteDescription(new RTCSessionDescription(offer));

                // Ensure we have local media
                let stream = localStreamRef.current;
                if (!stream || stream.getTracks().every(t => t.readyState !== 'live')) {
                    const type = activeCallRef.current?.type || 'voice';
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: type === 'video',
                    }).catch(() => navigator.mediaDevices.getUserMedia({ audio: true }));
                    localStreamRef.current = stream;
                }

                if (stream) {
                    stream.getTracks().forEach((track) => {
                        console.log('[CallProvider] Answerer adding track:', track.kind);
                        pc.addTrack(track, stream);
                    });
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                console.log('[CallProvider] Sending SDP answer to:', from);
                socket.emit('call:sdp-answer', {
                    targetUserId: from,
                    answer,
                    sessionId,
                });
            } catch (err) {
                console.error('[CallProvider] Handle offer error:', err);
            }
        };

        const handleSdpAnswer = async ({ answer }) => {
            console.log('[CallProvider] RECEIVED SDP ANSWER');
            try {
                if (peerRef.current && peerRef.current.signalingState !== 'stable') {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                }
            } catch (err) {
                console.error('[CallProvider] Handle SDP answer error:', err);
            }
        };

        const handleIceCandidate = async ({ candidate }) => {
            try {
                if (peerRef.current && candidate) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                // Ignore ICE candidate errors after connection is established
                if (peerRef.current?.iceConnectionState !== 'connected') {
                    console.error('[CallProvider] ICE candidate error:', err);
                }
            }
        };

        const handleMediaToggled = ({ userId, type, enabled }) => {
            console.log('[CallProvider] Media toggled:', { userId, type, enabled });
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
    }, [token, cleanupCall, createPeerConnection, rejectCall]);

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
