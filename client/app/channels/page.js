'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHash, FiVolume2, FiPlus, FiSettings, FiUsers, FiSearch, FiLogOut, FiChevronDown, FiCopy, FiCheck, FiCompass, FiTrash2, FiEdit2, FiSmile, FiShield, FiSend, FiX, FiPhone, FiVideo, FiPaperclip, FiUpload, FiBookmark, FiMessageCircle, FiMessageSquare, FiCornerUpRight, FiMenu } from 'react-icons/fi';
import { IoGameControllerOutline } from 'react-icons/io5';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useCall } from '../../components/CallProvider';
import { useVoice } from '../../components/VoiceProvider';
import { setChannels, setCurrentChannel, setMessages } from '../../redux/chatSlice';
import { setServers, setCurrentServer, addServer } from '../../redux/serverSlice';
import { updateUser } from '../../redux/authSlice';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import UserProfileModal from '../../components/UserProfileModal';
import TypingIndicator from '../../components/TypingIndicator';
import VoiceRecorder from '../../components/VoiceRecorder';

// Lazy-load heavy components (only loaded when user opens them)
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false, loading: () => <div className="w-[350px] h-[400px] bg-dark-800 rounded-xl animate-pulse" /> });
import { EmojiStyle } from 'emoji-picker-react';
const GameLauncher = dynamic(() => import('../../components/GameLauncher'), { ssr: false });
const MusicRoom = dynamic(() => import('../../components/MusicRoom'), { ssr: false });
const GifPicker = dynamic(() => import('../../components/GifPicker'), { ssr: false });
import AudioPlayer from '../../components/AudioPlayer';
import MessageSearch from '../../components/MessageSearch';
import VoiceVideoPopup from '../../components/VoiceVideoPopup';
import ServerSettingsModal from '../../components/ServerSettingsModal';
import { MdGif } from 'react-icons/md';

