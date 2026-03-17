'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiSend, FiSearch, FiMessageSquare, FiPlus, FiX, FiPaperclip, FiPhone, FiVideo, FiSmile, FiMenu, FiCheck, FiImage } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import { setMessages, addMessage } from '../../redux/chatSlice';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useCall } from '../../components/CallProvider';
import TypingIndicator from '../../components/TypingIndicator';
import VoiceRecorder from '../../components/VoiceRecorder';
import AudioPlayer from '../../components/AudioPlayer';
import MessageSearch from '../../components/MessageSearch';
import UserProfilePopup from '../../components/UserProfilePopup';
const ChatBackgroundPicker = dynamic(() => import('../../components/ChatBackgroundPicker'), { ssr: false });
import { MdGif } from 'react-icons/md';
import api from '../../services/api';
import { connectSocket, getSocket } from '../../services/socket';

// Lazy-load heavy components
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false, loading: () => <div className="w-[350px] h-[400px] bg-dark-800 rounded-xl animate-pulse" /> });
import { EmojiStyle } from 'emoji-picker-react';
const GifPicker = dynamic(() => import('../../components/GifPicker'), { ssr: false });
import toast from 'react-hot-toast';

export default function DMsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, loading } = useAuth();
    const { sendMessage, reactToMessage } = useSocket();
    const { initiateCall } = useCall() || {};

    const dispatch = useDispatch();
    const { messages, typingUsers } = useSelector(state => state.chat);

    const [conversations, setConversations] = useState([]);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(null);
    const [friends, setFriends] = useState([]);
    const [showNewDM, setShowNewDM] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showBgPicker, setShowBgPicker] = useState(false);
    const [chatBg, setChatBg] = useState('');
    const [profilePopupUser, setProfilePopupUser] = useState(null);
    const [friendMap, setFriendMap] = useState({});
    const quickEmojis = ['👍', '❤️', '😂', '🎉', '😮', '😢', '🔥', '👏'];
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) router.push('/login');
    }, [isAuthenticated, loading]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations();
            fetchFriends();
        }
    }, [isAuthenticated]);

    // Auto-open a DM conversation when redirected with ?open=channelId
    useEffect(() => {
        const openId = searchParams.get('open');
        if (openId && conversations.length > 0) {
            const targetConvo = conversations.find(c => c._id === openId);
            if (targetConvo) {
                setSelectedConvo(targetConvo);
                setIsSidebarOpen(false);
            }
        }
    }, [searchParams, conversations]);

    useEffect(() => {
        if (selectedConvo) {
            fetchMessages(selectedConvo._id);
            // Load background from server (synced between both users), fallback to localStorage
            const serverBg = selectedConvo.background;
            const localBg = localStorage.getItem(`chat_bg_${selectedConvo._id}`);
            setChatBg(serverBg || localBg || '');
        }
    }, [selectedConvo?._id]);

    // Parse chatBg - could be plain CSS string or JSON {css, size}
    const parseBg = (bg) => {
        if (!bg) return { css: '', size: '' };
        try {
            const parsed = JSON.parse(bg);
            return { css: parsed.css || '', size: parsed.size || '' };
        } catch {
            return { css: bg, size: '' };
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Removed duplicate manual socket listener; rely on useSocket -> Redux instead

    const fetchConversations = async () => {
        try {
            const { data } = await api.get('/channels/me');
            const dms = (data.channels || []).filter(c => c.type === 'dm');
            setConversations(dms);
        } catch (e) { console.error(e); }
    };

    const fetchFriends = async () => {
        try {
            const { data } = await api.get('/friends');
            const list = data.friends || data || [];
            setFriends(list);
            // Build lookup map: userId -> { nickname, customAvatar, ... }
            const map = {};
            list.forEach(f => {
                const u = f.user || f;
                map[u._id] = { nickname: f.nickname, customAvatar: f.customAvatar, ...u };
            });
            setFriendMap(map);
        } catch (e) { console.error(e); }
    };

    // Helper: get display name for a user (nickname if set, else username)
    const getDisplayName = (userId, fallbackUsername) => {
        return friendMap[userId]?.nickname || fallbackUsername || 'User';
    };

    // Helper: get custom avatar for a user
    const getFriendAvatar = (userId) => {
        return friendMap[userId]?.customAvatar || null;
    };

    // Handle nickname change from profile popup
    const handleNicknameChange = (userId, newNickname) => {
        setFriendMap(prev => ({
            ...prev,
            [userId]: { ...prev[userId], nickname: newNickname }
        }));
        setFriends(prev => prev.map(f => {
            const u = f.user || f;
            return u._id === userId ? { ...f, nickname: newNickname } : f;
        }));
    };

    // Handle avatar change from profile popup
    const handleFriendAvatarChange = (userId, newAvatar) => {
        setFriendMap(prev => ({
            ...prev,
            [userId]: { ...prev[userId], customAvatar: newAvatar }
        }));
        setFriends(prev => prev.map(f => {
            const u = f.user || f;
            return u._id === userId ? { ...f, customAvatar: newAvatar } : f;
        }));
    };

    // Listen for background changes from the other user
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const handleBgChange = ({ channelId, background, changedBy }) => {
            if (selectedConvo?._id === channelId) {
                setChatBg(background || '');
            }
        };
        socket.on('dm:background:changed', handleBgChange);
        return () => socket.off('dm:background:changed', handleBgChange);
    }, [selectedConvo?._id]);

    const fetchMessages = async (channelId) => {
        try {
            const { data } = await api.get(`/messages/channel/${channelId}`);
            dispatch(setMessages(data.messages || data || []));
            // Join the channel room for real-time updates
            if (user?.token) {
                const socket = connectSocket(user.token);
                if (socket) socket.emit('channel:join', channelId);
            }
        } catch (e) { console.error(e); }
    };

    const startDM = async (friendId) => {
        try {
            const { data } = await api.post('/channels/dm', { targetUserId: friendId });
            setSelectedConvo(data.channel);
            setShowNewDM(false);
            fetchConversations();
        } catch (e) { toast.error('Failed to start DM'); }
    };

    const onEmojiClick = (emojiObject) => {
        setMessageInput(prev => prev + emojiObject.emoji);
    };

    const handleReaction = (msgId, emoji) => {
        reactToMessage(msgId, emoji);
        setShowEmojiPicker(null);
    };

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedConvo) return;

        sendMessage(selectedConvo._id, messageInput, 'text');

        setMessageInput('');
        setShowInputEmojiPicker(false);
        setShowGifPicker(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedConvo) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            sendMessage(selectedConvo._id, `📎 ${file.name}`, 'file', [{ url: data.url, type: data.type, name: file.name }]);
        } catch (error) {
            toast.error('File upload failed');
        }
    };

    const getOtherUser = (convo) => {
        const other = convo.members?.find(m => {
            const uid = m.user?._id || m.user;
            return uid !== user?._id;
        });
        return other?.user || other || {};
    };

    const handleSelectBackground = (bg) => {
        // Store as JSON with both css and size for pattern backgrounds
        const value = bg.size ? JSON.stringify({ css: bg.css, size: bg.size }) : bg.css;
        setChatBg(value);
        if (selectedConvo) {
            // Save locally
            if (value) {
                localStorage.setItem(`chat_bg_${selectedConvo._id}`, value);
            } else {
                localStorage.removeItem(`chat_bg_${selectedConvo._id}`);
            }
            // Sync to other user via socket
            const socket = getSocket();
            if (socket) {
                socket.emit('dm:background', {
                    channelId: selectedConvo._id,
                    background: value || null
                });
            }
            // Send system message
            sendMessage(selectedConvo._id, `${user?.username || 'Someone'} changed the chat background`, 'system');
        }
        setShowBgPicker(false);
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-dark-900"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="flex h-[100dvh] bg-dark-900 text-white overflow-hidden relative">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* DM List Sidebar */}
            <div className={`
                fixed inset-y-0 left-0 z-50
                w-72 bg-dark-800 flex flex-col border-r border-white/5
                transition-all duration-300 ease-in-out md:relative shrink-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:-ml-72 md:border-none'}
            `}>
                <div className="h-12 px-4 flex items-center justify-between border-b border-white/5">
                    <button onClick={() => router.push('/channels')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                        <FiArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                    <h2 className="font-bold text-sm">Direct Messages</h2>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setShowNewDM(true)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="New DM">
                            <FiPlus className="w-4 h-4" />
                        </button>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors" title="Close">
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-2">
                    <div className="bg-white/5 rounded-lg flex items-center px-2.5 py-1.5">
                        <FiSearch className="w-4 h-4 text-white/20" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Find a conversation" className="flex-1 bg-transparent text-xs outline-none text-white placeholder-white/20 ml-2" />
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8">
                            <FiMessageSquare className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-sm text-white/20">No conversations yet</p>
                            <p className="text-xs text-white/10 mt-1">Start a DM with a friend!</p>
                        </div>
                    ) : conversations
                        .filter(c => {
                            if (!searchQuery) return true;
                            const other = getOtherUser(c);
                            const otherId = other._id || other;
                            const name = getDisplayName(otherId, other.username);
                            return (name || other.username || '').toLowerCase().includes(searchQuery.toLowerCase());
                        })
                        .map(convo => {
                            const other = getOtherUser(convo);
                            const otherId = other._id || other;
                            const displayName = getDisplayName(otherId, other.username);
                            const customAv = getFriendAvatar(otherId);
                            const isActive = selectedConvo?._id === convo._id;
                            return (
                                <motion.div key={convo._id} onClick={() => { setSelectedConvo(convo); setIsSidebarOpen(false); }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                    <div className="relative">
                                        {customAv ? (
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm" style={{ background: customAv.bg }}>{customAv.emoji}</div>
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-indigo-500/60 flex items-center justify-center text-sm font-bold">
                                                {(displayName || 'U')[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${other.status === 'online' ? 'bg-emerald-400' : other.status === 'idle' ? 'bg-amber-400' : other.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm truncate ${isActive ? 'text-white font-medium' : 'text-white/70'}`}>{displayName}</p>
                                        {convo.lastMessage && (
                                            <p className="text-[11px] text-white/30 truncate">{typeof convo.lastMessage === 'string' ? convo.lastMessage : convo.lastMessage.content || ''}</p>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    }
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {selectedConvo ? (
                    <>
                        {/* Header - sticky */}
                        <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 bg-dark-900 shrink-0 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsSidebarOpen(true)}
                                    className={`p-1.5 -ml-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors ${isSidebarOpen ? 'hidden md:hidden' : 'block'}`}
                                >
                                    <FiMenu className="w-5 h-5" />
                                </button>
                                <div className="relative cursor-pointer" onClick={() => {
                                    const other = getOtherUser(selectedConvo);
                                    const otherId = other._id || other;
                                    setProfilePopupUser({ userId: otherId, username: other.username, status: other.status, bio: other.bio });
                                }}>
                                    {(() => { const other = getOtherUser(selectedConvo); const otherId = other._id || other; const customAv = getFriendAvatar(otherId); return customAv ? (
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs" style={{ background: customAv.bg }}>{customAv.emoji}</div>
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-indigo-500/60 flex items-center justify-center text-xs font-bold">
                                            {(getDisplayName(otherId, other.username) || 'U')[0].toUpperCase()}
                                        </div>
                                    ); })()}
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-dark-900 ${getOtherUser(selectedConvo).status === 'online' ? 'bg-emerald-400' : 'bg-gray-500'
                                        }`} />
                                </div>
                                <div className="cursor-pointer" onClick={() => {
                                    const other = getOtherUser(selectedConvo);
                                    const otherId = other._id || other;
                                    setProfilePopupUser({ userId: otherId, username: other.username, status: other.status, bio: other.bio });
                                }}>
                                    <p className="font-bold text-sm">{(() => { const o = getOtherUser(selectedConvo); return getDisplayName(o._id || o, o.username); })()}</p>
                                    <p className={`text-[10px] ${getOtherUser(selectedConvo).status === 'online' ? 'text-emerald-400' : 'text-white/30'}`}>
                                        {getOtherUser(selectedConvo).status === 'online' ? 'Online' : getOtherUser(selectedConvo).status || 'Offline'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => initiateCall && initiateCall(getOtherUser(selectedConvo)._id, selectedConvo?._id, 'voice')}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-emerald-400 transition-colors" title="Voice Call">
                                    <FiPhone className="w-4 h-4" />
                                </button>
                                <button onClick={() => initiateCall && initiateCall(getOtherUser(selectedConvo)._id, selectedConvo?._id, 'video')}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-colors" title="Video Call">
                                    <FiVideo className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowSearch(true)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-indigo-400 transition-colors" title="Search Messages">
                                    <FiSearch className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowBgPicker(true)}
                                    className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-pink-400 transition-colors" title="Change Background">
                                    <FiImage className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Search Modal */}
                        <MessageSearch
                            isOpen={showSearch}
                            onClose={() => setShowSearch(false)}
                            channelId={selectedConvo._id}
                            onJumpToMessage={(msg) => toast.success(`Jump to: ${msg.content.substring(0, 20)}...`)}
                        />

                        {/* Messages - scrollable */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 relative min-h-0" style={(() => { const bg = parseBg(chatBg); const s = {}; if (bg.css) s.background = bg.css; if (bg.size) s.backgroundSize = bg.size; return s; })()}>
                            <div className="mb-8 text-center">
                                {(() => { const other = getOtherUser(selectedConvo); const otherId = other._id || other; const customAv = getFriendAvatar(otherId); const dispName = getDisplayName(otherId, other.username); return (<>
                                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer" onClick={() => setProfilePopupUser({ userId: otherId, username: other.username, status: other.status, bio: other.bio })} style={customAv ? { background: customAv.bg } : {}} className2="">
                                    {customAv ? (
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl cursor-pointer" style={{ background: customAv.bg }} onClick={() => setProfilePopupUser({ userId: otherId, username: other.username, status: other.status, bio: other.bio })}>{customAv.emoji}</div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center cursor-pointer" onClick={() => setProfilePopupUser({ userId: otherId, username: other.username, status: other.status, bio: other.bio })}>
                                            <span className="text-3xl font-bold text-indigo-400">{(dispName || 'U')[0].toUpperCase()}</span>
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-xl font-bold">{dispName}</h2>
                                {friendMap[otherId]?.nickname && <p className="text-xs text-white/30">{other.username}</p>}
                                </>); })()}
                                <p className="text-white/30 text-sm mt-1">This is the beginning of your direct message history.</p>
                            </div>
                            {messages.map((msg, idx) => {
                                const isMine = (msg.sender?._id || msg.sender) === user?._id;

                                // System messages (call logs, etc.)
                                if (msg.type === 'system') {
                                    return (
                                        <div key={msg._id || idx} className="flex justify-center my-3">
                                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                                <span className="text-xs text-white/40">{msg.content}</span>
                                                <span className="text-[10px] text-white/20">{new Date(msg.createdAt || Date.now()).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                    return (
                                    <div key={msg._id || idx} className={`flex items-start gap-3 ${isMine ? 'flex-row-reverse' : ''} group hover:bg-white/[0.02] px-2 py-1.5 rounded-lg relative`}>
                                        {(() => { const senderId = msg.sender?._id || msg.sender; const senderCustomAv = !isMine ? getFriendAvatar(senderId) : null; return senderCustomAv ? (
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 cursor-pointer" style={{ background: senderCustomAv.bg }} onClick={() => !isMine && setProfilePopupUser({ userId: senderId, username: msg.sender?.username, status: msg.sender?.status, bio: msg.sender?.bio })}>{senderCustomAv.emoji}</div>
                                        ) : (
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 cursor-pointer ${isMine ? 'bg-emerald-500/60' : 'bg-indigo-500/60'}`} onClick={() => !isMine && setProfilePopupUser({ userId: senderId, username: msg.sender?.username, status: msg.sender?.status, bio: msg.sender?.bio })}>
                                                {(getDisplayName(senderId, msg.sender?.username) || 'U')[0].toUpperCase()}
                                            </div>
                                        ); })()}
                                        <div className={`max-w-[70%] ${isMine ? 'text-right' : ''}`}>
                                            <div className={`flex items-baseline gap-2 ${isMine ? 'justify-end' : ''}`}>
                                                <span className="font-medium text-sm cursor-pointer hover:underline" onClick={() => { const sid = msg.sender?._id || msg.sender; if (!isMine) setProfilePopupUser({ userId: sid, username: msg.sender?.username, status: msg.sender?.status, bio: msg.sender?.bio }); }}>{isMine ? (msg.sender?.username || 'You') : getDisplayName(msg.sender?._id || msg.sender, msg.sender?.username)}</span>
                                                <span className="text-[10px] text-white/20 flex items-center gap-1">
                                                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString()}
                                                    {isMine && msg.readBy?.length > 0 && (
                                                        <span className="text-indigo-400 flex" title="Read">
                                                            <FiCheck className="w-2.5 h-2.5 -mr-1" /><FiCheck className="w-2.5 h-2.5" />
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <div className={`flex flex-col gap-1 mt-1 ${isMine ? 'items-end' : 'items-start'}`}>
                                                {msg.content && (
                                                    <div className={`inline-block px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-indigo-500/20 text-white rounded-tr-md' : 'bg-white/5 text-white/80 rounded-tl-md'}`}>
                                                        {msg.content.split(/(@\w+)/g).map((part, pi) =>
                                                            part.startsWith('@') ? (
                                                                <span key={pi} className="bg-indigo-500/30 text-indigo-300 px-1 rounded font-medium">{part}</span>
                                                            ) : part
                                                        )}
                                                    </div>
                                                )}
                                                {msg.attachments?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {msg.attachments.map((att, ai) => {
                                                            const isAudio = att.type?.startsWith('audio/');
                                                            const isImage = !isAudio && (att.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(att.url || ''));
                                                            const isVideo = !isAudio && !isImage && (att.type?.startsWith('video/') || /\.(mp4|webm|mov)(\?|$)/i.test(att.url || ''));
                                                            return (
                                                            <div key={ai} className="max-w-xs rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                                                {isImage ? (
                                                                    <img src={att.url} alt={att.name} className="w-full h-auto object-cover max-h-60 cursor-pointer" onClick={() => window.open(att.url, '_blank')} />
                                                                ) : isVideo ? (
                                                                    <video src={att.url} controls className="w-full h-auto max-h-60" />
                                                                ) : isAudio ? (
                                                                    <AudioPlayer src={att.url} isMine={isMine} />
                                                                ) : (
                                                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 hover:bg-white/5 transition-colors">
                                                                        <FiPaperclip className="w-4 h-4 text-indigo-400" />
                                                                        <span className="text-sm text-indigo-300 underline break-all">{att.name || 'Download File'}</span>
                                                                    </a>
                                                                )}
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {msg.reactions?.length > 0 && (
                                                    <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
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

                                            <div className={`absolute -top-3 ${isMine ? 'left-2 flex-row-reverse' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                <div className="flex items-center bg-dark-800 rounded-lg border border-white/10 shadow-xl">
                                                    <button onClick={() => setShowEmojiPicker(showEmojiPicker === msg._id ? null : msg._id)}
                                                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-colors" title="React"><FiSmile className="w-4 h-4" /></button>
                                                </div>
                                                {showEmojiPicker === msg._id && (
                                                    <div className={`absolute top-8 ${isMine ? 'left-0' : 'right-0'} z-50`}>
                                                        <div className="fixed inset-0" onClick={() => setShowEmojiPicker(null)} />
                                                        <div className="relative">
                                                            <EmojiPicker onEmojiClick={(emojiObject) => handleReaction(msg._id, emojiObject.emoji)} theme="dark" emojiStyle={EmojiStyle.NATIVE} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Typing Indicator */}
                        {selectedConvo && typingUsers[selectedConvo._id] && Object.keys(typingUsers[selectedConvo._id]).length > 0 && (
                            <TypingIndicator users={Object.values(typingUsers[selectedConvo._id]).map(u => ({ username: u }))} />
                        )}

                        {/* Input - sticky at bottom */}
                        <div className="px-4 pb-4 pt-2 relative shrink-0 bg-dark-900">
                            <div className="bg-white/5 border border-white/10 rounded-xl flex items-center px-4">
                                <button onClick={() => { setShowInputEmojiPicker(!showInputEmojiPicker); setShowGifPicker(false); }} className="text-white/20 hover:text-amber-400 transition-colors mr-2 cursor-pointer" title="Emoji">
                                    <FiSmile className="w-5 h-5" />
                                </button>
                                <button onClick={() => { setShowGifPicker(!showGifPicker); setShowInputEmojiPicker(false); }} className="text-white/20 hover:text-emerald-400 transition-colors mr-2 cursor-pointer" title="GIFs">
                                    <MdGif className="w-7 h-7" />
                                </button>
                                <FiPaperclip className="w-5 h-5 text-white/20 cursor-pointer hover:text-white transition-colors" onClick={() => fileInputRef.current?.click()} title="Attach file" />
                                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                                <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); setShowInputEmojiPicker(false); setShowGifPicker(false); } if (e.key === 'Escape') { setShowInputEmojiPicker(false); setShowGifPicker(false); } }}
                                    placeholder={`Message @${(() => { const o = getOtherUser(selectedConvo); return getDisplayName(o._id || o, o.username); })()}`}
                                    className="flex-1 bg-transparent py-3 px-3 text-sm outline-none text-white placeholder-white/30" />
                                <button onClick={handleSendMessage} className="text-white/20 hover:text-indigo-400 transition-colors"><FiSend className="w-5 h-5" /></button>
                                <VoiceRecorder onSend={async (blob) => {
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', blob, 'voice-message.webm');
                                        const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        sendMessage(selectedConvo._id, '🎤 Voice Message', 'voice_message', [{ url: data.url, type: 'audio/webm', name: 'Voice Message' }]);
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
                                                sendMessage(selectedConvo._id, '', 'file', [{ url: gifUrl, type: 'image/gif', name: 'GIF' }]);
                                                setShowGifPicker(false);
                                            }} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 relative">
                        {/* Always show hamburger menu when sidebar is closed, even on desktop empty state */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className={`absolute top-4 left-4 p-2 rounded-lg bg-dark-800 border border-white/10 text-white/70 hover:text-white transition-colors ${isSidebarOpen ? 'hidden md:hidden' : 'block'}`}
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
                            <FiMessageSquare className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white/30 mb-2">Select a conversation</h3>
                        <p className="text-sm text-white/20">Choose a friend to start chatting!</p>
                    </div>
                )}
            </div>

            {/* New DM Modal */}
            <AnimatePresence>
                {showNewDM && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowNewDM(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-dark-800 rounded-2xl border border-white/10 w-full max-w-[380px] mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="font-bold text-lg">New Message</h3>
                                <FiX className="w-5 h-5 text-white/30 cursor-pointer hover:text-white" onClick={() => setShowNewDM(false)} />
                            </div>
                            {/* Search input */}
                            <div className="px-4 pt-3 pb-1">
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by username..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none text-white placeholder-white/20 focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="p-4 max-h-80 overflow-y-auto">
                                {(() => {
                                    const filteredDMFriends = friends.filter(friend => {
                                        const f = friend.user || friend;
                                        return (f.username || '').toLowerCase().includes(searchQuery.toLowerCase());
                                    });
                                    if (friends.length === 0) return (
                                        <p className="text-sm text-white/30 text-center py-4">No friends yet. Add friends first!</p>
                                    );
                                    if (filteredDMFriends.length === 0) return (
                                        <div className="text-center py-6">
                                            <FiSearch className="w-8 h-8 mx-auto text-white/10 mb-2" />
                                            <p className="text-sm text-white/30">No friends matching &quot;{searchQuery}&quot;</p>
                                        </div>
                                    );
                                    return filteredDMFriends.map(friend => {
                                        const f = friend.user || friend;
                                        return (
                                            <div key={f._id} onClick={() => startDM(f._id)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                                                <div className="relative">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-500/60 flex items-center justify-center text-sm font-bold">
                                                        {(f.username || 'U')[0].toUpperCase()}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-800 ${f.status === 'online' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                                </div>
                                                <span className="text-sm text-white/80 font-medium">{f.username || 'Unknown'}</span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Chat Background Picker */}
                <ChatBackgroundPicker
                    isOpen={showBgPicker}
                    onClose={() => setShowBgPicker(false)}
                    currentBg={chatBg}
                    onSelectBackground={handleSelectBackground}
                />
            </AnimatePresence>

            {/* User Profile Popup */}
            <UserProfilePopup
                isOpen={!!profilePopupUser}
                onClose={() => setProfilePopupUser(null)}
                userId={profilePopupUser?.userId}
                username={profilePopupUser?.username}
                status={profilePopupUser?.status}
                bio={profilePopupUser?.bio}
                nickname={profilePopupUser ? friendMap[profilePopupUser.userId]?.nickname : null}
                customAvatar={profilePopupUser ? friendMap[profilePopupUser.userId]?.customAvatar : null}
                onNicknameChange={handleNicknameChange}
                onAvatarChange={handleFriendAvatarChange}
            />
        </div>
    );
}
