'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiMessageSquare } from 'react-icons/fi';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
    const router = useRouter();
    const { register } = useAuth();
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

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
            toast.success('Account created! Welcome to ServerChat! 🎉');
            router.push('/channels');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
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

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
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
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="cooluser123"
                                    required
                                    minLength={3}
                                />
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="you@example.com"
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
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
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
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 h-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`flex-1 rounded-full transition-all ${i <= pwStrength.strength / 20 ? pwStrength.color : 'bg-dark-700'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-dark-400 mt-1">{pwStrength.label}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="input-field pl-11"
                                    placeholder="••••••••"
                                    required
                                />
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400 w-4 h-4" />
                            </div>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                className="mt-1 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-white/20"
                            />
                            <span className="text-dark-400 text-sm">
                                I agree to the <span className="text-silver-300">Terms of Service</span> and{' '}
                                <span className="text-silver-300">Privacy Policy</span>
                            </span>
                        </label>

                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-white/90 to-silver-300/90 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Create Account'
                            )}
                        </motion.button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-dark-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-transparent text-dark-400">Or sign up with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <motion.button
                            onClick={() => handleOAuth('google')}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors">
                            <FaGoogle className="w-4 h-4 text-red-400" /> Google
                        </motion.button>
                        <motion.button
                            onClick={() => handleOAuth('github')}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors">
                            <FaGithub className="w-4 h-4" /> GitHub
                        </motion.button>
                    </div>

                    <p className="text-center text-dark-400 mt-6 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-silver-300 hover:text-silver-200 font-medium transition-colors">
                            Log In
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
