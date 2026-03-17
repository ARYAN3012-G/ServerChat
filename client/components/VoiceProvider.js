'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '../services/socket';

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
    // Map of peerId -> { pc: RTCPeerConnection, stream: MediaStream, socketId }
    const peersRef = useRef({});
    const localStreamRef = useRef(null);
    const channelIdRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isDeafened, setIsDeafened] = useState(false);
    const [connectedChannel, setConnectedChannel] = useState(null);
    const [peerStreams, setPeerStreams] = useState({}); // userId -> MediaStream

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
            console.log(`[VoiceProvider] Got remote track from ${targetUserId}:`, event.track.kind);
            const remoteStream = event.streams[0] || new MediaStream([event.track]);
            setPeerStreams(prev => ({ ...prev, [targetUserId]: remoteStream }));
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

        peersRef.current[targetUserId] = { pc, socketId: targetSocketId };
        return pc;
    }, []);

    const removePeer = useCallback((userId) => {
        const peer = peersRef.current[userId];
        if (peer) {
            peer.pc.close();
            delete peersRef.current[userId];
        }
        setPeerStreams(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
        });
    }, []);

    // Join a voice channel
    const joinVoice = useCallback(async (channelId) => {
        const socket = getSocket();
        if (!socket) return;

        // Get audio first
        const stream = await getLocalAudio();
        if (!stream) {
            console.error('[VoiceProvider] No audio stream available');
            return;
        }

        channelIdRef.current = channelId;
        setConnectedChannel(channelId);

        // Tell server we're joining
        socket.emit('voice:join', { channelId });
    }, [getLocalAudio]);

    // Leave voice channel
    const leaveVoice = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('voice:leave', { channelId: channelId || channelIdRef.current });
        }

        // Tear down all peer connections
        Object.keys(peersRef.current).forEach(userId => {
            peersRef.current[userId].pc.close();
        });
        peersRef.current = {};
        setPeerStreams({});

        // Stop local audio
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

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
            return newMuted;
        });
    }, []);

    // Toggle deafen
    const toggleDeafen = useCallback(() => {
        setIsDeafened(prev => {
            const newDeafened = !prev;
            // Mute all remote audio elements
            document.querySelectorAll('.voice-remote-audio').forEach(el => {
                el.muted = newDeafened;
            });
            return newDeafened;
        });
    }, []);

    // Socket event handlers
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        // When we join, the server tells us who is already in the channel
        const handleExistingUsers = async ({ channelId, users }) => {
            console.log(`[VoiceProvider] Existing users in ${channelId}:`, users.length);
            for (const u of users) {
                const pc = createPeer(u.userId, u.socketId, true);
                if (!pc) continue;

                try {
                    const offer = await pc.createOffer({ offerToReceiveAudio: true });
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

        // When a new user joins our channel, they will send us an offer
        // But we also need to be ready if THEY are the ones sending us existing-users offers
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

        socket.on('voice:existing-users', handleExistingUsers);
        socket.on('voice:offer', handleVoiceOffer);
        socket.on('voice:answer', handleVoiceAnswer);
        socket.on('voice:ice-candidate', handleIceCandidate);
        socket.on('voice:peer-left', handlePeerLeft);

        return () => {
            socket.off('voice:existing-users', handleExistingUsers);
            socket.off('voice:offer', handleVoiceOffer);
            socket.off('voice:answer', handleVoiceAnswer);
            socket.off('voice:ice-candidate', handleIceCandidate);
            socket.off('voice:peer-left', handlePeerLeft);
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
    };

    return (
        <VoiceContext.Provider value={value}>
            {children}
            {audioElements}
        </VoiceContext.Provider>
    );
}
