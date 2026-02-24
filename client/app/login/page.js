'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff, FiMessageSquare, FiSmartphone, FiCamera } from 'react-icons/fi';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState('email');
    const [loading, setLoading] = useState(false);
    const [require2FA, setRequire2FA] = useState(false);
    const [twoFACode, setTwoFACode] = useState('');
    const [tempToken, setTempToken] = useState('');

    const handleSubmit = async (e) => {
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
                router.push('/channels');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="fixed inset-0 bg-mesh opacity-30" />
            <div className="fixed top-0 left-1/3 w-[600px] h-[600px] bg-primary-500/8 rounded-full blur-3xl" />
            <div className="fixed bottom-0 right-1/3 w-[600px] h-[600px] bg-purple-500/8 rounded-full blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                            <FiMessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-3xl font-display font-bold text-white">ServerChat</span>
                    </Link>
                </div>

                <div className="glass p-8">
                    <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome Back!</h2>
                    <p className="text-dark-400 text-center mb-8">We&apos;re excited to see you again</p>

                    {!require2FA ? (
                        <>
                            {/* Login method tabs */}
                            <div className="flex gap-1 p-1 bg-dark-800 rounded-lg mb-6">
                                {[
                                    { id: 'email', icon: FiMail, label: 'Email' },
                                    { id: 'phone', icon: FiSmartphone, label: 'Phone' },
                                    { id: 'face', icon: FiCamera, label: 'Face ID' },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setLoginMethod(method.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${loginMethod === method.id
                                                ? 'bg-primary-500 text-white'
                                                : 'text-dark-400 hover:text-white'
                                            }`}
                                    >
                                        <method.icon className="w-4 h-4" />
                                        {method.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">
                                        {loginMethod === 'phone' ? 'Phone Number' : 'Email or Username'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={loginMethod === 'phone' ? 'tel' : 'text'}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-field pl-11"
                                            placeholder={loginMethod === 'phone' ? '+1 234 567 8900' : 'you@example.com'}
                                            required
                                        />
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-field pl-11 pr-11"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <Link href="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                                        Forgot Password?
                                    </Link>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Log In'
                                    )}
                                </motion.button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-dark-600" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-transparent text-dark-400">Or continue with</span>
                                </div>
                            </div>

                            {/* Social login */}
                            <div className="grid grid-cols-2 gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors"
                                >
                                    <FaGoogle className="w-4 h-4 text-red-400" />
                                    Google
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors"
                                >
                                    <FaGithub className="w-4 h-4" />
                                    GitHub
                                </motion.button>
                            </div>
                        </>
                    ) : (
                        /* 2FA Form */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-dark-300 text-center text-sm">Enter the 6-digit code from your authenticator app</p>
                            <input
                                type="text"
                                value={twoFACode}
                                onChange={(e) => setTwoFACode(e.target.value)}
                                className="input-field text-center text-2xl tracking-[0.5em]"
                                placeholder="000000"
                                maxLength={6}
                                required
                            />
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary"
                            >
                                Verify
                            </motion.button>
                        </form>
                    )}

                    <p className="text-center text-dark-400 mt-6 text-sm">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
