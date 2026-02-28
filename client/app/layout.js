'use client';

import { Provider } from 'react-redux';
import { store } from '../redux/store';
import { Toaster } from 'react-hot-toast';
import { NotificationProvider } from '../components/NotificationProvider';
import './globals.css';

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark">
            <head>
                <title>ServerChat - Real-Time Communication Platform</title>
                <meta name="description" content="Discord-like real-time communication and entertainment platform" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#5865F2" />
            </head>
            <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
                <Provider store={store}>
                    <NotificationProvider>
                        {children}
                    </NotificationProvider>
                    <Toaster
                        position="top-right"
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
