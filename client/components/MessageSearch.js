'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiHash, FiMessageSquare } from 'react-icons/fi';
import api from '../services/api';

export default function MessageSearch({ isOpen, onClose, onJumpToMessage, channelId }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setTotal(0);
        }
    }, [isOpen]);

    const doSearch = useCallback(async (searchQuery) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setResults([]);
            setTotal(0);
            return;
        }
        setLoading(true);
        try {
            const params = { q: searchQuery.trim() };
            if (channelId) params.channelId = channelId;
            const { data } = await api.get('/messages/search', { params });
            setResults(data.messages || []);
            setTotal(data.total || 0);
        } catch (e) {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [channelId]);

    const handleInput = (val) => {
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 400);
    };

    const highlightMatch = (text, q) => {
        if (!q || !text) return text;
        const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.split(regex).map((part, i) =>
            regex.test(part) ? <mark key={i} className="bg-amber-400/30 text-white rounded-sm px-0.5">{part}</mark> : part
        );
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now - d;
        const days = Math.floor(diff / 86400000);
        if (days === 0) return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (days === 1) return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh] p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: -20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: -20 }}
                    transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-xl bg-dark-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Search Bar */}
                    <div className="flex items-center gap-3 p-4 border-b border-white/5">
                        <FiSearch className={`w-5 h-5 shrink-0 transition-colors ${loading ? 'text-indigo-400 animate-pulse' : 'text-white/30'}`} />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => handleInput(e.target.value)}
                            placeholder="Search messages..."
                            className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-base"
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); setResults([]); setTotal(0); }} className="text-white/30 hover:text-white transition-colors">
                                <FiX className="w-4 h-4" />
                            </button>
                        )}
                        <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/20 text-[11px] font-mono">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div className="max-h-[60vh] overflow-y-auto">
                        {!query && (
                            <div className="p-8 text-center">
                                <FiSearch className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 text-sm">Type to search messages{channelId ? ' in this channel' : ' across all channels'}</p>
                            </div>
                        )}

                        {query && !loading && results.length === 0 && (
                            <div className="p-8 text-center">
                                <FiMessageSquare className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <p className="text-white/40 font-medium">No results found</p>
                                <p className="text-white/20 text-sm mt-1">Try different keywords</p>
                            </div>
                        )}

                        {loading && results.length === 0 && (
                            <div className="p-6 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="animate-pulse flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/5 shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-24 bg-white/5 rounded" />
                                            <div className="h-3 w-full bg-white/5 rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results.length > 0 && (
                            <>
                                <div className="px-4 py-2 text-[11px] text-white/20 font-semibold uppercase tracking-wider border-b border-white/5">
                                    {total} result{total !== 1 ? 's' : ''} found
                                </div>
                                {results.map((msg, i) => (
                                    <motion.div
                                        key={msg._id || i}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: i * 0.03 }}
                                        onClick={() => {
                                            if (onJumpToMessage) onJumpToMessage(msg);
                                            onClose();
                                        }}
                                        className="flex gap-3 px-4 py-3 hover:bg-white/[0.04] cursor-pointer transition-colors group border-b border-white/[0.03] last:border-0"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-semibold text-white/60 shrink-0 mt-0.5">
                                            {msg.sender?.avatar ? (
                                                <img src={msg.sender.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                (msg.sender?.username || '?')[0].toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-semibold text-white/80">{msg.sender?.username || 'Unknown'}</span>
                                                {msg.channel?.name && (
                                                    <span className="text-[10px] text-white/20 flex items-center gap-0.5">
                                                        <FiHash className="w-2.5 h-2.5" /> {msg.channel.name}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-white/15 ml-auto shrink-0">{formatTime(msg.createdAt)}</span>
                                            </div>
                                            <p className="text-sm text-white/50 truncate group-hover:text-white/70 transition-colors">
                                                {highlightMatch(msg.content, query)}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
