'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const MusicPlayerContext = createContext(null);

export function useMusicPlayer() {
    const ctx = useContext(MusicPlayerContext);
    if (!ctx) throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
    return ctx;
}

export default function MusicPlayerProvider({ children }) {
    const [currentTrack, setCurrentTrack] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);
    const [muted, setMuted] = useState(false);
    const [queue, setQueue] = useState([]); // list of songs for next/prev
    const audioRef = useRef(null);

    // Create audio element once (persists across page navigations)
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.volume = volume / 100;
        }

        const audio = audioRef.current;
        const onTime = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
        const onEnd = () => { setIsPlaying(false); playNext(); };
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('ended', onEnd);
        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);

        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('ended', onEnd);
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = muted ? 0 : volume / 100;
    }, [volume, muted]);

    const playSong = useCallback((song, songList = []) => {
        if (!song?.url) return;
        const audio = audioRef.current;
        if (!audio) return;

        setCurrentTrack(song);
        if (songList.length > 0) setQueue(songList);

        audio.src = song.url;
        audio.play().catch(() => {});
        setIsPlaying(true);
    }, []);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;
        if (isPlaying) audio.pause();
        else audio.play().catch(() => {});
    }, [isPlaying, currentTrack]);

    const playNext = useCallback(() => {
        if (!currentTrack || queue.length === 0) return;
        const idx = queue.findIndex(s => s.url === currentTrack.url);
        if (idx >= 0 && idx < queue.length - 1) playSong(queue[idx + 1], queue);
    }, [currentTrack, queue, playSong]);

    const playPrev = useCallback(() => {
        if (!currentTrack || queue.length === 0) return;
        const idx = queue.findIndex(s => s.url === currentTrack.url);
        if (idx > 0) playSong(queue[idx - 1], queue);
    }, [currentTrack, queue, playSong]);

    const seekTo = useCallback((pct) => {
        const audio = audioRef.current;
        if (audio && duration) audio.currentTime = pct * duration;
    }, [duration]);

    const stopMusic = useCallback(() => {
        const audio = audioRef.current;
        if (audio) { audio.pause(); audio.src = ''; }
        setCurrentTrack(null);
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
    }, []);

    const value = {
        currentTrack, isPlaying, progress, duration, volume, muted, queue,
        playSong, togglePlay, playNext, playPrev, seekTo, stopMusic,
        setVolume, setMuted, setQueue,
    };

    return (
        <MusicPlayerContext.Provider value={value}>
            {children}
        </MusicPlayerContext.Provider>
    );
}
