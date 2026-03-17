'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUsers, FiCalendar, FiMessageCircle, FiShield, FiSlash, FiPhone, FiVideo } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function UserProfileModal({ userId, onClose, onVoiceCall, onVideoCall }) {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blocking, setBlocking] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        setError(false);
        (async () => {
            try {
                const { data } = await api.get(`/users/${userId}`);
                setProfile(data.user || data);
            } catch (e) {
                console.error('Profile fetch error:', e);
                setError(true);
            }
            setLoading(false);
        })();
    }, [userId]);

    if (!userId) return null;

    const handleBlockUser = async () => {
        if (blocking) return;
        setBlocking(true);
        try {
            if (isBlocked) {
                await api.delete(`/users/block/${userId}`);
                setIsBlocked(false);
                toast.success('User unblocked');
            } else {
                await api.post(`/users/block/${userId}`);
                setIsBlocked(true);
                toast.success('User blocked');
            }
        } catch (e) { toast.error('Failed to update block status'); }
        setBlocking(false);
    };

    const handleMessageUser = async () => {
        try {
            const { data } = await api.post('/channels/dm', { targetUserId: userId });
            const dmChannel = data.channel || data;
            onClose();
            router.push(`/dms?open=${dmChannel._id}`);
        } catch (e) { toast.error('Failed to start DM'); }
    };

    // Safely extract customStatus text
    const getStatusText = (status) => {
        if (!status) return null;
        if (typeof status === 'string') return status;
        if (typeof status === 'object' && status.text) return status.text;
        return null;
    };

    // Safely format a date
    const formatDate = (dateStr) => {
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Unknown';
            return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } catch {
            return 'Unknown';
        }
    };

    // Safely get friends list (filter out non-populated entries)
    const getFriends = (friends) => {
        if (!Array.isArray(friends)) return [];
        return friends.filter(f => f && typeof f === 'object' && f.username);
    };

    const roleBadges = {
        admin: { label: 'Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        moderator: { label: 'Moderator', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        user: { label: 'Member', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
    };

    const statusText = profile ? getStatusText(profile.customStatus) : null;
    const friends = profile ? getFriends(profile.friends) : [];

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#111427] border border-white/10 rounded-2xl w-full max-w-[360px] mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500 relative">
                        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : error || !profile ? (
                        <div className="p-8 text-center text-white/30">
                            {error ? 'Failed to load profile' : 'User not found'}
                        </div>
                    ) : (
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
                                    <h2 className="text-xl font-bold text-white">{profile.username || 'Unknown User'}</h2>
                                    {profile.role && roleBadges[profile.role] && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${roleBadges[profile.role].color}`}>
                                            {roleBadges[profile.role].label}
                                        </span>
                                    )}
                                </div>

                                {/* Status */}
                                {statusText && (
                                    <p className="text-sm text-white/40 mb-3">{statusText}</p>
                                )}

                                <div className="w-full h-px bg-white/10 my-3" />

                                {/* Bio */}
                                {profile.bio && (
                                    <div className="mb-3">
                                        <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-1">About Me</h4>
                                        <p className="text-sm text-white/60">{typeof profile.bio === 'string' ? profile.bio : ''}</p>
                                    </div>
                                )}

                                {/* Info */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-white/40">
                                        <FiCalendar className="w-4 h-4" />
                                        <span>Joined {formatDate(profile.createdAt)}</span>
                                    </div>
                                    {friends.length > 0 && (
                                        <div className="flex items-center gap-2 text-sm text-white/40">
                                            <FiUsers className="w-4 h-4" />
                                            <span>{friends.length} friends</span>
                                        </div>
                                    )}
                                </div>

                                {/* Friends */}
                                {friends.length > 0 && (
                                    <div className="mt-3">
                                        <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-2">Friends</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {friends.slice(0, 6).map((f, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1">
                                                    <div className="w-5 h-5 rounded-full bg-indigo-500/60 flex items-center justify-center text-[9px] font-bold">
                                                        {(f.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-xs text-white/50">{f.username}</span>
                                                </div>
                                            ))}
                                            {friends.length > 6 && (
                                                <span className="text-xs text-white/20 self-center ml-1">+{friends.length - 6} more</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
                                    <button onClick={handleMessageUser}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20">
                                        <FiMessageCircle className="w-3.5 h-3.5" />
                                        Send Message
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => onVoiceCall?.(userId)}
                                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20">
                                            <FiPhone className="w-3.5 h-3.5" />
                                            Voice Call
                                        </button>
                                        <button onClick={() => onVideoCall?.(userId)}
                                            className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20">
                                            <FiVideo className="w-3.5 h-3.5" />
                                            Video Call
                                        </button>
                                    </div>
                                    <button onClick={handleBlockUser} disabled={blocking}
                                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors ${isBlocked ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'}`}>
                                        <FiSlash className="w-3.5 h-3.5" />
                                        {blocking ? 'Processing...' : isBlocked ? 'Unblock User' : 'Block User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
