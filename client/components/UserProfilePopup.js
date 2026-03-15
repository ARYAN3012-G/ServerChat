'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiEdit3, FiCheck, FiStar } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

// Pre-built avatar gallery (same as AvatarPicker)
const AVATARS = [
    { id: 'avatar-blue', bg: 'linear-gradient(135deg, #667eea, #764ba2)', emoji: '😎' },
    { id: 'avatar-green', bg: 'linear-gradient(135deg, #11998e, #38ef7d)', emoji: '🤩' },
    { id: 'avatar-sunset', bg: 'linear-gradient(135deg, #fc5c7d, #6a82fb)', emoji: '🔥' },
    { id: 'avatar-ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)', emoji: '🌊' },
    { id: 'avatar-neon', bg: 'linear-gradient(135deg, #f093fb, #f5576c)', emoji: '⚡' },
    { id: 'avatar-aurora', bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', emoji: '💫' },
    { id: 'avatar-lava', bg: 'linear-gradient(135deg, #f12711, #f5af19)', emoji: '🎯' },
    { id: 'avatar-forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)', emoji: '🌿' },
    { id: 'avatar-cosmic', bg: 'linear-gradient(135deg, #7f00ff, #e100ff)', emoji: '🚀' },
    { id: 'avatar-ice', bg: 'linear-gradient(135deg, #c3cfe2, #f5f7fa)', emoji: '❄️' },
    { id: 'avatar-royal', bg: 'linear-gradient(135deg, #4a00e0, #8e2de2)', emoji: '👑' },
    { id: 'avatar-candy', bg: 'linear-gradient(135deg, #ff6fd8, #3813c2)', emoji: '🍬' },
];

export default function UserProfilePopup({ isOpen, onClose, userId, username, status, bio, nickname, customAvatar, onNicknameChange, onAvatarChange }) {
    const [editingNickname, setEditingNickname] = useState(false);
    const [nicknameInput, setNicknameInput] = useState(nickname || '');
    const [showAvatarGallery, setShowAvatarGallery] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setNicknameInput(nickname || '');
        setEditingNickname(false);
        setShowAvatarGallery(false);
    }, [isOpen, userId]);

    const handleSaveNickname = async () => {
        setSaving(true);
        try {
            await api.put(`/friends/nickname/${userId}`, { nickname: nicknameInput.trim() });
            onNicknameChange?.(userId, nicknameInput.trim() || null);
            setEditingNickname(false);
            toast.success(nicknameInput.trim() ? 'Nickname updated!' : 'Nickname removed');
        } catch (e) {
            toast.error('Failed to update nickname');
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAvatar = async (avatar) => {
        setSaving(true);
        try {
            if (avatar) {
                await api.put(`/friends/avatar/${userId}`, { avatarId: avatar.id, bg: avatar.bg, emoji: avatar.emoji });
                onAvatarChange?.(userId, { id: avatar.id, bg: avatar.bg, emoji: avatar.emoji });
            } else {
                await api.put(`/friends/avatar/${userId}`, {});
                onAvatarChange?.(userId, null);
            }
            setShowAvatarGallery(false);
            toast.success('Avatar updated!');
        } catch (e) {
            toast.error('Failed to update avatar');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const statusColor = status === 'online' ? 'bg-emerald-400' : status === 'idle' ? 'bg-amber-400' : status === 'dnd' ? 'bg-red-500' : 'bg-gray-500';
    const statusText = status === 'online' ? 'Online' : status === 'idle' ? 'Idle' : status === 'dnd' ? 'Do Not Disturb' : 'Offline';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-dark-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Banner */}
                    <div className="h-20 bg-gradient-to-r from-indigo-500 to-purple-600 relative">
                        <button onClick={onClose} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 text-white/80 hover:text-white transition-colors">
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Avatar */}
                    <div className="relative px-5 -mt-10">
                        <div
                            className="w-20 h-20 rounded-full border-4 border-dark-800 flex items-center justify-center text-2xl font-bold overflow-hidden cursor-pointer group relative"
                            onClick={() => setShowAvatarGallery(!showAvatarGallery)}
                            title="Change avatar for this friend"
                        >
                            {customAvatar ? (
                                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: customAvatar.bg }}>
                                    {customAvatar.emoji}
                                </div>
                            ) : (
                                <div className="w-full h-full bg-indigo-500/60 flex items-center justify-center">
                                    {(username || '?')[0].toUpperCase()}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                                <FiEdit3 className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <div className={`absolute bottom-1 left-[72px] w-4 h-4 rounded-full border-[3px] border-dark-800 ${statusColor}`} />
                    </div>

                    {/* Info */}
                    <div className="px-5 pt-3 pb-4">
                        {/* Nickname Section */}
                        <div className="flex items-center gap-2 mb-1">
                            {editingNickname ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={nicknameInput}
                                        onChange={(e) => setNicknameInput(e.target.value)}
                                        placeholder="Set a nickname..."
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none text-white placeholder-white/30 focus:border-indigo-500"
                                        autoFocus
                                        maxLength={30}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNickname(); if (e.key === 'Escape') setEditingNickname(false); }}
                                    />
                                    <button onClick={handleSaveNickname} disabled={saving} className="p-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50">
                                        <FiCheck className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold">{nickname || username}</h3>
                                    <button onClick={() => { setEditingNickname(true); setNicknameInput(nickname || ''); }} className="p-1 rounded text-white/20 hover:text-white/60 transition-colors" title="Edit nickname">
                                        <FiEdit3 className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                        {nickname && <p className="text-xs text-white/30 mb-1">{username}</p>}

                        {/* Status */}
                        <div className="flex items-center gap-1.5 mb-3">
                            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                            <span className="text-xs text-white/50">{statusText}</span>
                        </div>

                        {/* Bio */}
                        {bio && (
                            <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 mb-3">
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-1">About Me</p>
                                <p className="text-sm text-white/60">{bio}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button onClick={() => setShowAvatarGallery(!showAvatarGallery)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs font-medium transition-colors">
                                <FiStar className="w-3.5 h-3.5" /> Custom Avatar
                            </button>
                        </div>
                    </div>

                    {/* Avatar Gallery (collapsible) */}
                    <AnimatePresence>
                        {showAvatarGallery && (
                            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <div className="px-5 pb-4 border-t border-white/5 pt-3">
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-2">Choose Avatar</p>
                                    <div className="grid grid-cols-6 gap-2">
                                        {/* Reset option */}
                                        <div onClick={() => handleSelectAvatar(null)} className="group cursor-pointer">
                                            <div className="w-full aspect-square rounded-xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center text-xs text-white/30 group-hover:border-white/30 transition-all">
                                                <FiX className="w-4 h-4" />
                                            </div>
                                        </div>
                                        {AVATARS.map((a) => (
                                            <div key={a.id} onClick={() => handleSelectAvatar(a)} className="group cursor-pointer">
                                                <div
                                                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-lg transition-all group-hover:scale-110 group-hover:shadow-lg border-2 ${customAvatar?.id === a.id ? 'border-indigo-400' : 'border-transparent group-hover:border-white/30'}`}
                                                    style={{ background: a.bg }}
                                                >
                                                    {a.emoji}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
