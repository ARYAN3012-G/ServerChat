'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCamera, FiUpload, FiX, FiLock, FiStar, FiCheck } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

// Pre-built avatar gallery
const FREE_AVATARS = [
    { id: 'avatar-blue',    bg: 'linear-gradient(135deg, #667eea, #764ba2)', emoji: '😎' },
    { id: 'avatar-green',   bg: 'linear-gradient(135deg, #11998e, #38ef7d)', emoji: '🤩' },
    { id: 'avatar-sunset',  bg: 'linear-gradient(135deg, #fc5c7d, #6a82fb)', emoji: '🔥' },
    { id: 'avatar-ocean',   bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)', emoji: '🌊' },
    { id: 'avatar-neon',    bg: 'linear-gradient(135deg, #f093fb, #f5576c)', emoji: '⚡' },
    { id: 'avatar-aurora',  bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', emoji: '💫' },
    { id: 'avatar-lava',    bg: 'linear-gradient(135deg, #f12711, #f5af19)', emoji: '🎯' },
    { id: 'avatar-forest',  bg: 'linear-gradient(135deg, #134e5e, #71b280)', emoji: '🌿' },
    { id: 'avatar-cosmic',  bg: 'linear-gradient(135deg, #7f00ff, #e100ff)', emoji: '🚀' },
    { id: 'avatar-ice',     bg: 'linear-gradient(135deg, #c3cfe2, #f5f7fa)', emoji: '❄️' },
    { id: 'avatar-royal',   bg: 'linear-gradient(135deg, #4a00e0, #8e2de2)', emoji: '👑' },
    { id: 'avatar-candy',   bg: 'linear-gradient(135deg, #ff6fd8, #3813c2)', emoji: '🍬' },
];

const PREMIUM_AVATARS = [
    { id: 'premium-gold',    bg: 'linear-gradient(135deg, #f7971e, #ffd200)', emoji: '🏆' },
    { id: 'premium-galaxy',  bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', emoji: '🌌' },
    { id: 'premium-crystal', bg: 'linear-gradient(135deg, #a8edea, #fed6e3)', emoji: '💎' },
    { id: 'premium-dragon',  bg: 'linear-gradient(135deg, #870000, #190a05)', emoji: '🐉' },
    { id: 'premium-unicorn', bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', emoji: '🦄' },
    { id: 'premium-shadow',  bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)', emoji: '🌑' },
    { id: 'premium-phoenix', bg: 'linear-gradient(135deg, #ff4e50, #f9d423)', emoji: '🔮' },
    { id: 'premium-titan',   bg: 'linear-gradient(135deg, #141e30, #243b55)', emoji: '⚔️' },
];

export default function AvatarPicker({ isOpen, onClose, currentAvatar, onAvatarChange, username }) {
    const [activeTab, setActiveTab] = useState('gallery');
    const [uploading, setUploading] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [capturedPhoto, setCapturedPhoto] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // Cleanup camera on close
    useEffect(() => {
        if (!isOpen && cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            setCameraStream(null);
            setCapturedPhoto(null);
        }
    }, [isOpen]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 400 } }
            });
            setCameraStream(stream);
            if (videoRef.current) videoRef.current.srcObject = stream;
            setActiveTab('camera');
        } catch (e) {
            toast.error('Camera access denied');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        // Crop to square center
        const sx = (video.videoWidth - size) / 2;
        const sy = (video.videoHeight - size) / 2;
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 256, 256);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
        // Stop camera
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
    };

    const retakePhoto = async () => {
        setCapturedPhoto(null);
        await startCamera();
    };

    const uploadCapturedPhoto = async () => {
        if (!capturedPhoto) return;
        setUploading(true);
        try {
            // Convert dataURL to blob
            const res = await fetch(capturedPhoto);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append('avatar', blob, 'camera-avatar.jpg');
            const { data } = await api.put('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onAvatarChange(data.user?.avatar);
            toast.success('Avatar updated!');
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large (max 5MB)');
            return;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const { data } = await api.put('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onAvatarChange(data.user?.avatar);
            toast.success('Avatar updated!');
            onClose();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const selectPrebuiltAvatar = async (avatar) => {
        setUploading(true);
        try {
            // Save the prebuilt avatar selection to profile
            await api.put('/users/profile', { prebuiltAvatar: avatar.id });
            onAvatarChange({ prebuilt: avatar.id, bg: avatar.bg, emoji: avatar.emoji });
            toast.success('Avatar updated!');
            onClose();
        } catch (e) {
            toast.error('Failed to update avatar');
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md bg-dark-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-lg font-bold">Change Avatar</h3>
                        <button onClick={onClose} className="p-1 text-white/30 hover:text-white transition-colors">
                            <FiX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Current Avatar Preview */}
                    <div className="flex items-center gap-4 px-6 py-4 bg-white/[0.02]">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/60 flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-white/10">
                            {currentAvatar?.url ? (
                                <img src={currentAvatar.url} alt="" className="w-full h-full object-cover" />
                            ) : currentAvatar?.prebuilt ? (
                                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: currentAvatar.bg }}>{currentAvatar.emoji}</div>
                            ) : (
                                (username || '?')[0].toUpperCase()
                            )}
                        </div>
                        <div>
                            <p className="font-semibold">{username}</p>
                            <p className="text-xs text-white/30">Click below to choose a new avatar</p>
                        </div>
                    </div>

                    {/* Tab Buttons */}
                    <div className="flex gap-2 px-6 pt-4 pb-2">
                        <button
                            onClick={() => { setActiveTab('gallery'); if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); } }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'gallery' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                        >
                            <FiStar className="w-3.5 h-3.5" /> Gallery
                        </button>
                        <button
                            onClick={startCamera}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'camera' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                        >
                            <FiCamera className="w-3.5 h-3.5" /> Camera
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                        >
                            <FiUpload className="w-3.5 h-3.5" /> Upload
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </div>

                    {/* Content */}
                    <div className="px-6 pb-6 pt-2 max-h-[400px] overflow-y-auto">
                        <AnimatePresence mode="wait">
                            {/* Gallery Tab */}
                            {activeTab === 'gallery' && (
                                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {/* Free Avatars */}
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-wider mb-3">Free Avatars</p>
                                    <div className="grid grid-cols-6 gap-2.5 mb-6">
                                        {FREE_AVATARS.map((avatar, i) => (
                                            <motion.div
                                                key={avatar.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => selectPrebuiltAvatar(avatar)}
                                                className="group relative cursor-pointer"
                                            >
                                                <div
                                                    className="w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all group-hover:scale-110 group-hover:shadow-lg border-2 border-transparent group-hover:border-white/30"
                                                    style={{ background: avatar.bg }}
                                                >
                                                    {avatar.emoji}
                                                </div>
                                                {currentAvatar?.prebuilt === avatar.id && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                                        <FiCheck className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Premium Avatars */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-wider">Premium Avatars</p>
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">PRO</span>
                                    </div>
                                    <div className="grid grid-cols-6 gap-2.5">
                                        {PREMIUM_AVATARS.map((avatar, i) => (
                                            <motion.div
                                                key={avatar.id}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.03 + 0.2 }}
                                                onClick={() => toast('Premium subscription required!', { icon: '🔒' })}
                                                className="group relative cursor-not-allowed"
                                            >
                                                <div
                                                    className="w-full aspect-square rounded-xl flex items-center justify-center text-xl opacity-40 border-2 border-white/5"
                                                    style={{ background: avatar.bg }}
                                                >
                                                    {avatar.emoji}
                                                </div>
                                                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-black/40">
                                                    <FiLock className="w-3.5 h-3.5 text-amber-400/60" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Camera Tab */}
                            {activeTab === 'camera' && (
                                <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div className="flex flex-col items-center gap-4">
                                        {capturedPhoto ? (
                                            <>
                                                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-indigo-500/30">
                                                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={retakePhoto}
                                                        className="px-5 py-2.5 rounded-xl text-sm text-white/50 border border-white/10 hover:border-white/20 transition-colors">
                                                        Retake
                                                    </button>
                                                    <button onClick={uploadCapturedPhoto} disabled={uploading}
                                                        className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2">
                                                        {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiCheck className="w-4 h-4" /> Use This Photo</>}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/10 bg-dark-900 flex items-center justify-center">
                                                    {cameraStream ? (
                                                        <video
                                                            ref={videoRef}
                                                            autoPlay
                                                            playsInline
                                                            muted
                                                            className="w-full h-full object-cover scale-x-[-1]"
                                                        />
                                                    ) : (
                                                        <div className="text-center">
                                                            <FiCamera className="w-10 h-10 text-white/10 mx-auto mb-2" />
                                                            <p className="text-xs text-white/20">Starting camera...</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {cameraStream && (
                                                    <button onClick={capturePhoto}
                                                        className="px-6 py-2.5 bg-white text-dark-900 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors shadow-lg flex items-center gap-2">
                                                        <FiCamera className="w-4 h-4" /> Capture
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <canvas ref={canvasRef} className="hidden" />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {uploading && activeTab === 'gallery' && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-indigo-400">
                                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                Updating avatar...
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
