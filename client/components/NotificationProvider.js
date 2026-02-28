'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiInfo, FiAlertTriangle, FiBell } from 'react-icons/fi';

const NotificationContext = createContext();

export function useNotification() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { ...notification, id }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, notification.duration || 4000);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const notify = {
        success: (title, message) => addNotification({ type: 'success', title, message }),
        error: (title, message) => addNotification({ type: 'error', title, message }),
        info: (title, message) => addNotification({ type: 'info', title, message }),
        warning: (title, message) => addNotification({ type: 'warning', title, message }),
    };

    const icons = { success: FiCheck, error: FiX, info: FiInfo, warning: FiAlertTriangle };
    const colors = {
        success: 'bg-discord-green/20 border-discord-green/30 text-discord-green',
        error: 'bg-red-500/20 border-red-500/30 text-red-400',
        info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    };
    const iconColors = {
        success: 'bg-discord-green text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-amber-500 text-white',
    };

    return (
        <NotificationContext.Provider value={notify}>
            {children}
            {/* Toast container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                <AnimatePresence>
                    {notifications.map(n => {
                        const Icon = icons[n.type] || FiBell;
                        return (
                            <motion.div
                                key={n.id}
                                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg border backdrop-blur-sm shadow-xl ${colors[n.type]}`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColors[n.type]}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {n.title && <p className="text-sm font-semibold text-white">{n.title}</p>}
                                    {n.message && <p className="text-xs opacity-80 mt-0.5">{n.message}</p>}
                                </div>
                                <button onClick={() => removeNotification(n.id)} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
                                    <FiX className="w-4 h-4" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
}
