'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { getSocket } from '../services/socket';
import { setCurrentChannel } from '../redux/chatSlice';
import { setCurrentServer } from '../redux/serverSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function NotificationProvider() {
    const { user } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const router = useRouter();
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

    // Navigate to a specific server + channel
    const navigateToChannel = useCallback(async (serverId, channelId) => {
        try {
            if (serverId) {
                // Fetch full server details and set it as current
                const { data: serverData } = await api.get(`/servers/${serverId}`);
                dispatch(setCurrentServer(serverData));

                // Find the channel in the server's channels
                const targetChannel = serverData.channels?.find(ch => ch._id === channelId);
                if (targetChannel) {
                    dispatch(setCurrentChannel(targetChannel));
                } else if (channelId) {
                    // Channel not in server data — fetch directly
                    try {
                        const { data: channelData } = await api.get(`/channels/${channelId}`);
                        dispatch(setCurrentChannel(channelData));
                    } catch (e) {
                        // Fallback: at least set the server and go to first channel
                        if (serverData.channels?.length > 0) {
                            dispatch(setCurrentChannel(serverData.channels[0]));
                        }
                    }
                }
            } else if (channelId) {
                // DM or no server — just set the channel
                try {
                    const { data: channelData } = await api.get(`/channels/${channelId}`);
                    dispatch(setCurrentChannel(channelData));
                } catch (e) { /* ignore */ }
            }

            // Navigate to channels page
            router.push('/channels');
        } catch (e) {
            console.error('Failed to navigate to mention:', e);
            // At least navigate to channels
            router.push('/channels');
        }
    }, [dispatch, router]);

    // Generate notification sound using Web Audio API (no external file needed)
    const playSound = useCallback((type = 'message') => {
        try {
            const ctx = audioContextRef.current || new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = ctx;

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const now = ctx.currentTime;

            if (type === 'mention') {
                // More urgent triple-tone for mentions
                for (let i = 0; i < 3; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200 + (i * 200), now + (i * 0.12));
                    gain.gain.setValueAtTime(0.2, now + (i * 0.12));
                    gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.12) + 0.2);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + (i * 0.12));
                    osc.stop(now + (i * 0.12) + 0.2);
                }
            } else {
                // Standard two-tone notification chime
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
            }
        } catch (e) {
            // Ignore autoplay restrictions
        }
    }, []);

    const showBrowserNotification = useCallback((title, body, icon, onClick) => {
        if (!hasPermission.current || typeof window === 'undefined') return;
        if (document.hasFocus()) return; // Don't show if user is focused on tab

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
                if (onClick) onClick();
            };

            setTimeout(() => notification.close(), 5000);
        } catch (e) {
            // Ignore notification errors
        }
    }, []);

    // Listen for new messages and mentions via socket
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !user) return;

        // Standard message notification
        const handleNewMessage = (message) => {
            const senderId = message.sender?._id || message.sender;
            if (senderId === user._id) return;

            // Check if user is mentioned
            const isMentioned = message.content?.includes(`@${user.username}`);
            
            if (isMentioned) {
                playSound('mention');
                const senderName = message.sender?.username || 'Someone';
                toast(
                    (t) => (
                        <div
                            onClick={() => { toast.dismiss(t.id); navigateToChannel(null, message.channel); }}
                            style={{ cursor: 'pointer' }}
                        >
                            <strong>🔔 {senderName}</strong> mentioned you!
                            <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>
                                {message.content?.length > 60 ? message.content.slice(0, 60) + '…' : message.content}
                            </p>
                            <p style={{ fontSize: '10px', opacity: 0.4, marginTop: '4px' }}>Tap to go there →</p>
                        </div>
                    ),
                    {
                        style: { background: '#1a1b2e', color: '#fff', border: '1px solid rgba(99, 102, 241, 0.3)' },
                        duration: 6000,
                    }
                );
                showBrowserNotification(
                    `@${user.username} mentioned by ${senderName}`,
                    message.content?.length > 100 ? message.content.slice(0, 100) + '…' : message.content,
                    null,
                    () => navigateToChannel(null, message.channel)
                );
            } else {
                playSound('message');
                const senderName = message.sender?.username || 'Someone';
                const content = message.content || (message.attachments?.length > 0 ? '📎 Sent an attachment' : 'Sent a message');
                showBrowserNotification(
                    `New message from ${senderName}`,
                    content.length > 100 ? content.slice(0, 100) + '…' : content
                );
            }
        };

        // Targeted @mention notification (from server — works even in other channels)
        const handleMentionNotification = ({ message, mentionedBy, channelId, channelName, serverId }) => {
            playSound('mention');

            const channelLabel = channelName ? `#${channelName}` : '';

            toast(
                (t) => (
                    <div
                        onClick={() => { toast.dismiss(t.id); navigateToChannel(serverId, channelId); }}
                        style={{ cursor: 'pointer' }}
                    >
                        <strong>🔔 @{user.username}</strong> — {mentionedBy} mentioned you!
                        {channelLabel && <span style={{ fontSize: '11px', opacity: 0.5 }}> in {channelLabel}</span>}
                        <p style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>
                            {message?.content?.length > 60 ? message.content.slice(0, 60) + '…' : (message?.content || '')}
                        </p>
                        <p style={{ fontSize: '10px', opacity: 0.4, marginTop: '4px' }}>Tap to go there →</p>
                    </div>
                ),
                {
                    style: { background: '#1a1b2e', color: '#fff', border: '1px solid rgba(99, 102, 241, 0.3)' },
                    duration: 6000,
                }
            );

            showBrowserNotification(
                `@${user.username} mentioned by ${mentionedBy}${channelLabel ? ` in ${channelLabel}` : ''}`,
                message?.content?.slice(0, 100) || 'You were mentioned in a message',
                null,
                () => navigateToChannel(serverId, channelId)
            );
        };

        // Incoming call sound
        const handleIncomingCall = () => {
            playSound('mention'); // Use urgent tone for calls
        };

        socket.on('message:new', handleNewMessage);
        socket.on('notification:mention', handleMentionNotification);
        socket.on('call:incoming', handleIncomingCall);

        return () => {
            socket.off('message:new', handleNewMessage);
            socket.off('notification:mention', handleMentionNotification);
            socket.off('call:incoming', handleIncomingCall);
        };
    }, [user, playSound, showBrowserNotification, navigateToChannel]);

    return null; // No DOM needed — uses Web Audio API
}
