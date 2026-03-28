'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiUsers, FiEdit2, FiLink, FiAlertTriangle, FiX, FiCopy, FiCheck, FiChevronDown, FiTrash2, FiShield, FiStar } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const TABS = [
    { id: 'overview', label: 'Overview', icon: FiSettings },
    { id: 'members', label: 'Members', icon: FiUsers },
    { id: 'nicknames', label: 'Nicknames', icon: FiEdit2 },
    { id: 'invites', label: 'Invites', icon: FiLink },
    { id: 'danger', label: 'Danger Zone', icon: FiAlertTriangle },
];

const ROLE_COLORS = {
    owner: 'text-amber-400',
    admin: 'text-red-400',
    moderator: 'text-indigo-400',
    member: 'text-white/40',
};

const ROLE_LABELS = {
    owner: '👑 Owner',
    admin: '🛡️ Admin',
    moderator: '⚔️ Moderator',
    member: 'Member',
};

export default function ServerSettingsModal({ server, user, onClose, onServerUpdate, onServerDelete, onLeaveServer }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Overview state
    const [serverName, setServerName] = useState(server?.name || '');
    const [serverDesc, setServerDesc] = useState(server?.description || '');
    const [isPublic, setIsPublic] = useState(server?.isPublic || false);
    const [saving, setSaving] = useState(false);

    // Members state
    const [roleDropdownUser, setRoleDropdownUser] = useState(null);

    // Nicknames state
    const [nicknames, setNicknames] = useState({});
    const [savingNickname, setSavingNickname] = useState(null);

    // Invites state
    const [copied, setCopied] = useState(false);

    // Danger state
    const [deleteConfirm, setDeleteConfirm] = useState('');

    const myMember = server?.members?.find(m => m.user?._id === user?._id);
    const myRole = myMember?.role || 'member';
    const isOwner = myRole === 'owner';
    const isAdmin = ['owner', 'admin'].includes(myRole);

    useEffect(() => {
        if (server) {
            setServerName(server.name || '');
            setServerDesc(server.description || '');
            setIsPublic(server.isPublic || false);
            // Init nicknames
            const nicks = {};
            server.members?.forEach(m => { nicks[m.user?._id] = m.nickname || ''; });
            setNicknames(nicks);
        }
    }, [server]);

    // ── Save Overview ──
    const saveOverview = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/servers/${server._id}`, { name: serverName, description: serverDesc, isPublic });
            toast.success('Server updated!');
            onServerUpdate?.(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update');
        }
        setSaving(false);
    };

    // ── Change Member Role ──
    const changeRole = async (userId, newRole) => {
        try {
            await api.put(`/servers/${server._id}/members/role`, { userId, role: newRole });
            toast.success(`Role updated to ${newRole}`);
            setRoleDropdownUser(null);
            onServerUpdate?.({ ...server, members: server.members.map(m => m.user?._id === userId ? { ...m, role: newRole } : m) });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change role');
        }
    };

    // ── Kick Member ──
    const kickMember = async (userId) => {
        try {
            await api.delete(`/servers/${server._id}/members/${userId}`);
            toast.success('Member kicked');
            onServerUpdate?.({ ...server, members: server.members.filter(m => m.user?._id !== userId) });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to kick');
        }
    };

    // ── Save Nickname ──
    const saveNickname = async (userId) => {
        setSavingNickname(userId);
        try {
            await api.put(`/servers/${server._id}/members/nickname`, { userId, nickname: nicknames[userId] || '' });
            toast.success('Nickname updated!');
            onServerUpdate?.({ ...server, members: server.members.map(m => m.user?._id === userId ? { ...m, nickname: nicknames[userId] || '' } : m) });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update nickname');
        }
        setSavingNickname(null);
    };

    // ── Copy Invite ──
    const copyInvite = () => {
        navigator.clipboard?.writeText(server?.inviteCode || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Delete Server ──
    const handleDelete = async () => {
        try {
            await api.delete(`/servers/${server._id}`);
            toast.success('Server deleted');
            onServerDelete?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        }
    };

    // ── Leave Server ──
    const handleLeave = async () => {
        try {
            await api.post(`/servers/${server._id}/leave`);
            toast.success('Left server');
            onLeaveServer?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to leave');
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'overview': return (
                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Server Name</label>
                        <input value={serverName} onChange={e => setServerName(e.target.value)} disabled={!isAdmin}
                            className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-colors disabled:opacity-50" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 block">Description</label>
                        <textarea value={serverDesc} onChange={e => setServerDesc(e.target.value)} disabled={!isAdmin} rows={3}
                            className="w-full bg-dark-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500/50 focus:outline-none transition-colors resize-none disabled:opacity-50" />
                    </div>
                    <div className="flex items-center justify-between bg-dark-950 border border-white/10 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-white">Public Server</p>
                            <p className="text-xs text-white/30">Anyone can discover and join</p>
                        </div>
                        <button onClick={() => isAdmin && setIsPublic(!isPublic)} disabled={!isAdmin}
                            className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-indigo-500' : 'bg-white/10'} disabled:opacity-50`}>
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isPublic ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <div className="bg-dark-950 border border-white/10 rounded-xl px-4 py-3">
                        <p className="text-xs text-white/40 mb-1">Invite Code</p>
                        <div className="flex items-center gap-2">
                            <code className="text-sm text-indigo-400 font-mono">{server?.inviteCode || '—'}</code>
                            <button onClick={copyInvite} className="text-white/30 hover:text-white transition-colors">
                                {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/20">
                        <span>Owner: <strong className="text-white/50">{server?.owner?.username || '—'}</strong></span>
                        <span>•</span>
                        <span>{server?.members?.length || 0} members</span>
                        <span>•</span>
                        <span>Created {server?.createdAt ? new Date(server.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                    {isAdmin && (
                        <button onClick={saveOverview} disabled={saving}
                            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div>
            );

            case 'members': return (
                <div className="space-y-2">
                    <p className="text-xs text-white/30 mb-3">{server?.members?.length || 0} members</p>
                    {server?.members?.map((m) => (
                        <div key={m.user?._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-950/50 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                                style={{ backgroundColor: m.user?.accentColor || '#6366f1' }}>
                                {m.user?.avatar?.url ? <img src={m.user.avatar.url} alt="" className="w-full h-full rounded-full object-cover" /> : (m.user?.username?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{m.nickname || m.user?.username || 'User'}</p>
                                <p className={`text-[10px] font-medium ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</p>
                            </div>
                            {/* Role + Kick controls (only for admin/owner, not for self or owner target) */}
                            {isAdmin && m.user?._id !== user?._id && m.role !== 'owner' && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className="relative">
                                        <button onClick={() => setRoleDropdownUser(roleDropdownUser === m.user?._id ? null : m.user?._id)}
                                            className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white/40 hover:text-white transition-colors flex items-center gap-1">
                                            Role <FiChevronDown className="w-3 h-3" />
                                        </button>
                                        {roleDropdownUser === m.user?._id && (
                                            <div className="absolute right-0 top-8 w-36 bg-dark-800 border border-white/10 rounded-xl shadow-2xl z-10 p-1">
                                                {['admin', 'moderator', 'member'].map(r => (
                                                    <button key={r} onClick={() => changeRole(m.user?._id, r)}
                                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${m.role === r ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                                                        {ROLE_LABELS[r]}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => kickMember(m.user?._id)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors" title="Kick">
                                        <FiTrash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            );

            case 'nicknames': return (
                <div className="space-y-3">
                    <p className="text-xs text-white/30 mb-2">Set custom nicknames for members in this server</p>
                    {!isAdmin && <p className="text-xs text-amber-400/70 bg-amber-500/10 px-3 py-2 rounded-lg">Only admins and the owner can change nicknames.</p>}
                    {server?.members?.map((m) => (
                        <div key={m.user?._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-dark-950/50 border border-white/5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: m.user?.accentColor || '#6366f1' }}>
                                {(m.user?.username?.[0] || 'U').toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/30 truncate">{m.user?.username}</p>
                                <input
                                    value={nicknames[m.user?._id] || ''}
                                    onChange={e => setNicknames(p => ({ ...p, [m.user?._id]: e.target.value }))}
                                    placeholder="No nickname"
                                    disabled={!isAdmin}
                                    className="w-full bg-transparent text-sm text-white placeholder:text-white/15 focus:outline-none disabled:opacity-40"
                                />
                            </div>
                            {isAdmin && (
                                <button onClick={() => saveNickname(m.user?._id)} disabled={savingNickname === m.user?._id}
                                    className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-400 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50 flex-shrink-0">
                                    {savingNickname === m.user?._id ? '...' : 'Save'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            );

            case 'invites': return (
                <div className="space-y-4">
                    <div className="bg-dark-950 border border-white/10 rounded-xl p-4">
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Permanent Invite Code</p>
                        <div className="flex items-center gap-3">
                            <code className="flex-1 bg-dark-900 px-3 py-2 rounded-lg text-sm text-indigo-400 font-mono border border-white/5">{server?.inviteCode || '—'}</code>
                            <button onClick={copyInvite}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}>
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                    {server?.inviteLinks?.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Invite Links</p>
                            <div className="space-y-2">
                                {server.inviteLinks.map((link, i) => (
                                    <div key={i} className="flex items-center justify-between bg-dark-950/50 border border-white/5 rounded-xl px-3 py-2">
                                        <code className="text-xs text-white/50 font-mono">{link.code}</code>
                                        <div className="flex items-center gap-2 text-[10px] text-white/20">
                                            <span>{link.uses} uses</span>
                                            {link.maxUses > 0 && <span>/ {link.maxUses} max</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );

            case 'danger': return (
                <div className="space-y-4">
                    {!isOwner && (
                        <div className="bg-dark-950 border border-amber-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-amber-400 mb-1">Leave Server</h3>
                            <p className="text-xs text-white/30 mb-3">You will lose access to all channels.</p>
                            <button onClick={handleLeave}
                                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-xs font-medium transition-colors">
                                Leave Server
                            </button>
                        </div>
                    )}
                    {isOwner && (
                        <div className="bg-dark-950 border border-red-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-red-400 mb-1">Delete Server</h3>
                            <p className="text-xs text-white/30 mb-3">This action is permanent and cannot be undone. All channels and messages will be deleted.</p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                                    placeholder={`Type "${server?.name}" to confirm`}
                                    className="flex-1 bg-dark-900 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500/50 focus:outline-none" />
                                <button onClick={handleDelete} disabled={deleteConfirm !== server?.name}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap">
                                    Delete Server
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );

            default: return null;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-[720px] max-h-[85vh] overflow-hidden shadow-2xl flex flex-col sm:flex-row"
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar — hidden on mobile, shown via hamburger */}
                <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-48 bg-dark-900 border-b sm:border-b-0 sm:border-r border-white/5 flex-shrink-0`}>
                    <div className="px-4 py-4 border-b border-white/5">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-white/30">Server Settings</h2>
                        <p className="text-sm font-semibold text-white truncate mt-1">{server?.name}</p>
                    </div>
                    <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                        {TABS.map(tab => {
                            if (tab.id === 'danger' && !isAdmin && !isOwner) return null;
                            if (tab.id === 'nicknames' && !isAdmin) return null;
                            const Icon = tab.icon;
                            return (
                                <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMobileSidebarOpen(false); }}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0">
                    {/* Header */}
                    <div className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
                        {/* Mobile tab toggle */}
                        <button onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} className="sm:hidden p-1.5 rounded-lg hover:bg-white/10 text-white/40 mr-2">
                            <FiSettings className="w-4 h-4" />
                        </button>
                        <h3 className="text-sm font-semibold text-white capitalize flex-1">{activeTab === 'danger' ? 'Danger Zone' : activeTab}</h3>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors">
                            <FiX className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                        {renderTabContent()}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
