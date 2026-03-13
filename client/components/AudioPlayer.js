'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FiPlay, FiPause } from 'react-icons/fi';

export default function AudioPlayer({ src, isMine }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);

    // Generate a fake waveform (deterministic from src URL)
    const bars = 28;
    const waveform = useRef(
        Array.from({ length: bars }, (_, i) => {
            const seed = (i * 7 + 13) % 17;
            return 0.2 + (seed / 17) * 0.8;
        })
    ).current;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateDuration = () => {
            // WebM files often return Infinity until played/buffered
            if (audio.duration && audio.duration !== Infinity && !isNaN(audio.duration)) {
                setDuration(audio.duration);
                setLoaded(true);
            }
        };

        const onLoaded = () => {
            updateDuration();
            setLoaded(true); // Always set loaded so button enables
        };

        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            // If duration was Infinity, it might become available during playback
            if (duration === 0 || duration === Infinity || isNaN(duration)) {
                updateDuration();
            }
        };

        const onEnded = () => { setPlaying(false); setCurrentTime(0); };
        const onError = () => setError(true);

        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        // Fallback for WebM Infinity bug: fast seek to end and back to force duration calculation
        const forceDurationCalc = () => {
            if (audio.duration === Infinity) {
                audio.currentTime = 1e8; // seeking to very end forces seeking to real end
                setTimeout(() => {
                    updateDuration();
                    if (audio.currentTime > 0) audio.currentTime = 0;
                }, 100);
            }
        };
        audio.addEventListener('loadeddata', forceDurationCalc);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoaded);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadeddata', forceDurationCalc);
        };
    }, [duration]);

    useEffect(() => {
        const handleOtherPlay = (e) => {
            if (e.detail.id !== audioRef.current?.src) {
                audioRef.current?.pause();
                setPlaying(false);
            }
        };
        window.addEventListener('custom-audio-play', handleOtherPlay);
        return () => window.removeEventListener('custom-audio-play', handleOtherPlay);
    }, []);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            window.dispatchEvent(new CustomEvent('custom-audio-play', { detail: { id: audio.src } }));
            audio.play().then(() => setPlaying(true)).catch(() => setError(true));
        }
    }, [playing]);

    const seekTo = useCallback((e) => {
        const audio = audioRef.current;
        const currentDur = audio?.duration && audio.duration !== Infinity && !isNaN(audio.duration) ? audio.duration : duration;
        if (!audio || !currentDur) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        audio.currentTime = pct * currentDur;
        setCurrentTime(audio.currentTime);
    }, [duration]);

    const formatTime = (s) => {
        if (!s || isNaN(s) || s === Infinity) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Calculate progress safely, trusting the audio element's actual duration if internal state is lagging
    const currentDur = audioRef.current?.duration && audioRef.current.duration !== Infinity && !isNaN(audioRef.current.duration) 
        ? audioRef.current.duration 
        : (duration && duration !== Infinity && !isNaN(duration) ? duration : 0);
    const progress = currentDur > 0 ? currentTime / currentDur : 0;

    if (error) {
        return (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs ${isMine ? 'bg-red-500/10 text-red-300' : 'bg-red-500/10 text-red-400'}`}>
                <span>⚠️ Audio unavailable</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl min-w-[220px] max-w-[280px] ${
            isMine
                ? 'bg-indigo-500/15 border border-indigo-500/20'
                : 'bg-white/[0.04] border border-white/10'
        }`}>
            <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                disabled={!loaded}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isMine
                        ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                } ${!loaded ? 'opacity-40' : ''}`}
            >
                {playing
                    ? <FiPause className="w-4 h-4" />
                    : <FiPlay className="w-4 h-4 ml-0.5" />
                }
            </button>

            {/* Waveform + Time */}
            <div className="flex-1 min-w-0">
                {/* Waveform bars */}
                <div
                    className="flex items-center gap-[2px] h-6 cursor-pointer"
                    onClick={seekTo}
                >
                    {waveform.map((h, i) => {
                        const barProgress = i / bars;
                        const isActive = barProgress <= progress;
                        return (
                            <div
                                key={i}
                                className={`rounded-full transition-colors duration-150 ${
                                    isActive
                                        ? isMine ? 'bg-indigo-400' : 'bg-white/70'
                                        : isMine ? 'bg-indigo-500/30' : 'bg-white/15'
                                }`}
                                style={{
                                    width: '3px',
                                    height: `${Math.round(h * 20 + 4)}px`,
                                    flexShrink: 0,
                                }}
                            />
                        );
                    })}
                </div>

                {/* Time */}
                <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-[10px] font-mono ${isMine ? 'text-indigo-300/60' : 'text-white/30'}`}>
                        {playing || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
                    </span>
                    <span className={`text-[10px] ${isMine ? 'text-indigo-300/40' : 'text-white/20'}`}>
                        🎤
                    </span>
                </div>
            </div>
        </div>
    );
}
