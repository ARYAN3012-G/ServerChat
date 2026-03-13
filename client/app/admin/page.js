'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiShield, FiSearch, FiBarChart2, FiAlertTriangle, FiTrendingUp, FiActivity, FiFileText, FiPlay, FiMenu } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function AdminPage() {
    const router = useRouter();
    const { isAuthenticated, loading } = useAuth();
    const [tab, setTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activityLogs, setActivityLogs] = useState([]);
    const [adminLogs, setAdminLogs] = useState([]);
    const [gameActivity, setGameActivity] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (isAuthenticated) { fetchStats(); fetchUsers(); } }, [isAuthenticated]);

    const fetchStats = async () => { try { const { data } = await api.get('/admin/dashboard'); setStats(data.stats || data); } catch (e) { console.error(e); } };
    const fetchUsers = async () => { try { const { data } = await api.get('/admin/users'); setUsers(data.users || data || []); } catch (e) { console.error(e); } };
    const fetchActivityLogs = async () => { try { const { data } = await api.get('/admin/logs/login'); setActivityLogs(data.logs || []); } catch (e) { console.error(e); } };
    const fetchAdminLogs = async () => { try { const { data } = await api.get('/admin/logs/admin'); setAdminLogs(data.logs || []); } catch (e) { console.error(e); } };
    const fetchGameActivity = async () => { try { const { data } = await api.get('/admin/logs/games'); setGameActivity(data.games || []); } catch (e) { console.error(e); } };

    useEffect(() => {
        if (!isAuthenticated) return;
        if (tab === 'activity') fetchActivityLogs();
        if (tab === 'audit') fetchAdminLogs();
        if (tab === 'games') fetchGameActivity();
    }, [tab, isAuthenticated]);

    const handleBanUser = async (userId, isBanned) => {
        if (!confirm(isBanned ? 'Unban this user?' : 'Ban this user?')) return;
        try {
            const endpoint = isBanned ? `/admin/unban/${userId}` : `/admin/ban/${userId}`;
            await api.post(endpoint);
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u => (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()));

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers || 0, color: 'from-white/10 to-white/5', shadow: 'shadow-white/5', icon: FiUsers },
        { label: 'Online Now', value: stats.onlineUsers || 0, color: 'from-emerald-500/20 to-emerald-500/5', shadow: 'shadow-emerald-500/10', icon: FiTrendingUp },
        { label: 'Total Messages', value: stats.totalMessages || 0, color: 'from-white/10 to-white/5', shadow: 'shadow-white/5', icon: FiActivity },
        { label: 'Messages 24h', value: stats.messagesDay || 0, color: 'from-sky-500/20 to-sky-500/5', shadow: 'shadow-sky-500/10', icon: FiActivity },
        { label: 'Total Channels', value: stats.totalChannels || 0, color: 'from-white/10 to-white/5', shadow: 'shadow-white/5', icon: FiBarChart2 },
        { label: 'Active Games', value: stats.activeGames || 0, color: 'from-amber-500/20 to-amber-500/5', shadow: 'shadow-amber-500/10', icon: FiPlay },
        { label: 'Total Games', value: stats.totalGames || 0, color: 'from-white/10 to-white/5', shadow: 'shadow-white/5', icon: FiPlay },
        { label: 'New This Week', value: stats.newUsersWeek || 0, color: 'from-white/10 to-white/5', shadow: 'shadow-white/5', icon: FiAlertTriangle },
        { label: 'Total Revenue', value: `$${stats.totalRevenue || 0}`, color: 'from-emerald-500/20 to-emerald-500/5', shadow: 'shadow-emerald-500/10', icon: FiBarChart2 },
    ] : [];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiBarChart2 },
        { id: 'users', label: 'Users', icon: FiUsers },
        { id: 'activity', label: 'Activity Logs', icon: FiActivity },
        { id: 'audit', label: 'Admin Audit', icon: FiFileText },
        { id: 'games', label: 'Game Activity', icon: FiPlay },
    ];

    const actionColors = {
        login: 'text-emerald-400 bg-emerald-500/10', logout: 'text-white/40 bg-white/5', register: 'text-blue-400 bg-blue-500/10',
        message_sent: 'text-silver-300 bg-silver-400/10', friend_added: 'text-pink-400 bg-pink-500/10',
        game_finished: 'text-amber-400 bg-amber-500/10', game_started: 'text-amber-400 bg-amber-500/10',
        user_banned: 'text-red-400 bg-red-500/10', user_unbanned: 'text-emerald-400 bg-emerald-500/10',
        user_role_changed: 'text-silver-300 bg-silver-400/10', profile_updated: 'text-sky-400 bg-sky-500/10',
        call_started: 'text-teal-400 bg-teal-500/10', call_ended: 'text-white/40 bg-white/5',
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-[#040407]"><div className="w-10 h-10 border-2 border-silver-400 border-t-transparent rounded-full animate-spin" /></div>;

    // Get weekly activity data from API or default to zeros
    const weeklyActivity = stats?.weeklyActivity || [
        { day: 'Sun', messages: 0, newUsers: 0 },
        { day: 'Mon', messages: 0, newUsers: 0 },
        { day: 'Tue', messages: 0, newUsers: 0 },
        { day: 'Wed', messages: 0, newUsers: 0 },
        { day: 'Thu', messages: 0, newUsers: 0 },
        { day: 'Fri', messages: 0, newUsers: 0 },
        { day: 'Sat', messages: 0, newUsers: 0 },
    ];
    const maxMessages = Math.max(...weeklyActivity.map(d => d.messages), 1);

    return (
        <div className="flex h-screen bg-[#040407] text-white overflow-hidden">
            {/* Mobile overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed inset-y-0 left-0 z-40 w-56 bg-dark-800 border-r border-white/5 flex flex-col h-full transition-transform duration-300 md:relative`}>
                <div className="p-4 border-b border-white/5">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-4"><FiArrowLeft className="w-4 h-4" /> Back to Chat</button>
                    <h2 className="text-lg font-bold flex items-center gap-2"><FiShield className="w-5 h-5 text-amber-400" /> Admin Panel</h2>
                </div>
                <div className="flex-1 p-2 space-y-1">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full relative">
                {/* Mobile header */}
                <div className="md:hidden mb-6 flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><FiShield className="w-5 h-5 text-amber-400" /> Admin Panel</h2>
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-dark-800 border border-white/10 text-white/70 hover:text-white transition-colors">
                        <FiMenu className="w-6 h-6" />
                    </button>
                </div>
                <AnimatePresence mode="wait">
                    {/* OVERVIEW */}
                    {tab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">Dashboard Overview</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                {statCards.map((card, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                                        className={`bg-gradient-to-br ${card.color} rounded-2xl p-6 shadow-xl ${card.shadow} relative overflow-hidden border border-white/[0.06]`}>
                                        <div className="absolute top-3 right-3 opacity-20"><card.icon className="w-8 h-8" /></div>
                                        <p className="text-white/50 text-sm font-medium">{card.label}</p>
                                        <p className="text-3xl font-black mt-2">{card.value}</p>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
                                <h4 className="text-lg font-semibold mb-2">Messages Activity (Last 7 days)</h4>
                                <p className="text-white/30 text-xs mb-6">Real data from your database</p>
                                <div className="flex items-end gap-3 h-48">
                                    {weeklyActivity.map((d, i) => (
                                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${maxMessages > 0 ? (d.messages / maxMessages) * 100 : 0}%` }} transition={{ delay: i * 0.1, duration: 0.5 }}
                                            className="flex-1 bg-gradient-to-t from-white/20 to-white/5 rounded-t-lg relative group cursor-pointer min-h-[4px] border-t border-white/20">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">{d.messages}</div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex gap-3 mt-3">
                                    {weeklyActivity.map(d => (
                                        <div key={d.day} className="flex-1 text-center text-xs text-white/30">{d.day}</div>
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
                                        className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none text-white placeholder-white/20 focus:ring-2 focus:ring-silver-400 w-64" />
                                </div>
                            </div>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
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
                                                        <div className="w-9 h-9 rounded-full bg-silver-400/40 flex items-center justify-center text-sm font-bold">{(u.username || '?')[0].toUpperCase()}</div>
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
                                                    <button onClick={() => handleBanUser(u._id, u.isBanned)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${u.isBanned ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/20'}`}>{u.isBanned ? 'Unban' : 'Ban'}</button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && <div className="text-center py-10 text-white/30">No users found</div>}
                            </div>
                        </motion.div>
                    )}

                    {/* ACTIVITY LOGS (ActivityLog collection) */}
                    {tab === 'activity' && (
                        <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-6">Activity Logs</h3>
                            <p className="text-white/40 text-sm mb-6">User login, register, and other activity events — from <code className="text-silver-300">activitylogs</code> collection</p>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">User</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Action</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">IP Address</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activityLogs.map((log, i) => (
                                            <motion.tr key={log._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-3 text-sm font-medium">{log.user?.username || 'Unknown'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${actionColors[log.action] || 'text-white/40 bg-white/5'}`}>
                                                        {log.action?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-white/30 font-mono">{log.ipAddress || '—'}</td>
                                                <td className="px-6 py-3 text-sm text-white/30">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                                {activityLogs.length === 0 && <div className="text-center py-10 text-white/30">No activity logs yet — logs are created on login, register, and other user actions</div>}
                            </div>
                        </motion.div>
                    )}

                    {/* ADMIN AUDIT LOG (AdminLog collection) */}
                    {tab === 'audit' && (
                        <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-6">Admin Audit Trail</h3>
                            <p className="text-white/40 text-sm mb-6">Every admin action is recorded — from <code className="text-silver-300">adminlogs</code> collection</p>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Admin</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Action</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Details</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminLogs.map((log, i) => (
                                            <motion.tr key={log._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-3 text-sm font-medium">{log.admin?.username || 'Unknown'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${actionColors[log.action] || 'text-white/40 bg-white/5'}`}>
                                                        {log.action?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-white/30 font-mono max-w-xs truncate">{log.details ? JSON.stringify(log.details) : '—'}</td>
                                                <td className="px-6 py-3 text-sm text-white/30">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                                {adminLogs.length === 0 && <div className="text-center py-10 text-white/30">No admin logs yet — logs are created when admins ban/unban users or change roles</div>}
                            </div>
                        </motion.div>
                    )}

                    {/* GAME ACTIVITY (GameSession collection) */}
                    {tab === 'games' && (
                        <motion.div key="games" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-6">Game Activity</h3>
                            <p className="text-white/40 text-sm mb-6">All game sessions & scores — from <code className="text-silver-300">gamesessions</code> collection</p>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 overflow-hidden overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Game</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Players</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Winner</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Status</th>
                                            <th className="text-left px-6 py-4 text-[11px] font-bold text-white/30 uppercase tracking-wider">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gameActivity.map((g, i) => (
                                            <motion.tr key={g._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                                                className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-3">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-silver-400/10 text-silver-300">
                                                        {g.game?.replace(/-/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm">{g.players?.map(p => p.user?.username || 'Unknown').join(', ')}</td>
                                                <td className="px-6 py-3 text-sm text-amber-400">{g.winner?.username || '—'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${g.status === 'finished' ? 'text-emerald-400 bg-emerald-500/10' : g.status === 'in_progress' ? 'text-amber-400 bg-amber-500/10' : 'text-white/30 bg-white/5'}`}>
                                                        {g.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm text-white/30">{g.createdAt ? new Date(g.createdAt).toLocaleString() : '—'}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                                {gameActivity.length === 0 && <div className="text-center py-10 text-white/30">No game sessions recorded yet — play games to generate data!</div>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