export default function ChannelsPage() {
    const dispatch = useDispatch();
    const router = useRouter();
    const { user, isAuthenticated, loading, logout } = useAuth();
    const { channels, currentChannel, messages } = useSelector((s) => s.chat);
    const { servers, currentServer } = useSelector((s) => s.server);
    const { session: gameSession } = useSelector((s) => s.game);

    const [messageInput, setMessageInput] = useState('');
    const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [showCreateServer, setShowCreateServer] = useState(false);
    const [showJoinServer, setShowJoinServer] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [newServerName, setNewServerName] = useState('');
    const [newServerDesc, setNewServerDesc] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [serverError, setServerError] = useState('');
    const [newChannelName, setNewChannelName] = useState('');
    const [newChannelType, setNewChannelType] = useState('text');
    const [newChannelCategory, setNewChannelCategory] = useState('');
    const [editingMsg, setEditingMsg] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const quickEmojis = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '👏'];

    // Real-time features state
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [profileUser, setProfileUser] = useState(null);
    const [showServerSettings, setShowServerSettings] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [showPinned, setShowPinned] = useState(false);
    const [threadView, setThreadView] = useState(null);
    const [threadMessages, setThreadMessages] = useState([]);
    const [threadInput, setThreadInput] = useState('');
    // Video refs use callback pattern to bind VoiceProvider streams

    const { sendMessage, joinChannel, leaveChannel, startTyping, stopTyping, reactToMessage,
        joinVoiceChannel, leaveVoiceChannel, voiceUsers,
        createGame, joinGame, makeGameMove, requestRematch,
        joinMusicRoom, syncMusic, leaveMusicRoom, musicRoom } = useSocket();
    const { initiateCall } = useCall() || {};
    const voice = useVoice() || {};
    const { joinVoice, leaveVoice, toggleMute: voiceToggleMute, toggleDeafen: voiceToggleDeafen,
        isMuted: voiceIsMuted, isDeafened: voiceIsDeafened, connectedChannel: voiceConnectedChannel,
        voiceUsers: vcUsers, isVideoOn, isScreenSharing, localVideoStream, localScreenStream,
        peerVideoStreams, startVideo, stopVideo, switchCamera, facingMode,
        startScreenShare, stopScreenShare } = voice;
    const { typingUsers, onlineUsers } = useSelector((s) => s.chat);
    const [connectedVoice, setConnectedVoice] = useState(null);
    const isMuted = voiceIsMuted;
    const isDeafened = voiceIsDeafened;
    const [showGameLauncher, setShowGameLauncher] = useState(false);
    const [showMusicRoom, setShowMusicRoom] = useState(false);
    const [showCallPicker, setShowCallPicker] = useState(null); // 'voice' | 'video' | null
    const [showVideoPopup, setShowVideoPopup] = useState(false);
    const [selectedCallMembers, setSelectedCallMembers] = useState([]);
    const [serverContextMenu, setServerContextMenu] = useState(null); // { server, x, y }
    const longPressTimerRef = useRef(null);

    // Listen for friend status changes globally
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const handleFriendStatus = ({ userId, status }) => {
            fetchServers();
        };
        socket.on('presence:status-changed', handleFriendStatus);
        return () => socket.off('presence:status-changed', handleFriendStatus);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for new members joining the server in real-time
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !currentServer) return;
        const handleMemberJoined = async ({ serverId }) => {
            if (serverId === currentServer._id) {
                // Re-fetch server to update member list
                try {
                    const { data } = await api.get(`/servers/${currentServer._id}`);
                    dispatch(setCurrentServer(data));
                } catch (e) { console.error(e); }
            }
        };
        socket.on('server:member-joined', handleMemberJoined);
        return () => socket.off('server:member-joined', handleMemberJoined);
    }, [currentServer?._id]);

    // Auto-show game launcher if a game starts in our channel
    useEffect(() => {
        if (gameSession && gameSession.status !== 'finished' && gameSession.channel === currentChannel?._id) {
            setShowGameLauncher(true);
        }
    }, [gameSession, currentChannel?._id]);

    // Auto-open video popup when video/screen share starts
    useEffect(() => {
        if ((isVideoOn || isScreenSharing) && connectedVoice) {
            setShowVideoPopup(true);
        }
    }, [isVideoOn, isScreenSharing, connectedVoice]);

    // Auto-open music room or game launcher from invite deep link (?room=music or ?room=games)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const room = params.get('room');
        if (room && currentServer) {
            if (room === 'music') {
                setShowMusicRoom(true);
            } else if (room === 'games') {
                setShowGameLauncher(true);
            }
            // Clean up URL param so it doesn't re-trigger
            const url = new URL(window.location.href);
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url.toString());
        }
    }, [currentServer?._id]);

    // Callback refs to bind VoiceProvider video/screen streams to video elements
    const localVideoCallbackRef = useCallback((el) => {
        if (el && localVideoStream) {
            el.srcObject = localVideoStream;
            el.play().catch(() => {});
        }
    }, [localVideoStream]);

    const screenVideoCallbackRef = useCallback((el) => {
        if (el && localScreenStream) {
            el.srcObject = localScreenStream;
            el.play().catch(() => {});
        }
    }, [localScreenStream]);

    useEffect(() => {
        if (!loading && !isAuthenticated) router.push('/login');
    }, [isAuthenticated, loading]);

    useEffect(() => { if (isAuthenticated) fetchServers(); }, [isAuthenticated]);

    useEffect(() => {
        if (currentServer) {
            const ch = currentServer.channels || [];
            dispatch(setChannels(ch));
            if (ch.length > 0 && !currentChannel) dispatch(setCurrentChannel(ch[0]));
        }
    }, [currentServer]);

    useEffect(() => {
        if (currentChannel?._id) {
            fetchMessages(currentChannel._id);
            joinChannel(currentChannel._id);
            // Mark messages as read & fetch pinned
            fetchPinnedMessages(currentChannel._id);
            markMessagesRead(currentChannel._id);
        }
        return () => { if (currentChannel?._id) leaveChannel(currentChannel._id); };
    }, [currentChannel?._id]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const fetchMessages = async (channelId) => {
        try { const { data } = await api.get(`/messages/channel/${channelId}`); dispatch(setMessages(data.messages || [])); } catch (e) { console.error(e); }
    };

    const onEmojiClick = (emojiObject) => {
        setMessageInput(prev => prev + emojiObject.emoji);
        setShowInputEmojiPicker(false);
    };

    const fetchServers = async () => {
        try {
            const { data } = await api.get('/servers/me');
            dispatch(setServers(data));
            if (data.length > 0 && !currentServer) {
                const { data: detail } = await api.get(`/servers/${data[0]._id}`);
                dispatch(setCurrentServer(detail));
            }
        } catch (e) { console.error(e); }
    };

    const handleCreateServer = async () => {
        if (!newServerName.trim()) return;
        setServerError('');
        try {
            const { data } = await api.post('/servers', { name: newServerName, description: newServerDesc });
            dispatch(addServer(data));
            dispatch(setCurrentServer(data));
            setShowCreateServer(false); setNewServerName(''); setNewServerDesc('');
        } catch (e) { setServerError(e.response?.data?.message || 'Failed'); }
    };

    const handleJoinServer = async () => {
        if (!joinCode.trim()) return;
        setServerError('');
        try {
            const { data } = await api.post(`/servers/join/${joinCode.trim()}`);
            dispatch(addServer(data));
            dispatch(setCurrentServer(data));
            setShowJoinServer(false); setJoinCode('');
        } catch (e) { setServerError(e.response?.data?.message || 'Failed'); }
    };

    const handleSelectServer = async (server) => {
        try {
            const { data } = await api.get(`/servers/${server._id}`);
            dispatch(setCurrentServer(data));
            dispatch(setCurrentChannel(null));
        } catch (e) { console.error(e); }
    };

    const handleCopyInvite = () => {
        if (currentServer?.inviteCode) {
            navigator.clipboard.writeText(currentServer.inviteCode);
            setCopied(true); setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannelName.trim() || !currentServer) return;
        try {
            await api.post('/channels', { name: newChannelName.toLowerCase().replace(/\s+/g, '-'), type: newChannelType, category: newChannelCategory.trim() || undefined, serverId: currentServer._id });
            const { data } = await api.get(`/servers/${currentServer._id}`);
            dispatch(setCurrentServer(data));
            setShowCreateChannel(false); setNewChannelName(''); setNewChannelType('text'); setNewChannelCategory('');
        } catch (e) { console.error(e); }
    };

    const handleDeleteChannel = async (channelId) => {
        if (!confirm('Delete this channel?')) return;
        try {
            await api.delete(`/channels/${channelId}`);
            const { data } = await api.get(`/servers/${currentServer._id}`);
            dispatch(setCurrentServer(data));
            if (currentChannel?._id === channelId) dispatch(setCurrentChannel(null));
        } catch (e) { console.error(e); }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim() && !fileInputRef.current?.files?.[0]) return;

        sendMessage(currentChannel._id, messageInput, 'text');

        setMessageInput('');
        setShowInputEmojiPicker(false);
        setShowGifPicker(false);
        stopTyping(currentChannel._id);
    };

    const handleTyping = (e) => {
        const val = e.target.value;
        setMessageInput(val);
        if (currentChannel?._id) {
            startTyping(currentChannel._id);
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => stopTyping(currentChannel._id), 2000);
        }
        // @mention detection
        const lastAt = val.lastIndexOf('@');
        if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
            const query = val.slice(lastAt + 1);
            if (query.length >= 0 && !query.includes(' ')) {
                setMentionQuery(query);
                const matches = serverMembers.filter(m =>
                    (m.username || '').toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5);
                setMentionList(matches);
                setShowMentions(matches.length > 0);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const handleEditMessage = async (msgId) => {
        if (!editContent.trim()) return;
        const socket = getSocket();
        if (socket) socket.emit('message:edit', { messageId: msgId, content: editContent });
        setEditingMsg(null); setEditContent('');
    };

    const handleDeleteMessage = async (msgId) => {
        const socket = getSocket();
        if (socket) socket.emit('message:delete', { messageId: msgId });
    };

    const handleReaction = (msgId, emoji) => {
        reactToMessage(msgId, emoji);
        setShowEmojiPicker(null);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const { data } = await api.get(`/messages/channel/${currentChannel._id}?search=${searchQuery}`);
            setSearchResults(data.messages || []);
        } catch (e) { setSearchResults([]); }
    };

    // ── Pinned Messages ──
    const fetchPinnedMessages = async (channelId) => {
        try { const { data } = await api.get(`/messages/pinned/${channelId}`); setPinnedMessages(data.messages || data || []); } catch (e) { setPinnedMessages([]); }
    };

    const handlePinMessage = async (msgId) => {
        const socket = getSocket();
        if (socket) socket.emit('message:pin', { messageId: msgId, channelId: currentChannel._id });
        toast.success('Message pinned!');
        setTimeout(() => fetchPinnedMessages(currentChannel._id), 500);
    };

    // ── Read Receipts ──
    const markMessagesRead = async (channelId) => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            try {
                await api.post(`/messages/${lastMsg._id}/read`);
            } catch (e) {
                console.error(e);
            }
        }
    };

    // ── Threads ──
    const openThread = async (msg) => {
        setThreadView(msg);
        try { const { data } = await api.get(`/messages/thread/${msg._id}`); setThreadMessages(data.messages || data || []); } catch (e) { setThreadMessages([]); }
    };

    const sendThreadReply = () => {
        if (!threadInput.trim() || !threadView) return;
        sendMessage(currentChannel._id, threadInput, 'text', [], null, threadView._id);
        setThreadInput('');
        setTimeout(() => openThread(threadView), 300);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            sendMessage(currentChannel._id, `📎 ${file.name}`, 'file', [{ url: data.url, type: data.type, name: file.name }]);
        } catch (e) {
            toast.error('File upload failed');
        }
    };

    const selectChannel = (channel) => {
        dispatch(setCurrentChannel(channel));
        if (channel._id) joinChannel(channel._id);
    };

    const handleLogout = () => {
        logout();
        setTimeout(() => router.push('/login'), 100);
    };

    const textChannels = channels.filter(c => c.type === 'text');
    const voiceChannels = channels.filter(c => c.type === 'voice');

    // Category grouping — group text channels by category
    const textCategories = textChannels.reduce((acc, ch) => {
        const cat = ch.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});
    const voiceCategories = voiceChannels.reduce((acc, ch) => {
        const cat = ch.category || 'Voice';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ch);
        return acc;
    }, {});

    // Collapsed categories state
    const [collapsedCats, setCollapsedCats] = useState({});
    const toggleCategory = (cat) => setCollapsedCats(prev => ({ ...prev, [cat]: !prev[cat] }));

    // Unread tracking (localStorage based)
    const [unreadChannels, setUnreadChannels] = useState({});
    useEffect(() => {
        const saved = localStorage.getItem('lastRead');
        if (saved) setUnreadChannels(JSON.parse(saved));
    }, []);
    const markChannelRead = (channelId) => {
        setUnreadChannels(prev => {
            const updated = { ...prev, [channelId]: Date.now() };
            localStorage.setItem('lastRead', JSON.stringify(updated));
            return updated;
        });
    };
    // Mark current channel as read when switching
    useEffect(() => {
        if (currentChannel?._id) markChannelRead(currentChannel._id);
    }, [currentChannel?._id]);

    // User status picker
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [customStatusText, setCustomStatusText] = useState(user?.customStatus?.text || '');
    const statusOptions = [
        { value: 'online', label: 'Online', color: 'bg-emerald-400', icon: '🟢' },
        { value: 'idle', label: 'Idle', color: 'bg-amber-400', icon: '🌙' },
        { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', icon: '⛔' },
        { value: 'invisible', label: 'Invisible', color: 'bg-gray-400', icon: '👻' },
    ];
    const handleStatusChange = async (newStatus) => {
        try {
            await api.put('/users/profile', { status: newStatus, customStatus: { text: customStatusText } });
            dispatch(updateUser({ status: newStatus, customStatus: { text: customStatusText } }));
            const socket = getSocket();
            if (socket) socket.emit('presence:status', { status: newStatus });
            setShowStatusPicker(false);
        } catch (e) { console.error(e); }
    };

    // @Mention autocomplete
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionList, setMentionList] = useState([]);
    const serverMembers = currentServer?.members?.map(m => m.user || m) || [];
    const handleInputChange = (e) => {
        const val = e.target.value;
        setMessageInput(val);
        // Detect @mention
        const lastAt = val.lastIndexOf('@');
        if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
            const query = val.slice(lastAt + 1);
            if (query.length >= 0 && !query.includes(' ')) {
                setMentionQuery(query);
                const matches = serverMembers.filter(m =>
                    (m.username || '').toLowerCase().includes(query.toLowerCase())
                ).slice(0, 5);
                setMentionList(matches);
                setShowMentions(matches.length > 0);
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };
    const insertMention = (username) => {
        const lastAt = messageInput.lastIndexOf('@');
        const newVal = messageInput.slice(0, lastAt) + `@${username} `;
        setMessageInput(newVal);
        setShowMentions(false);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-dark-900"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex h-[100dvh] bg-dark-900 text-white overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ─── SERVER SIDEBAR ─── */}
            <div className={`fixed mt-12 md:mt-0 md:relative z-50 w-[72px] h-full bg-dark-950 flex flex-col items-center border-r border-white/5 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!sidebarOpen ? 'max-md:invisible' : ''}`}>
                {/* Fixed Top: Friends & DMs */}
                <div className="flex flex-col items-center gap-2 pt-3 pb-1 flex-shrink-0">
                    <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/friends')}
                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-emerald-400 hover:text-white hover:bg-emerald-500 cursor-pointer transition-all duration-200" title="Friends">
                        <FiUsers className="w-6 h-6" />
                    </motion.div>
                    <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/dms')}
                        className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 hover:text-white hover:bg-indigo-500 cursor-pointer transition-all duration-200" title="Direct Messages">
                        <FiMessageSquare className="w-6 h-6" />
                    </motion.div>
                    <div className="w-8 h-0.5 bg-white/10 rounded-full" />
                </div>

                {/* Scrollable Middle: Server Icons ONLY (max ~3 visible) */}
                <div className="overflow-y-auto flex flex-col items-center gap-2 py-1" style={{ scrollbarWidth: 'none', maxHeight: '192px' }}>
                    {servers.map((server) => (
                        <motion.div key={server._id} whileHover={{ borderRadius: '35%' }}
                            onClick={() => handleSelectServer(server)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setServerContextMenu({ server, x: e.clientX, y: e.clientY });
                            }}
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                longPressTimerRef.current = setTimeout(() => {
                                    setServerContextMenu({ server, x: touch.clientX, y: touch.clientY });
                                }, 500);
                            }}
                            onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                            onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                            className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-200 text-[11px] font-bold tracking-tight ${currentServer?._id === server._id ? 'bg-indigo-500 text-white rounded-[35%] shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-white/40 hover:text-white hover:bg-indigo-500/80'}`}
                            title={server.name}>
                            {server.icon?.url ? <img src={server.icon.url} alt="" className="w-full h-full rounded-full object-cover" /> : server.name.substring(0, 2).toUpperCase()}
                        </motion.div>
                    ))}
                </div>

                {/* Fixed: Create & Join Server */}
                <div className="flex flex-col items-center gap-2 py-1 flex-shrink-0">
                    <div className="w-8 h-0.5 bg-white/10 rounded-full" />

                    <motion.div whileHover={{ borderRadius: '35%' }}
                        onClick={() => { setShowCreateServer(true); setServerError(''); }}
                        className="w-12 h-12 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-emerald-400 hover:text-white hover:bg-emerald-500 cursor-pointer transition-all duration-200" title="Create Server">
                        <FiPlus className="w-6 h-6" />
                    </motion.div>

                    <motion.div whileHover={{ borderRadius: '35%' }}
                        onClick={() => { setShowJoinServer(true); setServerError(''); }}
                        className="w-12 h-12 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-emerald-500 cursor-pointer transition-all duration-200" title="Join Server">
                        <FiCompass className="w-5 h-5" />
                    </motion.div>

                    <div className="w-8 h-0.5 bg-white/10 rounded-full" />

                    {/* Games — account/solo games only */}
                    <motion.div whileHover={{ borderRadius: '35%' }}
                        onClick={() => router.push('/games')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-indigo-500 cursor-pointer transition-all duration-200" title="Solo Games">
                        <IoGameControllerOutline className="w-5 h-5" />
                    </motion.div>

                    {/* Music — account/personal music only */}
                    <motion.div whileHover={{ borderRadius: '35%' }}
                        onClick={() => router.push('/music')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-pink-500 cursor-pointer transition-all duration-200" title="My Music">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </motion.div>

                    {user?.email === 'aryanrajeshgadam.3012@gmail.com' && (
                    <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/admin')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-amber-500 cursor-pointer transition-all duration-200" title="Admin">
                        <FiShield className="w-4 h-4" />
                    </motion.div>
                    )}


                    {/* Settings */}
                    <motion.div whileHover={{ borderRadius: '35%' }} onClick={() => router.push('/settings')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 cursor-pointer transition-all duration-200" title="Settings">
                        <FiSettings className="w-4 h-4" />
                    </motion.div>
                </div>
            </div>

            {/* Server Right-Click / Long-Press Context Menu */}
            <AnimatePresence>
                {serverContextMenu && (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setServerContextMenu(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed z-[61] bg-dark-800 border border-white/10 rounded-xl shadow-2xl py-1.5 w-48"
                            style={{ top: Math.min(serverContextMenu.y, window.innerHeight - 160), left: Math.min(serverContextMenu.x, window.innerWidth - 200) }}
                        >
                            <div className="px-3 py-1.5 border-b border-white/5 mb-1">
                                <p className="text-xs font-semibold text-white truncate">{serverContextMenu.server?.name}</p>
                                <p className="text-[10px] text-white/30">{serverContextMenu.server?.members?.length || '—'} members</p>
                            </div>
                            <button
                                onClick={() => { handleSelectServer(serverContextMenu.server); setShowServerSettings(true); setServerContextMenu(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white/60 hover:bg-white/5 hover:text-white transition-colors"
                            >
                                <FiSettings className="w-3.5 h-3.5" /> Server Settings
                            </button>
                            {serverContextMenu.server?.owner?._id === user?._id || serverContextMenu.server?.owner === user?._id ? (
                                <button
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to delete "${serverContextMenu.server?.name}"? This cannot be undone.`)) {
                                            api.delete(`/servers/${serverContextMenu.server?._id}`).then(() => {
                                                toast.success('Server deleted');
                                                dispatch(setServers(servers.filter(s => s._id !== serverContextMenu.server?._id)));
                                                if (currentServer?._id === serverContextMenu.server?._id) dispatch(setCurrentServer(null));
                                            }).catch(err => toast.error(err.response?.data?.message || 'Failed to delete'));
                                        }
                                        setServerContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <FiTrash2 className="w-3.5 h-3.5" /> Delete Server
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        api.post(`/servers/${serverContextMenu.server?._id}/leave`).then(() => {
                                            toast.success('Left server');
                                            dispatch(setServers(servers.filter(s => s._id !== serverContextMenu.server?._id)));
                                            if (currentServer?._id === serverContextMenu.server?._id) dispatch(setCurrentServer(null));
                                        }).catch(err => toast.error(err.response?.data?.message || 'Failed to leave'));
                                        setServerContextMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 transition-colors"
                                >
                                    <FiLogOut className="w-3.5 h-3.5" /> Leave Server
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ─── CHANNEL SIDEBAR ─── */}
            <div className={`fixed mt-12 md:mt-0 md:relative z-40 left-[72px] md:left-0 h-full w-60 bg-dark-800 flex flex-col border-r border-white/5 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${!sidebarOpen ? 'max-md:invisible' : ''}`}>
                <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                    <span className="font-bold text-white truncate">{currentServer?.name || 'No Server'}</span>
                    {currentServer && (
                        <div className="flex items-center gap-1">
                            <button onClick={handleCopyInvite} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Copy Invite Code">
                                {copied ? <FiCheck className="w-4 h-4 text-emerald-400" /> : <FiCopy className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setShowServerSettings(true)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Server Settings">
                                <FiSettings className="w-4 h-4" />
                            </button>
                            <FiChevronDown className="w-4 h-4 text-white/30" />
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto px-2 pt-4 space-y-1">
                    {currentServer ? (
                        <>
                            {/* Text Channel Categories */}
                            {Object.entries(textCategories).map(([cat, chs]) => (
                                <div key={`text-${cat}`} className="mb-2">
                                    <div className="flex items-center justify-between px-1 mb-0.5 cursor-pointer group" onClick={() => toggleCategory(`text-${cat}`)}>
                                        <div className="flex items-center gap-1">
                                            <FiChevronDown className={`w-3 h-3 text-white/20 transition-transform ${collapsedCats[`text-${cat}`] ? '-rotate-90' : ''}`} />
                                            <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">{cat}</span>
                                        </div>
                                        <FiPlus onClick={(e) => { e.stopPropagation(); setNewChannelType('text'); setShowCreateChannel(true); }} className="w-3.5 h-3.5 text-white/15 cursor-pointer hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                    </div>
                                    <AnimatePresence>
                                        {!collapsedCats[`text-${cat}`] && chs.map((ch) => {
                                            const isUnread = ch.lastActivity && (!unreadChannels[ch._id] || new Date(ch.lastActivity).getTime() > unreadChannels[ch._id]);
                                            const isActive = currentChannel?._id === ch._id;
                                            return (
                                                <motion.div key={ch._id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                                    onClick={() => { selectChannel(ch); markChannelRead(ch._id); }}
                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-all duration-150 ${isActive ? 'bg-white/10 text-white' : isUnread ? 'text-white font-medium' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                                                    {isUnread && !isActive && <div className="absolute -left-1 w-1 h-2 bg-white rounded-r-full" />}
                                                    <FiHash className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white/60' : 'text-white/20'}`} />
                                                    <span className="text-sm truncate flex-1">{ch.name}</span>
                                                    {isUnread && !isActive && <div className="w-2 h-2 rounded-full bg-white flex-shrink-0" />}
                                                    <FiTrash2 onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch._id); }}
                                                        className="w-3.5 h-3.5 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ))}

                            {/* Voice Channel Categories */}
                            {Object.entries(voiceCategories).map(([cat, chs]) => (
                                <div key={`voice-${cat}`} className="mb-2">
                                    <div className="flex items-center justify-between px-1 mb-0.5 cursor-pointer group" onClick={() => toggleCategory(`voice-${cat}`)}>
                                        <div className="flex items-center gap-1">
                                            <FiChevronDown className={`w-3 h-3 text-white/20 transition-transform ${collapsedCats[`voice-${cat}`] ? '-rotate-90' : ''}`} />
                                            <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">{cat}</span>
                                        </div>
                                        <FiPlus onClick={(e) => { e.stopPropagation(); setNewChannelType('voice'); setShowCreateChannel(true); }} className="w-3.5 h-3.5 text-white/15 cursor-pointer hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                                    </div>
                                    <AnimatePresence>
                                        {!collapsedCats[`voice-${cat}`] && chs.map((ch) => (
                                            <motion.div key={ch._id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                                <div onClick={() => {
                                                    if (voiceConnectedChannel === ch._id) {
                                                        // Already connected — open the call page
                                                        router.push(`/call/${ch._id}`);
                                                    } else {
                                                        // Navigate to call page (VoiceProvider auto-leaves old channel)
                                                        router.push(`/call/${ch._id}`);
                                                    }
                                                }}
                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-150 group ${voiceConnectedChannel === ch._id ? 'bg-emerald-500/10 text-emerald-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                                                    <FiVolume2 className={`w-4 h-4 flex-shrink-0 ${voiceConnectedChannel === ch._id ? 'text-emerald-400' : 'text-white/20'}`} />
                                                    <span className="text-sm truncate flex-1">{ch.name}</span>
                                                    <FiTrash2 onClick={(e) => { e.stopPropagation(); handleDeleteChannel(ch._id); }}
                                                        className="w-3.5 h-3.5 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" />
                                                </div>
                                                {voiceUsers[ch._id]?.length > 0 && (
                                                    <div className="ml-6 mt-0.5 space-y-0.5">
                                                        {voiceUsers[ch._id].map((u) => (
                                                            <div key={u.userId} className="flex items-center gap-1.5 text-xs text-white/40 py-0.5">
                                                                <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold">{(u.username || 'U')[0].toUpperCase()}</div>
                                                                <span>{u.username}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ))}

                            {/* Activities */}
                            <div className="mb-2">
                                <div className="flex items-center px-1 mb-0.5 cursor-pointer" onClick={() => toggleCategory('activities')}>
                                    <FiChevronDown className={`w-3 h-3 text-white/20 transition-transform ${collapsedCats['activities'] ? '-rotate-90' : ''}`} />
                                    <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider ml-1">Activities</span>
                                </div>
                                {!collapsedCats['activities'] && (
                                    <>
                                        <div onClick={() => router.push(`/server-games/${currentServer?._id}`)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-150">
                                            <IoGameControllerOutline className="w-4 h-4 text-indigo-400/50" />
                                            <span className="text-sm">Play Games</span>
                                        </div>
                                        <div onClick={() => router.push(`/music?serverId=${currentServer?._id}`)}
                                            className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-white/40 hover:text-white/70 hover:bg-white/5 transition-all duration-150">
                                            <FiVolume2 className="w-4 h-4 text-pink-400/50" />
                                            <span className="text-sm">Listen Together</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-white/30 text-sm p-4">
                            <p className="mb-1">No servers yet!</p>
                            <p className="text-xs text-white/20">Create or join a server to start.</p>
                        </div>
                    )}
                </div>

                {/* Voice Connected Panel */}
                {voiceConnectedChannel && (
                    <div className="px-2 py-2 border-t border-white/5 bg-dark-950/30">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium">Voice Connected</span>
                            <span className="text-[9px] text-white/20 ml-auto">{(vcUsers || []).length + 1} users</span>
                        </div>
                        {/* Connected Users List */}
                        <div className="space-y-1 mb-2 max-h-20 overflow-y-auto">
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
                                <div className="w-5 h-5 rounded-full bg-indigo-500/60 flex items-center justify-center text-[8px] font-bold">
                                    {(user?.username?.[0] || 'U').toUpperCase()}
                                </div>
                                <span className="text-[10px] text-white/70 flex-1 truncate">{user?.username} (You)</span>
                                <div className="flex gap-0.5">
                                    {isMuted && <span className="text-[8px]">🔇</span>}
                                    {isVideoOn && <span className="text-[8px]">📹</span>}
                                </div>
                            </div>
                            {(vcUsers || []).map(u => (
                                <div key={u.userId} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.02]">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/40 flex items-center justify-center text-[8px] font-bold">
                                        {(u.username?.[0] || 'U').toUpperCase()}
                                    </div>
                                    <span className="text-[10px] text-white/50 flex-1 truncate">{u.username}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => router.push(`/call/${voiceConnectedChannel}`)}
                                className="flex-1 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs transition-colors flex items-center justify-center gap-1">
                                🖥️ Open Call
                            </button>
                            <button onClick={() => { leaveVoice?.(voiceConnectedChannel); leaveVoiceChannel?.(voiceConnectedChannel); }}
                                className="flex-1 p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs transition-colors flex items-center justify-center gap-1">
                                📞 Disconnect
                            </button>
                        </div>
                    </div>
                )}

                {/* Incoming call is now handled globally by CallProvider */}

                {/* USER PANEL */}
                <div className="relative bg-dark-950/50 px-2.5 py-2 border-t border-white/5">
                    {/* Status Picker Popup */}
                    <AnimatePresence>
                        {showStatusPicker && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-full left-0 right-0 mb-1 mx-1 bg-dark-800 rounded-xl border border-white/10 shadow-2xl p-3 z-50 max-w-[280px] sm:max-w-none">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Set Status</p>
                                    <button onClick={(e) => { e.stopPropagation(); setShowStatusPicker(false); }}
                                        className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                                        <FiX className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {statusOptions.map(opt => (
                                    <div key={opt.value} onClick={(e) => { e.stopPropagation(); handleStatusChange(opt.value); }}
                                        className="flex items-center gap-2.5 px-2 py-2 sm:py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.color}`} />
                                        <span className="text-sm text-white/80">{opt.label}</span>
                                    </div>
                                ))}
                                <div className="border-t border-white/5 mt-2 pt-2">
                                    <input type="text" value={customStatusText} onChange={e => setCustomStatusText(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Set custom status..."
                                        className="w-full bg-white/5 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-white placeholder-white/20 outline-none border border-white/5 focus:border-white/20 transition-colors"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); handleStatusChange(user?.status || 'online'); } }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <div className="flex items-center gap-2">
                        <div className="relative cursor-pointer" onClick={() => router.push('/settings')}>
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">{user?.username?.[0]?.toUpperCase() || '?'}</div>
                            <div onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }} className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-dark-950 cursor-pointer hover:scale-125 transition-transform ${user?.status === 'dnd' ? 'bg-red-500' : user?.status === 'idle' ? 'bg-amber-400' : user?.status === 'invisible' ? 'bg-gray-400' : 'bg-emerald-400'
                                }`} title="Change Status" />
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push('/settings')}>
                            <p className="text-sm font-medium truncate">{user?.username || 'User'}</p>
                            <p className={`text-[10px] ${user?.customStatus?.text ? 'text-violet-400' : user?.status === 'dnd' ? 'text-red-400' : user?.status === 'idle' ? 'text-amber-400' : user?.status === 'invisible' ? 'text-gray-400' : 'text-emerald-400'}`}>
                                {user?.customStatus?.text || (user?.status === 'dnd' ? 'Do Not Disturb' : user?.status === 'idle' ? 'Idle' : user?.status === 'invisible' ? 'Invisible' : 'Online')}
                            </p>
                        </div>
                        <button onClick={() => router.push('/settings')} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Settings">
                            <FiSettings className="w-4 h-4" />
                        </button>
                        <button onClick={handleLogout} className="p-1.5 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors" title="Log Out">
                            <FiLogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── MAIN CHAT ─── */}
            <div className="flex-1 flex flex-col min-w-0 bg-dark-900 h-full w-full relative z-10 overflow-hidden">
                {currentChannel ? (
                    <>
                        <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 shrink-0 z-30 bg-dark-900 border-white/5 w-full">
                            <div className="flex items-center gap-2 min-w-0">
                                <button
                                    onClick={() => setSidebarOpen(prev => !prev)}
                                    className="md:hidden mr-2 p-1.5 rounded-lg bg-dark-800 border border-white/10 text-white/70 hover:text-white transition-colors flex-shrink-0"
                                >
                                    <FiMenu className="w-5 h-5" />
                                </button>
                                <FiHash className="w-5 h-5 text-white/20 shrink-0" />
                                <span className="font-bold truncate">{currentChannel.name}</span>
                                {currentChannel.description && <span className="text-sm text-white/30 ml-2 border-l border-white/10 pl-2">{currentChannel.description}</span>}
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <FiPhone className="hidden sm:block w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/20 cursor-pointer hover:text-emerald-400 transition-colors" title="Voice Call"
                                    onClick={() => setShowCallPicker('voice')} />
                                <FiVideo className="hidden sm:block w-4 h-4 sm:w-[18px] sm:h-[18px] text-white/20 cursor-pointer hover:text-indigo-400 transition-colors" title="Video Call"
                                    onClick={() => setShowCallPicker('video')} />
                                <FiBookmark className={`w-4 h-4 sm:w-[18px] sm:h-[18px] cursor-pointer transition-colors ${showPinned ? 'text-amber-400' : 'text-white/20 hover:text-amber-400'}`} title="Pinned Messages"
                                    onClick={() => { setShowPinned(!showPinned); if (!showPinned) fetchPinnedMessages(currentChannel._id); }} />
                                <FiSearch className={`w-4 h-4 sm:w-5 sm:h-5 cursor-pointer transition-colors ${showSearch ? 'text-indigo-400' : 'text-white/20 hover:text-white'}`} onClick={() => { setShowSearch(!showSearch); setSearchResults([]); setSearchQuery(''); }} />
                                <FiUsers className={`hidden sm:block w-4 h-4 sm:w-5 sm:h-5 cursor-pointer transition-colors ${showMembers ? 'text-white' : 'text-white/20 hover:text-white'}`} onClick={() => setShowMembers(!showMembers)} />
                            </div>
                        </div>

                        {/* Message Search Modal */}
                        <MessageSearch
                            isOpen={showSearch}
                            onClose={() => setShowSearch(false)}
                            channelId={currentChannel?._id}
                            onJumpToMessage={(msg) => toast.success(`Jump to: ${msg.content.substring(0, 20)}...`)}
                        />

                        {/* Pinned Messages Panel */}
                        <AnimatePresence>
                            {showPinned && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-white/5 overflow-hidden bg-amber-500/5">
                                    <div className="px-4 py-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-amber-400 flex items-center gap-1"><FiBookmark className="w-3 h-3" /> Pinned Messages</span>
                                            <FiX className="w-3.5 h-3.5 text-white/30 cursor-pointer hover:text-white" onClick={() => setShowPinned(false)} />
                                        </div>
                                        {pinnedMessages.length > 0 ? pinnedMessages.map((pm, i) => (
                                            <div key={pm._id || i} className="flex items-start gap-2 py-1.5 text-sm">
                                                <span className="font-medium text-white/70">{pm.sender?.username || 'User'}</span>
                                                <span className="text-white/40 truncate flex-1">{pm.content}</span>
                                            </div>
                                        )) : <p className="text-xs text-white/20 py-1">No pinned messages yet</p>}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* VIDEO / SCREEN SHARE — now triggers the popup instead of inline */}
                        {(isVideoOn || isScreenSharing) && connectedVoice && !showVideoPopup && (
                            <div className="border-b border-white/5 bg-dark-950/50 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-dark-950/80 transition-colors"
                                onClick={() => setShowVideoPopup(true)}>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs text-white/70 font-medium">
                                        {isScreenSharing ? '📺 Screen Sharing' : '📹 Camera Active'} — Click to open video window
                                    </span>
                                </div>
                                <span className="text-[10px] text-white/30">Open ↗</span>
                            </div>
                        )}

                        <div className="flex-1 flex min-h-0">
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
                                <div className="mb-8">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3"><FiHash className="w-8 h-8 text-white/20" /></div>
                                    <h2 className="text-3xl font-bold">Welcome to #{currentChannel.name}!</h2>
                                    <p className="text-white/30 mt-1">This is the start of the #{currentChannel.name} channel.</p>
                                </div>

                                {messages.map((msg, idx) => (
                                    <div key={msg._id || idx} className="flex items-start gap-3 group hover:bg-white/[0.02] px-2 py-1.5 rounded-lg relative">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/80 flex items-center justify-center text-sm font-bold flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setProfileUser(msg.sender?._id || msg.sender)}>
                                            {(msg.sender?.username || 'U')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-medium text-white cursor-pointer hover:underline flex items-center" onClick={() => setProfileUser(msg.sender?._id || msg.sender)}>
                                                    {msg.sender?.username || 'User'}
                                                    {msg.sender?.subscription?.tier === 'pro' && (
                                                        <span className="ml-1.5 text-[12px] bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text drop-shadow-[0_0_2px_rgba(251,191,36,0.5)]" title="ServerChat Pro">✦</span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-white/20 flex items-center gap-1">
                                                    {new Date(msg.createdAt || Date.now()).toLocaleString()}
                                                    {msg.sender?._id === user?._id && msg.readBy?.length > 0 && (
                                                        <span className="text-indigo-400 flex" title="Read by others">
                                                            <FiCheck className="w-3 h-3 -mr-1.5" /><FiCheck className="w-3 h-3" />
                                                        </span>
                                                    )}
                                                </span>
                                                {msg.isEdited && <span className="text-xs text-white/15">(edited)</span>}
                                                {msg.isPinned && <span className="text-xs text-amber-400/60">📌</span>}
                                                {msg.threadCount > 0 && <span className="text-xs text-indigo-400/60 cursor-pointer hover:text-indigo-400" onClick={() => openThread(msg)}>💬 {msg.threadCount} replies</span>}
                                            </div>
                                            {editingMsg === msg._id ? (
                                                <div className="mt-1">
                                                    <input value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditMessage(msg._id); if (e.key === 'Escape') setEditingMsg(null); }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none text-white focus:ring-1 focus:ring-indigo-500" autoFocus />
                                                    <p className="text-xs text-white/20 mt-1">escape to cancel • enter to save</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-white/70 text-sm mt-0.5">
                                                        {msg.content?.split(/(@\w+)/g).map((part, pi) =>
                                                            part.startsWith('@') ? (
                                                                <span key={pi} className="bg-indigo-500/20 text-indigo-300 px-1 rounded font-medium cursor-pointer hover:bg-indigo-500/30">{part}</span>
                                                            ) : part
                                                        )}
                                                    </p>
                                                    {/* Game Challenge Card */}
                                                    {msg.gameChallenge?.game && (
                                                        <div className={`mt-2 p-3 rounded-xl border ${
                                                            msg.gameChallenge.status === 'cancelled' ? 'bg-red-500/5 border-red-500/10 opacity-60' :
                                                            msg.gameChallenge.status === 'waiting' ? 'bg-amber-500/5 border-amber-500/20' :
                                                            msg.gameChallenge.status === 'in_progress' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                                            msg.gameChallenge.status === 'finished' ? 'bg-indigo-500/5 border-indigo-500/20' :
                                                            'bg-white/[0.02] border-white/10'
                                                        }`}>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-lg">{
                                                                    msg.gameChallenge.status === 'cancelled' ? '🚫' :
                                                                    msg.gameChallenge.status === 'finished' ? '🏆' : '🎮'
                                                                }</span>
                                                                <span className={`text-xs font-bold ${msg.gameChallenge.status === 'cancelled' ? 'line-through text-white/30' : ''}`}>
                                                                    {msg.gameChallenge.game?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                                </span>
                                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                                                                    msg.gameChallenge.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                                                    msg.gameChallenge.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' :
                                                                    msg.gameChallenge.status === 'in_progress' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                    msg.gameChallenge.status === 'finished' ? 'bg-indigo-500/20 text-indigo-400' :
                                                                    'bg-white/5 text-white/30'
                                                                }`}>
                                                                    {msg.gameChallenge.status === 'cancelled' ? 'Cancelled' :
                                                                     msg.gameChallenge.status === 'waiting' ? 'Open' :
                                                                     msg.gameChallenge.status === 'in_progress' ? 'Live' :
                                                                     msg.gameChallenge.status === 'finished' ? 'Ended' : 'Unknown'}
                                                                </span>
                                                            </div>
                                                            {msg.gameChallenge.status !== 'cancelled' && (
                                                                <div className="mt-2 flex gap-2 flex-wrap">
                                                                    {msg.gameChallenge.status === 'waiting' && msg.sender?._id !== user?._id && (
                                                                        <button onClick={() => { const s = getSocket(); s?.emit('game:request-join', { sessionId: msg.gameSessionId }); }}
                                                                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-medium transition-colors">
                                                                            ⚔️ Join Game
                                                                        </button>
                                                                    )}
                                                                    {msg.gameChallenge.status === 'in_progress' && (
                                                                        <button onClick={() => { const s = getSocket(); s?.emit('game:spectate', { sessionId: msg.gameSessionId }); router.push(currentServer ? `/server-games/${currentServer._id}?tab=spectate` : '/games'); }}
                                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 rounded-lg text-[10px] font-medium transition-colors border border-white/10">
                                                                            👁️ Spectate
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {msg.attachments?.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {msg.attachments.map((att, ai) => (
                                                                <div key={ai} className="max-w-xs rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                                                {att.type?.startsWith('audio/') ? (
                                                                        <AudioPlayer src={att.url} isMine={msg.sender?._id === user?._id} />
                                                                    ) : att.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(att.url || '') ? (
                                                                        <a href={att.url} target="_blank" rel="noopener noreferrer"><img src={att.url} alt={att.name} className="w-full h-auto object-cover max-h-60" /></a>
                                                                    ) : att.type?.startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(att.url || '') ? (
                                                                        <video src={att.url} controls className="w-full h-auto max-h-60" />
                                                                    ) : (
                                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors">
                                                                            <FiPaperclip className="w-4 h-4 text-indigo-400" />
                                                                            <span className="text-sm text-indigo-300 underline break-all">{att.name || 'Download File'}</span>
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {msg.reactions?.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {msg.reactions.map((r, ri) => {
                                                        const emojiStr = typeof r.emoji === 'string' ? r.emoji : (r.emoji?.emoji || r.emoji?.text || '👍');
                                                        return (
                                                            <button key={ri} onClick={() => handleReaction(msg._id, emojiStr)}
                                                                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-colors">
                                                                <span>{emojiStr}</span><span className="text-white/40">{r.users?.length || 0}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex items-center bg-dark-800 rounded-lg border border-white/10 shadow-xl">
                                                <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg._id ? null : msg._id)}
                                                    className="p-1.5 hover:bg-white/10 rounded-l-lg text-white/30 hover:text-white transition-colors" title="React"><FiSmile className="w-4 h-4" /></button>
                                                <button onClick={() => openThread(msg)}
                                                    className="p-1.5 hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-colors" title="Thread"><FiMessageCircle className="w-4 h-4" /></button>
                                                <button onClick={() => handlePinMessage(msg._id)}
                                                    className="p-1.5 hover:bg-white/10 text-white/30 hover:text-amber-400 transition-colors" title="Pin"><FiBookmark className="w-4 h-4" /></button>
                                                {(msg.sender?._id === user?._id || msg.sender === user?._id) && (
                                                    <button onClick={() => { setEditingMsg(msg._id); setEditContent(msg.content); }}
                                                        className="p-1.5 hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                                                )}
                                                <button onClick={() => handleDeleteMessage(msg._id)}
                                                    className="p-1.5 hover:bg-white/10 rounded-r-lg text-white/30 hover:text-red-400 transition-colors" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                                            </div>
                                            {showEmojiPicker === msg._id && (
                                                <div className="absolute top-8 right-0 sm:right-0 -right-4 z-50">
                                                    <div className="fixed inset-0" onClick={() => setShowEmojiPicker(null)} />
                                                    <div className="relative">
                                                        <EmojiPicker onEmojiClick={(emojiObject) => handleReaction(msg._id, emojiObject.emoji)} theme="dark" emojiStyle={EmojiStyle.NATIVE} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <AnimatePresence>
                                {showMembers && currentServer && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed md:relative inset-0 md:inset-auto z-50 md:z-auto md:w-[240px] bg-dark-800 md:border-l border-white/5 overflow-y-auto">
                                        <div className="p-4">
                                            <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-3">Members — {currentServer.members?.length || 0}</h3>
                                            {(currentServer.members || []).map((m, i) => (
                                                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                                                    <div className="relative">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-500/60 flex items-center justify-center text-xs font-bold">{(m.user?.username || 'U')[0].toUpperCase()}</div>
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${(() => {
                                                            const isMe = m.user?._id === user?._id;
                                                            if (!isMe && !onlineUsers.includes(m.user?._id)) return 'bg-white/20';
                                                            const s = isMe ? user?.status : m.user?.status;
                                                            if (s === 'dnd') return 'bg-red-500';
                                                            if (s === 'idle') return 'bg-amber-400';
                                                            if (s === 'invisible') return 'bg-gray-400';
                                                            return 'bg-emerald-400';
                                                        })()
                                                            }`} />
                                                    </div>
                                                    <p className="text-sm truncate text-white/70">
                                                        {m.user?.username || 'User'}
                                                        {m.role === 'owner' && <span className="ml-1 text-amber-400">👑</span>}
                                                        {m.role === 'admin' && <span className="ml-1 text-red-400">⚡</span>}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Thread Panel */}
                            <AnimatePresence>
                                {threadView && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed md:relative inset-0 md:inset-auto z-50 md:z-auto md:w-[340px] bg-dark-800 md:border-l border-white/5 flex flex-col overflow-hidden">
                                        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><FiMessageCircle className="w-4 h-4 text-indigo-400" /> Thread</h3>
                                            <FiX className="w-4 h-4 text-white/30 cursor-pointer hover:text-white" onClick={() => setThreadView(null)} />
                                        </div>
                                        {/* Parent Message */}
                                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-medium text-white flex items-center">
                                                    {threadView.sender?.username || 'User'}
                                                    {threadView.sender?.subscription?.tier === 'pro' && (
                                                        <span className="ml-1 text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text drop-shadow-[0_0_2px_rgba(251,191,36,0.5)]" title="ServerChat Pro">✦</span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-white/20">{new Date(threadView.createdAt || Date.now()).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-white/60">{threadView.content}</p>
                                        </div>
                                        {/* Thread Replies */}
                                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
                                            {threadMessages.length > 0 ? threadMessages.map((tm, i) => (
                                                <div key={tm._id || i} className="flex items-start gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-indigo-500/60 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                                        {(tm.sender?.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-xs font-medium text-white flex items-center">
                                                                {tm.sender?.username || 'User'}
                                                                {tm.sender?.subscription?.tier === 'pro' && (
                                                                    <span className="ml-1 text-[10px] bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text drop-shadow-[0_0_2px_rgba(251,191,36,0.5)]" title="ServerChat Pro">✦</span>
                                                                )}
                                                            </span>
                                                            <span className="text-[10px] text-white/20">{new Date(tm.createdAt || Date.now()).toLocaleTimeString()}</span>
                                                        </div>
                                                        <p className="text-xs text-white/60 mt-0.5">{tm.content}</p>
                                                    </div>
                                                </div>
                                            )) : <p className="text-xs text-white/20 text-center py-4">No replies yet. Start the conversation!</p>}
                                        </div>
                                        {/* Thread Input */}
                                        <div className="px-3 py-2 border-t border-white/5">
                                            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                                <input type="text" value={threadInput} onChange={(e) => setThreadInput(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendThreadReply(); } }}
                                                    placeholder="Reply in thread..." className="flex-1 bg-transparent text-xs outline-none text-white placeholder-white/30" />
                                                <FiCornerUpRight className="w-4 h-4 text-white/20 cursor-pointer hover:text-indigo-400 transition-colors" onClick={sendThreadReply} />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Typing Indicator */}
                        {currentChannel && typingUsers[currentChannel._id] && Object.keys(typingUsers[currentChannel._id]).length > 0 && (
                            <TypingIndicator users={Object.values(typingUsers[currentChannel._id]).map(u => ({ username: u }))} />
                        )}

                        <div className="px-2 sm:px-4 pb-4 pt-2 relative shrink-0 bg-dark-900">
                            {/* @Mention Autocomplete */}
                            <AnimatePresence>
                                {showMentions && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                        className="absolute bottom-full left-4 right-4 mb-1 bg-dark-800 rounded-xl border border-white/10 shadow-2xl overflow-hidden z-50">
                                        <p className="px-3 py-1.5 text-[10px] text-white/30 uppercase font-semibold border-b border-white/5">Members matching @{mentionQuery}</p>
                                        {mentionList.map((m) => (
                                            <div key={m._id} onClick={() => insertMention(m.username)}
                                                className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors">
                                                <div className="w-6 h-6 rounded-full bg-indigo-500/60 flex items-center justify-center text-[10px] font-bold">{(m.username || 'U')[0].toUpperCase()}</div>
                                                <span className="text-sm text-white/80">{m.username}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4 relative">
                                <button onClick={() => { setShowInputEmojiPicker(!showInputEmojiPicker); setShowGifPicker(false); }} className="text-white/20 hover:text-amber-400 transition-colors mr-1 sm:mr-2 cursor-pointer flex-shrink-0" title="Emoji">
                                    <FiSmile className="w-5 h-5" />
                                </button>
                                <button onClick={() => { setShowGifPicker(!showGifPicker); setShowInputEmojiPicker(false); }} className="hidden sm:flex text-white/20 hover:text-emerald-400 transition-colors mr-1 sm:mr-2 cursor-pointer flex-shrink-0" title="GIFs">
                                    <MdGif className="w-7 h-7" />
                                </button>
                                <button onClick={() => router.push(`/server-games/${currentServer?._id}`)} className="hidden sm:flex text-white/20 hover:text-indigo-400 transition-colors mr-1 sm:mr-2 cursor-pointer flex-shrink-0" title="Server Games">
                                    <IoGameControllerOutline className="w-5 h-5" />
                                </button>
                                <FiPaperclip className="hidden sm:block w-5 h-5 text-white/20 cursor-pointer hover:text-white transition-colors flex-shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach file" />
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                                <input type="text" value={messageInput} onChange={handleTyping}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); setShowMentions(false); setShowInputEmojiPicker(false); setShowGifPicker(false); }
                                        if (e.key === 'Escape') { setShowMentions(false); setShowInputEmojiPicker(false); setShowGifPicker(false); }
                                    }}
                                    placeholder={`Message #${currentChannel.name}`} className="flex-1 bg-transparent py-3 px-3 text-sm outline-none text-white placeholder-white/30" />
                                <button onClick={handleSendMessage} className="text-white/20 hover:text-indigo-400 transition-colors flex-shrink-0 ml-1"><FiSend className="w-5 h-5" /></button>
                                <VoiceRecorder onSend={async (blob) => {
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', blob, 'voice-message.webm');
                                        const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        sendMessage(currentChannel._id, '🎤 Voice Message', 'voice_message', [{ url: data.url, type: 'audio/webm', name: 'Voice Message' }]);
                                    } catch (e) {
                                        console.error('Voice send error:', e.response?.data || e);
                                        toast.error(e.response?.data?.message || 'Failed to send voice message');
                                    }
                                }} />

                                {showInputEmojiPicker && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowInputEmojiPicker(false)} />
                                        <div className="absolute bottom-16 left-4 z-50 shadow-2xl">
                                            <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" emojiStyle={EmojiStyle.NATIVE} />
                                        </div>
                                    </>
                                )}

                                {showGifPicker && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowGifPicker(false)} />
                                        <div className="absolute bottom-16 left-12 z-50">
                                            <GifPicker onSelect={(gifUrl) => {
                                                sendMessage(currentChannel._id, '', 'file', [{ url: gifUrl, type: 'image/gif', name: 'GIF' }]);
                                                setShowGifPicker(false);
                                            }} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 w-full relative">
                        <div className="absolute top-4 left-4 md:hidden">
                            <button
                                onClick={() => setSidebarOpen(prev => !prev)}
                                className="p-2 rounded-lg bg-dark-800 border border-white/10 text-white/70 hover:text-white transition-colors"
                            >
                                <FiMenu className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                            <FiMessageSquare className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white/30 mb-2">{currentServer ? 'Select a channel' : 'No server selected'}</h3>
                        <p className="text-sm text-white/20">{currentServer ? 'Pick a channel from the sidebar' : 'Create or join a server to start chatting!'}</p>
                    </div>
                )}
            </div>

            {/* ─── CREATE SERVER MODAL ─── */}
            <AnimatePresence>
                {showCreateServer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateServer(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-[440px] mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 sm:p-8 text-center">
                                <h2 className="text-xl sm:text-2xl font-bold mb-2">Create a Server</h2>
                                <p className="text-white/40 text-sm">Give your server a name and description.</p>
                            </div>
                            <div className="px-8 pb-2 space-y-4">
                                <div>
                                    <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Server Name</label>
                                    <input type="text" value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="My Server"
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateServer()} autoFocus
                                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Description <span className="text-white/20 font-normal">(optional)</span></label>
                                    <textarea value={newServerDesc} onChange={(e) => setNewServerDesc(e.target.value)} placeholder="What's it about?" rows={2}
                                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all resize-none placeholder-white/20" />
                                </div>
                                {serverError && <p className="text-red-400 text-sm">{serverError}</p>}
                            </div>
                            <div className="p-6 bg-dark-950/50 flex justify-between items-center mt-4">
                                <button onClick={() => setShowCreateServer(false)} className="text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleCreateServer} disabled={!newServerName.trim()} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20">Create Server</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── JOIN SERVER MODAL ─── */}
            <AnimatePresence>
                {showJoinServer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowJoinServer(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-[440px] mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 sm:p-8 text-center">
                                <h2 className="text-xl sm:text-2xl font-bold mb-2">Join a Server</h2>
                                <p className="text-white/40 text-sm">Enter an invite code.</p>
                            </div>
                            <div className="px-8 pb-2">
                                <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Invite Code</label>
                                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. a1b2c3d4"
                                    onKeyDown={(e) => e.key === 'Enter' && handleJoinServer()} autoFocus
                                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20" />
                                {serverError && <p className="text-red-400 text-sm mt-2">{serverError}</p>}
                            </div>
                            <div className="p-6 bg-dark-950/50 flex justify-between items-center mt-4">
                                <button onClick={() => setShowJoinServer(false)} className="text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleJoinServer} disabled={!joinCode.trim()} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20">Join</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── CREATE CHANNEL MODAL ─── */}
            <AnimatePresence>
                {showCreateChannel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateChannel(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-[440px] mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 sm:p-8 text-center"><h2 className="text-xl sm:text-2xl font-bold mb-2">Create Channel</h2><p className="text-white/40 text-sm">in {currentServer?.name}</p></div>
                            <div className="px-8 pb-2 space-y-4">
                                <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Channel Type</label>
                                    <div className="flex gap-3 mt-2">
                                        <button onClick={() => setNewChannelType('text')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${newChannelType === 'text' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}><FiHash className="w-5 h-5" /> Text</button>
                                        <button onClick={() => setNewChannelType('voice')} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${newChannelType === 'voice' ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/10 text-white/40 hover:border-white/20'}`}><FiVolume2 className="w-5 h-5" /> Voice</button>
                                    </div>
                                </div>
                                <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Category <span className="text-white/20 font-normal">(optional)</span></label>
                                    <input type="text" value={newChannelCategory} onChange={(e) => setNewChannelCategory(e.target.value)} placeholder="e.g. general"
                                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-white focus:ring-2 focus:ring-indigo-500 transition-all placeholder-white/20" />
                                </div>
                                <div><label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Channel Name</label>
                                    <div className="mt-2 flex items-center bg-white/5 border border-white/10 rounded-xl px-4">
                                        {newChannelType === 'text' ? <FiHash className="w-4 h-4 text-white/30" /> : <FiVolume2 className="w-4 h-4 text-white/30" />}
                                        <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()} placeholder="new-channel" autoFocus
                                            className="flex-1 bg-transparent py-3 px-2 text-sm outline-none text-white placeholder-white/20" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 bg-dark-950/50 flex justify-between items-center mt-4">
                                <button onClick={() => setShowCreateChannel(false)} className="text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleCreateChannel} disabled={!newChannelName.trim()} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-500/20">Create Channel</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* User Profile Modal */}
            {profileUser && <UserProfileModal userId={profileUser} onClose={() => setProfileUser(null)} />}

            {/* Call is now handled globally by CallProvider */}

            {/* Voice Video Popup */}
            {showVideoPopup && connectedVoice && (
                <VoiceVideoPopup
                    user={user}
                    isVideoOn={isVideoOn}
                    isScreenSharing={isScreenSharing}
                    localVideoStream={localVideoStream}
                    localScreenStream={localScreenStream}
                    peerVideoStreams={peerVideoStreams || {}}
                    peerScreenStreams={voice.peerScreenStreams || {}}
                    voiceUsers={vcUsers?.[connectedVoice] || []}
                    isMuted={isMuted}
                    isDeafened={isDeafened}
                    onToggleMute={voiceToggleMute}
                    onToggleDeafen={voiceToggleDeafen}
                    onStartVideo={() => startVideo && startVideo()}
                    onStopVideo={() => stopVideo && stopVideo()}
                    onStartScreenShare={() => startScreenShare && startScreenShare()}
                    onStopScreenShare={() => stopScreenShare && stopScreenShare()}
                    onSwitchCamera={() => switchCamera && switchCamera()}
                    facingMode={facingMode}
                    onDisconnect={() => { leaveVoice(connectedVoice); leaveVoiceChannel(connectedVoice); setConnectedVoice(null); setShowVideoPopup(false); }}
                    onClose={() => setShowVideoPopup(false)}
                />
            )}

            {/* Call Member Picker Modal (Multi-Select) */}
            <AnimatePresence>
                {showCallPicker && currentServer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowCallPicker(null); setSelectedCallMembers([]); }}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-[400px] mx-4 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6 text-center border-b border-white/5">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center mx-auto mb-3">
                                    {showCallPicker === 'video' ? <FiVideo className="w-6 h-6 text-white" /> : <FiPhone className="w-6 h-6 text-white" />}
                                </div>
                                <h2 className="text-xl font-bold">Start {showCallPicker === 'video' ? 'Video' : 'Voice'} Call</h2>
                                <p className="text-white/40 text-sm mt-1">Select member{selectedCallMembers.length > 1 ? 's' : ''} to call</p>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                                {(currentServer.members || []).filter(m => m.user?._id !== user?._id).map((m, i) => {
                                    const isSelected = selectedCallMembers.includes(m.user?._id);
                                    return (
                                        <motion.div key={m.user?._id || i}
                                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                                            onClick={() => {
                                                setSelectedCallMembers(prev =>
                                                    isSelected ? prev.filter(id => id !== m.user?._id) : [...prev, m.user?._id]
                                                );
                                            }}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/10 border border-indigo-500/30' : 'border border-transparent'}`}>
                                            {/* Checkbox */}
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                {isSelected && <FiCheck className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/60 flex items-center justify-center text-sm font-bold">
                                                    {(m.user?.username || 'U')[0].toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${onlineUsers.includes(m.user?._id) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{m.user?.username || 'User'}</p>
                                                <p className="text-xs text-white/30">{onlineUsers.includes(m.user?._id) ? 'Online' : 'Offline'}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {(currentServer.members || []).filter(m => m.user?._id !== user?._id).length === 0 && (
                                    <p className="text-center text-white/30 text-sm py-6">No other members in this server</p>
                                )}
                            </div>
                            <div className="p-4 border-t border-white/5 flex gap-2">
                                <button onClick={() => { setShowCallPicker(null); setSelectedCallMembers([]); }}
                                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/50 hover:text-white transition-colors">Cancel</button>
                                <button
                                    disabled={selectedCallMembers.length === 0}
                                    onClick={() => {
                                        selectedCallMembers.forEach(memberId => {
                                            initiateCall?.(memberId, currentChannel?._id, showCallPicker);
                                        });
                                        setShowCallPicker(null);
                                        setSelectedCallMembers([]);
                                    }}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedCallMembers.length > 0 ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
                                    {showCallPicker === 'video' ? <FiVideo className="w-4 h-4" /> : <FiPhone className="w-4 h-4" />}
                                    Call{selectedCallMembers.length > 0 ? ` (${selectedCallMembers.length})` : ''}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Game Launcher */}
            {
                showGameLauncher && currentChannel && (
                    <GameLauncher
                        channelId={currentChannel._id}
                        onClose={() => setShowGameLauncher(false)}
                        createGame={createGame}
                        joinGame={joinGame}
                        makeGameMove={makeGameMove}
                        requestRematch={requestRematch}
                        inviteCode={currentServer?.inviteCode}
                    />
                )
            }

            {/* Music Room */}
            {
                showMusicRoom && currentServer && (
                    <MusicRoom
                        serverId={currentServer._id}
                        serverName={currentServer.name}
                        onClose={() => setShowMusicRoom(false)}
                        joinMusicRoom={joinMusicRoom}
                        syncMusic={syncMusic}
                        leaveMusicRoom={leaveMusicRoom}
                        musicRoom={musicRoom}
                        userId={user?._id}
                        isServerOwner={currentServer?.owner?._id === user?._id || currentServer?.owner === user?._id}
                        inviteCode={currentServer?.inviteCode}
                    />
                )
            }

            {/* User Profile Modal */}
            {profileUser && (
                <UserProfileModal
                    userId={profileUser}
                    onClose={() => setProfileUser(null)}
                    onVoiceCall={(userId) => { setProfileUser(null); initiateCall?.(userId, currentChannel?._id, 'voice'); }}
                    onVideoCall={(userId) => { setProfileUser(null); initiateCall?.(userId, currentChannel?._id, 'video'); }}
                />
            )}

            {/* Server Settings Modal */}
            <AnimatePresence>
                {showServerSettings && currentServer && (
                    <ServerSettingsModal
                        server={currentServer}
                        user={user}
                        onClose={() => setShowServerSettings(false)}
                        onServerUpdate={(updated) => {
                            dispatch(setCurrentServer({ ...currentServer, ...updated }));
                            dispatch(setServers(servers.map(s => s._id === updated._id ? { ...s, ...updated } : s)));
                        }}
                        onServerDelete={() => {
                            dispatch(setServers(servers.filter(s => s._id !== currentServer._id)));
                            dispatch(setCurrentServer(null));
                        }}
                        onLeaveServer={() => {
                            dispatch(setServers(servers.filter(s => s._id !== currentServer._id)));
                            dispatch(setCurrentServer(null));
                        }}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}
