'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUsers, FiCalendar, FiMessageCircle, FiShield } from 'react-icons/fi';
import api from '../services/api';

export default function UserProfileModal({ userId, onClose }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        (async () => {
            try {
                const { data } = await api.get(`/users/${userId}`);
                setProfile(data.user || data);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [userId]);

    if (!userId) return null;

    const roleBadges = {
        admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        moderator: { label: 'Moderator', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        user: { label: 'Member', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    };

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#111427] border border-white/10 rounded-2xl w-[360px] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative">
                        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : profile ? (
                        <div className="relative">
                            {/* Avatar */}
                            <div className="absolute -top-10 left-5">
                                <div className="w-20 h-20 rounded-full bg-indigo-500 border-4 border-[#111427] flex items-center justify-center text-2xl font-bold">
                                    {profile.avatar?.url ? (
                                        <img src={profile.avatar.url} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (profile.username?.[0] || 'U').toUpperCase()}
                                </div>
                                <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-3 border-[#111427] ${profile.status === 'online' ? 'bg-emerald-400' : profile.status === 'idle' ? 'bg-amber-400' : profile.status === 'dnd' ? 'bg-red-400' : 'bg-white/20'}`} />
                            </div>

                            <div className="pt-12 px-5 pb-5">
                                {/* Name & Role */}
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-xl font-bold text-white">{profile.username}</h2>
                                    {profile.role && roleBadges[profile.role] && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${roleBadges[profile.role].color}`}>
                                            {roleBadges[profile.role].label}
                                        </span>
                                    )}
                                </div>

                                {/* Status */}
                                {profile.customStatus && (
                                    <p className="text-sm text-white/40 mb-3">{profile.customStatus}</p>
                                )}

                                <div className="w-full h-px bg-white/10 my-3" />

                                {/* Bio */}
                                {profile.bio && (
                                    <div className="mb-3">
                                        <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1">About Me</h4>
                                        <p className="text-sm text-white/60">{profile.bio}</p>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-white/40">
                                        <FiCalendar className="w-4 h-4" />
                                        <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    {profile.friends && (
                                        <div className="flex items-center gap-2 text-sm text-white/40">
                                            <FiUsers className="w-4 h-4" />
                                            <span>{profile.friends.length} friends</span>
                                        </div>
                                    )}
                                </div>

                                {/* Mutual Friends */}
                                {profile.friends?.length > 0 && (
                                    <div className="mt-3">
                                        <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">Friends</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {profile.friends.slice(0, 6).map((f, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-500/60 flex items-center justify-center text-[9px] font-bold">
                                                        {(f.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-xs text-white/50">{f.username}</span>
                                                </div>
                                            ))}
                                            {profile.friends.length > 6 && (
                                                <span className="text-xs text-white/20 self-center ml-1">+{profile.friends.length - 6} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-white/30">User not found</div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
