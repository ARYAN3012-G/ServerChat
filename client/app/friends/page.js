'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUserPlus, FiCheck, FiX, FiMessageSquare, FiUserMinus, FiSearch, FiUsers, FiInbox, FiSend } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function FriendsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [tab, setTab] = useState('all'); // all, pending, add
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
    const [searchQuery, setSearchQuery] = useState('');
    const [addUsername, setAddUsername] = useState('');
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            fetchFriends();
            fetchRequests();
        }
    }, [isAuthenticated]);

    const fetchFriends = async () => {
        try {
            const { data } = await api.get('/friends');
            setFriends(data.friends || []);
        } catch (e) { console.error(e); }
    };

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/friends/requests');
            setRequests(data);
        } catch (e) { console.error(e); }
    };

    const handleAccept = async (requestId) => {
        try {
            await api.put(`/friends/accept/${requestId}`);
            fetchFriends(); fetchRequests();
        } catch (e) { console.error(e); }
    };

    const handleReject = async (requestId) => {
        try {
            await api.put(`/friends/reject/${requestId}`);
            fetchRequests();
        } catch (e) { console.error(e); }
    };

    const handleRemoveFriend = async (userId) => {
        if (!confirm('Remove this friend?')) return;
        try {
            await api.delete(`/friends/${userId}`);
            fetchFriends();
        } catch (e) { console.error(e); }
    };

    const handleAddFriend = async () => {
        if (!addUsername.trim()) return;
        setAddError(''); setAddSuccess('');
        try {
            // Search for user first
            const { data } = await api.get(`/users/search?q=${addUsername}`);
            if (data.users?.length > 0) {
                const target = data.users[0];
                await api.post('/friends/request', { userId: target._id });
                setAddSuccess(`Friend request sent to ${target.username}!`);
                setAddUsername('');
                fetchRequests();
            } else {
                setAddError('User not found');
            }
        } catch (e) {
            setAddError(e.response?.data?.message || 'Failed to send request');
        }
    };

    const handleStartDM = async (userId) => {
        try {
            const { data } = await api.post('/channels/dm', { targetUserId: userId });
            router.push(`/channels?dm=${data.channel._id}`);
        } catch (e) { console.error(e); }
    };

    const pendingCount = requests.incoming.length;
    const filteredFriends = friends.filter(f =>
        f.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tabs = [
        { id: 'all', label: 'All', icon: FiUsers },
        { id: 'pending', label: 'Pending', icon: FiInbox, badge: pendingCount },
        { id: 'add', label: 'Add Friend', icon: FiUserPlus, green: true },
    ];

    return (
        <div className="flex h-screen bg-dark-800 text-white">
            {/* Left nav */}
            <div className="w-[72px] bg-dark-900 flex flex-col items-center py-3 gap-2">
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/channels')}
                    className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white cursor-pointer transition-all" title="Back to Servers">
                    <FiMessageSquare className="w-6 h-6" />
                </motion.div>
            </div>

            {/* DM Sidebar */}
            <div className="w-60 bg-dark-800 flex flex-col border-r border-dark-900">
                <div className="h-12 px-4 flex items-center border-b border-dark-900">
                    <input type="text" placeholder="Find or start a conversation" className="w-full bg-dark-900 rounded-md px-3 py-1.5 text-sm outline-none text-white placeholder-dark-400" />
                </div>
                <div className="flex-1 overflow-y-auto px-2 pt-3">
                    <button onClick={() => router.push('/friends')} className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-dark-600 text-white mb-2">
                        <FiUsers className="w-5 h-5" /> Friends
                    </button>
                    <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide px-2 mt-4 mb-2">Direct Messages</p>
                    {friends.map(f => (
                        <div key={f._id} onClick={() => handleStartDM(f._id)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dark-700 cursor-pointer text-dark-300 hover:text-white">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">{f.username[0].toUpperCase()}</div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${f.status === 'online' ? 'bg-discord-green' : 'bg-dark-400'}`} />
                            </div>
                            <span className="text-sm truncate">{f.username}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
                {/* Header tabs */}
                <div className="h-12 px-4 flex items-center gap-4 border-b border-dark-900">
                    <div className="flex items-center gap-2 text-dark-300">
                        <FiUsers className="w-5 h-5" /> <span className="font-bold text-white">Friends</span>
                    </div>
                    <div className="h-6 w-px bg-dark-600" />
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${t.green && tab !== t.id ? 'bg-discord-green/20 text-discord-green hover:bg-discord-green/30' :
                                    tab === t.id ? 'bg-dark-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}`}>
                            {t.label}
                            {t.badge > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{t.badge}</span>}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {tab === 'all' && (
                        <div>
                            <div className="mb-4">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search friends" className="w-full bg-dark-900 rounded-md pl-9 pr-3 py-2 text-sm outline-none text-white placeholder-dark-400" />
                                </div>
                            </div>
                            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">All Friends — {filteredFriends.length}</p>
                            {filteredFriends.length === 0 ? (
                                <div className="text-center py-12 text-dark-400">
                                    <FiUsers className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-lg font-medium text-dark-300">No friends yet</p>
                                    <p className="text-sm mt-1">Add friends to start chatting!</p>
                                </div>
                            ) : (
                                filteredFriends.map(f => (
                                    <motion.div key={f._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 group border-t border-dark-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">{f.username[0].toUpperCase()}</div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${f.status === 'online' ? 'bg-discord-green' : 'bg-dark-400'}`} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{f.username}</p>
                                                <p className="text-xs text-dark-400">{f.status === 'online' ? 'Online' : 'Offline'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleStartDM(f._id)} className="w-9 h-9 rounded-full bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-dark-300 hover:text-white transition-colors" title="Message">
                                                <FiMessageSquare className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleRemoveFriend(f._id)} className="w-9 h-9 rounded-full bg-dark-600 hover:bg-dark-500 flex items-center justify-center text-dark-300 hover:text-red-400 transition-colors" title="Remove Friend">
                                                <FiUserMinus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === 'pending' && (
                        <div>
                            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-3">Incoming — {requests.incoming.length}</p>
                            {requests.incoming.map(r => (
                                <motion.div key={r._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 border-t border-dark-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold">{r.from?.username?.[0]?.toUpperCase() || '?'}</div>
                                        <div>
                                            <p className="font-medium text-sm">{r.from?.username}</p>
                                            <p className="text-xs text-dark-400">Incoming Friend Request</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAccept(r._id)} className="w-9 h-9 rounded-full bg-dark-600 hover:bg-discord-green/30 flex items-center justify-center text-discord-green transition-colors" title="Accept">
                                            <FiCheck className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleReject(r._id)} className="w-9 h-9 rounded-full bg-dark-600 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors" title="Reject">
                                            <FiX className="w-5 h-5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide mt-6 mb-3">Outgoing — {requests.outgoing.length}</p>
                            {requests.outgoing.map(r => (
                                <motion.div key={r._id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-dark-700 border-t border-dark-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-dark-600 flex items-center justify-center text-sm font-bold">{r.to?.username?.[0]?.toUpperCase() || '?'}</div>
                                        <div>
                                            <p className="font-medium text-sm">{r.to?.username}</p>
                                            <p className="text-xs text-dark-400">Outgoing Friend Request</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleReject(r._id)} className="w-9 h-9 rounded-full bg-dark-600 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors" title="Cancel">
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            ))}
                            {requests.incoming.length === 0 && requests.outgoing.length === 0 && (
                                <div className="text-center py-12 text-dark-400"><FiInbox className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>No pending requests</p></div>
                            )}
                        </div>
                    )}

                    {tab === 'add' && (
                        <div>
                            <h3 className="text-lg font-bold mb-1">Add Friend</h3>
                            <p className="text-dark-400 text-sm mb-4">You can add friends by their username.</p>
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <input type="text" value={addUsername} onChange={(e) => { setAddUsername(e.target.value); setAddError(''); setAddSuccess(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
                                        placeholder="Enter a username" className="w-full bg-dark-900 rounded-lg px-4 py-3 text-sm outline-none text-white placeholder-dark-400 border border-dark-700 focus:border-primary-500 transition-colors" />
                                </div>
                                <button onClick={handleAddFriend} disabled={!addUsername.trim()}
                                    className="px-6 py-3 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    Send Friend Request
                                </button>
                            </div>
                            {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
                            {addSuccess && <p className="text-discord-green text-sm mt-2">{addSuccess}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
