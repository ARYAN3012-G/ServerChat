'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSlash, FiUserCheck } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function BlockedUsersTab() {
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unblocking, setUnblocking] = useState(null);

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            const { data } = await api.get('/users/blocked');
            setBlockedUsers(data.blockedUsers || []);
        } catch (e) {
            console.error('Failed to fetch blocked users:', e);
        }
        setLoading(false);
    };

    const handleUnblock = async (userId) => {
        setUnblocking(userId);
        try {
            await api.delete(`/users/block/${userId}`);
            setBlockedUsers(prev => prev.filter(u => u._id !== userId));
            toast.success('User unblocked');
        } catch (e) {
            toast.error('Failed to unblock user');
        }
        setUnblocking(null);
    };

    return (
        <motion.div key="blocked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <h3 className="text-2xl font-bold mb-8">Blocked Users</h3>
            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                <p className="text-sm text-white/40 mb-6">
                    Users you have blocked cannot send you messages, friend requests, or call you.
                </p>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : blockedUsers.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <FiUserCheck className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-white/30 text-sm">You haven't blocked anyone</p>
                        <p className="text-white/15 text-xs mt-1">Blocked users will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {blockedUsers.map(user => (
                            <div key={user._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-sm font-bold text-red-400">
                                        {user.avatar?.url ? (
                                            <img src={user.avatar.url} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (user.username?.[0] || 'U').toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{user.username || 'Unknown'}</p>
                                        <p className="text-[10px] text-white/30">Blocked</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnblock(user._id)}
                                    disabled={unblocking === user._id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-50"
                                >
                                    <FiSlash className="w-3 h-3" />
                                    {unblocking === user._id ? 'Unblocking...' : 'Unblock'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
