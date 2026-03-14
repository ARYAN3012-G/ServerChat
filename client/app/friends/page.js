'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUserPlus, FiUserCheck, FiUserX, FiSearch, FiMessageSquare, FiUsers, FiClock, FiX, FiCheck, FiMenu, FiLoader } from 'react-icons/fi';
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

    // Auto-suggestion state
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (isAuthenticated) { fetchFriends(); fetchRequests(); } }, [isAuthenticated]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const handleStatus = () => fetchFriends();
        socket.on('presence:status-changed', handleStatus);
        return () => socket.off('presence:status-changed', handleStatus);
    }, []);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchFriends = async () => { try { const { data } = await api.get('/friends'); setFriends(data.friends || data || []); } catch (e) { console.error(e); } };
    const fetchRequests = async () => { try { const { data } = await api.get('/friends/requests'); setRequests({ incoming: data.incoming || [], outgoing: data.outgoing || [] }); } catch (e) { console.error(e); } };

    // Debounced search for auto-suggestions
    const searchUsers = useCallback(async (query) => {
        if (!query || query.trim().length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setSuggestionsLoading(true);
        try {
            const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}&limit=8`);
            setSuggestions(data.users || []);
            setShowSuggestions(true);
        } catch (e) {
            console.error(e);
            setSuggestions([]);
        } finally {
            setSuggestionsLoading(false);
        }
    }, []);

    const handleAddUsernameChange = (value) => {
        setAddUsername(value);
        setAddStatus(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => searchUsers(value), 300);
    };

    const handleSendRequest = async (username) => {
        const targetUsername = username || addUsername;
        if (!targetUsername.trim()) return;
        try {
            await api.post('/friends/request', { username: targetUsername });
            setAddStatus({ type: 'success', msg: `Request sent to ${targetUsername}!` });
            setAddUsername('');
            setSuggestions([]);
            setShowSuggestions(false);
            fetchRequests();
        } catch (e) {
            setAddStatus({ type: 'error', msg: e.response?.data?.message || 'Failed' });
        }
    };

    const handleSelectSuggestion = (username) => {
        setAddUsername(username);
        setShowSuggestions(false);
        handleSendRequest(username);
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
                                <p className="text-white/40 text-sm mb-6">Start typing a username to find people.</p>
                                <div className="relative" ref={suggestionsRef}>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 z-10" />
                                            <input type="text" value={addUsername}
                                                onChange={(e) => handleAddUsernameChange(e.target.value)}
                                                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                                                placeholder="Search by username..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm outline-none text-white placeholder-white/20 focus:ring-2 focus:ring-indigo-500" />
                                            {suggestionsLoading && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => handleSendRequest()} disabled={!addUsername.trim()}
                                            className="px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-30 transition-colors shadow-lg shadow-indigo-500/20">Send Request</button>
                                    </div>

                                    {/* Auto-suggestions dropdown */}
                                    <AnimatePresence>
                                        {showSuggestions && suggestions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                className="absolute z-50 left-0 right-0 sm:right-auto sm:w-[calc(100%-140px)] mt-2 bg-dark-800 border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden max-h-[320px] overflow-y-auto"
                                            >
                                                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider px-4 pt-3 pb-1">
                                                    {suggestions.length} user{suggestions.length !== 1 ? 's' : ''} found
                                                </p>
                                                {suggestions.map((u, i) => (
                                                    <motion.div
                                                        key={u._id}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.03 }}
                                                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer transition-colors group"
                                                        onClick={() => handleSelectSuggestion(u.username)}
                                                    >
                                                        <div className="relative flex-shrink-0">
                                                            {u.avatar?.url ? (
                                                                <img src={u.avatar.url} alt="" className="w-9 h-9 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-indigo-500/40 flex items-center justify-center text-sm font-bold">
                                                                    {(u.username || '?')[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-dark-800 ${
                                                                u.status === 'online' ? 'bg-emerald-400' : u.status === 'idle' ? 'bg-amber-400' : u.status === 'dnd' ? 'bg-red-500' : 'bg-white/20'
                                                            }`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-white truncate">{u.username}</p>
                                                            {u.bio && <p className="text-[11px] text-white/25 truncate">{u.bio}</p>}
                                                        </div>
                                                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                                                                <FiUserPlus className="w-3.5 h-3.5" /> Add
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* No results */}
                                    <AnimatePresence>
                                        {showSuggestions && suggestions.length === 0 && addUsername.trim().length >= 2 && !suggestionsLoading && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                className="absolute z-50 left-0 right-0 sm:right-auto sm:w-[calc(100%-140px)] mt-2 bg-dark-800 border border-white/10 rounded-xl shadow-2xl shadow-black/50 p-6 text-center"
                                            >
                                                <FiSearch className="w-8 h-8 mx-auto text-white/10 mb-2" />
                                                <p className="text-sm text-white/30">No users found for &quot;{addUsername}&quot;</p>
                                                <p className="text-xs text-white/15 mt-1">Try a different username</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
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
