'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUser, FiLock, FiMoon, FiBell, FiSave, FiCheck, FiCamera, FiStar, FiZap, FiMenu, FiSmartphone, FiShield, FiSlash, FiLogOut } from 'react-icons/fi';
import dynamic from 'next/dynamic';
const AvatarPicker = dynamic(() => import('../../components/AvatarPicker'), { ssr: false });
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import BlockedUsersTab from '../../components/BlockedUsersTab';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading, logout } = useAuth();
    const [tab, setTab] = useState('account');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [customStatus, setCustomStatus] = useState('');
    const [banner, setBanner] = useState('');
    const [accentColor, setAccentColor] = useState('#6366f1');
    const [background, setBackground] = useState('');
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [notifSettings, setNotifSettings] = useState({ messages: true, friends: true, mentions: true, sounds: true });
    const [subscription, setSubscription] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [avatarData, setAvatarData] = useState(null);

    // Phone & Face ID
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneSaving, setPhoneSaving] = useState(false);
    const [phoneSaved, setPhoneSaved] = useState(false);
    const [phoneEditing, setPhoneEditing] = useState(false);
    const [faceRegistered, setFaceRegistered] = useState(false);
    const [faceScanning, setFaceScanning] = useState(false);
    const [faceApiLoaded, setFaceApiLoaded] = useState(false);
    const faceVideoRef = useRef(null);
    const faceStreamRef = useRef(null);
    const faceApiRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [faceDeleting, setFaceDeleting] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [blockedLoading, setBlockedLoading] = useState(false);

    // Read ?tab= query param
    const searchParams = useSearchParams();
    useEffect(() => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['account', 'security', 'subscription', 'appearance', 'notifications', 'blocked'].includes(urlTab)) {
            setTab(urlTab);
        }
    }, [searchParams]);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (user) { setUsername(user.username || ''); setBio(user.bio || ''); setCustomStatus(typeof user.customStatus === 'string' ? user.customStatus : (user.customStatus?.text || '')); setBackground(user.preferences?.background || ''); setPhoneNumber(user.phone || ''); if (user.phone) setPhoneSaved(true); if (user.hasFaceId) setFaceRegistered(true); setAvatarData(user.avatar || null); setBanner(user.banner || ''); setAccentColor(user.accentColor || '#6366f1'); } }, [user]);
    useEffect(() => { if (isAuthenticated) fetchSubscription(); }, [isAuthenticated]);

    const handleLogout = () => {
        logout();
        setTimeout(() => router.push('/login'), 100);
    };

    // Load face-api — let it use its default backend (WebGL if available, WASM fallback)
    // Do NOT override the backend: face-api bundles its own TF.js with WebGL kernels already
    // registered. Calling tf.setBackend('cpu') after that causes "kernel already registered"
    // conflicts and makes detection hang indefinitely.
    const loadFaceApi = async () => {
        if (faceApiRef.current) { setFaceApiLoaded(true); return; }
        try {
            const faceapi = await import('@vladmandic/face-api');
            // Ensure TF backend is fully ready before loading models
            await faceapi.tf.ready();
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
            faceApiRef.current = faceapi;
            setFaceApiLoaded(true);
        } catch (e) { console.error('Face API load error:', e); toast.error('Failed to load face models'); }
    };

    // Callback ref for video element — binds stream immediately when element mounts
    const setFaceVideoElement = (el) => {
        faceVideoRef.current = el;
        if (el && faceStreamRef.current) {
            el.srcObject = faceStreamRef.current;
        }
    };

    const fetchSubscription = async () => { try { const { data } = await api.get('/payments/subscription'); setSubscription(data.subscription || { tier: 'free', status: 'inactive' }); } catch (e) { setSubscription({ tier: 'free', status: 'inactive' }); } };

    const handleSaveProfile = async () => {
        const isPro = subscription?.tier === 'pro';
        const maxBio = isPro ? 500 : 200;
        if (bio.length > maxBio) {
            setError(`Bio is too long (max ${maxBio} chars). ${!isPro ? 'Upgrade to Pro for 500 chars!' : ''}`);
            return;
        }

        setError(''); setSaved(false);
        try { await api.put('/users/profile', { username, bio, customStatus: { text: customStatus }, banner, accentColor, preferences: { background } }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
        catch (e) { setError(e.response?.data?.message || 'Failed'); }
    };

    const handleChangePassword = async () => {
        if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
        if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
        setError(''); setSaved(false);
        try {
            if (user?.hasPassword) {
                // User already has a password — change it
                await api.put('/auth/password', { currentPassword: currentPw, newPassword: newPw });
            } else {
                // OAuth user setting password for the first time
                await api.post('/auth/set-password', { password: newPw });
            }
            setCurrentPw(''); setNewPw(''); setConfirmPw(''); setSaved(true); setTimeout(() => setSaved(false), 2000);
            toast.success(user?.hasPassword ? 'Password changed!' : 'Password set! You can now login with email + password.');
        } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    };

    const proFeatures = [
        { icon: '🎨', label: 'Premium Backgrounds', desc: '8 exclusive DM + app backgrounds' },
        { icon: '📁', label: '100 MB Uploads', desc: '10× larger file uploads' },
        { icon: '⚡', label: 'Premium Badge', desc: 'Gold badge on profile & messages' },
        { icon: '🎭', label: 'Animated Avatar', desc: 'Upload GIFs as profile picture' },
        { icon: '🖼️', label: 'Profile Banner', desc: 'Custom banner image on profile' },
        { icon: '📝', label: 'Extended Bio', desc: '500 characters (vs 200 free)' },
        { icon: '🖥️', label: 'HD Screen Share', desc: '1080p / 30fps quality' },
        { icon: '🎵', label: 'Music Room Priority', desc: 'DJ controls & queue priority' },
        { icon: '💬', label: 'Custom Emoji', desc: 'Use custom emojis everywhere' },
        { icon: '✅', label: 'Read Receipts', desc: 'See who read your messages' },
        { icon: '🚀', label: 'Server Boost', desc: '500 member limit for owned servers' },
    ];

    const tabs = [
        { id: 'account', label: 'My Account', icon: FiUser },
        { id: 'security', label: 'Security', icon: FiLock },
        { id: 'subscription', label: 'Subscription', icon: FiStar },
        { id: 'appearance', label: 'Appearance', icon: FiMoon },
        { id: 'notifications', label: 'Notifications', icon: FiBell },
        { id: 'blocked', label: 'Blocked Users', icon: FiSlash },
    ];

    if (loading) return <div className="flex h-screen items-center justify-center bg-dark-900"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex h-[100dvh] bg-dark-900 text-white overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-56 bg-dark-800 border-r border-white/5 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-white/5">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors mb-4"><FiArrowLeft className="w-4 h-4" /> Back to Chat</button>
                    <h2 className="text-lg font-bold">Settings</h2>
                </div>
                <div className="p-2 space-y-1 overflow-y-auto flex-none">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setError(''); setSaved(false); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                    <div className="my-2 border-t border-white/5" />
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 transition-all">
                        <FiLogOut className="w-4 h-4" /> Log Out
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-10 w-full relative">
                {/* Mobile Menu Button */}
                <div className="md:hidden mb-6 flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold">Settings</h2>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg bg-dark-800 border border-white/10 text-white/70 hover:text-white transition-colors"
                    >
                        <FiMenu className="w-6 h-6" />
                    </button>
                </div>

                <div className="max-w-2xl mx-auto">
                    <AnimatePresence mode="wait">
                        {/* ACCOUNT */}
                        {tab === 'account' && (
                            <>
                                <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                    <h3 className="text-2xl font-bold mb-8">My Account</h3>
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8 relative overflow-hidden">
                                    {/* Banner Preview */}
                                    <div className={`absolute top-0 left-0 right-0 h-32 z-0 ${!banner ? 'bg-indigo-500/20' : ''}`} style={{ backgroundColor: !banner ? accentColor : undefined, backgroundImage: banner ? `url(${banner})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />

                                    <div className="relative z-10 pt-16 sm:pt-12 flex flex-col sm:flex-row items-center sm:items-end text-center sm:text-left gap-3 sm:gap-5 mb-8 pb-8 border-b border-white/5">
                                        <div className="relative group cursor-pointer shadow-xl shadow-black/50 rounded-full shrink-0" onClick={() => setShowAvatarPicker(true)}>
                                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold overflow-hidden border-4 border-dark-900" style={{ backgroundColor: accentColor }}>
                                                {avatarData?.url ? (
                                                    <img src={avatarData.url} alt="" className="w-full h-full object-cover" />
                                                ) : avatarData?.prebuilt ? (
                                                    <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: avatarData.bg }}>{avatarData.emoji}</div>
                                                ) : (
                                                    user?.username?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-4 border-transparent"><FiCamera className="w-6 h-6" /></div>
                                        </div>
                                        <div className="mb-2 min-w-0 w-full sm:w-auto flex-1">
                                            <p className="text-xl sm:text-2xl font-bold flex flex-wrap justify-center sm:justify-start items-center gap-2 drop-shadow-md break-all">
                                                {user?.username} 
                                                {subscription?.tier === 'pro' && <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text text-sm ml-1" title="ServerChat Pro">✦</span>}
                                            </p>
                                            <p className="text-xs sm:text-sm text-white/50 break-all">{user?.email}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-5 relative z-10">
                                        <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Username</label>
                                            <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                        <div>
                                            <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">
                                                Bio <span className="text-[9px] lowercase font-normal">({bio.length}/{subscription?.tier === 'pro' ? 500 : 200})</span>
                                                {subscription?.tier !== 'pro' && bio.length >= 200 && <span className="text-amber-400 capitalize text-[9px] ml-auto">Upgrade to Pro for 500 chars</span>}
                                            </label>
                                            <textarea value={bio} maxLength={subscription?.tier === 'pro' ? 500 : 200} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself" className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none placeholder-white/20" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">Custom Banner URL {!subscription || subscription?.tier !== 'pro' ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">PRO</span> : ''}</label>
                                                <div className="relative mt-2">
                                                    <input value={banner} onChange={(e) => setBanner(e.target.value)} disabled={subscription?.tier !== 'pro'} placeholder={subscription?.tier === 'pro' ? "https://example.com/banner.gif" : "Subscribe to Pro"} className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20 ${subscription?.tier !== 'pro' ? 'opacity-50 cursor-not-allowed pr-10' : ''}`} />
                                                    {subscription?.tier !== 'pro' && <FiLock className="absolute right-3 top-3.5 text-amber-400/50" />}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-2">Accent Color {!subscription || subscription?.tier !== 'pro' ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">PRO</span> : ''}</label>
                                                <div className="flex items-center gap-3 mt-2 h-[46px]">
                                                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} disabled={subscription?.tier !== 'pro'} className={`w-12 h-10 rounded cursor-pointer ${subscription?.tier !== 'pro' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                                    <span className="text-sm font-mono text-white/60">{accentColor}</span>
                                                    {subscription?.tier !== 'pro' && <FiLock className="text-amber-400/50 ml-2" />}
                                                </div>
                                            </div>
                                        </div>
                                        <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Custom Status</label>
                                            <input value={customStatus} onChange={(e) => setCustomStatus(e.target.value)} placeholder="What are you up to?" className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20" /></div>
                                    </div>
                                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                                        <button onClick={handleSaveProfile} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                            {saved ? <><FiCheck className="w-4 h-4" /> Saved!</> : <><FiSave className="w-4 h-4" /> Save Changes</>}
                                        </button>
                                        <button onClick={handleLogout} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors">
                                            <FiLogOut className="w-4 h-4" /> Log Out
                                        </button>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Avatar Picker Modal */}
                            <AvatarPicker
                                isOpen={showAvatarPicker}
                                onClose={() => setShowAvatarPicker(false)}
                                currentAvatar={avatarData}
                                onAvatarChange={(newAvatar) => setAvatarData(newAvatar)}
                                username={user?.username || ''}
                            />
                            </>
                        )}

                        {/* SECURITY */}
                        {tab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <h3 className="text-2xl font-bold mb-8">Security</h3>

                                {/* Set / Change Password */}
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8 mb-6">
                                    <h4 className="text-lg font-semibold mb-3 flex items-center gap-2"><FiLock className="w-5 h-5 text-indigo-400" /> {user?.hasPassword ? 'Change Password' : 'Set Password'}</h4>
                                    {!user?.hasPassword && (
                                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
                                            <FiZap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                            <p className="text-sm text-amber-300/80">You signed in with {user?.googleId ? 'Google' : 'GitHub'}. Set a password to also login with email.</p>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {user?.hasPassword && (
                                            <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Current Password</label>
                                                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                        )}
                                        <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">New Password</label>
                                            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                        <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Confirm Password</label>
                                            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
                                    </div>
                                    {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                                    <button onClick={handleChangePassword} className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                        {saved ? <><FiCheck className="w-4 h-4" /> Updated!</> : <><FiLock className="w-4 h-4" /> {user?.hasPassword ? 'Change Password' : 'Set Password'}</>}
                                    </button>
                                </div>

                                {/* Phone Number */}
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8 mb-6">
                                    <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><FiSmartphone className="w-5 h-5 text-emerald-400" /> Phone Number</h4>
                                    <p className="text-sm text-white/30 mb-5">Add a phone number to enable login via the Phone tab. One phone per account.</p>

                                    {phoneSaved && !phoneEditing ? (
                                        /* Saved state — read-only with edit button */
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                                <FiCheck className="w-5 h-5 text-emerald-400" />
                                                <div>
                                                    <p className="text-xs text-emerald-400/60 font-semibold uppercase tracking-wider">Linked Phone</p>
                                                    <p className="text-sm text-white font-medium">{phoneNumber}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setPhoneEditing(true)}
                                                className="px-4 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:border-white/20 hover:text-white transition-all">
                                                Edit
                                            </button>
                                        </div>
                                    ) : (
                                        /* Edit / New state */
                                        <>
                                            <div className="relative">
                                                <input type="tel" value={phoneNumber}
                                                    onChange={(e) => {
                                                        if (e.target.value.includes('@')) return;
                                                        setPhoneNumber(e.target.value);
                                                    }}
                                                    placeholder="+91 98765 43210"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-emerald-500 transition-all pl-11 placeholder-white/20" />
                                                <FiSmartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                            </div>
                                            <div className="flex gap-3 mt-4">
                                                <button onClick={async () => {
                                                    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 7) { toast.error('Enter a valid phone number'); return; }
                                                    setPhoneSaving(true);
                                                    try {
                                                        await api.put('/auth/phone', { phone: phoneNumber });
                                                        toast.success('Phone number saved!');
                                                        setPhoneSaved(true);
                                                        setPhoneEditing(false);
                                                    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save'); }
                                                    setPhoneSaving(false);
                                                }} disabled={phoneSaving}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                                                    {phoneSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiSmartphone className="w-4 h-4" /> Save Phone Number</>}
                                                </button>
                                                {phoneEditing && (
                                                    <button onClick={() => { setPhoneEditing(false); setPhoneNumber(user?.phone || ''); }}
                                                        className="px-4 py-2.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Face ID Registration */}
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                    <h4 className="text-lg font-semibold mb-2 flex items-center gap-2"><FiCamera className="w-5 h-5 text-violet-400" /> Face ID</h4>
                                    <p className="text-sm text-white/30 mb-5">Register your face to enable Face ID login. Look directly at the camera.</p>

                                    {/* ── REGISTERED STATE ── */}
                                    {faceRegistered && !cameraActive ? (
                                        <div>
                                            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
                                                <FiCheck className="w-5 h-5 text-emerald-400" />
                                                <div>
                                                    <p className="text-xs text-emerald-400/60 font-semibold uppercase tracking-wider">Status</p>
                                                    <p className="text-sm text-white font-medium">Face ID Registered ✓</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={async () => {
                                                    setCameraActive(true);
                                                    loadFaceApi();
                                                    try {
                                                        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } } });
                                                        faceStreamRef.current = stream;
                                                        if (faceVideoRef.current) faceVideoRef.current.srcObject = stream;
                                                    } catch (e) { toast.error('Camera access denied'); setCameraActive(false); }
                                                }}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-500/20 text-violet-300 rounded-xl text-sm font-semibold hover:bg-violet-500/30 transition-colors border border-violet-500/20">
                                                    <FiCamera className="w-4 h-4" /> Update Face
                                                </button>
                                                <button onClick={async () => {
                                                    setFaceDeleting(true);
                                                    try {
                                                        await api.delete('/auth/face-descriptor');
                                                        setFaceRegistered(false);
                                                        toast.success('Face ID removed');
                                                    } catch (e) { toast.error('Failed to remove Face ID'); }
                                                    setFaceDeleting(false);
                                                }} disabled={faceDeleting}
                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                                                    {faceDeleting ? <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : 'Delete Face'}
                                                </button>
                                            </div>
                                        </div>

                                        /* ── CAMERA ACTIVE ── */
                                    ) : cameraActive ? (
                                        <>
                                            <div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-white/10 aspect-[4/3] mb-4 max-w-sm">
                                                <video ref={setFaceVideoElement} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className={`w-36 h-36 rounded-full border-2 ${faceScanning ? 'border-violet-400 animate-pulse' : 'border-white/20'} transition-colors`} />
                                                </div>
                                                <div className="absolute bottom-2 left-0 right-0 text-center">
                                                    <span className={`text-xs px-3 py-1 rounded-full ${faceScanning ? 'bg-violet-500/20 text-violet-400' : faceApiLoaded ? 'bg-white/5 text-white/40' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {faceScanning ? '🔍 Scanning...' : faceApiLoaded ? '📸 Ready — click Register' : '⏳ Loading models...'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={async () => {
                                                    if (!faceApiLoaded || !faceVideoRef.current || !faceApiRef.current) { toast.error('Models still loading...'); return; }
                                                    setFaceScanning(true);
                                                    try {
                                                        const faceapi = faceApiRef.current;
                                                        const detection = await Promise.race([
                                                            faceapi
                                                                .detectSingleFace(faceVideoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
                                                                .withFaceLandmarks()
                                                                .withFaceDescriptor(),
                                                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
                                                        ]);
                                                        if (!detection) { toast.error('No face detected. Look directly at the camera.'); setFaceScanning(false); return; }
                                                        const descriptor = Array.from(detection.descriptor);
                                                        await api.post('/auth/face-descriptor', { descriptor });
                                                        setFaceRegistered(true);
                                                        toast.success('Face ID registered successfully!');
                                                        if (faceStreamRef.current) faceStreamRef.current.getTracks().forEach(t => t.stop());
                                                        setCameraActive(false);
                                                    } catch (e) {
                                                        if (e.message === 'timeout') {
                                                            toast.error('Detection timed out. Try better lighting or move closer to the camera.');
                                                        } else {
                                                            toast.error('Failed to register face');
                                                        }
                                                    }
                                                    setFaceScanning(false);
                                                }} disabled={faceScanning || !faceApiLoaded}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 transition-colors disabled:opacity-50">
                                                    {faceScanning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiShield className="w-4 h-4" /> Register Face</>}
                                                </button>
                                                <button onClick={() => {
                                                    if (faceStreamRef.current) faceStreamRef.current.getTracks().forEach(t => t.stop());
                                                    setCameraActive(false);
                                                }} className="px-4 py-2.5 rounded-xl text-sm text-white/40 border border-white/10 hover:border-white/20 transition-colors">
                                                    Cancel
                                                </button>
                                            </div>
                                        </>

                                        /* ── NOT REGISTERED ── */
                                    ) : (
                                        <button onClick={async () => {
                                            setCameraActive(true);
                                            loadFaceApi();
                                            try {
                                                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } } });
                                                faceStreamRef.current = stream;
                                                if (faceVideoRef.current) faceVideoRef.current.srcObject = stream;
                                            } catch (e) { toast.error('Camera access denied'); setCameraActive(false); }
                                        }}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-semibold hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/20">
                                            <FiCamera className="w-4 h-4" /> Open Camera to Register
                                        </button>
                                    )}
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

                                    <div className="mt-8 pt-8 border-t border-white/5">
                                        <h4 className="text-lg font-semibold mb-2 flex items-center gap-2">Custom Background {!subscription || subscription?.tier !== 'pro' ? <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">PRO</span> : ''}</h4>
                                        <p className="text-sm text-white/40 mb-4">Paste an image or GIF URL to use as your app background.</p>
                                        <div className="relative">
                                            <input
                                                value={background}
                                                onChange={(e) => setBackground(e.target.value)}
                                                disabled={subscription?.tier !== 'pro'}
                                                placeholder={subscription?.tier === 'pro' ? "https://example.com/animated-bg.gif" : "Subscribe to Pro to use custom URLs"}
                                                className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20 ${subscription?.tier !== 'pro' ? 'opacity-50 cursor-not-allowed pr-10' : ''}`}
                                            />
                                            {subscription?.tier !== 'pro' && <FiLock className="absolute right-3 top-3.5 text-amber-400/50" />}
                                        </div>

                                        <div className="mt-6">
                                            <p className="text-[10px] font-bold text-white/40 mb-2 uppercase tracking-wider">Free Presets</p>
                                            <div className="flex flex-wrap gap-3 mb-4">
                                                {['none', 'stars', 'matrix', 'cyberpunk'].map(preset => (
                                                    <button key={preset} onClick={() => setBackground(preset === 'none' ? '' : preset)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${background === preset || (preset === 'none' && !background) ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>
                                                        {preset}
                                                    </button>
                                                ))}
                                            </div>

                                            <p className="text-[10px] font-bold text-amber-400/60 mb-2 uppercase tracking-wider flex items-center gap-2">Premium Presets</p>
                                            <div className="flex flex-wrap gap-3">
                                                {['aurora', 'particles', 'waves'].map(preset => (
                                                    <button key={preset} onClick={() => subscription?.tier === 'pro' ? setBackground(preset) : toast('ServerChat Pro required!', { icon: '🔒' })}
                                                        className={`flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${background === preset ? 'border-amber-500 bg-amber-500/20 text-amber-300' : 'border-white/5 text-white/40'} ${subscription?.tier === 'pro' ? 'hover:bg-amber-500/10 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                                                        {preset} {subscription?.tier !== 'pro' && <FiLock className="w-3 h-3 text-amber-400/50" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                                        <button onClick={handleSaveProfile} className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20">
                                            {saved ? <><FiCheck className="w-4 h-4" /> Saved!</> : <><FiSave className="w-4 h-4" /> Save Appearance</>}
                                        </button>
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

                        {/* SUBSCRIPTION (ServerChat Pro) */}
                        {tab === 'subscription' && (
                            <motion.div key="subscription" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <h3 className="text-2xl font-bold mb-8">Subscription</h3>

                                {/* Current Plan Card */}
                                <div className={`rounded-2xl p-8 shadow-xl mb-6 relative overflow-hidden ${subscription?.tier === 'pro' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'}`}>
                                    <div className="absolute top-4 right-4 opacity-20"><FiZap className="w-16 h-16" /></div>
                                    <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Current Plan</p>
                                    <h4 className="text-4xl font-black mt-2 mb-1">{subscription?.tier === 'pro' ? 'ServerChat Pro ⚡' : 'Free'}</h4>
                                    <p className="text-white/60 text-sm mb-2">
                                        Status: <span className={`font-semibold ${subscription?.status === 'active' ? 'text-emerald-300' : 'text-white/50'}`}>{subscription?.status || 'inactive'}</span>
                                    </p>
                                    {subscription?.currentPeriodEnd && subscription?.tier === 'pro' && (
                                        <p className="text-white/40 text-xs">
                                            {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>

                                {/* Upgrade Card (show only for free users) */}
                                {subscription?.tier !== 'pro' && (
                                    <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-2xl border border-amber-500/20 p-8 mb-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 className="text-2xl font-bold text-amber-400">Upgrade to ServerChat Pro</h4>
                                                <p className="text-white/40 text-sm mt-1">Unlock all premium features</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-black text-white">₹50<span className="text-sm font-normal text-white/40">/month</span></p>
                                                <p className="text-xs text-amber-400/60">UPI • Cards • Net Banking</p>
                                            </div>
                                        </div>

                                        <button onClick={async () => {
                                            try {
                                                const { data } = await api.post('/payments/checkout');
                                                const options = {
                                                    key: data.razorpayKeyId,
                                                    subscription_id: data.subscriptionId,
                                                    name: 'ServerChat Pro',
                                                    description: '₹50/month — Premium Subscription',
                                                    handler: async (response) => {
                                                        try {
                                                            const verifyRes = await api.post('/payments/verify', {
                                                                razorpay_payment_id: response.razorpay_payment_id,
                                                                razorpay_subscription_id: response.razorpay_subscription_id,
                                                                razorpay_signature: response.razorpay_signature,
                                                            });
                                                            toast.success(verifyRes.data.message || 'Welcome to Pro! 🎉');
                                                            fetchSubscription();
                                                        } catch (e) {
                                                            toast.error('Payment verification failed');
                                                        }
                                                    },
                                                    prefill: {
                                                        name: user?.username || '',
                                                        email: user?.email || '',
                                                    },
                                                    theme: { color: '#f59e0b' },
                                                    modal: {
                                                        ondismiss: () => toast('Payment cancelled', { icon: '❌' }),
                                                    },
                                                };
                                                const rzp = new window.Razorpay(options);
                                                rzp.open();
                                            } catch (e) {
                                                toast.error(e.response?.data?.message || 'Failed to start checkout');
                                            }
                                        }}
                                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-lg font-bold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]">
                                            ⚡ Subscribe Now — ₹50/month
                                        </button>
                                        <p className="text-xs text-white/20 text-center mt-3">Supports UPI, PhonePe, Google Pay, Paytm, Cards, Net Banking</p>
                                    </div>
                                )}

                                {/* Cancel Button (for Pro users) */}
                                {subscription?.tier === 'pro' && subscription?.status === 'active' && !subscription?.cancelAtPeriodEnd && (
                                    <div className="mb-6">
                                        <button onClick={async () => {
                                            if (!confirm('Are you sure you want to cancel? You\'ll keep Pro features until the end of your billing period.')) return;
                                            try {
                                                const { data } = await api.post('/payments/cancel');
                                                toast.success(data.message);
                                                fetchSubscription();
                                            } catch (e) {
                                                toast.error(e.response?.data?.message || 'Cancel failed');
                                            }
                                        }}
                                            className="px-6 py-3 rounded-xl text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
                                            Cancel Subscription
                                        </button>
                                    </div>
                                )}

                                {subscription?.cancelAtPeriodEnd && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 mb-6">
                                        <p className="text-sm text-red-400">⚠️ Your subscription will cancel at the end of your billing period. You will keep Pro features until then.</p>
                                    </div>
                                )}

                                {/* Pro Features List */}
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                    <h4 className="text-lg font-semibold mb-5 flex items-center gap-2">
                                        <FiZap className="w-5 h-5 text-amber-400" /> Pro Features
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {proFeatures.map((f, i) => (
                                            <div key={i} className="flex items-start gap-3 py-2">
                                                <span className="text-lg">{f.icon}</span>
                                                <div>
                                                    <p className={`text-sm font-semibold ${subscription?.tier === 'pro' ? 'text-amber-400' : 'text-white/70'}`}>{f.label}</p>
                                                    <p className="text-xs text-white/30">{f.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* BLOCKED USERS */}
                        {tab === 'blocked' && (
                            <BlockedUsersTab />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
