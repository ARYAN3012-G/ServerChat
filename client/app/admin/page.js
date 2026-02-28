'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiUsers, FiServer, FiMessageSquare, FiActivity, FiShield, FiSlash, FiTrash2, FiSearch } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function AdminPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data.users || []);
        } catch (e) { console.error(e); }
    };

    const handleBanUser = async (userId) => {
        if (!confirm('Ban this user?')) return;
        try {
            await api.post(`/admin/ban/${userId}`);
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Permanently delete this user? This cannot be undone.')) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = [
        { label: 'Total Users', value: users.length, icon: FiUsers, color: 'bg-blue-500' },
        { label: 'Online Users', value: users.filter(u => u.status === 'online').length, icon: FiActivity, color: 'bg-discord-green' },
        { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: FiShield, color: 'bg-amber-500' },
        { label: 'Banned', value: users.filter(u => u.isBanned).length, icon: FiSlash, color: 'bg-red-500' },
    ];

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiActivity },
        { id: 'users', label: 'Users', icon: FiUsers },
    ];

    return (
        <div className="flex h-screen bg-dark-800 text-white">
            {/* Sidebar */}
            <div className="w-56 bg-dark-800 border-r border-dark-900 flex flex-col">
                <div className="h-12 px-4 flex items-center border-b border-dark-900">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors text-sm">
                        <FiArrowLeft className="w-4 h-4" /> Back
                    </button>
                </div>
                <div className="flex-1 p-2">
                    <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide px-3 py-2">Admin Panel</p>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 ${activeTab === t.id ? 'bg-dark-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto p-8">
                    {activeTab === 'overview' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                {stats.map((s, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                        className="bg-dark-700 rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-dark-400 text-sm">{s.label}</span>
                                            <div className={`w-8 h-8 ${s.color} rounded-lg flex items-center justify-center`}>
                                                <s.icon className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-3xl font-bold">{s.value}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Quick user activity chart placeholder */}
                            <div className="bg-dark-700 rounded-xl p-6">
                                <h3 className="font-semibold mb-4">User Activity (Last 7 Days)</h3>
                                <div className="flex items-end gap-2 h-32">
                                    {[35, 52, 48, 61, 45, 72, 58].map((h, i) => (
                                        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.05 }}
                                            className="flex-1 bg-primary-500/30 rounded-t-md relative group cursor-pointer hover:bg-primary-500/50">
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-dark-400 opacity-0 group-hover:opacity-100 transition-opacity">{h}</div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-dark-500">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6">User Management</h2>
                            <div className="mb-4 relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..."
                                    className="w-full bg-dark-700 rounded-lg pl-10 pr-4 py-3 text-sm outline-none text-white placeholder-dark-400" />
                            </div>
                            <div className="bg-dark-700 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wide border-b border-dark-600">
                                    <span className="col-span-4">User</span>
                                    <span className="col-span-2">Role</span>
                                    <span className="col-span-2">Status</span>
                                    <span className="col-span-2">Joined</span>
                                    <span className="col-span-2">Actions</span>
                                </div>
                                {filteredUsers.map(u => (
                                    <div key={u._id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-dark-600/50 transition-colors border-b border-dark-600/50">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">{u.username?.[0]?.toUpperCase()}</div>
                                            <div>
                                                <p className="text-sm font-medium">{u.username}</p>
                                                <p className="text-xs text-dark-400">{u.email}</p>
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-dark-600 text-dark-300'}`}>
                                                {u.role || 'user'}
                                            </span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className={`flex items-center gap-1 text-xs ${u.status === 'online' ? 'text-discord-green' : 'text-dark-400'}`}>
                                                <span className={`w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-discord-green' : 'bg-dark-400'}`} /> {u.status || 'offline'}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-xs text-dark-400">{new Date(u.createdAt).toLocaleDateString()}</div>
                                        <div className="col-span-2 flex gap-2">
                                            <button onClick={() => handleBanUser(u._id)} className="p-1.5 rounded hover:bg-dark-500 text-dark-300 hover:text-amber-400 transition-colors" title="Ban"><FiSlash className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteUser(u._id)} className="p-1.5 rounded hover:bg-dark-500 text-dark-300 hover:text-red-400 transition-colors" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                {filteredUsers.length === 0 && <div className="p-8 text-center text-dark-400">No users found</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
