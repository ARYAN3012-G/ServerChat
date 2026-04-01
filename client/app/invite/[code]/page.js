'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiUsers, FiShield, FiGlobe, FiLock, FiLogIn, FiUserPlus, FiClock, FiCheck, FiX, FiArrowRight } from 'react-icons/fi';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const code = params.code;

    const [server, setServer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(false);
    const [result, setResult] = useState(null); // 'joined' | 'pending' | 'already'
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [joinMessage, setJoinMessage] = useState('');

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        setIsLoggedIn(!!token);
        fetchPreview();
    }, [code]);

    const fetchPreview = async () => {
        setLoading(true);
        try {
            // Use a direct fetch without auth header for the preview
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const res = await fetch(`${API_URL}/api/servers/invite-preview/${code}`);
            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Invalid invite link');
            } else {
                setServer(data);
            }
        } catch {
            setError('Failed to load invite. Please check the link.');
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        setJoining(true);
        try {
            const res = await api.post(`/servers/join/${code}`, { message: joinMessage });
            if (res.data.pending) {
                setResult('pending');
                toast.success('Join request sent!');
            } else if (res.data.alreadyMember) {
                setResult('already');
                const redirectUrl = deepRoom ? `/channels?room=${deepRoom}` : '/channels';
                setTimeout(() => router.push(redirectUrl), 1500);
            } else {
                setResult('joined');
                toast.success(`Joined ${server?.name || 'server'}!`);
                const redirectUrl = deepRoom ? `/channels?room=${deepRoom}` : '/channels';
                setTimeout(() => router.push(redirectUrl), 1500);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to join';
            if (err.response?.data?.alreadyMember) {
                setResult('already');
                toast('You\'re already a member!', { icon: '✅' });
                const redirectUrl = deepRoom ? `/channels?room=${deepRoom}` : '/channels';
                setTimeout(() => router.push(redirectUrl), 1500);
            } else {
                toast.error(msg);
            }
        }
        setJoining(false);
    };

    const handleLoginRedirect = () => {
        localStorage.setItem('pendingInvite', code);
        router.push('/login');
    };

    const handleRegisterRedirect = () => {
        localStorage.setItem('pendingInvite', code);
        router.push('/register');
    };

    // Determine deep link (music room vs games)
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const deepRoom = urlParams?.get('room'); // 'music' | 'games'

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0b14] via-[#0e1025] to-[#12062a] flex items-center justify-center p-4">
            {/* Background glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Loading */}
                {loading && (
                    <div className="bg-[#12142a]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center">
                        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                        <p className="text-white/30 text-sm mt-4">Loading invite...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-[#12142a]/80 backdrop-blur-xl border border-red-500/20 rounded-3xl p-10 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                            <FiX className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Invalid Invite</h2>
                        <p className="text-white/40 text-sm mb-6">{error}</p>
                        <button onClick={() => router.push('/')} className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm transition-colors">
                            Go Home
                        </button>
                    </div>
                )}

                {/* Server Preview */}
                {!loading && !error && server && (
                    <div className="bg-[#12142a]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/5">
                        {/* Banner area */}
                        <div className="h-24 bg-gradient-to-r from-indigo-600/40 via-purple-600/30 to-pink-600/20 relative">
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
                            {deepRoom && (
                                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/30 backdrop-blur-sm rounded-full text-[10px] text-white/60 font-medium flex items-center gap-1">
                                    {deepRoom === 'music' ? '🎵 Music Room' : '🎮 Games'}
                                </div>
                            )}
                        </div>

                        {/* Server icon */}
                        <div className="px-6 -mt-8 relative">
                            <div className="w-16 h-16 rounded-2xl bg-[#1a1c3a] border-4 border-[#12142a] flex items-center justify-center shadow-xl">
                                {server.icon?.url ? (
                                    <img src={server.icon.url} alt="" className="w-full h-full rounded-xl object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-indigo-400">{(server.name || 'S')[0].toUpperCase()}</span>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="px-6 pt-3 pb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl font-bold text-white">{server.name}</h1>
                                {server.isPublic ? (
                                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-[9px] font-bold flex items-center gap-1"><FiGlobe className="w-2.5 h-2.5" /> PUBLIC</span>
                                ) : (
                                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full text-[9px] font-bold flex items-center gap-1"><FiLock className="w-2.5 h-2.5" /> PRIVATE</span>
                                )}
                            </div>
                            {server.description && <p className="text-sm text-white/40 mb-3 leading-relaxed">{server.description}</p>}

                            <div className="flex items-center gap-4 text-xs text-white/25 mb-5">
                                <span className="flex items-center gap-1"><FiUsers className="w-3 h-3" /> {server.memberCount} members</span>
                                <span className="flex items-center gap-1"><FiShield className="w-3 h-3" /> {server.owner?.username || 'Owner'}</span>
                            </div>

                            {/* Result States */}
                            {result === 'joined' && (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center mb-4">
                                    <FiCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-emerald-400 font-medium text-sm">Welcome to {server.name}!</p>
                                    <p className="text-white/30 text-xs mt-1">Redirecting to channels...</p>
                                </motion.div>
                            )}

                            {result === 'pending' && (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center mb-4">
                                    <FiClock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                    <p className="text-amber-400 font-medium text-sm">Join Request Sent</p>
                                    <p className="text-white/30 text-xs mt-1">Waiting for admin approval. You'll be notified!</p>
                                </motion.div>
                            )}

                            {result === 'already' && (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                    className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center mb-4">
                                    <FiCheck className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                    <p className="text-indigo-400 font-medium text-sm">Already a member!</p>
                                    <p className="text-white/30 text-xs mt-1">Redirecting...</p>
                                </motion.div>
                            )}

                            {/* Actions */}
                            {!result && isLoggedIn && (
                                <div className="space-y-3">
                                    {/* Private server: show optional message input */}
                                    {!server.isPublic && (
                                        <div>
                                            <label className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-1 block">Message to admin (optional)</label>
                                            <input type="text" value={joinMessage} onChange={e => setJoinMessage(e.target.value)} maxLength={200}
                                                placeholder="Why do you want to join?"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/15 outline-none focus:border-indigo-500/40 transition-colors" />
                                        </div>
                                    )}
                                    <button onClick={handleJoin} disabled={joining}
                                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                                        {joining ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                {server.isPublic ? 'Join Server' : 'Request to Join'}
                                                <FiArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {!result && !isLoggedIn && (
                                <div className="space-y-2.5">
                                    <p className="text-xs text-white/25 text-center mb-3">You need an account to join this server</p>
                                    <button onClick={handleLoginRedirect}
                                        className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                                        <FiLogIn className="w-4 h-4" /> Log In & Join
                                    </button>
                                    <button onClick={handleRegisterRedirect}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2">
                                        <FiUserPlus className="w-4 h-4" /> Create Account
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-white/15">ServerChat Invite</span>
                            <span className="text-[10px] text-white/10 font-mono">{code}</span>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
