'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiLock, FiEye, FiEyeOff, FiMessageSquare, FiArrowLeft, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../services/api';

export default function ResetPasswordPage() {
    const { token } = useParams();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            setSuccess(true);
            toast.success('Password reset successfully!');
            setTimeout(() => router.push('/login'), 3000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid or expired reset link');
        } finally {
            setLoading(false);
        }
    };

    // Password strength
    const getStrength = () => {
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        return s;
    };
    const strength = getStrength();
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e', '#10b981'][strength];

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 bg-mesh opacity-30" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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

                <div className="glass p-8">
                    {!success ? (
                        <>
                            <h2 className="text-2xl font-bold text-white text-center mb-2">Reset Password</h2>
                            <p className="text-dark-400 text-center mb-8">Choose a new password for your account</p>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* New Password */}
                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-field pl-11 pr-11"
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
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
                                    {/* Strength indicator */}
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="h-1 flex-1 rounded-full transition-colors duration-300"
                                                        style={{ backgroundColor: strength >= i ? strengthColor : 'rgba(255,255,255,0.06)' }}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="input-field pl-11 pr-11"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                                        >
                                            {showConfirm ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                                    )}
                                    {confirmPassword && password === confirmPassword && password.length >= 8 && (
                                        <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><FiCheck className="w-3 h-3" /> Passwords match</p>
                                    )}
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading || password.length < 8 || password !== confirmPassword}
                                    className="w-full bg-gradient-to-r from-white/90 to-silver-300/90 text-dark-950 font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center mt-6"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-dark-950/30 border-t-dark-950 rounded-full animate-spin" />
                                    ) : (
                                        'Reset Password'
                                    )}
                                </motion.button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <FiCheck className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                            <p className="text-dark-400 mb-2">Your password has been updated successfully.</p>
                            <p className="text-dark-500 text-sm">Redirecting to login...</p>
                        </div>
                    )}

                    <Link href="/login" className="flex items-center justify-center gap-2 mt-6 text-silver-300 hover:text-silver-200 text-sm font-medium transition-colors">
                        <FiArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
