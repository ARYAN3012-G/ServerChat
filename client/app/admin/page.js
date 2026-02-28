'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiShield, FiSearch, FiBarChart2, FiAlertTriangle, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function AdminPage() {
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    const [tab, setTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (isAuthenticated) { fetchStats(); fetchUsers(); } }, [isAuthenticated]);

    const fetchStats = async () => { try { const { data } = await api.get('/admin/dashboard'); setStats(data); } catch (e) { console.error(e); } };
    const fetchUsers = async () => { try { const { data } = await api.get('/admin/users'); setUsers(data.users || data || []); } catch (e) { console.error(e); } };

    const handleBanUser = async (userId) => {
        if (!confirm('Ban this user?')) return;
        try { await api.post(`/admin/ban/${userId}`); fetchUsers(); } catch (e) { console.error(e); }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Delete this user permanently?')) return;
        try { await api.delete(`/admin/users/${userId}`); fetchUsers(); } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u => (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers || 0, color: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-500/20', icon: FiUsers },
        { label: 'Online Now', value: stats.onlineUsers || 0, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', icon: FiTrendingUp },
        { label: 'Admins', value: stats.admins || 0, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', icon: FiShield },
        { label: 'Banned', value: stats.bannedUsers || 0, color: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/20', icon: FiAlertTriangle },
    ] : [];

    if (loading) return <div className="flex h-screen items-center justify-center bg-dark-900"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 bg-dark-800 border-r border-white/5 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-4"><FiArrowLeft className="w-4 h-4" /> Back to Chat</button>
                    <h2 className="text-lg font-bold flex items-center gap-2"><FiShield className="w-5 h-5 text-amber-400" /> Admin</h2>
                </div>
                <div className="flex-1 p-2 space-y-1">
                    <button onClick={() => setTab('overview')} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'overview' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}><FiBarChart2 className="w-4 h-4" /> Overview</button>
                    <button onClick={() => setTab('users')} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'users' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}><FiUsers className="w-4 h-4" /> Users</button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <AnimatePresence mode="wait">
                    {/* OVERVIEW */}
                    {tab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">Dashboard Overview</h3>
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {statCards.map((card, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                        className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 shadow-xl ${card.shadow} relative overflow-hidden`}>
                                        <div className="absolute top-3 right-3 opacity-20"><card.icon className="w-8 h-8" /></div>
                                        <p className="text-white/70 text-sm font-medium">{card.label}</p>
                                        <p className="text-3xl font-black mt-2">{card.value}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Activity Chart */}
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
                                <h4 className="text-lg font-semibold mb-6">User Activity (Last 7 days)</h4>
                                <div className="flex items-end gap-3 h-48">
                                    {[65, 45, 78, 52, 90, 70, 85].map((h, i) => (
                                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.1, duration: 0.5 }}
                                            className="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-400/30 rounded-t-lg relative group cursor-pointer">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">{h}</div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-3">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                        <div key={d} className="flex-1 text-center text-xs text-white/30">{d}</div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* USERS */}
                    {tab === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold">User Management</h3>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..."
                                        className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none text-white placeholder-white/20 focus:ring-2 focus:ring-indigo-500 w-64" />
                                </div>
                            </div>

                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">User</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Role</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Status</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Joined</th>
                                            <th className="text-right px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u, i) => (
                                            <motion.tr key={u._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-500/40 flex items-center justify-center text-sm font-bold">{(u.username || '?')[0].toUpperCase()}</div>
                                                        <div><p className="font-medium text-sm">{u.username}</p><p className="text-xs text-white/30">{u.email}</p></div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-white/40 border border-white/10'}`}>{u.role || 'user'}</span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <span className={`flex items-center gap-1.5 text-sm ${u.isBanned ? 'text-red-400' : u.status === 'online' ? 'text-emerald-400' : 'text-white/30'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${u.isBanned ? 'bg-red-400' : u.status === 'online' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                                        {u.isBanned ? 'Banned' : u.status || 'offline'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-white/30">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleBanUser(u._id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors">{u.isBanned ? 'Unban' : 'Ban'}</button>
                                                        <button onClick={() => handleDeleteUser(u._id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"><FiTrash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && <div className="text-center py-10 text-white/30">No users found</div>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
