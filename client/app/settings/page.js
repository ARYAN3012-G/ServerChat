'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUser, FiLock, FiMoon, FiBell, FiSave, FiCheck, FiCamera, FiStar, FiZap } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    const [tab, setTab] = useState('account');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [customStatus, setCustomStatus] = useState('');
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [notifSettings, setNotifSettings] = useState({ messages: true, friends: true, mentions: true, sounds: true });
    const [subscription, setSubscription] = useState(null);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (user) { setUsername(user.username || ''); setBio(user.bio || ''); setCustomStatus(user.customStatus || ''); } }, [user]);
    useEffect(() => { if (isAuthenticated) fetchSubscription(); }, [isAuthenticated]);

    const fetchSubscription = async () => { try { const { data } = await api.get('/payments/subscription'); setSubscription(data.subscription || { tier: 'free', status: 'inactive' }); } catch (e) { setSubscription({ tier: 'free', status: 'inactive' }); } };

    const handleSaveProfile = async () => {
        setError(''); setSaved(false);
        try { await api.put('/users/profile', { username, bio, customStatus }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
        catch (e) { setError(e.response?.data?.message || 'Failed'); }
    };

    const handleChangePassword = async () => {
        if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
        setError(''); setSaved(false);
        try { await api.put('/auth/password', { currentPassword: currentPw, newPassword: newPw }); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setSaved(true); setTimeout(() => setSaved(false), 2000); }
        catch (e) { setError(e.response?.data?.message || 'Failed'); }
    };

    const tierConfig = {
        free: { color: 'from-gray-500 to-gray-600', badge: 'text-white/40 bg-white/5', label: 'Free', features: ['10 MB uploads', 'Basic features'] },
        basic: { color: 'from-blue-500 to-indigo-600', badge: 'text-blue-400 bg-blue-500/10', label: 'Basic', features: ['50 MB uploads', 'Custom Emojis', 'Screen Share'] },
        premium: { color: 'from-amber-500 to-orange-600', badge: 'text-amber-400 bg-amber-500/10', label: 'Premium', features: ['100 MB uploads', 'Custom Emojis', 'Premium Badge', 'Animated Avatar', 'Screen Share'] },
    };

    const tabs = [
        { id: 'account', label: 'My Account', icon: FiUser },
        { id: 'security', label: 'Security', icon: FiLock },
        { id: 'subscription', label: 'Subscription', icon: FiStar },
        { id: 'appearance', label: 'Appearance', icon: FiMoon },
        { id: 'notifications', label: 'Notifications', icon: FiBell },
    ];

    if (loading) return <div className="flex h-screen items-center justify-center bg-dark-900"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex h-screen bg-dark-900 text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-56 bg-dark-800 border-r border-white/5 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-4"><FiArrowLeft className="w-4 h-4" /> Back to Chat</button>
                    <h2 className="text-lg font-bold">Settings</h2>
                </div>
                <div className="flex-1 p-2 space-y-1">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSaved(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 max-w-2xl">
                <AnimatePresence mode="wait">
                    {/* ACCOUNT */}
                    {tab === 'account' && (
                        <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">My Account</h3>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/5">
                                    <div className="relative group">
                                        <div className="w-20 h-20 rounded-full bg-indigo-500/60 flex items-center justify-center text-3xl font-bold">{user?.username?.[0]?.toUpperCase() || '?'}</div>
                                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"><FiCamera className="w-5 h-5" /></div>
                                    </div>
                                    <div><p className="text-xl font-bold">{user?.username}</p><p className="text-sm text-white/30">{user?.email}</p></div>
                                </div>
                                <div className="space-y-5">
                                    <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Username</label>
                                        <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                    <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Bio</label>
                                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself" className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none placeholder-white/20" /></div>
                                    <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Custom Status</label>
                                        <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} placeholder="What are you up to?" className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20" /></div>
                                </div>
                                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                                <button onClick={handleSaveProfile} className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                    {saved ? <><FiCheck className="w-4 h-4" /> Saved!</> : <><FiSave className="w-4 h-4" /> Save Changes</>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* SECURITY */}
                    {tab === 'security' && (
                        <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">Security</h3>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                <h4 className="text-lg font-semibold mb-5">Change Password</h4>
                                <div className="space-y-4">
                                    <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Current Password</label>
                                        <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                    <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">New Password</label>
                                        <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                    <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Confirm Password</label>
                                        <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                </div>
                                {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                                <button onClick={handleChangePassword} className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                    {saved ? <><FiCheck className="w-4 h-4" /> Updated!</> : <><FiLock className="w-4 h-4" /> Change Password</>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* APPEARANCE */}
                    {tab === 'appearance' && (
                        <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">Appearance</h3>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                <h4 className="text-lg font-semibold mb-5">Theme</h4>
                                <div className="flex gap-4">
                                    <div className="flex-1 p-5 rounded-xl border-2 border-indigo-500 bg-indigo-500/10 cursor-pointer text-center">
                                        <div className="w-16 h-10 bg-dark-900 rounded-lg mx-auto mb-3 border border-white/10" />
                                        <p className="text-sm font-semibold">Dark</p>
                                        <p className="text-xs text-indigo-300 mt-1">Active</p>
                                    </div>
                                    <div className="flex-1 p-5 rounded-xl border border-white/10 cursor-not-allowed opacity-40 text-center">
                                        <div className="w-16 h-10 bg-white rounded-lg mx-auto mb-3 border border-gray-200" />
                                        <p className="text-sm font-semibold">Light</p>
                                        <p className="text-xs text-white/30 mt-1">Coming soon</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* NOTIFICATIONS */}
                    {tab === 'notifications' && (
                        <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">Notifications</h3>
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8 space-y-5">
                                {Object.entries(notifSettings).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between py-2">
                                        <div><p className="font-medium capitalize">{key}</p><p className="text-sm text-white/30">{key === 'messages' ? 'Get notified for new messages' : key === 'friends' ? 'Friend request notifications' : key === 'mentions' ? '@mention alerts' : 'Notification sounds'}</p></div>
                                        <button onClick={() => setNotifSettings(s => ({ ...s, [key]: !val }))}
                                            className={`w-12 h-7 rounded-full transition-all duration-200 ${val ? 'bg-indigo-500' : 'bg-white/10'}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-200 ml-1 ${val ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* SUBSCRIPTION (Subscription + Payment collections) */}
                    {tab === 'subscription' && (
                        <motion.div key="subscription" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <h3 className="text-2xl font-bold mb-8">Subscription</h3>
                            <p className="text-white/40 text-sm mb-6">Your plan and features — from <code className="text-indigo-400">subscriptions</code> & <code className="text-indigo-400">payments</code> collections</p>

                            {/* Current Plan Card */}
                            <div className={`bg-gradient-to-br ${tierConfig[subscription?.tier || 'free']?.color} rounded-2xl p-8 shadow-xl mb-6 relative overflow-hidden`}>
                                <div className="absolute top-4 right-4 opacity-20"><FiZap className="w-16 h-16" /></div>
                                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Current Plan</p>
                                <h4 className="text-4xl font-black mt-2 mb-1">{tierConfig[subscription?.tier || 'free']?.label}</h4>
                                <p className="text-white/60 text-sm mb-4">Status: <span className={`font-semibold ${subscription?.status === 'active' ? 'text-emerald-300' : 'text-white/50'}`}>{subscription?.status || 'inactive'}</span></p>
                                {subscription?.currentPeriodEnd && <p className="text-white/40 text-xs">Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>}
                            </div>

                            {/* Features */}
                            <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                <h4 className="text-lg font-semibold mb-5">Your Features</h4>
                                <div className="space-y-3">
                                    {(tierConfig[subscription?.tier || 'free']?.features || []).map((f, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <FiCheck className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm text-white/70">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Upgrade Tiers */}
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {Object.entries(tierConfig).map(([key, cfg]) => (
                                    <div key={key} className={`rounded-2xl border p-6 text-center transition-all ${subscription?.tier === key ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                                        <h5 className="font-bold text-lg mb-1">{cfg.label}</h5>
                                        <p className="text-xs text-white/30 mb-3">{key === 'free' ? 'Free forever' : key === 'basic' ? '$4.99/mo' : '$9.99/mo'}</p>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${subscription?.tier === key ? 'bg-indigo-500 text-white' : cfg.badge}`}>
                                            {subscription?.tier === key ? 'Current' : 'Select'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-white/20 text-xs mt-4 text-center">Payment processing requires Stripe configuration</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
