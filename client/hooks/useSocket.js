'use client';

import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { addMessage, updateMessage, removeMessage, setTypingUser, addOnlineUser, removeOnlineUser, updateReactions } from '../redux/chatSlice';
import { setGameSession } from '../redux/gameSlice';

export function useSocket() {
    const dispatch = useDispatch();
    const { token } = useSelector((state) => state.auth);

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

        return () => {
            disconnectSocket();
        };
    }, [token, dispatch]);

    const sendMessage = useCallback((channelId, content, type = 'text', attachments = [], replyTo = null, threadId = null) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('message:send', { channelId, content, type, attachments, replyTo, threadId });
        }
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

    return {
        sendMessage,
        joinChannel,
        leaveChannel,
        startTyping,
        stopTyping,
        reactToMessage,
    };
}
