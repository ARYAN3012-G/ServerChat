'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../services/socket';

export default function NotificationProvider() {
    const { user } = useSelector(state => state.auth);
    const audioRef = useRef(null);
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

    const playSound = useCallback(() => {
        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(() => { });
            }
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
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
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

        socket.on('message:new', handleNewMessage);

        return () => {
            socket.off('message:new', handleNewMessage);
        };
    }, [user, playSound, showBrowserNotification]);

    return (
        <>
            {/* Notification sound - using a data URI for a short chime */}
            <audio
                ref={audioRef}
                preload="auto"
                src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJaetreogGpifI2dq7Kxnn1yc4SPnq2lnYZzaXKAi5igoZyLfHRydomWo6ernYx/c3N7iZWfoZ+UiX52d3uHkpuhop6Vi390dHyIk52hopyWi4F4dXqFkZyhoZ+Xjod+eHmDj5uhoKCamI6HgHl4gY6an6Cgm5mRioN8eX+MmZ+gn5yakIqEfXl+i5ieoJ+bnZKMhn97fIiXnZ+enZyTjYiCfXyGlZyfnp2dk4+KhX59hJObnp6dnZOQi4eBfYKRmpydnZ2UkYyIg36BkJmcnZydlZKOiYSAf4+YnJ2cnZWTj4qFgX6Ol5ucnZydlZOPi4aCf4yWm5ydnJ2VlJCMiIOAi5WanJ2cnZaVkY2JhIGKlJqcnZydlpWRjYqFgomTmZycnJ2WlZKOi4aCiJKZnJycnJaWk4+MiISHkZicnJycl5aTkI2KhYaQl5ucnJyXl5SRjouGhY+Wm5ycnJeXlJGOjIeEjpWam5ucl5eVkY+MiISNlJqbnJyXl5WSkI2JhYyTmZubnJeYlZOQjYqFi5KZm5ubl5iVk5COioaKkZibm5uXmJWUkY+Lh4mQl5qbm5iYlpSSj4yIiI+Xmpubm5iWlJOQjYmHjpaZm5ubmZeUk5GNioePl5mcm5uYl7aUko+NioeOnJeZmpualpaUkpCOjIqVnJqampqYlpSTkI+NjJWnmZqampiXlJOSkI+NlJiZmpqamJaUk5GQjo2TmpqampmYl5STkZCOjZKZmZqamZiXlZOSkY+OkpiZmpqZmJeVlJKRkI+RmJmampqYl5aUk5GQj5CXmZqamZiXlpSSkZCPkJaYmZmZmJeWlZOSkJGUl5iZmZmYl5aUk5KRkJOWmJmZmZiXlpSTkpGQk5aYmJmZmJeWlJOSkZCTlZiYmJiYl5aVk5OSkJGUl5iYmJiXlpaUk5KRkZOWl5iYmJeWlpSTk5KRkpWXmJiYmJaWlJSTkpGSlZeYmJiYlpaVk5OSkZGUlpeYmJiXlpaUk5OSkZKUlpiYmJiXlpWUk5OSkZKUlpeYmJeXlpWUk5OSkpOUlpiYmJeXlpWUlJOSkpOUlpeXl5eXlpWUlJOSkpOUlpd4eHeXlpaVlJSTk5OUlZaXl5eXlpaVlJSTk5OUlZaXl5eXlpaVlJST"
            />
        </>
    );
}
