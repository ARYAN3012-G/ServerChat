'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiSquare, FiSend, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function VoiceRecorder({ onSend, onCancel }) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const { user } = useSelector(state => state.auth);
    const isPro = user?.subscription?.tier === 'pro';
    const MAX_SECONDS = isPro ? 300 : 60; // 5 mins for Pro, 60s for Free

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm'
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (e) {
            console.error('Microphone access denied:', e);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (isRecording && recordingTime >= MAX_SECONDS) {
            stopRecording();
            toast(`Voice limit reached (${formatTime(MAX_SECONDS)}). ${!isPro ? 'Upgrade to Pro for 5-minute messages!' : ''}`, { icon: '⏱️' });
        }
    }, [recordingTime, isRecording, MAX_SECONDS, stopRecording, isPro]);

    const handleSend = useCallback(() => {
        if (audioBlob && onSend) {
            onSend(audioBlob);
        }
        resetState();
    }, [audioBlob, onSend]);

    const handleCancel = useCallback(() => {
        if (isRecording) stopRecording();
        resetState();
        if (onCancel) onCancel();
    }, [isRecording, stopRecording, onCancel]);

    const resetState = () => {
        setAudioBlob(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingTime(0);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
                {!isRecording && !audioBlob && (
                    <motion.button
                        key="mic"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={startRecording}
                        className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors"
                        title="Record voice message"
                    >
                        <FiMic className="w-5 h-5" />
                    </motion.button>
                )}

                {isRecording && (
                    <motion.div
                        key="recording"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2"
                    >
                        <motion.div
                            className="w-2.5 h-2.5 rounded-full bg-red-500"
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        />
                        <span className="text-sm text-red-400 font-mono font-medium min-w-[40px]">
                            {formatTime(recordingTime)}
                        </span>
                        <button
                            onClick={stopRecording}
                            className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                            title="Stop recording"
                        >
                            <FiSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            title="Cancel"
                        >
                            <FiX className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}

                {!isRecording && audioBlob && (
                    <motion.div
                        key="preview"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2"
                    >
                        <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                        <button
                            onClick={handleSend}
                            className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 transition-colors"
                            title="Send voice message"
                        >
                            <FiSend className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                            title="Discard"
                        >
                            <FiX className="w-3.5 h-3.5" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
