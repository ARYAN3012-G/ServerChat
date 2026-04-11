'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { addMessage, updateMessage, removeMessage, setTypingUser, addOnlineUser, removeOnlineUser, updateReactions } from '../redux/chatSlice';
import { setGameSession, updateServerSession } from '../redux/gameSlice';

export function useSocket() {
    const dispatch = useDispatch();
    const { token } = useSelector((state) => state.auth);
    const [voiceUsers, setVoiceUsers] = useState({});
    const [musicRoom, setMusicRoom] = useState(null);

    useEffect(() => {
        if (!token) return;

        const socket = connectSocket(token);

        // Define handler references
        const handleNewMessage = (message) => {
            console.log('[Socket] message:new received!', message._id);
            dispatch(addMessage(message));
        };
        const handleUpdatedMessage = (message) => dispatch(updateMessage(message));
        const handleDeletedMessage = ({ messageId }) => dispatch(removeMessage(messageId));
        const handleTypingStart = ({ userId, username, channelId }) => dispatch(setTypingUser({ channelId, userId, username, isTyping: true }));
        const handleTypingStop = ({ userId, channelId }) => dispatch(setTypingUser({ channelId, userId, isTyping: false }));
        const handleReactedMessage = ({ messageId, reactions }) => dispatch(updateReactions({ messageId, reactions }));
        const handlePresenceOnline = ({ userId }) => dispatch(addOnlineUser(userId));
        const handlePresenceOffline = ({ userId }) => dispatch(removeOnlineUser(userId));
        const handleGameUpdated = ({ session }) => { dispatch(setGameSession(session)); dispatch(updateServerSession(session)); };
        const handleGameCreated = ({ session }) => { dispatch(setGameSession(session)); dispatch(updateServerSession(session)); };
        const handleGameRematch = ({ session }) => { dispatch(setGameSession(session)); dispatch(updateServerSession(session)); };
        const handleVoiceJoined = ({ channelId, userId, username }) => setVoiceUsers(prev => ({ ...prev, [channelId]: [...(prev[channelId] || []).filter(u => u.userId !== userId), { userId, username }] }));
        const handleVoiceLeft = ({ channelId, userId }) => setVoiceUsers(prev => ({ ...prev, [channelId]: (prev[channelId] || []).filter(u => u.userId !== userId) }));
        const handleMusicSync = (data) => setMusicRoom(prev => ({ ...prev, ...data }));
        const handleStreamJoined = ({ userId, username, users, hostUserId, ownerUserId }) => setMusicRoom(prev => prev ? { ...prev, users: users || [...(prev.users || []), { userId, username }], hostUserId: hostUserId || prev.hostUserId, ownerUserId: ownerUserId || prev.ownerUserId } : prev);
        const handleStreamLeft = ({ userId }) => setMusicRoom(prev => prev ? { ...prev, users: (prev.users || []).filter(u => u.userId !== userId) } : prev);
        const handleHostChanged = ({ hostUserId, users }) => setMusicRoom(prev => prev ? { ...prev, hostUserId, users: users || prev.users } : prev);
        const handleStatusChanged = ({ userId, status }) => {
            // Keep user in online list (they're still connected), status change is cosmetic
            if (status !== 'offline') {
                dispatch(addOnlineUser(userId));
            } else {
                dispatch(removeOnlineUser(userId));
            }
        };
        const handleMessagePinned = ({ messageId }) => {
            // Update the message in redux to show pin indicator
            dispatch(updateMessage({ _id: messageId, isPinned: true }));
        };

        // Attach listeners
        socket.on('message:new', handleNewMessage);
        socket.on('message:updated', handleUpdatedMessage);
        socket.on('message:deleted', handleDeletedMessage);
        socket.on('typing:start', handleTypingStart);
        socket.on('typing:stop', handleTypingStop);
        socket.on('message:reacted', handleReactedMessage);
        socket.on('presence:online', handlePresenceOnline);
        socket.on('presence:offline', handlePresenceOffline);
        socket.on('game:updated', handleGameUpdated);
        socket.on('game:created', handleGameCreated);
        socket.on('game:rematch', handleGameRematch);
        socket.on('voice:user-joined', handleVoiceJoined);
        socket.on('voice:user-left', handleVoiceLeft);
        socket.on('music:sync', handleMusicSync);
        socket.on('stream:user-joined', handleStreamJoined);
        socket.on('stream:user-left', handleStreamLeft);
        socket.on('music:host-changed', handleHostChanged);
        socket.on('presence:status-changed', handleStatusChanged);
        socket.on('message:pinned', handleMessagePinned);

        return () => {
            if (socket) {
                socket.off('message:new', handleNewMessage);
                socket.off('message:updated', handleUpdatedMessage);
                socket.off('message:deleted', handleDeletedMessage);
                socket.off('typing:start', handleTypingStart);
                socket.off('typing:stop', handleTypingStop);
                socket.off('message:reacted', handleReactedMessage);
                socket.off('presence:online', handlePresenceOnline);
                socket.off('presence:offline', handlePresenceOffline);
                socket.off('game:updated', handleGameUpdated);
                socket.off('game:created', handleGameCreated);
                socket.off('game:rematch', handleGameRematch);
                socket.off('voice:user-joined', handleVoiceJoined);
                socket.off('voice:user-left', handleVoiceLeft);
                socket.off('music:sync', handleMusicSync);
                socket.off('stream:user-joined', handleStreamJoined);
                socket.off('stream:user-left', handleStreamLeft);
                socket.off('music:host-changed', handleHostChanged);
                socket.off('presence:status-changed', handleStatusChanged);
                socket.off('message:pinned', handleMessagePinned);
            }
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
    const joinMusicRoom = useCallback((roomId, isServerOwner = false) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('stream:join', { roomId, isServerOwner });
            setMusicRoom({ roomId, users: [], track: null, isPlaying: false, currentTime: 0, hostUserId: null, ownerUserId: null });
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
        joinVoiceChannel, leaveVoiceChannel, voiceUsers,
        createGame, joinGame, makeGameMove, requestRematch,
        joinMusicRoom, syncMusic, leaveMusicRoom, musicRoom,
    };
}


