'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiUser, FiLock, FiMoon, FiBell, FiSave, FiCheck, FiCamera, FiStar, FiZap, FiMenu, FiSmartphone, FiShield } from 'react-icons/fi';
import dynamic from 'next/dynamic';
const AvatarPicker = dynamic(() => import('../../components/AvatarPicker'), { ssr: false });
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading } = useAuth();
    const [tab, setTab] = useState('account');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [customStatus, setCustomStatus] = useState('');
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

    // Read ?tab= query param
    const searchParams = useSearchParams();
    useEffect(() => {
        const urlTab = searchParams.get('tab');
        if (urlTab && ['account', 'security', 'subscription', 'appearance', 'notifications'].includes(urlTab)) {
            setTab(urlTab);
        }
    }, [searchParams]);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/login'); }, [isAuthenticated, loading]);
    useEffect(() => { if (user) { setUsername(user.username || ''); setBio(user.bio || ''); setCustomStatus(user.customStatus || ''); setBackground(user.preferences?.background || ''); setPhoneNumber(user.phone || ''); if (user.phone) setPhoneSaved(true); if (user.hasFaceId) setFaceRegistered(true); setAvatarData(user.avatar || null); } }, [user]);
    useEffect(() => { if (isAuthenticated) fetchSubscription(); }, [isAuthenticated]);

    // Load face-api via npm dynamic import, forcing CPU backend to avoid WebGL hang
    const loadFaceApi = async () => {
        if (faceApiRef.current) { setFaceApiLoaded(true); return; }
        try {
            // Import the full TF.js and force CPU backend — WebGL hangs on many systems
            const tf = await import('@tensorflow/tfjs');
            await tf.setBackend('cpu');
            await tf.ready();

            const faceapi = await import('@vladmandic/face-api');
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
        setError(''); setSaved(false);
        try { await api.put('/users/profile', { username, bio, customStatus, preferences: { background } }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
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
        <div className="flex h-screen bg-dark-900 text-white overflow-hidden relative">
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
                            <motion.div key="account" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <h3 className="text-2xl font-bold mb-8">My Account</h3>
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8">
                                    <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/5">
                                        <div className="relative group cursor-pointer" onClick={() => setShowAvatarPicker(true)}>
                                            <div className="w-20 h-20 rounded-full bg-indigo-500/60 flex items-center justify-center text-3xl font-bold overflow-hidden border-2 border-white/10">
                                                {avatarData?.url ? (
                                                    <img src={avatarData.url} alt="" className="w-full h-full object-cover" />
                                                ) : avatarData?.prebuilt ? (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: avatarData.bg }}>{avatarData.emoji}</div>
                                                ) : (
                                                    user?.username?.[0]?.toUpperCase() || '?'
                                                )}
                                            </div>
                                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><FiCamera className="w-5 h-5" /></div>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold">{user?.username}</p>
                                            <p className="text-sm text-white/30">{user?.email}</p>
                                            <button onClick={() => setShowAvatarPicker(true)} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition-colors">Change Avatar</button>
                                        </div>
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

                            {/* Avatar Picker Modal */}
                            <AvatarPicker
                                isOpen={showAvatarPicker}
                                onClose={() => setShowAvatarPicker(false)}
                                currentAvatar={avatarData}
                                onAvatarChange={(newAvatar) => setAvatarData(newAvatar)}
                                username={user?.username || ''}
                            />
                        )}

                        {/* SECURITY */}
                        {tab === 'security' && (
                            <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <h3 className="text-2xl font-bold mb-8">Security</h3>

                                {/* Change Password */}
                                <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-8 mb-6">
                                    <h4 className="text-lg font-semibold mb-5 flex items-center gap-2"><FiLock className="w-5 h-5 text-indigo-400" /> Change Password</h4>
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
                                                        const detection = await faceapi
                                                            .detectSingleFace(faceVideoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
                                                            .withFaceLandmarks()
                                                            .withFaceDescriptor();
                                                        if (!detection) { toast.error('No face detected. Look directly at the camera.'); setFaceScanning(false); return; }
                                                        const descriptor = Array.from(detection.descriptor);
                                                        await api.post('/auth/face-descriptor', { descriptor });
                                                        setFaceRegistered(true);
                                                        toast.success('Face ID registered successfully!');
                                                        if (faceStreamRef.current) faceStreamRef.current.getTracks().forEach(t => t.stop());
                                                        setCameraActive(false);
                                                    } catch (e) { toast.error('Failed to register face'); }
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
                                        <h4 className="text-lg font-semibold mb-2">Custom Background</h4>
                                        <p className="text-sm text-white/40 mb-4">Paste an image or GIF URL to use as your app background.</p>
                                        <input
                                            value={background}
                                            onChange={(e) => setBackground(e.target.value)}
                                            placeholder="https://example.com/animated-bg.gif"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20"
                                        />

                                        <div className="mt-6 flex flex-wrap gap-3">
                                            {['none', 'stars', 'matrix', 'cyberpunk'].map(preset => (
                                                <button key={preset} onClick={() => setBackground(preset === 'none' ? '' : preset)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${background === preset || (preset === 'none' && !background) ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/40 hover:bg-white/5'}`}>
                                                    {preset}
                                                </button>
                                            ))}
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
        </div>
    );
}
