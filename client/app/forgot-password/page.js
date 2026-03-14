'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiMail, FiMessageSquare, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
            toast.success('Reset link sent to your email!');
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

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
                    {!sent ? (
                        <>
                            <h2 className="text-2xl font-bold text-white text-center mb-2">Forgot Password?</h2>
                            <p className="text-dark-400 text-center mb-8">Enter your email and we&apos;ll send you a reset link</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Email</label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-field pl-11"
                                            placeholder="you@example.com"
                                            required
                                        />
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                                    </div>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-white/90 to-silver-300/90 text-white font-semibold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </motion.button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                                <FiMail className="w-8 h-8 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Check Your Email</h2>
                            <p className="text-dark-400 mb-6">We&apos;ve sent a password reset link to <span className="text-white">{email}</span></p>
                            
                            <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700/50 mt-4">
                                <p className="text-sm text-silver-300">
                                    <strong className="text-white">Didn&apos;t get it?</strong> Check your <span className="text-amber-400">Spam</span> or <span className="text-amber-400">Junk</span> folder. If you find it there, please mark it as <strong>"Report not spam"</strong> to help us reach your inbox next time!
                                </p>
                            </div>
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
