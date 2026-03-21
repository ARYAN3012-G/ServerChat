'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLock, FiCheck, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';

const FREE_BACKGROUNDS = [
    { id: 'none', label: 'Default', preview: 'transparent', css: '' },
    { id: 'dark-gradient', label: 'Dark Gradient', preview: 'linear-gradient(135deg, #0c0e1a 0%, #1a1a2e 50%, #16213e 100%)', css: 'linear-gradient(135deg, #0c0e1a 0%, #1a1a2e 50%, #16213e 100%)' },
    { id: 'deep-ocean', label: 'Deep Ocean', preview: 'linear-gradient(180deg, #0a1628 0%, #0d2137 40%, #0c3547 100%)', css: 'linear-gradient(180deg, #0a1628 0%, #0d2137 40%, #0c3547 100%)' },
    { id: 'twilight', label: 'Twilight', preview: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a1a2e 100%)', css: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 50%, #1a1a2e 100%)' },
    { id: 'midnight-green', label: 'Midnight Green', preview: 'linear-gradient(180deg, #0a1a14 0%, #0d2b1f 50%, #0a1a14 100%)', css: 'linear-gradient(180deg, #0a1a14 0%, #0d2b1f 50%, #0a1a14 100%)' },
    { id: 'warm-dark', label: 'Warm Dark', preview: 'linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #1a0f0a 100%)', css: 'linear-gradient(135deg, #1a0f0a 0%, #2d1810 50%, #1a0f0a 100%)' },
    { id: 'subtle-dots', label: 'Dots', preview: 'radial-gradient(circle, #ffffff08 1px, transparent 1px)', css: 'radial-gradient(circle, #ffffff08 1px, transparent 1px)', size: '20px 20px' },
    { id: 'diagonal-lines', label: 'Lines', preview: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff05 10px, #ffffff05 11px)', css: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #ffffff05 10px, #ffffff05 11px)' },
    { id: 'grid', label: 'Grid', preview: 'linear-gradient(#ffffff06 1px, transparent 1px), linear-gradient(to right, #ffffff06 1px, transparent 1px)', css: 'linear-gradient(#ffffff06 1px, transparent 1px), linear-gradient(to right, #ffffff06 1px, transparent 1px)', size: '30px 30px' },
];

const PREMIUM_BACKGROUNDS = [
    { id: 'aurora-borealis', label: 'Aurora Borealis', preview: 'linear-gradient(180deg, #0f0c29 0%, #302b63 30%, #24243e 60%, #0f0c29 100%)', css: 'linear-gradient(180deg, #0f0c29 0%, #302b63 30%, #24243e 60%, #0f0c29 100%)' },
    { id: 'galaxy', label: 'Galaxy', preview: 'radial-gradient(ellipse at 30% 20%, #1a0533 0%, #0d0221 40%, #000 70%), radial-gradient(circle at 70% 80%, #1b0a3c 0%, transparent 50%)', css: 'radial-gradient(ellipse at 30% 20%, #1a0533 0%, #0d0221 40%, #000 70%), radial-gradient(circle at 70% 80%, #1b0a3c 0%, transparent 50%)' },
    { id: 'neon-city', label: 'Neon City', preview: 'linear-gradient(180deg, #0a0015 0%, #1a0a3e 30%, #2d0a5e 50%, #0a0015 100%)', css: 'linear-gradient(180deg, #0a0015 0%, #1a0a3e 30%, #2d0a5e 50%, #0a0015 100%)' },
    { id: 'sunset-gradient', label: 'Sunset', preview: 'linear-gradient(180deg, #1a0a2e 0%, #4a1942 30%, #801336 50%, #1a0a2e 100%)', css: 'linear-gradient(180deg, #1a0a2e 0%, #4a1942 30%, #801336 50%, #1a0a2e 100%)' },
    { id: 'emerald-city', label: 'Emerald', preview: 'linear-gradient(135deg, #0a2f1a 0%, #1a5c3a 30%, #0a3d2e 60%, #0a1a14 100%)', css: 'linear-gradient(135deg, #0a2f1a 0%, #1a5c3a 30%, #0a3d2e 60%, #0a1a14 100%)' },
    { id: 'cyber-grid', label: 'Cyber Grid', preview: 'linear-gradient(#6366f108 1px, transparent 1px), linear-gradient(to right, #6366f108 1px, transparent 1px)', css: 'linear-gradient(#6366f108 1px, transparent 1px), linear-gradient(to right, #6366f108 1px, transparent 1px)' },
    { id: 'nebula', label: 'Nebula', preview: 'radial-gradient(ellipse at 20% 50%, #240046 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #3c096c 0%, transparent 50%), #0a0a1a', css: 'radial-gradient(ellipse at 20% 50%, #240046 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #3c096c 0%, transparent 50%), #0a0a1a' },
    { id: 'fire-glow', label: 'Fire Glow', preview: 'radial-gradient(ellipse at 50% 100%, #4a1500 0%, #1a0500 40%, #0a0000 70%)', css: 'radial-gradient(ellipse at 50% 100%, #4a1500 0%, #1a0500 40%, #0a0000 70%)' },
];

