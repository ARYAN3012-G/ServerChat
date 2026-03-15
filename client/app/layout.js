'use client';

import { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '../redux/store';
import { Toaster } from 'react-hot-toast';
import NotificationProvider from '../components/NotificationProvider';
import CallProvider from '../components/CallProvider';
import BackgroundRenderer from '../components/BackgroundRenderer';
import './globals.css';

export default function RootLayout({ children }) {
    const [toastPosition, setToastPosition] = useState('top-right');

    useEffect(() => {
        const handleResize = () => {
            setToastPosition(window.innerWidth < 768 ? 'top-center' : 'top-right');
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <html lang="en" className="dark">
            <head>
                {/* Primary SEO */}
                <title>ServerChat - Real-Time Communication Platform</title>
                <meta name="description" content="ServerChat is a modern real-time communication platform with text channels, voice & video calls, built-in games, watch parties, and more. Connect with your team instantly." />
                <meta name="keywords" content="chat, real-time, communication, voice call, video call, channels, gaming, watch party, team chat, messaging" />
                <meta name="author" content="Aryan Rajesh Gadam" />
                <meta name="robots" content="index, follow" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="canonical" href="https://server-chat-chi.vercel.app/" />

                {/* Favicon & PWA */}
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#040407" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

                {/* Open Graph (Facebook, WhatsApp, Discord link previews) */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://server-chat-chi.vercel.app/" />
                <meta property="og:title" content="ServerChat - Real-Time Communication Platform" />
                <meta property="og:description" content="Chat, voice & video calls, built-in games, watch parties, and more. Connect with your team instantly." />
                <meta property="og:site_name" content="ServerChat" />
                <meta property="og:locale" content="en_US" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="ServerChat - Real-Time Communication Platform" />
                <meta name="twitter:description" content="Chat, voice & video calls, built-in games, watch parties, and more. Connect with your team instantly." />
            </head>
            <body className="bg-transparent text-[var(--text-primary)] antialiased">
                <Provider store={store}>
                    <CallProvider>
                        <BackgroundRenderer />
                        <NotificationProvider />
                        {children}
                    </CallProvider>
                    <Toaster
                        position={toastPosition}
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#1e293b',
                                color: '#f2f3f5',
                                borderRadius: '12px',
                                border: '1px solid #334155',
                            },
                        }}
                    />
                </Provider>
            </body>
        </html>
    );
}
