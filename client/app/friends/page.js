'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUserPlus, FiUserCheck, FiUserX, FiSearch, FiMessageSquare, FiUsers, FiClock, FiX, FiCheck, FiMenu } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { getSocket } from '../../services/socket';

export default function FriendsPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    const [tab, setTab] = useState('all');
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [addUsername, setAddUsername] = useState('');
    const [addStatus, setAddStatus] = useState(null);
    const { onlineUsers } = useSelector((s) => s.chat);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (isAuthenticated) { fetchFriends(); fetchRequests(); } }, [isAuthenticated]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const handleStatus = () => fetchFriends();
        socket.on('presence:status-changed', handleStatus);
        return () => socket.off('presence:status-changed', handleStatus);
    }, []);

    const fetchFriends = async () => { try { const { data } = await api.get('/friends'); setFriends(data.friends || data || []); } catch (e) { console.error(e); } };
    const fetchRequests = async () => { try { const { data } = await api.get('/friends/requests'); setRequests({ incoming: data.incoming || [], outgoing: data.outgoing || [] }); } catch (e) { console.error(e); } };

    const handleSendRequest = async () => {
        if (!addUsername.trim()) return;
        try { await api.post('/friends/request', { username: addUsername }); setAddStatus({ type: 'success', msg: `Request sent to ${addUsername}!` }); setAddUsername(''); fetchRequests(); }
        catch (e) { setAddStatus({ type: 'error', msg: e.response?.data?.message || 'Failed' }); }
    };

    const handleAccept = async (id) => { try { await api.put(`/friends/accept/${id}`); fetchFriends(); fetchRequests(); } catch (e) { console.error(e); } };
    const handleReject = async (id) => { try { await api.put(`/friends/reject/${id}`); fetchRequests(); } catch (e) { console.error(e); } };
    const handleRemove = async (id) => { if (!confirm('Remove friend?')) return; try { await api.delete(`/friends/${id}`); fetchFriends(); } catch (e) { console.error(e); } };
    const handleMessageFriend = async (friendId) => {
        try {
            await api.post('/channels/dm', { targetUserId: friendId });
            router.push('/dms');
        } catch (e) { console.error(e); }
    };

    const tabs = [
        { id: 'all', label: 'All Friends', icon: FiUsers },
        { id: 'pending', label: 'Pending', icon: FiClock, count: requests.incoming.length },
        { id: 'add', label: 'Add Friend', icon: FiUserPlus },
    ];

    const filteredFriends = friends.filter(f => (f.username || '').toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <div className="flex h-screen items-center justify-center bg-dark-900"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden md:flex w-[72px] bg-dark-950 flex-col items-center py-3 gap-2 border-r border-white/5">
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500 cursor-pointer transition-all" title="Back to Chat">
                    <FiArrowLeft className="w-6 h-6" />
                </motion.div>
            </div>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="h-12 px-4 sm:px-6 flex items-center gap-3 sm:gap-6 border-b border-white/5">
                    <button onClick={() => router.push('/channels')} className="md:hidden text-white/40 hover:text-white transition-colors">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                    <FiUsers className="w-5 h-5 text-white/30 hidden sm:block" />
                    <span className="font-bold">Friends</span>
                    <div className="flex items-center gap-1 ml-2 sm:ml-4 overflow-x-auto scrollbar-none">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                                <t.icon className="w-4 h-4" /> {t.label}
                                {t.count > 0 && <span className="ml-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">{t.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <AnimatePresence mode="wait">
                        {/* ALL FRIENDS */}
                        {tab === 'all' && (
                            <motion.div key="all" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <div className="relative max-w-md mb-6">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search friends..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none text-white placeholder-white/20 focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                {filteredFriends.length === 0 ? (
                                    <div className="text-center py-20"><FiUsers className="w-12 h-12 mx-auto text-white/10 mb-3" /><p className="text-white/30">No friends yet</p></div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">All Friends — {filteredFriends.length}</p>
                                        {filteredFriends.map((f, i) => (
                                            <motion.div key={f._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/60 flex items-center justify-center font-bold">{(f.username || '?')[0].toUpperCase()}</div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark-900 ${(() => {
                                                        if (!onlineUsers.includes(f._id)) return 'bg-white/20';
                                                        const s = f.status;
                                                        if (s === 'dnd') return 'bg-red-500';
                                                        if (s === 'idle') return 'bg-amber-400';
                                                        if (s === 'invisible') return 'bg-white/20';
                                                        return 'bg-emerald-400';
                                                    })()
                                                        }`} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium">{f.username}</p>
                                                    <p className="text-xs text-white/30">{
                                                        onlineUsers.includes(f._id) && f.status !== 'invisible'
                                                            ? (f.status === 'dnd' ? 'Do Not Disturb' : f.status === 'idle' ? 'Idle' : 'Online')
                                                            : 'Offline'
                                                    }</p>
                                                </div>
                                                <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleMessageFriend(f._id)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors" title="Message"><FiMessageSquare className="w-4 h-4" /></button>
                                                    <button onClick={() => handleRemove(f._id)} className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors" title="Remove"><FiUserX className="w-4 h-4" /></button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* PENDING */}
                        {tab === 'pending' && (
                            <motion.div key="pending" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                {requests.incoming.length > 0 && (
                                    <div className="mb-8">
                                        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Incoming — {requests.incoming.length}</p>
                                        {requests.incoming.map((r, i) => (
                                            <div key={r._id || i} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center font-bold text-emerald-300">{(r.from?.username || '?')[0].toUpperCase()}</div>
                                                <div className="flex-1"><p className="font-medium">{r.from?.username}</p><p className="text-xs text-white/30">Incoming request</p></div>
                                                <button onClick={() => handleAccept(r._id)} className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"><FiCheck className="w-4 h-4" /></button>
                                                <button onClick={() => handleReject(r._id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"><FiX className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {requests.outgoing.length > 0 && (
                                    <div>
                                        <p className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Outgoing — {requests.outgoing.length}</p>
                                        {requests.outgoing.map((r, i) => (
                                            <div key={r._id || i} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center font-bold text-amber-300">{(r.to?.username || '?')[0].toUpperCase()}</div>
                                                <div className="flex-1"><p className="font-medium">{r.to?.username}</p><p className="text-xs text-white/30">Outgoing • Pending</p></div>
                                                <button onClick={() => handleReject(r._id)} className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"><FiX className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
                                    <div className="text-center py-20"><FiClock className="w-12 h-12 mx-auto text-white/10 mb-3" /><p className="text-white/30">No pending requests</p></div>
                                )}
                            </motion.div>
                        )}

                        {/* ADD FRIEND */}
                        {tab === 'add' && (
                            <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-lg">
                                <h3 className="text-xl font-bold mb-2">Add a Friend</h3>
                                <p className="text-white/40 text-sm mb-6">Enter their username to send a friend request.</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input type="text" value={addUsername} onChange={(e) => { setAddUsername(e.target.value); setAddStatus(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()} placeholder="Enter a username"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white placeholder-white/20 focus:ring-2 focus:ring-indigo-500" />
                                    <button onClick={handleSendRequest} disabled={!addUsername.trim()}
                                        className="px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-30 transition-colors shadow-lg shadow-indigo-500/20">Send Request</button>
                                </div>
                                {addStatus && (
                                    <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                                        className={`mt-3 text-sm ${addStatus.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>{addStatus.msg}</motion.p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
