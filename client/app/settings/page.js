'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiUser, FiLock, FiBell, FiMonitor, FiLogOut, FiSave, FiSun, FiMoon, FiShield } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { toggleTheme } from '../../redux/uiSlice';
import api from '../../services/api';

export default function SettingsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, logout } = useAuth();
    const { theme } = useSelector((s) => s.ui);

    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState({ username: '', email: '', bio: '', customStatus: '' });
    const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (user) {
            setProfile({ username: user.username || '', email: user.email || '', bio: user.bio || '', customStatus: user.customStatus || '' });
        }
    }, [user]);

    const handleSaveProfile = async () => {
        setSaving(true); setMessage({ type: '', text: '' });
        try {
            await api.put('/users/profile', { username: profile.username, bio: profile.bio, customStatus: profile.customStatus });
            setMessage({ type: 'success', text: 'Profile updated!' });
        } catch (e) {
            setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to update' });
        } finally { setSaving(false); }
    };

    const handleChangePassword = async () => {
        if (passwords.newPassword !== passwords.confirm) {
            setMessage({ type: 'error', text: 'Passwords do not match' }); return;
        }
        setSaving(true); setMessage({ type: '', text: '' });
        try {
            await api.put('/users/password', { currentPassword: passwords.current, newPassword: passwords.newPassword });
            setMessage({ type: 'success', text: 'Password changed!' });
            setPasswords({ current: '', newPassword: '', confirm: '' });
        } catch (e) {
            setMessage({ type: 'error', text: e.response?.data?.message || 'Failed' });
        } finally { setSaving(false); }
    };

    const tabs = [
        { id: 'profile', label: 'My Account', icon: FiUser },
        { id: 'security', label: 'Security', icon: FiLock },
        { id: 'appearance', label: 'Appearance', icon: FiMonitor },
        { id: 'notifications', label: 'Notifications', icon: FiBell },
    ];

    return (
        <div className="flex h-screen bg-dark-800 text-white">
            {/* Sidebar */}
            <div className="w-56 bg-dark-800 border-r border-dark-900 flex flex-col">
                <div className="h-12 px-4 flex items-center border-b border-dark-900">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-dark-300 hover:text-white transition-colors text-sm">
                        <FiArrowLeft className="w-4 h-4" /> Back
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <p className="text-xs font-semibold text-dark-400 uppercase tracking-wide px-3 py-2">User Settings</p>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => { setActiveTab(t.id); setMessage({ type: '', text: '' }); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-0.5 ${activeTab === t.id ? 'bg-dark-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}`}>
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                    <div className="border-t border-dark-700 mt-4 pt-2">
                        <button onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                            <FiLogOut className="w-4 h-4" /> Log Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-8">
                    {message.text && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                            className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-discord-green/20 text-discord-green' : 'bg-red-500/20 text-red-400'}`}>
                            {message.text}
                        </motion.div>
                    )}

                    {activeTab === 'profile' && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">My Account</h2>
                            <div className="bg-dark-700 rounded-xl p-6 space-y-5">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-20 h-20 rounded-full bg-primary-500 flex items-center justify-center text-3xl font-bold">
                                        {user?.username?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold">{user?.username}</p>
                                        <p className="text-dark-400 text-sm">{user?.email}</p>
                                        <button className="mt-2 text-xs text-primary-400 hover:underline">Change Avatar</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Username</label>
                                    <input type="text" value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Email</label>
                                    <input type="email" value={profile.email} disabled className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-dark-400 cursor-not-allowed" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Bio</label>
                                    <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} rows={3}
                                        placeholder="Tell everyone about yourself" className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all resize-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Custom Status</label>
                                    <input type="text" value={profile.customStatus} onChange={(e) => setProfile({ ...profile, customStatus: e.target.value })}
                                        placeholder="What are you up to?" className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all" />
                                </div>
                                <button onClick={handleSaveProfile} disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors">
                                    <FiSave className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">Security</h2>
                            <div className="bg-dark-700 rounded-xl p-6 space-y-5">
                                <h3 className="font-semibold flex items-center gap-2"><FiShield className="w-5 h-5" /> Change Password</h3>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Current Password</label>
                                    <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">New Password</label>
                                    <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Confirm New Password</label>
                                    <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white" />
                                </div>
                                <button onClick={handleChangePassword} disabled={saving || !passwords.current || !passwords.newPassword}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 disabled:opacity-50 transition-colors">
                                    <FiLock className="w-4 h-4" /> {saving ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">Appearance</h2>
                            <div className="bg-dark-700 rounded-xl p-6">
                                <h3 className="font-semibold mb-4">Theme</h3>
                                <div className="flex gap-4">
                                    <button onClick={() => theme !== 'dark' && dispatch(toggleTheme())}
                                        className={`flex-1 p-6 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary-500 bg-dark-900' : 'border-dark-600 hover:border-dark-500'}`}>
                                        <FiMoon className="w-8 h-8 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-center">Dark</p>
                                    </button>
                                    <button onClick={() => theme !== 'light' && dispatch(toggleTheme())}
                                        className={`flex-1 p-6 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary-500 bg-dark-600' : 'border-dark-600 hover:border-dark-500'}`}>
                                        <FiSun className="w-8 h-8 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-center">Light</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div>
                            <h2 className="text-xl font-bold mb-6">Notifications</h2>
                            <div className="bg-dark-700 rounded-xl p-6 space-y-4">
                                {['Enable Desktop Notifications', 'Enable Message Sounds', 'Enable Friend Request Notifications', 'Show Message Preview in Notifications'].map((label, i) => (
                                    <div key={i} className="flex items-center justify-between py-2">
                                        <span className="text-sm">{label}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" defaultChecked className="sr-only peer" />
                                            <div className="w-11 h-6 bg-dark-500 peer-checked:bg-primary-500 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] peer-checked:after:translate-x-5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
