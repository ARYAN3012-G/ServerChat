'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../services/socket';

export default function NotificationProvider() {
    const { user } = useSelector(state => state.auth);
    const audioContextRef = useRef(null);
    const hasPermission = useRef(false);

    // Request browser notification permission on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
                hasPermission.current = true;
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    hasPermission.current = permission === 'granted';
                });
            }
        }
    }, []);

    // Generate notification sound using Web Audio API (no external file needed)
    const playSound = useCallback(() => {
        try {
            const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = ctx;

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // Create a pleasant two-tone notification chime
            const now = ctx.currentTime;

            // First tone (higher)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, now); // A5
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.3);

            // Second tone (slightly lower, delayed)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(0.12, now + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.45);
        } catch (e) {
            // Ignore autoplay restrictions
        }
    }, []);

    const showBrowserNotification = useCallback((title, body, icon) => {
        if (!hasPermission.current || typeof window === 'undefined') return;
        if (document.hasFocus()) return; // Don't show if user is focused

        try {
            const notification = new Notification(title, {
                body,
                icon: icon || '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                tag: 'disco-message',
                renotify: true,
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        } catch (e) {
            // Ignore notification errors
        }
    }, []);

    // Listen for new messages via socket
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !user) return;

        const handleNewMessage = (message) => {
            // Don't notify for own messages
            const senderId = message.sender?._id || message.sender;
            if (senderId === user._id) return;

            playSound();

            const senderName = message.sender?.username || 'Someone';
            const content = message.content || (message.attachments?.length > 0 ? '📎 Sent an attachment' : 'Sent a message');
            showBrowserNotification(
                `New message from ${senderName}`,
                content.length > 100 ? content.slice(0, 100) + '…' : content
            );
        };

        // Also play sound for incoming calls
        const handleIncomingCall = () => {
            playSound();
        };

        socket.on('message:new', handleNewMessage);
        socket.on('call:incoming', handleIncomingCall);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('call:incoming', handleIncomingCall);
        };
    }, [user, playSound, showBrowserNotification]);

    return null; // No DOM needed — uses Web Audio API
}
