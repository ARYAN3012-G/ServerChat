'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMessageSquare, FiCalendar, FiActivity, FiUser } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import api from '../services/api';

export default function UserProfilePopup({ userId, username, onClose, onMessage }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { onlineUsers } = useSelector((s) => s.chat);

    useEffect(() => {
        if (!userId) return;
        const fetchProfile = async () => {
            try {
                const { data } = await api.get(`/users/${userId}`);
                setProfile(data.user || data);
            } catch (e) {
                // Fallback to just username
                setProfile({ username: username || 'User', createdAt: null });
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [userId, username]);

    const isOnline = onlineUsers?.includes(userId);
    const statusColor = isOnline ? 'bg-emerald-400' : 'bg-white/20';
    const statusText = isOnline ? (profile?.status === 'dnd' ? 'Do Not Disturb' : profile?.status === 'idle' ? 'Idle' : 'Online') : 'Offline';

    const memberSince = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '—';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-dark-800 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white/70 hover:text-white transition-colors"
                        >
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Avatar */}
                    <div className="px-5 -mt-10 relative z-10">
                        <div className="relative inline-block">
                            <div className="w-20 h-20 rounded-full bg-dark-700 border-4 border-dark-800 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                                {profile?.avatar ? (
                                    <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    (profile?.username || '?')[0].toUpperCase()
                                )}
                            </div>
                            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-[3px] border-dark-800 ${statusColor}`} />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="px-5 pt-3 pb-5">
                        {loading ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-6 w-32 bg-white/5 rounded-lg" />
                                <div className="h-4 w-24 bg-white/5 rounded-lg" />
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-white">{profile?.username}</h3>
                                <p className="text-sm text-white/30">{profile?.email || ''}</p>

                                {profile?.customStatus && (
                                    <div className="mt-3 flex items-center gap-2 text-sm text-white/50">
                                        <FiActivity className="w-3.5 h-3.5" />
                                        <span>{profile.customStatus}</span>
                                    </div>
                                )}

                                {profile?.bio && (
                                    <div className="mt-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                        <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-1">About Me</p>
                                        <p className="text-sm text-white/60">{profile.bio}</p>
                                    </div>
                                )}

                                <div className="mt-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                                    <p className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-1.5">Info</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <FiUser className="w-3.5 h-3.5 text-white/20" />
                                            <span className="text-white/40">Status:</span>
                                            <span className={`font-medium ${isOnline ? 'text-emerald-400' : 'text-white/30'}`}>{statusText}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <FiCalendar className="w-3.5 h-3.5 text-white/20" />
                                            <span className="text-white/40">Member since:</span>
                                            <span className="text-white/60">{memberSince}</span>
                                        </div>
                                        {profile?.role && profile.role !== 'user' && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                    {profile.role}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {onMessage && (
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => { onMessage(userId); onClose(); }}
                                        className="w-full mt-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FiMessageSquare className="w-4 h-4" />
                                        Send Message
                                    </motion.button>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
