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
    const [queue, setQueue] = useState([]);
    const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'one' | 'all'
    const audioRef = useRef(null);
    const repeatRef = useRef(repeatMode);

    // Keep ref synced so the event listener always sees current value
    useEffect(() => { repeatRef.current = repeatMode; }, [repeatMode]);

    // Create audio element once (persists across page navigations)
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.volume = volume / 100;
        }

        const audio = audioRef.current;
        const onTime = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0); };
        const onEnd = () => {
            if (repeatRef.current === 'one') {
                // Replay same song
                audio.currentTime = 0;
                audio.play().catch(() => {});
            } else {
                setIsPlaying(false);
                // playNext handles 'all' wrap-around
                playNextRef.current();
            }
        };
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
        if (idx >= 0 && idx < queue.length - 1) {
            playSong(queue[idx + 1], queue);
        } else if (repeatRef.current === 'all' && queue.length > 0) {
            // Wrap around to beginning on repeat-all
            playSong(queue[0], queue);
        }
    }, [currentTrack, queue, playSong]);

    // Keep a ref to playNext so the event listener always calls the latest version
    const playNextRef = useRef(playNext);
    useEffect(() => { playNextRef.current = playNext; }, [playNext]);

    const playPrev = useCallback(() => {
        if (!currentTrack || queue.length === 0) return;
        const idx = queue.findIndex(s => s.url === currentTrack.url);
        if (idx > 0) {
            playSong(queue[idx - 1], queue);
        } else if (repeatRef.current === 'all' && queue.length > 0) {
            playSong(queue[queue.length - 1], queue);
        }
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

    const toggleRepeat = useCallback(() => {
        setRepeatMode(prev => prev === 'off' ? 'one' : prev === 'one' ? 'all' : 'off');
    }, []);

    const value = {
        currentTrack, isPlaying, progress, duration, volume, muted, queue, repeatMode,
        playSong, togglePlay, playNext, playPrev, seekTo, stopMusic, toggleRepeat,
        setVolume, setMuted, setQueue,
    };

    return (
        <MusicPlayerContext.Provider value={value}>
            {children}
        </MusicPlayerContext.Provider>
    );
}