export default function ChatBackgroundPicker({ isOpen, onClose, currentBg, onSelectBackground }) {
    const { user } = useSelector(state => state.auth);
    const isPro = user?.subscription?.tier === 'pro';

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-dark-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FiImage className="w-5 h-5 text-indigo-400" />
                            <h3 className="text-lg font-bold">Chat Background</h3>
                        </div>
                        <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white transition-colors">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-6 pb-6 pt-4 max-h-[70vh] overflow-y-auto">
                        {/* Preview */}
                        <div className="mb-5 rounded-xl overflow-hidden border border-white/10 h-28 relative"
                            style={{ background: currentBg || '#0f1019' }}>
                            <div className="absolute inset-0 flex flex-col justify-end p-3 gap-1.5">
                                <div className="flex justify-end"><div className="bg-indigo-500/80 rounded-2xl rounded-tr-sm px-3 py-1.5 text-xs max-w-[60%]">Hey, how's it going?</div></div>
                                <div className="flex justify-start"><div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs max-w-[60%]">Pretty good! Love the new background 😍</div></div>
                            </div>
                        </div>

                        {/* Free Backgrounds */}
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-3">Free Backgrounds</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-6">
                            {FREE_BACKGROUNDS.map((bg) => (
                                <motion.div key={bg.id} whileHover={{ scale: 1.05 }}
                                    onClick={() => onSelectBackground(bg)}
                                    className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-colors ${currentBg === bg.css ? 'border-indigo-500' : 'border-white/5 hover:border-white/20'}`}>
                                    <div className="w-full aspect-[4/3] flex items-center justify-center"
                                        style={{ background: bg.preview || '#0f1019', backgroundSize: bg.size || 'cover' }}>
                                        {bg.id === 'none' && <span className="text-[10px] text-white/30">Default</span>}
                                    </div>
                                    {currentBg === bg.css && bg.id !== 'none' && (
                                        <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                            <FiCheck className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                    <p className="text-[9px] text-white/40 text-center py-1 truncate px-1">{bg.label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Premium Backgrounds */}
                        <div className="flex items-center gap-2 mb-3">
                            <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-wider">Premium Backgrounds</p>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PRO</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                            {PREMIUM_BACKGROUNDS.map((bg) => (
                                <motion.div key={bg.id} whileHover={{ scale: 1.02 }}
                                    onClick={() => isPro ? onSelectBackground(bg) : toast('ServerChat Pro required!', { icon: '🔒' })}
                                    className={`relative rounded-xl overflow-hidden border-2 transition-colors ${currentBg === bg.css ? 'border-amber-500' : 'border-white/5'} ${isPro ? 'cursor-pointer hover:border-amber-500/50' : 'cursor-not-allowed'}`}>
                                    <div className={`w-full aspect-[4/3] ${!isPro ? 'opacity-50' : ''}`}
                                        style={{ background: bg.preview }}>
                                    </div>
                                    {!isPro && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                            <FiLock className="w-4 h-4 text-amber-400/50" />
                                        </div>
                                    )}
                                    {currentBg === bg.css && isPro && (
                                        <div className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                                            <FiCheck className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                    <p className="text-[9px] text-white/30 text-center py-1 truncate px-1">{bg.label}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
