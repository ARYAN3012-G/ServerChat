'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff, FiMessageSquare, FiSmartphone, FiCamera, FiShield, FiArrowRight, FiSettings, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/authSlice';

export default function LoginPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { login } = useAuth();
    const [loginMethod, setLoginMethod] = useState('email');
    const [loading, setLoading] = useState(false);

    // Email tab
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Phone tab
    const [phone, setPhone] = useState('');
    const [phonePassword, setPhonePassword] = useState('');
    const [showPhonePassword, setShowPhonePassword] = useState(false);

    // Face ID tab
    const [faceEmail, setFaceEmail] = useState('');
    const [scanning, setScanning] = useState(false);
    const [capturedPreview, setCapturedPreview] = useState(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);

    // 2FA
    const [require2FA, setRequire2FA] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [tempToken, setTempToken] = useState('');

    // Welcome modal  (post-OAuth)
    const [showWelcome, setShowWelcome] = useState(false);

    // ─── OAuth callback handler (runs ONCE on mount) ───
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const rToken = params.get('refreshToken');
        const error = params.get('error');
        const needsPassword = params.get('needsPassword');

        // If no OAuth params in URL, skip
        if (!token && !rToken && !error) return;

        // Clean URL immediately
        window.history.replaceState({}, document.title, '/login');

        if (error === 'oauth_failed') {
            toast.error('OAuth Authentication failed');
            return;
        }

        if (token && rToken) {
            // Save tokens
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', rToken);

            if (needsPassword === 'true') {
                setShowWelcome(true);
                return;
            }

            // Fetch user profile and redirect
            const fetchAndRedirect = async () => {
                try {
                    const { data } = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    dispatch(setCredentials({
                        user: data.user,
                        accessToken: token,
                        refreshToken: rToken,
                    }));
                    toast.success('Welcome back!');
                    router.push(getRedirectPath());
                } catch (e) {
                    console.error('OAuth hydration failed:', e);
                    toast.error(e.response?.data?.message || 'Login failed — please try again');
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
            };
            fetchAndRedirect();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — run once on mount only

    // ─── Check for pending invite ───
    const getRedirectPath = useCallback(() => {
        const pending = typeof window !== 'undefined' ? localStorage.getItem('pendingInvite') : null;
        if (pending) {
            localStorage.removeItem('pendingInvite');
            return `/invite/${pending}`;
        }
        return '/channels';
    }, []);

    // ─── Hydrate Redux from localStorage (for regular page loads) ───
    const hydrateAndRedirect = useCallback(async (path) => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                const { data } = await api.get('/auth/me');
                dispatch(setCredentials({
                    user: data.user,
                    accessToken: storedToken,
                    refreshToken: localStorage.getItem('refreshToken'),
                }));
            } catch (e) { /* will redirect to login naturally */ }
        }
        router.push(path || getRedirectPath());
    }, [dispatch, router, getRedirectPath]);

    // ─── Webcam for Face ID ───
    useEffect(() => {
        if (loginMethod === 'face') {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [loginMethod]);

    const startCamera = async () => {
        setCapturedPreview(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } } });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) { toast.error('Camera access denied'); }
    };
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCapturedPreview(null);
    };
    const setVideoElement = (el) => {
        videoRef.current = el;
        if (el && streamRef.current) el.srcObject = streamRef.current;
    };

    // Step 1: Capture one frame → show preview
    const captureFrame = () => {
        const video = videoRef.current;
        if (!video) return;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvasRef.current = canvas;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPreview(image);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };

    // Retake
    const retake = () => {
        setCapturedPreview(null);
        startCamera();
    };

    // ─── Handlers ───
    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await login(email, password);
            if (result.require2FA) {
                setRequire2FA(true);
                setTempToken(result.tempToken);
                toast.success('Enter your 2FA code');
            } else {
                toast.success('Welcome back!');
                router.push(getRedirectPath());
            }
        } catch (error) {
            const data = error.response?.data;
            if (data?.oauthAccount) {
                toast.error(data.message, { duration: 6000 });
            } else {
                toast.error(data?.message || 'Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneLogin = async (e) => {
        e.preventDefault();
        if (phone.includes('@')) {
            toast.error('Please enter a phone number, not an email');
            return;
        }
        if (phone.replace(/\D/g, '').length < 7) {
            toast.error('Please enter a valid phone number');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { phone, password: phonePassword });
            if (data.require2FA) {
                setRequire2FA(true);
                setTempToken(data.tempToken);
                toast.success('Enter your 2FA code');
            } else {
                localStorage.setItem('token', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                dispatch(setCredentials(data));
                toast.success('Welcome back!');
                router.push(getRedirectPath());
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: User confirmed preview → send to server for Face++ Compare
    const handleFaceLogin = async () => {
        if (!faceEmail) { toast.error('Please enter your email first'); return; }
        if (!capturedPreview) { toast.error('Please capture a photo first'); return; }

        setScanning(true);
        try {
            const { data } = await api.post('/auth/face-login', { email: faceEmail, image: capturedPreview });
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            dispatch(setCredentials(data));
            stopCamera();
            toast.success('Welcome back!');
            router.push(getRedirectPath());
        } catch (error) {
            toast.error(error.response?.data?.message || 'Face recognition failed');
        } finally {
            setScanning(false);
        }
    };

    const handleOAuth = (provider) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        window.location.href = `${apiUrl}/api/auth/${provider}`;
    };

    // ─── RENDER ───
    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 bg-mesh opacity-30" />
            <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
            <div className="fixed bottom-0 right-1/3 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/90 to-silver-300/90 flex items-center justify-center">
                            <FiMessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-3xl font-display font-bold text-white">ServerChat</span>
                    </Link>
                </div>

                <div className="glass p-5 sm:p-8">
                    <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Back!</h2>
                    <p className="text-dark-400 text-center mb-8">We&apos;re excited to see you again</p>

                    {!require2FA ? (
                        <>
                            {/* Login method tabs */}
                            <div className="flex gap-1 p-1 bg-dark-800 rounded-lg mb-6">
                                {[
                                    { id: 'email', icon: FiMail, label: 'Email' },
                                    { id: 'phone', icon: FiSmartphone, label: 'Phone' },
                                    { id: 'face', icon: FiCamera, label: 'Face ID', shortLabel: 'Face' },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setLoginMethod(method.id)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${loginMethod === method.id
                                            ? 'bg-white text-dark-900'
                                            : 'text-dark-400 hover:text-white'
                                            }`}
                                    >
                                        <method.icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{method.label}</span>
                                        <span className="sm:hidden">{method.shortLabel || method.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* ═══ EMAIL TAB ═══ */}
                            {loginMethod === 'email' && (
                                <form onSubmit={handleEmailLogin} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Email or Username</label>
                                        <div className="relative">
                                            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)}
                                                className="input-field pl-11" placeholder="you@example.com" required />
                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Password</label>
                                        <div className="relative">
                                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                                className="input-field pl-11 pr-11" placeholder="••••••••" required />
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                                                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Link href="/forgot-password" className="text-sm text-silver-300 hover:text-silver-200 transition-colors">Forgot Password?</Link>
                                    </div>
                                    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                        className="w-full bg-gradient-to-r from-white/90 to-silver-300/90 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Log In'}
                                    </motion.button>
                                </form>
                            )}

                            {/* ═══ PHONE TAB ═══ */}
                            {loginMethod === 'phone' && (
                                <form onSubmit={handlePhoneLogin} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Phone Number</label>
                                        <div className="relative">
                                            <input type="tel" value={phone}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val.includes('@')) { toast.error('Please enter a phone number, not an email'); return; }
                                                    setPhone(val);
                                                }}
                                                className="input-field pl-11" placeholder="+91 98765 43210" required />
                                            <FiSmartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                        </div>
                                        <p className="text-[10px] text-white/20 mt-1">Add your phone number in Settings first to enable phone login</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Password</label>
                                        <div className="relative">
                                            <input type={showPhonePassword ? 'text' : 'password'} value={phonePassword} onChange={(e) => setPhonePassword(e.target.value)}
                                                className="input-field pl-11 pr-11" placeholder="••••••••" required />
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                            <button type="button" onClick={() => setShowPhonePassword(!showPhonePassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                                                {showPhonePassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiSmartphone className="w-4 h-4" /> Log In with Phone</>}
                                    </motion.button>
                                </form>
                            )}

                            {/* ═══ FACE ID TAB ═══ */}
                            {loginMethod === 'face' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Email</label>
                                        <div className="relative">
                                            <input type="email" value={faceEmail} onChange={(e) => setFaceEmail(e.target.value)}
                                                className="input-field pl-11" placeholder="you@example.com" required />
                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Camera / Preview */}
                                    <div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-white/10 aspect-[4/3]">
                                        {capturedPreview ? (
                                            <img src={capturedPreview} alt="Preview" className="w-full h-full object-cover scale-x-[-1]" />
                                        ) : (
                                            <video ref={setVideoElement} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className={`w-44 h-44 rounded-full border-2 transition-colors ${
                                                scanning ? 'border-emerald-400 animate-pulse' :
                                                capturedPreview ? 'border-emerald-400' : 'border-white/20'
                                            }`} />
                                        </div>
                                        <div className="absolute bottom-3 left-0 right-0 text-center">
                                            <span className={`text-xs px-3 py-1.5 rounded-full backdrop-blur-sm ${
                                                scanning ? 'bg-emerald-500/30 text-emerald-300' :
                                                capturedPreview ? 'bg-emerald-500/30 text-emerald-300' :
                                                'bg-black/30 text-white/60'
                                            }`}>
                                                {scanning ? '⏳ Verifying...' : capturedPreview ? '✅ Confirm to login' : '📸 Click Capture'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-white/20 text-center">Register your face during sign-up or in Settings &gt; Security</p>

                                    {capturedPreview ? (
                                        <div className="flex gap-3">
                                            <motion.button whileTap={{ scale: 0.98 }} onClick={handleFaceLogin}
                                                disabled={scanning}
                                                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                                                {scanning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiCheck className="w-4 h-4" /> Confirm &amp; Login</>}
                                            </motion.button>
                                            <motion.button whileTap={{ scale: 0.98 }} onClick={retake} disabled={scanning}
                                                className="px-5 py-3 rounded-lg text-sm text-white/50 border border-white/10 hover:border-white/20 hover:text-white transition-all flex items-center gap-2">
                                                <FiRefreshCw className="w-4 h-4" /> Retake
                                            </motion.button>
                                        </div>
                                    ) : (
                                        <motion.button whileTap={{ scale: 0.98 }} onClick={captureFrame}
                                            disabled={loading}
                                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                                            <FiCamera className="w-4 h-4" /> Capture Photo
                                        </motion.button>
                                    )}
                                </div>
                            )}

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-600" /></div>
                                <div className="relative flex justify-center text-sm"><span className="px-4 bg-transparent text-dark-400">Or continue with</span></div>
                            </div>

                            {/* Social login */}
                            <div className="grid grid-cols-2 gap-3">
                                <motion.button onClick={() => handleOAuth('google')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors" type="button">
                                    <FaGoogle className="w-4 h-4 text-red-400" /> Google
                                </motion.button>
                                <motion.button onClick={() => handleOAuth('github')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors" type="button">
                                    <FaGithub className="w-4 h-4" /> GitHub
                                </motion.button>
                            </div>
                        </>
                    ) : (
                        /* 2FA Form */
                        <form onSubmit={handleEmailLogin} className="space-y-4">
                            <p className="text-dark-300 text-center text-sm">Enter the 6-digit code from your authenticator app</p>
                            <input type="text" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)}
                                className="input-field text-center text-2xl tracking-[0.5em]" placeholder="000000" maxLength={6} required />
                            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full btn-primary">
                                Verify
                            </motion.button>
                        </form>
                    )}

                    <p className="text-center text-dark-400 mt-6 text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-silver-300 hover:text-silver-200 font-medium transition-colors">Sign Up</Link>
                    </p>
                </div>
            </motion.div>

            {/* ─── WELCOME MODAL (after first OAuth login) ─── */}
            <AnimatePresence>
                {showWelcome && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                            <div className="p-8 text-center">
                                <div className="text-5xl mb-4">🎉</div>
                                <h2 className="text-2xl font-bold text-white mb-2">Welcome to ServerChat!</h2>
                                <p className="text-white/40 text-sm leading-relaxed">
                                    Would you like to set up your profile? You can add a <span className="text-white/60">password</span>, <span className="text-white/60">phone number</span>, and <span className="text-white/60">Face ID</span> for easier login next time.
                                </p>
                            </div>
                            <div className="px-6 sm:px-8 pb-8 flex flex-col sm:flex-row gap-3">
                                <motion.button whileTap={{ scale: 0.97 }}
                                    onClick={() => { setShowWelcome(false); hydrateAndRedirect('/channels'); }}
                                    className="w-full sm:flex-1 py-3 sm:py-3.5 rounded-xl text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all font-medium order-2 sm:order-1">
                                    Skip for now
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.97 }}
                                    onClick={() => { setShowWelcome(false); hydrateAndRedirect('/settings?tab=security'); }}
                                    className="w-full sm:flex-1 py-3 sm:py-3.5 rounded-xl text-sm bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 order-1 sm:order-2 shadow-lg shadow-indigo-500/20">
                                    <FiSettings className="w-4 h-4 shrink-0" /> <span className="truncate">Update Details</span>
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
