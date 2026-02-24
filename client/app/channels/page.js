'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHash, FiVolume2, FiVideo, FiPlus, FiSettings, FiUsers, FiSearch, FiLogOut, FiSun, FiMoon, FiPlay, FiMusic, FiChevronDown, FiX, FiCopy, FiCheck, FiCompass } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { setChannels, setCurrentChannel, setMessages } from '../../redux/chatSlice';
import { setServers, setCurrentServer, addServer } from '../../redux/serverSlice';
import { toggleTheme } from '../../redux/uiSlice';
import api from '../../services/api';

export default function ChannelsPage() {
    const dispatch = useDispatch();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();
    const { theme } = useSelector((state) => state.ui);
    const { channels, currentChannel, messages } = useSelector((state) => state.chat);
    const { servers, currentServer } = useSelector((state) => state.server);
    const [messageInput, setMessageInput] = useState('');
    const [showMembers, setShowMembers] = useState(true);
    const [showCreateServer, setShowCreateServer] = useState(false);
    const [showJoinServer, setShowJoinServer] = useState(false);
    const [newServerName, setNewServerName] = useState('');
    const [newServerDesc, setNewServerDesc] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [serverError, setServerError] = useState('');
    const messagesEndRef = useRef(null);

    const { sendMessage, joinChannel } = useSocket();

    // Fetch servers on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetchServers();
        }
    }, [isAuthenticated]);

    // Fetch channels when server changes
    useEffect(() => {
        if (currentServer) {
            const serverChannels = currentServer.channels || [];
            dispatch(setChannels(serverChannels));
            if (serverChannels.length > 0 && !currentChannel) {
                dispatch(setCurrentChannel(serverChannels[0]));
            }
        }
    }, [currentServer]);

    const fetchServers = async () => {
        try {
            const { data } = await api.get('/servers/me');
            dispatch(setServers(data));
            if (data.length > 0) {
                dispatch(setCurrentServer(data[0]));
                // Refresh first server details
                const { data: serverDetail } = await api.get(`/servers/${data[0]._id}`);
                dispatch(setCurrentServer(serverDetail));
            }
        } catch (error) {
            console.error('Failed to fetch servers:', error);
        }
    };

    const handleCreateServer = async () => {
        if (!newServerName.trim()) return;
        setServerError('');
        try {
            const { data } = await api.post('/servers', {
                name: newServerName,
                description: newServerDesc,
            });
            dispatch(addServer(data));
            dispatch(setCurrentServer(data));
            setShowCreateServer(false);
            setNewServerName('');
            setNewServerDesc('');
        } catch (error) {
            setServerError(error.response?.data?.message || 'Failed to create server');
        }
    };

    const handleJoinServer = async () => {
        if (!joinCode.trim()) return;
        setServerError('');
        try {
            const { data } = await api.post(`/servers/join/${joinCode.trim()}`);
            dispatch(addServer(data));
            dispatch(setCurrentServer(data));
            setShowJoinServer(false);
            setJoinCode('');
        } catch (error) {
            setServerError(error.response?.data?.message || 'Failed to join server');
        }
    };

    const handleSelectServer = async (server) => {
        try {
            const { data } = await api.get(`/servers/${server._id}`);
            dispatch(setCurrentServer(data));
            dispatch(setCurrentChannel(null));
        } catch (error) {
            console.error('Failed to load server:', error);
        }
    };

    const handleCopyInvite = () => {
        if (currentServer?.inviteCode) {
            navigator.clipboard.writeText(currentServer.inviteCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const selectChannel = (channel) => {
        dispatch(setCurrentChannel(channel));
        if (channel._id) {
            joinChannel(channel._id);
        }
    };

    const handleSendMessage = () => {
        if (!messageInput.trim() || !currentChannel) return;
        sendMessage(currentChannel._id, messageInput);
        setMessageInput('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const textChannels = channels.filter(c => c.type === 'text');
    const voiceChannels = channels.filter(c => c.type === 'voice');

    return (
        <div className="flex h-screen bg-dark-800 text-white overflow-hidden">
            {/* Server Sidebar */}
            <div className="w-[72px] bg-dark-900 flex flex-col items-center py-3 gap-2 overflow-y-auto scrollbar-none">
                {/* DM Button */}
                <motion.div
                    whileHover={{ borderRadius: '35%' }}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-primary-400 hover:text-white hover:bg-primary-500 cursor-pointer transition-all"
                    title="Direct Messages"
                >
                    <FiHash className="w-6 h-6" />
                </motion.div>

                <div className="w-8 h-0.5 bg-dark-700 rounded-full mx-auto" />

                {/* Server icons */}
                {servers.map((server) => (
                    <motion.div
                        key={server._id}
                        whileHover={{ borderRadius: '35%' }}
                        onClick={() => handleSelectServer(server)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all text-sm font-bold
                            ${currentServer?._id === server._id
                                ? 'bg-primary-500 text-white rounded-[35%]'
                                : 'bg-dark-700 text-dark-300 hover:text-white hover:bg-primary-500'
                            }`}
                        title={server.name}
                    >
                        {server.icon?.url ? (
                            <img src={server.icon.url} alt={server.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            server.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                        )}
                    </motion.div>
                ))}

                <div className="w-8 h-0.5 bg-dark-700 rounded-full mx-auto" />

                {/* Create Server */}
                <motion.div
                    whileHover={{ borderRadius: '35%' }}
                    onClick={() => { setShowCreateServer(true); setServerError(''); }}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-discord-green hover:text-white hover:bg-discord-green cursor-pointer transition-all"
                    title="Create a Server"
                >
                    <FiPlus className="w-6 h-6" />
                </motion.div>

                {/* Join Server */}
                <motion.div
                    whileHover={{ borderRadius: '35%' }}
                    onClick={() => { setShowJoinServer(true); setServerError(''); }}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 hover:text-white hover:bg-discord-green cursor-pointer transition-all"
                    title="Join a Server"
                >
                    <FiCompass className="w-5 h-5" />
                </motion.div>

                {/* Quick nav icons */}
                <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/games')}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 hover:text-white hover:bg-discord-green cursor-pointer transition-all">
                    <FiPlay className="w-5 h-5" />
                </motion.div>
                <motion.div whileHover={{ borderRadius: '35%' }}
                    className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 hover:text-white hover:bg-purple-500 cursor-pointer transition-all">
                    <FiMusic className="w-5 h-5" />
                </motion.div>
            </div>

            {/* Channel Sidebar */}
            <div className="w-60 bg-dark-800 flex flex-col">
                {/* Server Header */}
                <div className="h-12 px-4 flex items-center justify-between border-b border-dark-900 cursor-pointer hover:bg-dark-700 transition-colors">
                    <span className="font-bold text-white truncate">
                        {currentServer?.name || 'No Server'}
                    </span>
                    {currentServer && (
                        <div className="flex items-center gap-1">
                            <button onClick={handleCopyInvite} className="p-1 rounded hover:bg-dark-600 text-dark-300 hover:text-white transition-colors" title="Copy Invite Code">
                                {copied ? <FiCheck className="w-4 h-4 text-discord-green" /> : <FiCopy className="w-4 h-4" />}
                            </button>
                            <FiChevronDown className="w-4 h-4 text-dark-300" />
                        </div>
                    )}
                </div>

                {/* Channel List */}
                <div className="flex-1 overflow-y-auto px-2 pt-4 space-y-4">
                    {currentServer ? (
                        <>
                            <div>
                                <div className="flex items-center justify-between px-1 mb-1">
                                    <span className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Text Channels</span>
                                    <FiPlus className="w-4 h-4 text-dark-400 cursor-pointer hover:text-white transition-colors" />
                                </div>
                                {textChannels.map((channel) => (
                                    <motion.div
                                        key={channel._id}
                                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                                        onClick={() => selectChannel(channel)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer group transition-colors
                                            ${currentChannel?._id === channel._id ? 'bg-dark-600 text-white' : 'text-dark-300'}`}
                                    >
                                        <FiHash className="w-5 h-5 text-dark-400 flex-shrink-0" />
                                        <span className="text-sm truncate">{channel.name}</span>
                                    </motion.div>
                                ))}
                            </div>

                            <div>
                                <div className="flex items-center justify-between px-1 mb-1">
                                    <span className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Voice Channels</span>
                                    <FiPlus className="w-4 h-4 text-dark-400 cursor-pointer hover:text-white transition-colors" />
                                </div>
                                {voiceChannels.map((channel) => (
                                    <motion.div
                                        key={channel._id}
                                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-dark-300 hover:text-white"
                                    >
                                        <FiVolume2 className="w-5 h-5 text-dark-400 flex-shrink-0" />
                                        <span className="text-sm truncate">{channel.name}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-dark-400 text-sm p-4">
                            <p>No servers yet!</p>
                            <p className="mt-2">Create or join a server to get started.</p>
                        </div>
                    )}
                </div>

                {/* User Panel */}
                <div className="h-14 bg-dark-900/50 px-2 flex items-center gap-2">
                    <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm font-bold">
                            {user?.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-discord-green rounded-full border-2 border-dark-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
                        <p className="text-xs text-discord-green truncate">Online</p>
                    </div>
                    <button onClick={() => dispatch(toggleTheme())} className="p-1.5 rounded hover:bg-dark-700 text-dark-300 hover:text-white"><FiSettings className="w-4 h-4" /></button>
                    <button onClick={() => dispatch(toggleTheme())} className="p-1.5 rounded hover:bg-dark-700 text-dark-300 hover:text-white">
                        {theme === 'dark' ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
                    </button>
                    <button onClick={logout} className="p-1.5 rounded hover:bg-dark-700 text-dark-300 hover:text-red-400"><FiLogOut className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {currentChannel ? (
                    <>
                        {/* Channel Header */}
                        <div className="h-12 px-4 flex items-center justify-between border-b border-dark-900">
                            <div className="flex items-center gap-2">
                                <FiHash className="w-5 h-5 text-dark-400" />
                                <span className="font-bold">{currentChannel.name}</span>
                                {currentChannel.description && (
                                    <span className="text-sm text-dark-400 ml-2 border-l border-dark-600 pl-2">{currentChannel.description}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <FiSearch className="w-5 h-5 text-dark-400 cursor-pointer hover:text-white transition-colors" />
                                <FiUsers
                                    className={`w-5 h-5 cursor-pointer transition-colors ${showMembers ? 'text-white' : 'text-dark-400 hover:text-white'}`}
                                    onClick={() => setShowMembers(!showMembers)}
                                />
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 flex">
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                                {/* Welcome message */}
                                <div className="mb-6">
                                    <div className="w-16 h-16 rounded-full bg-dark-600 flex items-center justify-center mb-3">
                                        <FiHash className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold">Welcome to #{currentChannel.name}!</h2>
                                    <p className="text-dark-400 mt-1">This is the start of the #{currentChannel.name} channel.</p>
                                </div>

                                {messages.map((msg, idx) => (
                                    <div key={idx} className="flex items-start gap-3 group hover:bg-dark-800/50 px-1 py-1 rounded">
                                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                            {(msg.sender?.username || msg.user?.username || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-medium text-white hover:underline cursor-pointer">
                                                    {msg.sender?.username || msg.user?.username || 'User'}
                                                </span>
                                                <span className="text-xs text-dark-400">
                                                    {new Date(msg.createdAt || Date.now()).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-dark-200 text-sm mt-0.5">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Members Sidebar */}
                            <AnimatePresence>
                                {showMembers && currentServer && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: 240, opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        className="bg-dark-800 border-l border-dark-900 overflow-y-auto"
                                    >
                                        <div className="p-4">
                                            <h3 className="text-xs font-semibold text-dark-400 uppercase mb-2">
                                                Members — {currentServer.members?.length || 0}
                                            </h3>
                                            {(currentServer.members || []).map((member, idx) => (
                                                <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-dark-700 cursor-pointer">
                                                    <div className="relative">
                                                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
                                                            {(member.user?.username || 'U')[0].toUpperCase()}
                                                        </div>
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${member.user?.status === 'online' ? 'bg-discord-green' : 'bg-dark-400'}`} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm truncate">
                                                            {member.user?.username || 'User'}
                                                            {member.role === 'owner' && <span className="ml-1 text-xs text-amber-400">👑</span>}
                                                            {member.role === 'admin' && <span className="ml-1 text-xs text-red-400">⚡</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Message Input */}
                        <div className="px-4 pb-6 pt-2">
                            <div className="bg-dark-600 rounded-lg flex items-center px-4">
                                <FiPlus className="w-5 h-5 text-dark-300 cursor-pointer hover:text-white transition-colors" />
                                <input
                                    type="text"
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={`Message #${currentChannel.name}`}
                                    className="flex-1 bg-transparent py-3 px-3 text-sm outline-none text-white placeholder-dark-400"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-dark-400">
                        <div className="text-center">
                            <FiHash className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <h3 className="text-xl font-bold text-dark-300 mb-2">
                                {currentServer ? 'Select a channel' : 'No server selected'}
                            </h3>
                            <p className="text-sm">
                                {currentServer
                                    ? 'Pick a text or voice channel from the sidebar'
                                    : 'Create or join a server to start chatting!'
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Server Modal */}
            <AnimatePresence>
                {showCreateServer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                        onClick={() => setShowCreateServer(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-700 rounded-xl w-[440px] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <h2 className="text-2xl font-bold mb-2">Create a Server</h2>
                                <p className="text-dark-300 text-sm">Give your new server a personality with a name and description.</p>
                            </div>

                            <div className="px-6 pb-2 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Server Name</label>
                                    <input
                                        type="text"
                                        value={newServerName}
                                        onChange={(e) => setNewServerName(e.target.value)}
                                        placeholder="My Awesome Server"
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Description <span className="text-dark-500 font-normal">(optional)</span></label>
                                    <textarea
                                        value={newServerDesc}
                                        onChange={(e) => setNewServerDesc(e.target.value)}
                                        placeholder="What's your server about?"
                                        rows={2}
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                                    />
                                </div>
                                {serverError && (
                                    <p className="text-red-400 text-sm">{serverError}</p>
                                )}
                            </div>

                            <div className="p-4 bg-dark-800 flex justify-between items-center mt-4">
                                <button
                                    onClick={() => setShowCreateServer(false)}
                                    className="text-sm text-dark-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateServer}
                                    disabled={!newServerName.trim()}
                                    className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Create Server
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Join Server Modal */}
            <AnimatePresence>
                {showJoinServer && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                        onClick={() => setShowJoinServer(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-700 rounded-xl w-[440px] overflow-hidden shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 text-center">
                                <h2 className="text-2xl font-bold mb-2">Join a Server</h2>
                                <p className="text-dark-300 text-sm">Enter an invite code to join an existing server.</p>
                            </div>

                            <div className="px-6 pb-2 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-dark-300 uppercase tracking-wide">Invite Code</label>
                                    <input
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        placeholder="e.g. a1b2c3d4"
                                        className="mt-2 w-full bg-dark-900 rounded-md px-3 py-2.5 text-sm outline-none text-white focus:ring-2 focus:ring-primary-500 transition-all"
                                        autoFocus
                                    />
                                </div>
                                {serverError && (
                                    <p className="text-red-400 text-sm">{serverError}</p>
                                )}
                                <div className="text-xs text-dark-400">
                                    <p className="font-semibold mb-1">Invites should look like:</p>
                                    <p className="text-dark-500">a1b2c3d4</p>
                                </div>
                            </div>

                            <div className="p-4 bg-dark-800 flex justify-between items-center mt-4">
                                <button
                                    onClick={() => setShowJoinServer(false)}
                                    className="text-sm text-dark-300 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleJoinServer}
                                    disabled={!joinCode.trim()}
                                    className="px-6 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Join Server
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
