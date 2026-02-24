'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHash, FiVolume2, FiVideo, FiPlus, FiSettings, FiUsers, FiSearch, FiLogOut, FiSun, FiMoon, FiPlay, FiMusic, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { setChannels, setCurrentChannel, setMessages } from '../../redux/chatSlice';
import { toggleTheme, toggleMemberList } from '../../redux/uiSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ChannelsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
    const { sendMessage, joinChannel, leaveChannel, startTyping, stopTyping, reactToMessage } = useSocket();
    const { channels, currentChannel, messages, typingUsers, onlineUsers } = useSelector((state) => state.chat);
    const { theme, memberListOpen } = useSelector((state) => state.ui);
    const [messageInput, setMessageInput] = useState('');
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [typingTimeout, setTypingTimeout] = useState(null);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, authLoading, router]);

    // Load channels
    useEffect(() => {
        const loadChannels = async () => {
            try {
                const { data } = await api.get('/channels/me');
                dispatch(setChannels(data.channels));
                if (data.channels.length > 0 && !currentChannel) {
                    dispatch(setCurrentChannel(data.channels[0]));
                }
            } catch (error) {
                console.error('Failed to load channels');
            }
        };
        if (isAuthenticated) loadChannels();
    }, [isAuthenticated, dispatch]);

    // Load messages when channel changes
    useEffect(() => {
        const loadMessages = async () => {
            if (!currentChannel) return;
            try {
                const { data } = await api.get(`/messages/channel/${currentChannel._id}`);
                dispatch(setMessages(data.messages));
                joinChannel(currentChannel._id);
            } catch (error) {
                console.error('Failed to load messages');
            }
        };
        loadMessages();
    }, [currentChannel, dispatch, joinChannel]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !currentChannel) return;
        sendMessage(currentChannel._id, messageInput.trim());
        setMessageInput('');
        stopTyping(currentChannel?._id);
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        if (currentChannel) {
            startTyping(currentChannel._id);
            if (typingTimeout) clearTimeout(typingTimeout);
            setTypingTimeout(setTimeout(() => stopTyping(currentChannel._id), 2000));
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) return;
        try {
            const { data } = await api.post('/channels', { name: newChannelName });
            dispatch(setChannels([...channels, data.channel]));
            setShowCreateChannel(false);
            setNewChannelName('');
            toast.success('Channel created!');
        } catch (error) {
            toast.error('Failed to create channel');
        }
    };

    const getTypingText = () => {
        if (!currentChannel) return '';
        const typers = typingUsers[currentChannel._id];
        if (!typers) return '';
        const names = Object.values(typers);
        if (names.length === 0) return '';
        if (names.length === 1) return `${names[0]} is typing...`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
        return 'Several people are typing...';
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-dark-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const textChannels = channels.filter(c => c.type === 'text' || !c.type);
    const voiceChannels = channels.filter(c => c.type === 'voice');

    return (
        <div className="flex h-screen bg-discord-chatbg overflow-hidden">
            {/* Server sidebar */}
            <div className="w-[72px] bg-discord-darkest flex flex-col items-center py-3 gap-2 shrink-0">
                <motion.div
                    whileHover={{ borderRadius: '35%' }}
                    className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold cursor-pointer hover:bg-primary-600 transition-colors"
                    onClick={() => router.push('/channels')}
                >
                    SC
                </motion.div>
                <div className="w-8 h-0.5 bg-dark-600 rounded-full my-1" />

                {/* Quick nav icons */}
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/games')}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 hover:text-white hover:bg-discord-green cursor-pointer transition-all">
                    <FiPlay className="w-5 h-5" />
                </motion.div>
                <motion.div whileHover={{ borderRadius: '35%' }}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 hover:text-white hover:bg-purple-500 cursor-pointer transition-all">
                    <FiMusic className="w-5 h-5" />
                </motion.div>

                <div className="mt-auto">
                    <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/settings')}
                        className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-600 cursor-pointer transition-all">
                        <FiSettings className="w-5 h-5" />
                    </motion.div>
                </div>
            </div>

            {/* Channel sidebar */}
            <div className="w-60 bg-discord-sidebar flex flex-col shrink-0">
                <div className="h-12 px-4 flex items-center justify-between border-b border-black/20 shadow-sm">
                    <span className="font-semibold text-white truncate">ServerChat</span>
                    <FiChevronDown className="w-4 h-4 text-dark-300" />
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin pt-4 px-2">
                    {/* Text channels */}
                    <div className="flex items-center justify-between px-2 mb-1">
                        <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Text Channels</span>
                        <button onClick={() => setShowCreateChannel(true)} className="text-dark-400 hover:text-white transition-colors">
                            <FiPlus className="w-4 h-4" />
                        </button>
                    </div>
                    {textChannels.map(channel => (
                        <motion.div
                            key={channel._id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => dispatch(setCurrentChannel(channel))}
                            className={`channel-item ${currentChannel?._id === channel._id ? 'active' : ''}`}
                        >
                            <FiHash className="w-4 h-4 shrink-0 opacity-60" />
                            <span className="truncate text-sm">{channel.name}</span>
                        </motion.div>
                    ))}

                    {/* Voice channels */}
                    <div className="flex items-center justify-between px-2 mb-1 mt-4">
                        <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Voice Channels</span>
                    </div>
                    {voiceChannels.map(channel => (
                        <div key={channel._id} className="channel-item">
                            <FiVolume2 className="w-4 h-4 shrink-0 opacity-60" />
                            <span className="truncate text-sm">{channel.name}</span>
                        </div>
                    ))}
                </div>

                {/* User panel */}
                <div className="h-[52px] bg-discord-darkest/50 flex items-center px-2 gap-2">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="w-3 h-3 rounded-full bg-discord-green border-2 border-discord-darkest absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                        <p className="text-xs text-dark-400">Online</p>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => dispatch(toggleTheme())} className="p-1.5 text-dark-400 hover:text-white transition-colors rounded-md hover:bg-dark-600">
                            {theme === 'dark' ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
                        </button>
                        <button onClick={logout} className="p-1.5 text-dark-400 hover:text-discord-red transition-colors rounded-md hover:bg-dark-600">
                            <FiLogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main chat area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <div className="h-12 border-b border-black/20 flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <FiHash className="w-5 h-5 text-dark-400" />
                        <span className="font-semibold text-white">{currentChannel?.name || 'Select a channel'}</span>
                        {currentChannel?.description && (
                            <>
                                <div className="w-px h-5 bg-dark-600 mx-2" />
                                <span className="text-sm text-dark-400 truncate">{currentChannel.description}</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="text-dark-300 hover:text-white transition-colors"><FiSearch className="w-5 h-5" /></button>
                        <button onClick={() => dispatch(toggleMemberList())} className="text-dark-300 hover:text-white transition-colors">
                            <FiUsers className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-1">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={msg._id || i}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="message-item group rounded-md"
                                >
                                    <div className="avatar text-sm shrink-0 mt-0.5">
                                        {msg.sender?.avatar?.url ? (
                                            <img src={msg.sender.avatar.url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        ) : (
                                            msg.sender?.username?.[0]?.toUpperCase() || '?'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-white hover:underline cursor-pointer">{msg.sender?.username || 'Unknown'}</span>
                                            <span className="text-xs text-dark-500">{new Date(msg.createdAt).toLocaleString()}</span>
                                            {msg.isEdited && <span className="text-xs text-dark-500">(edited)</span>}
                                        </div>
                                        <p className="text-dark-200 break-words whitespace-pre-wrap">{msg.content}</p>
                                        {/* Reactions */}
                                        {msg.reactions?.length > 0 && (
                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                {msg.reactions.map((r, ri) => (
                                                    <button
                                                        key={ri}
                                                        onClick={() => reactToMessage(msg._id, r.emoji)}
                                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/20 text-xs transition-colors"
                                                    >
                                                        <span>{r.emoji}</span>
                                                        <span className="text-primary-400">{r.users?.length}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Typing indicator */}
                        <AnimatePresence>
                            {getTypingText() && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 py-1"
                                >
                                    <p className="text-xs text-dark-400 flex items-center gap-1">
                                        <span className="flex gap-0.5">
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                        {getTypingText()}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Message input */}
                        <div className="p-4 shrink-0">
                            <form onSubmit={handleSendMessage}>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={handleTyping}
                                        placeholder={`Message #${currentChannel?.name || 'general'}`}
                                        className="w-full px-4 py-3 rounded-lg bg-discord-inputbg text-white placeholder-dark-400 focus:outline-none"
                                    />
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Member list */}
                    <AnimatePresence>
                        {memberListOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 240, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="bg-discord-sidebar border-l border-black/20 overflow-y-auto scrollbar-thin shrink-0"
                            >
                                <div className="p-4">
                                    <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
                                        Members — {currentChannel?.members?.length || 0}
                                    </h3>
                                    <div className="space-y-1">
                                        {currentChannel?.members?.map((member, i) => (
                                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-dark-700/50 cursor-pointer transition-colors">
                                                <div className="relative">
                                                    <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {member.user?.username?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className={`w-2.5 h-2.5 rounded-full border-2 border-discord-sidebar absolute -bottom-0.5 -right-0.5 ${onlineUsers.includes(member.user?._id) ? 'bg-discord-green' : 'bg-dark-500'
                                                        }`} />
                                                </div>
                                                <span className="text-sm text-dark-300 truncate">{member.user?.username || 'User'}</span>
                                                {member.role === 'owner' && (
                                                    <span className="text-xs text-amber-400">👑</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Create channel modal */}
            <AnimatePresence>
                {showCreateChannel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                        onClick={() => setShowCreateChannel(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-discord-lighter rounded-xl p-6 w-full max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold text-white mb-4">Create Channel</h3>
                            <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider mb-1.5 block">Channel Name</label>
                            <div className="flex items-center gap-2 mb-4">
                                <FiHash className="text-dark-400" />
                                <input
                                    type="text"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                                    className="input-field"
                                    placeholder="new-channel"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowCreateChannel(false)} className="text-dark-300 hover:text-white px-4 py-2 transition-colors">Cancel</button>
                                <button onClick={handleCreateChannel} className="btn-primary">Create</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
