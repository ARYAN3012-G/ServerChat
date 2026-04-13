'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiMessageSquare, FiCamera, FiCheck, FiArrowRight, FiShield } from 'react-icons/fi';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    // Face ID step (shown after successful registration)
    const [step, setStep] = useState('register'); // 'register' | 'faceSetup'
    const [cameraActive, setCameraActive] = useState(false);
    const [faceScanning, setFaceScanning] = useState(false);
    const [faceRegistered, setFaceRegistered] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ── Camera helpers ──
    const startCamera = async () => {
        setCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } }
            });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
            toast.error('Camera access denied');
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const setVideoElement = (el) => {
        videoRef.current = el;
        if (el && streamRef.current) el.srcObject = streamRef.current;
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return null;
        const canvas = canvasRef.current || document.createElement('canvas');
        canvasRef.current = canvas;
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 360;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    };

    const registerFace = async () => {
        setFaceScanning(true);
        try {
            const image = capturePhoto();
            if (!image) { toast.error('Could not capture photo'); setFaceScanning(false); return; }
            await api.post('/auth/face-descriptor', { image });
            setFaceRegistered(true);
            stopCamera();
            toast.success('Face ID registered! 🎉');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Face registration failed. Try better lighting.');
        }
        setFaceScanning(false);
    };

    // ── Registration submit ──
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        if (formData.password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        if (!agreeToTerms) {
            return toast.error('Please agree to the terms');
        }

        setLoading(true);
        try {
            await register(formData.username, formData.email, formData.password);
            toast.success('Account created! 🎉');
            // Move to Face ID setup step instead of redirecting
            setStep('faceSetup');
            // Auto-start camera after a short delay
            setTimeout(() => startCamera(), 500);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSkipFace = () => {
        stopCamera();
        const pendingInvite = localStorage.getItem('pendingInvite');
        if (pendingInvite) {
            localStorage.removeItem('pendingInvite');
            router.push(`/invite/${pendingInvite}`);
        } else {
            router.push('/channels');
        }
    };

    const handleOAuth = (provider) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        window.location.href = `${apiUrl}/api/auth/${provider}`;
    };

    // Password strength
    const getPasswordStrength = () => {
        const { password } = formData;
        if (!password) return { strength: 0, label: '', color: '' };
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 10) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { strength: 20, label: 'Very Weak', color: 'bg-red-500' },
            { strength: 40, label: 'Weak', color: 'bg-orange-500' },
            { strength: 60, label: 'Fair', color: 'bg-yellow-500' },
            { strength: 80, label: 'Strong', color: 'bg-green-500' },
            { strength: 100, label: 'Very Strong', color: 'bg-emerald-500' },
        ];
        return levels[Math.min(score, 4)];
    };

    const pwStrength = getPasswordStrength();

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 bg-mesh opacity-30" />
            <div className="fixed top-0 right-1/3 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl" />
            <div className="fixed bottom-0 left-1/3 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />

            <AnimatePresence mode="wait">
                {/* ═══════════ STEP 1: REGISTRATION FORM ═══════════ */}
                {step === 'register' && (
                    <motion.div
                        key="register"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                        className="relative z-10 w-full max-w-md"
                    >
                        <div className="text-center mb-8">
                            <Link href="/" className="inline-flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/90 to-silver-300/90 flex items-center justify-center">
                                    <FiMessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-3xl font-display font-bold text-white">ServerChat</span>
                            </Link>
                        </div>

                        <div className="glass p-5 sm:p-8">
                            <h2 className="text-2xl font-bold text-white text-center mb-2">Create Account</h2>
                            <p className="text-dark-400 text-center mb-8">Join the community today</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Username</label>
                                    <div className="relative">
                                        <input type="text" name="username" value={formData.username} onChange={handleChange}
                                            className="input-field pl-11" placeholder="cooluser123" required minLength={3} />
                                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Email</label>
                                    <div className="relative">
                                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                                            className="input-field pl-11" placeholder="you@example.com" required />
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Password</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                                            className="input-field pl-11 pr-11" placeholder="••••••••" required />
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                                            {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {formData.password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 h-1">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <div key={i} className={`flex-1 rounded-full transition-all ${i <= pwStrength.strength / 20 ? pwStrength.color : 'bg-dark-700'}`} />
                                                ))}
                                            </div>
                                            <p className="text-xs text-dark-400 mt-1">{pwStrength.label}</p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                                    <div className="relative">
                                        <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                                            className="input-field pl-11" placeholder="••••••••" required />
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                    </div>
                                </div>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)}
                                        className="mt-1 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-white/20" />
                                    <span className="text-dark-400 text-sm">
                                        I agree to the{' '}
                                        <Link href="/terms" target="_blank" className="text-silver-300 hover:text-white underline transition-colors">Terms of Service</Link>
                                        {' '}and{' '}
                                        <Link href="/privacy" target="_blank" className="text-silver-300 hover:text-white underline transition-colors">Privacy Policy</Link>
                                    </span>
                                </label>

                                <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading}
                                    className="w-full bg-gradient-to-r from-white/90 to-silver-300/90 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center">
                                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                                </motion.button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dark-600" /></div>
                                <div className="relative flex justify-center text-sm"><span className="px-4 bg-transparent text-dark-400">Or sign up with</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <motion.button onClick={() => handleOAuth('google')} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors">
                                    <FaGoogle className="w-4 h-4 text-red-400" /> Google
                                </motion.button>
                                <motion.button onClick={() => handleOAuth('github')} type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors">
                                    <FaGithub className="w-4 h-4" /> GitHub
                                </motion.button>
                            </div>

                            <p className="text-center text-dark-400 mt-6 text-sm">
                                Already have an account?{' '}
                                <Link href="/login" className="text-silver-300 hover:text-silver-200 font-medium transition-colors">Log In</Link>
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* ═══════════ STEP 2: FACE ID SETUP ═══════════ */}
                {step === 'faceSetup' && (
                    <motion.div
                        key="faceSetup"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="relative z-10 w-full max-w-md"
                    >
                        <div className="text-center mb-8">
                            <Link href="/" className="inline-flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/90 to-silver-300/90 flex items-center justify-center">
                                    <FiMessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-3xl font-display font-bold text-white">ServerChat</span>
                            </Link>
                        </div>

                        <div className="glass p-5 sm:p-8">
                            {/* Progress indicator */}
                            <div className="flex items-center justify-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                    <FiCheck className="w-4 h-4 text-white" />
                                </div>
                                <div className="w-12 h-0.5 bg-emerald-500" />
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${faceRegistered ? 'bg-emerald-500' : 'bg-violet-500 animate-pulse'}`}>
                                    {faceRegistered ? <FiCheck className="w-4 h-4 text-white" /> : <FiCamera className="w-4 h-4 text-white" />}
                                </div>
                            </div>

                            {!faceRegistered ? (
                                <>
                                    <h2 className="text-2xl font-bold text-white text-center mb-2">Set Up Face ID</h2>
                                    <p className="text-dark-400 text-center mb-6 text-sm">
                                        Register your face for quick, secure login next time. You can also do this later in Settings.
                                    </p>

                                    {/* Camera feed */}
                                    {cameraActive ? (
                                        <div className="space-y-4">
                                            <div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-white/10 aspect-[4/3]">
                                                <video ref={setVideoElement} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />

                                                {/* Face guide circle */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className={`w-44 h-44 rounded-full border-2 transition-all duration-300 ${
                                                        faceScanning ? 'border-violet-400 animate-pulse shadow-[0_0_30px_rgba(139,92,246,0.3)]' : 'border-white/20'
                                                    }`} />
                                                </div>

                                                {/* Corner guides */}
                                                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-violet-400/50 rounded-tl-lg" />
                                                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-violet-400/50 rounded-tr-lg" />
                                                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-violet-400/50 rounded-bl-lg" />
                                                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-violet-400/50 rounded-br-lg" />

                                                {/* Status badge */}
                                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                                    <span className={`text-xs px-3 py-1.5 rounded-full backdrop-blur-sm ${
                                                        faceScanning ? 'bg-violet-500/30 text-violet-300' : 'bg-black/30 text-white/60'
                                                    }`}>
                                                        {faceScanning ? '🔍 Analyzing face...' : '📸 Position your face in the circle'}
                                                    </span>
                                                </div>
                                            </div>

                                            <motion.button whileTap={{ scale: 0.98 }} onClick={registerFace} disabled={faceScanning}
                                                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                                                {faceScanning ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <><FiShield className="w-4 h-4" /> Capture &amp; Register Face</>
                                                )}
                                            </motion.button>
                                        </div>
                                    ) : (
                                        <motion.button whileTap={{ scale: 0.98 }} onClick={startCamera}
                                            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                                            <FiCamera className="w-4 h-4" /> Open Camera
                                        </motion.button>
                                    )}

                                    <button onClick={handleSkipFace}
                                        className="w-full mt-3 py-3 text-sm text-white/40 hover:text-white/60 transition-colors font-medium">
                                        Skip for now &rarr;
                                    </button>
                                </>
                            ) : (
                                /* Success state */
                                <div className="text-center py-4">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                                        className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                        <FiCheck className="w-10 h-10 text-emerald-400" />
                                    </motion.div>
                                    <h2 className="text-2xl font-bold text-white mb-2">You&apos;re All Set! 🎉</h2>
                                    <p className="text-dark-400 text-sm mb-6">
                                        Your account is created and Face ID is registered. You can now log in with your email or just your face!
                                    </p>
                                    <motion.button whileTap={{ scale: 0.98 }} onClick={handleSkipFace}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                                        <FiArrowRight className="w-4 h-4" /> Enter ServerChat
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
