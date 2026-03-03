'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { addMessage, updateMessage, removeMessage, setTypingUser, addOnlineUser, removeOnlineUser, updateReactions } from '../redux/chatSlice';
import { setGameSession } from '../redux/gameSlice';

export function useSocket() {
    const dispatch = useDispatch();
    const { token } = useSelector((state) => state.auth);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [voiceUsers, setVoiceUsers] = useState({});
    const [musicRoom, setMusicRoom] = useState(null);

    useEffect(() => {
        if (!token) return;

        const socket = connectSocket(token);

        // Chat events
        socket.on('message:new', (message) => {
            dispatch(addMessage(message));
        });

        socket.on('message:updated', (message) => {
            dispatch(updateMessage(message));
        });

        socket.on('message:deleted', ({ messageId }) => {
            dispatch(removeMessage(messageId));
        });

        socket.on('typing:start', ({ userId, username, channelId }) => {
            dispatch(setTypingUser({ channelId, userId, username, isTyping: true }));
        });

        socket.on('typing:stop', ({ userId, channelId }) => {
            dispatch(setTypingUser({ channelId, userId, isTyping: false }));
        });

        socket.on('message:reacted', ({ messageId, reactions }) => {
            dispatch(updateReactions({ messageId, reactions }));
        });

        // Presence events
        socket.on('presence:online', ({ userId }) => {
            dispatch(addOnlineUser(userId));
        });

        socket.on('presence:offline', ({ userId }) => {
            dispatch(removeOnlineUser(userId));
        });

        // Game events
        socket.on('game:updated', ({ session }) => {
            dispatch(setGameSession(session));
        });
        socket.on('game:created', ({ session }) => {
            dispatch(setGameSession(session));
        });
        socket.on('game:rematch', ({ session }) => {
            dispatch(setGameSession(session));
        });

        // Call events
        socket.on('call:incoming', (data) => {
            setIncomingCall(data);
        });
        socket.on('call:answered', ({ session }) => {
            setActiveCall(session);
            setIncomingCall(null);
        });
        socket.on('call:ended', () => {
            setActiveCall(null);
            setIncomingCall(null);
        });
        socket.on('call:rejected', () => {
            setActiveCall(null);
            setIncomingCall(null);
        });

        // Voice channel events
        socket.on('voice:user-joined', ({ channelId, userId, username }) => {
            setVoiceUsers(prev => ({
                ...prev,
                [channelId]: [...(prev[channelId] || []).filter(u => u.userId !== userId), { userId, username }]
            }));
        });
        socket.on('voice:user-left', ({ channelId, userId }) => {
            setVoiceUsers(prev => ({
                ...prev,
                [channelId]: (prev[channelId] || []).filter(u => u.userId !== userId)
            }));
        });

        // Music events
        socket.on('music:sync', (data) => {
            setMusicRoom(prev => ({ ...prev, ...data }));
        });
        socket.on('stream:user-joined', ({ userId, username }) => {
            setMusicRoom(prev => prev ? { ...prev, users: [...(prev.users || []), { userId, username }] } : prev);
        });
        socket.on('stream:user-left', ({ userId }) => {
            setMusicRoom(prev => prev ? { ...prev, users: (prev.users || []).filter(u => u.userId !== userId) } : prev);
        });

        return () => {
            disconnectSocket();
        };
    }, [token, dispatch]);

    // Chat functions
    const sendMessage = useCallback((channelId, content, type = 'text', attachments = [], replyTo = null, threadId = null) => {
        const socket = getSocket();
        if (socket) socket.emit('message:send', { channelId, content, type, attachments, replyTo, threadId });
    }, []);

    const joinChannel = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('channel:join', channelId);
    }, []);

    const leaveChannel = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('channel:leave', channelId);
    }, []);

    const startTyping = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('typing:start', channelId);
    }, []);

    const stopTyping = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('typing:stop', channelId);
    }, []);

    const reactToMessage = useCallback((messageId, emoji) => {
        const socket = getSocket();
        if (socket) socket.emit('message:react', { messageId, emoji });
    }, []);

    // Call functions
    const initiateCall = useCallback((targetUserId, channelId, type = 'voice') => {
        const socket = getSocket();
        if (socket) socket.emit('call:initiate', { targetUserId, channelId, type });
    }, []);

    const answerCall = useCallback((sessionId) => {
        const socket = getSocket();
        if (socket) socket.emit('call:answer', { sessionId });
    }, []);

    const endCall = useCallback((sessionId) => {
        const socket = getSocket();
        if (socket) socket.emit('call:end', { sessionId });
        setActiveCall(null);
    }, []);

    const rejectCall = useCallback((sessionId) => {
        const socket = getSocket();
        if (socket) socket.emit('call:reject', { sessionId });
        setIncomingCall(null);
    }, []);

    const toggleMedia = useCallback((sessionId, type, enabled) => {
        const socket = getSocket();
        if (socket) socket.emit('call:toggle-media', { sessionId, type, enabled });
    }, []);

    // Voice channel functions
    const joinVoiceChannel = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('voice:join', { channelId });
    }, []);

    const leaveVoiceChannel = useCallback((channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('voice:leave', { channelId });
    }, []);

    // Game functions
    const createGame = useCallback((game, channelId) => {
        const socket = getSocket();
        if (socket) socket.emit('game:create', { game, channelId });
    }, []);

    const joinGame = useCallback((sessionId) => {
        const socket = getSocket();
        if (socket) socket.emit('game:join', { sessionId });
    }, []);

    const makeGameMove = useCallback((sessionId, move) => {
        const socket = getSocket();
        if (socket) socket.emit('game:move', { sessionId, move });
    }, []);

    const requestRematch = useCallback((sessionId) => {
        const socket = getSocket();
        if (socket) socket.emit('game:rematch', { sessionId });
    }, []);

    // Music/Stream functions
    const joinMusicRoom = useCallback((roomId) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('stream:join', { roomId });
            setMusicRoom({ roomId, users: [], track: null, isPlaying: false, currentTime: 0 });
        }
    }, []);

    const syncMusic = useCallback((roomId, track, currentTime, isPlaying) => {
        const socket = getSocket();
        if (socket) socket.emit('music:sync', { roomId, track, currentTime, isPlaying });
    }, []);

    const leaveMusicRoom = useCallback((roomId) => {
        const socket = getSocket();
        if (socket) socket.emit('stream:leave', { roomId });
        setMusicRoom(null);
    }, []);

    return {
        sendMessage, joinChannel, leaveChannel, startTyping, stopTyping, reactToMessage,
        initiateCall, answerCall, endCall, rejectCall, toggleMedia,
        joinVoiceChannel, leaveVoiceChannel, voiceUsers,
        createGame, joinGame, makeGameMove, requestRematch,
        joinMusicRoom, syncMusic, leaveMusicRoom, musicRoom,
        incomingCall, activeCall,
    };
}

