'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
    getUserProfile,
    getOrJoinModuleGroup,
    getUserGroups,
    createCustomGroup,
    addGroupMember,
    removeGroupMember,
    sendGroupMessage,
    subscribeToGroupMessages,
    getUserConnections,
    getDiscoverableGroups,
    requestToJoinGroup,
    getGroupRequests,
    approveJoinRequest,
    rejectJoinRequest,
    promoteToAdmin,
    demoteAdmin,
    blockUser, // New
    unblockUser, // New
    Group,
    UserProfile,
    GroupMessage
} from '@/lib/db';
import { uploadChatAttachment } from '@/lib/storage';
import { Loader2, Send, Users, ArrowLeft, Plus, MoreVertical, Search, Trash2, Phone, Paperclip, Image as ImageIcon, FileText, X, Globe, Bell, Shield, UserPlus, EyeOff, Lock, Megaphone, Ban } from 'lucide-react';
import Link from 'next/link';

export default function GroupsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const selectedGroup = groups.find(g => g.id === selectedGroupId) || null;

    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});

    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupType, setNewGroupType] = useState<'custom' | 'channel'>('custom'); // New

    // Discovery & View Mode
    const [viewMode, setViewMode] = useState<'chats' | 'discover'>('chats');
    const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);

    // Join Requests (Admin Only)
    const [joinRequests, setJoinRequests] = useState<{ id: string, userId: string, user?: UserProfile }[]>([]);

    // Anonymous Mode
    const [isAnonymousMode, setIsAnonymousMode] = useState(false);

    // Add Member State
    const [myConnections, setMyConnections] = useState<UserProfile[]>([]);
    const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
    const [loadingConnections, setLoadingConnections] = useState(false);

    // File Upload State
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom helper
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 1. Initial Load
    useEffect(() => {
        if (!user) return;

        const init = async () => {
            try {
                const userProfile = await getUserProfile(user.uid);
                setProfile(userProfile);

                // Ensure Module Group Exists/Joined
                if (userProfile && userProfile.college && userProfile.course && userProfile.year) {
                    await getOrJoinModuleGroup(
                        user.uid,
                        userProfile.college,
                        userProfile.course,
                        userProfile.year
                    );
                }

                // Fetch All Groups
                const myGroups = await getUserGroups(user.uid);
                setGroups(myGroups);

                if (myGroups.length > 0 && !selectedGroupId) {
                    setSelectedGroupId(myGroups[0].id);
                }
            } catch (err) {
                console.warn("Error initializing groups:", err);
            } finally {
                setLoading(false);
            }
        };

        const interval = setInterval(init, 10000); // Polling for new group additions (simplified)
        init();
        return () => clearInterval(interval);
    }, [user]);

    // 2. Subscribe to Messages
    useEffect(() => {
        if (!selectedGroupId) return;

        const unsubscribe = subscribeToGroupMessages(selectedGroupId, (msgs) => {
            setMessages(msgs);

            // Collect unknown sender IDs
            const senderIds = new Set(msgs.map(m => m.senderId));
            // Add current group members too (for the manage list)
            if (selectedGroup) {
                selectedGroup.members.forEach(id => senderIds.add(id));
            }

            const unknownSenders = Array.from(senderIds)
                .filter(id => !memberProfiles[id] && id !== user?.uid);

            if (unknownSenders.length > 0) {
                unknownSenders.forEach(id => {
                    getUserProfile(id).then(p => {
                        if (p) {
                            setMemberProfiles(prev => ({ ...prev, [id]: p }));
                        }
                    });
                });
            }
        });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGroupId, selectedGroup?.members?.length]);

    // 3. Fetch Member Profiles for Selected Group
    useEffect(() => {
        if (!selectedGroup) return;

        const fetchMissingProfiles = async () => {
            const missingIds = selectedGroup.members.filter(id => !memberProfiles[id]);
            if (missingIds.length === 0) return;

            // Fetch in parallel for speed
            await Promise.all(missingIds.map(async (id) => {
                const p = await getUserProfile(id);
                if (p) {
                    setMemberProfiles(prev => ({ ...prev, [id]: p }));
                }
            }));
        };

        fetchMissingProfiles();
    }, [selectedGroup, memberProfiles]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedGroupId || !user) return;

        try {
            await sendGroupMessage(selectedGroupId, user.uid, newMessage, undefined, 'general', isAnonymousMode);
            setNewMessage('');
            // Reset anon mode after send? Optional. Keeping it persistent is better.
        } catch (error) {
            console.warn("Failed to send message:", error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedGroupId || !user) return;

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';

        setIsUploading(true);
        try {
            const url = await uploadChatAttachment(selectedGroupId, file);
            const type = file.type.startsWith('image/') ? 'image' : 'file';

            await sendGroupMessage(selectedGroupId, user.uid, type === 'image' ? 'Image' : file.name, {
                type,
                url,
                name: file.name
            });

        } catch (error) {
            console.warn("Upload failed", error);
            alert("Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!user || !newGroupName.trim()) return;
        setLoading(true);
        try {
            // Defaulting privacy to 'private' (Invite Only) for now, could add UI toggle later
            const newGroup = await createCustomGroup(newGroupName, user.uid, newGroupType, 'private');
            setGroups(prev => [...prev, newGroup as Group]);
            setSelectedGroupId(newGroup.id);
            setShowCreateModal(false);
            setNewGroupName('');
            setNewGroupType('custom');
        } catch (error) {
            console.warn(error);
        } finally {
            setLoading(false);
        }
    };

    const loadConnections = async () => {
        if (!user || myConnections.length > 0) return;
        setLoadingConnections(true);
        try {
            const friends = await getUserConnections(user.uid);
            setMyConnections(friends);
        } catch (error) {
            console.warn(error);
        } finally {
            setLoadingConnections(false);
        }
    };

    // Fetch Discoverable Groups
    useEffect(() => {
        if (viewMode === 'discover' && user) {
            if (profile?.college) {
                getDiscoverableGroups(user.uid, profile.college).then(setDiscoverGroups);
            } else {
                getDiscoverableGroups(user.uid).then(setDiscoverGroups);
            }
        }
    }, [viewMode, user, profile]);

    // Fetch Requests if Admin
    useEffect(() => {
        if (selectedGroup && selectedGroup.admins?.includes(user?.uid || '') && showManageModal) {
            getGroupRequests(selectedGroup.id).then(setJoinRequests);
        }
    }, [selectedGroup, user, showManageModal]);

    const handleJoinRequest = async (groupId: string) => {
        if (!user) return;
        try {
            await requestToJoinGroup(groupId, user.uid);
            alert("Request sent!");
            // Remove from list visually
            setDiscoverGroups(prev => prev.filter(g => g.id !== groupId));
        } catch (e) {
            console.warn(e);
            alert("Failed to send request");
        }
    };

    const handleRequestAction = async (requestId: string, targetUserId: string, action: 'approve' | 'reject') => {
        if (!selectedGroupId) return;
        try {
            if (action === 'approve') {
                await approveJoinRequest(selectedGroupId, targetUserId);
            } else {
                await rejectJoinRequest(selectedGroupId, targetUserId);
            }
            // Remove from list
            setJoinRequests(prev => prev.filter(r => r.id !== requestId));
        } catch (e) {
            alert("Action failed");
        }
    };

    const handlePromote = async (targetId: string) => {
        if (!selectedGroupId) return;
        if (confirm("Promote to Admin?")) {
            await promoteToAdmin(selectedGroupId, targetId);
            // Refresh hack
            const myGroups = await getUserGroups(user!.uid);
            setGroups(myGroups);
            alert("Promoted!");
        }
    }

    // Block/Unblock Logic
    const handleBlockAction = async (targetId: string, isBlocked: boolean) => {
        if (!user) return;
        try {
            if (isBlocked) {
                await unblockUser(user.uid, targetId);
                alert("Unblocked user.");
            } else {
                if (confirm("Are you sure you want to block this user? They won't be able to message you.")) {
                    await blockUser(user.uid, targetId);
                    alert("Blocked user.");
                } else return;
            }
            // Refresh profile to update blocked list
            const updatedProfile = await getUserProfile(user.uid);
            setProfile(updatedProfile);
        } catch (e) {
            console.warn(e);
            alert("Action failed");
        }
    };

    // Member Search State
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    const handleAddSelectedMembers = async () => {
        if (!selectedGroupId || selectedConnections.length === 0) return;

        try {
            await Promise.all(selectedConnections.map(uid => addGroupMember(selectedGroupId, uid)));

            // Refresh
            const myGroups = await getUserGroups(user!.uid);
            setGroups(myGroups);

            // Close modals
            setShowAddMembers(false);
            setSelectedConnections([]);
            alert("Members added!");
        } catch (error) {
            alert("Error adding members");
        }
    };

    const handleRemoveMember = async (targetId: string) => {
        if (!selectedGroupId || !user) return;
        if (!confirm("Remove this member?")) return;

        try {
            console.log("Removing member:", targetId, "from group:", selectedGroupId);
            await removeGroupMember(selectedGroupId, targetId);
            // Refresh groups
            const myGroups = await getUserGroups(user.uid);
            setGroups(myGroups);
            if (targetId === user.uid) {
                setSelectedGroupId(null); // I removed myself
            } else {
                alert("Member removed");
            }
        } catch (error) {
            console.warn("Failed to remove member:", error);
            alert("Failed to remove member");
        }
    };

    if (loading && groups.length === 0) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

    const isAdmin = selectedGroup?.admins?.includes(user?.uid || '');

    const canSpeak = selectedGroup ? (selectedGroup.type !== 'channel' || isAdmin) : false;

    return (
        <div className="flex bg-background h-[calc(100vh-65px)] md:h-[calc(100vh-80px)] overflow-hidden">
            {/* Sidebar List */}
            <div className={`w-full md:w-80 border-r border-border bg-card flex flex-col ${selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {!selectedGroupId && (
                                <Link href="/network" className="p-1 hover:bg-secondary rounded-full" title="Back to Network">
                                    <ArrowLeft className="w-4 h-4" />
                                </Link>
                            )}
                            <h2 className="font-bold text-lg">Communities</h2>
                        </div>
                        <button onClick={() => setShowCreateModal(true)} className="p-2 hover:bg-secondary rounded-full">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    {/* View Switcher */}
                    <div className="flex bg-secondary/50 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('chats')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === 'chats' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            My Chats
                        </button>
                        <button
                            onClick={() => setViewMode('discover')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${viewMode === 'discover' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Discover
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {viewMode === 'chats' && groups.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground text-sm">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No groups yet.</p>
                            <button onClick={() => setViewMode('discover')} className="text-primary hover:underline mt-2">
                                Find communities?
                            </button>
                        </div>
                    )}

                    {viewMode === 'chats' && groups.map(g => (
                        <div
                            key={g.id}
                            onClick={() => setSelectedGroupId(g.id)}
                            className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors ${selectedGroupId === g.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg relative">
                                {g.icon || (g.type === 'channel' ? '📢' : '👥')}
                                {g.type === 'channel' && <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5"><Megaphone className="w-2.5 h-2.5 text-white" /></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate flex items-center gap-1">
                                    {g.name}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate">
                                    {g.lastMessage || (g.type === 'channel' ? 'No announcements' : 'No messages')}
                                </p>
                            </div>
                        </div>
                    ))}

                    {viewMode === 'discover' && (
                        <div className="space-y-2">
                            {discoverGroups.length === 0 && (
                                <div className="text-center p-8 text-muted-foreground text-sm">
                                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No active communities found.</p>
                                </div>
                            )}
                            {discoverGroups.map(g => (
                                <div key={g.id} className="p-3 rounded-xl border border-border flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-lg">
                                            {g.icon || '👥'}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-medium truncate">{g.name}</h3>
                                            <p className="text-xs text-muted-foreground">{g.members.length} members • {g.college || 'Custom'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleJoinRequest(g.id)} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90">
                                        Join
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedGroup ? (
                <div className={`flex-1 flex flex-col ${selectedGroupId ? 'flex' : 'hidden md:flex'}`}>
                    {/* Header */}
                    <div className="p-3 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedGroupId(null)} className="md:hidden p-1 -ml-1">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                                {selectedGroup.icon || (selectedGroup.type === 'channel' ? '📢' : '👥')}
                            </div>
                            <div>
                                <h2 className="font-bold text-sm md:text-base leading-none flex items-center gap-2">
                                    {selectedGroup.name}
                                    {selectedGroup.type === 'channel' && <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded border border-blue-500/20">CHANNEL</span>}
                                </h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {selectedGroup.members.length} members {selectedGroup.type === 'channel' ? '• Broadcast Only' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => {
                                setShowManageModal(true);
                                loadConnections();
                            }} className="p-2 text-muted-foreground hover:bg-secondary rounded-full">
                                {isAdmin && joinRequests.length > 0 && <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full" />}
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.filter(m => !profile?.blockedUsers?.includes(m.senderId)).map((msg) => {
                            const isMe = msg.senderId === user?.uid;
                            const senderProfile = isMe ? profile : memberProfiles[msg.senderId];

                            // Anonymous Presentation Logic
                            const displayName = msg.isAnonymous ? 'Anonymous Student' : (senderProfile?.displayName || 'Unknown');
                            const displayAvatar = msg.isAnonymous ? null : senderProfile?.photoURL;
                            const displayBadge = msg.isAnonymous ? 'Verified Student' : null; // Can enhance with Year

                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {/* Avatar */}
                                    {!isMe && (
                                        <div className={`w-6 h-6 rounded-full overflow-hidden shrink-0 mb-1 ${msg.isAnonymous ? 'bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10' : 'bg-secondary'}`}>
                                            {displayAvatar ? (
                                                <img src={displayAvatar} alt="?" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/50">
                                                    {msg.isAnonymous ? <EyeOff className="w-3 h-3" /> : (displayName?.charAt(0) || '?')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] space-y-1`}>
                                        {!isMe && (
                                            <span className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1">
                                                {displayName}
                                                {displayBadge && <span className="bg-primary/10 text-primary px-1 rounded text-[8px]">{displayBadge}</span>}
                                            </span>
                                        )}

                                        {/* Message Bubble */}
                                        <div
                                            className={`px-3 py-2 rounded-2xl text-sm ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-secondary text-secondary-foreground rounded-bl-none'
                                                } ${msg.isAnonymous ? 'border border-primary/20' : ''}`}
                                        >
                                            {msg.type === 'image' && msg.fileUrl ? (
                                                <div className="mb-1">
                                                    <img src={msg.fileUrl} alt="uploaded" className="max-w-full rounded-lg max-h-48 object-cover" />
                                                </div>
                                            ) : msg.type === 'file' && msg.fileUrl ? (
                                                <div className="flex items-center gap-2 p-1">
                                                    <div className="bg-background/20 p-2 rounded-lg">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="truncate font-medium">{msg.fileName || 'File'}</span>
                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-80 hover:opacity-100 truncate">
                                                            Download
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                msg.text
                                            )}
                                        </div>
                                        <span className={`text-[9px] text-muted-foreground ${isMe ? 'mr-1' : 'ml-1'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    {canSpeak ? (
                        <div className="p-3 border-t border-border bg-background">
                            {isUploading && (
                                <div className="text-xs text-primary mb-2 text-center flex items-center justify-center gap-2">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                                </div>
                            )}
                            <form onSubmit={handleSend} className="flex gap-2 items-center max-w-3xl mx-auto">
                                {/* Attachments */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary transition-colors"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsAnonymousMode(!isAnonymousMode)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isAnonymousMode ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
                                    title="Toggle Anonymous Mode"
                                >
                                    {isAnonymousMode ? <EyeOff className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                                </button>

                                <input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={isAnonymousMode ? "Type anonymously..." : "Message..."}
                                    className="flex-1 bg-secondary/50 border-0 focus:ring-1 focus:ring-primary rounded-full px-4 h-10 text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                                >
                                    <Send className="w-4 h-4 ml-0.5" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground border-t border-border bg-background/50">
                            <Lock className="w-4 h-4 inline-block mr-1 mb-0.5" /> Only admins can post in this channel.
                        </div>
                    )}
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
                    Select a community to start chatting
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-sm rounded-xl p-6 shadow-xl border border-border">
                        <h2 className="text-xl font-bold mb-4">Create New Community</h2>

                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setNewGroupType('custom')}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${newGroupType === 'custom' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-secondary'}`}
                            >
                                <Users className="w-4 h-4 mx-auto mb-1" />
                                Group Chat
                            </button>
                            <button
                                onClick={() => setNewGroupType('channel')}
                                className={`flex-1 py-2 rounded-lg border text-sm font-medium ${newGroupType === 'channel' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-secondary'}`}
                            >
                                <Megaphone className="w-4 h-4 mx-auto mb-1" />
                                Channel
                            </button>
                        </div>

                        <input
                            className="w-full bg-secondary px-3 py-2 rounded-md mb-4"
                            placeholder={newGroupType === 'channel' ? "Channel Name (e.g. Campus News)" : "Group Name (e.g. Study Buddies)"}
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-md">Cancel</button>
                            <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Modal */}
            {showManageModal && selectedGroup && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-md rounded-xl p-6 shadow-xl border border-border max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Manage {selectedGroup.type === 'channel' ? 'Channel' : 'Group'}</h2>
                            <button onClick={() => setShowManageModal(false)} className="text-muted-foreground hover:text-foreground">Done</button>
                        </div>

                        {/* Join Requests - ADMIN ONLY */}
                        {isAdmin && joinRequests.length > 0 && (
                            <div className="mb-6 p-3 bg-secondary/30 rounded-xl border border-border">
                                <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Join Requests</h3>
                                <div className="space-y-2">
                                    {joinRequests.map(req => (
                                        <div key={req.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px]">{req.user?.displayName?.[0]}</div>
                                                <span className="text-sm font-medium">{req.user?.displayName}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleRequestAction(req.id, req.userId, 'reject')} className="px-2 py-1 text-xs bg-red-500/10 text-red-500 rounded hover:bg-red-500/20">Reject</button>
                                                <button onClick={() => handleRequestAction(req.id, req.userId, 'approve')} className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded hover:bg-green-500/20">Accept</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add Members Button */}
                        <div className="mb-6">
                            <button
                                onClick={() => setShowAddMembers(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors"
                            >
                                <UserPlus className="w-5 h-5" />
                                Add Participants
                            </button>
                        </div>

                        <h3 className="text-sm font-semibold mb-2">Members ({selectedGroup.members.length})</h3>

                        {/* Member Search */}
                        <div className="relative mb-2">
                            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                                className="w-full bg-secondary pl-8 pr-3 py-2 rounded-lg text-sm"
                                placeholder="Search members..."
                                value={memberSearchQuery}
                                onChange={e => setMemberSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2">
                            {selectedGroup.members
                                .filter(mid => {
                                    if (!memberSearchQuery) return true;
                                    const p = memberProfiles[mid];
                                    return p?.displayName?.toLowerCase().includes(memberSearchQuery.toLowerCase());
                                })
                                .map(memberId => {
                                    const p = memberProfiles[memberId];
                                    const isMemberAdmin = selectedGroup.admins?.includes(memberId);
                                    const isBlocked = profile?.blockedUsers?.includes(memberId);

                                    return (
                                        <div key={memberId} className="flex justify-between items-center p-2 rounded-lg bg-secondary/30">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                                    {p?.displayName?.charAt(0) || '?'}
                                                </div>
                                                <div className="text-sm">
                                                    <p className="font-medium leading-none flex items-center gap-1">
                                                        {p?.displayName || 'Loading...'}
                                                        {isMemberAdmin && <Shield className="w-3 h-3 text-primary" />}
                                                        {isBlocked && <span className="text-[9px] bg-red-500/10 text-red-500 px-1 rounded">BLOCKED</span>}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">{memberId.slice(0, 6)}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-1">
                                                {/* Block Action (available to everyone against others) */}
                                                {memberId !== user?.uid && (
                                                    <button
                                                        onClick={() => handleBlockAction(memberId, !!isBlocked)}
                                                        className={`p-1.5 rounded-md ${isBlocked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-secondary'}`}
                                                        title={isBlocked ? "Unblock" : "Block"}
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {/* Admin Actions */}
                                                {isAdmin && memberId !== user?.uid && (
                                                    <>
                                                        {!isMemberAdmin && (
                                                            <button onClick={() => handlePromote(memberId)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md" title="Promote to Admin">
                                                                <Shield className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemoveMember(memberId)}
                                                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                            <button
                                onClick={() => handleRemoveMember(user!.uid)}
                                className="w-full py-2.5 text-red-500 font-medium hover:bg-red-500/5 rounded-lg flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Leave {selectedGroup.type === 'channel' ? 'Channel' : 'Group'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Selection Modal */}
            {showAddMembers && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-sm rounded-xl p-6 shadow-xl border border-border flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                            <h2 className="text-xl font-bold">Add Participants</h2>
                            <button onClick={() => setShowAddMembers(false)}><X className="w-6 h-6" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                            {loadingConnections ? (
                                <div className="text-center py-4 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading friends...</div>
                            ) : myConnections.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No accepted connections found.</p>
                                    <p className="text-xs mt-1">Connect with more people first!</p>
                                </div>
                            ) : (
                                myConnections.map(friend => {
                                    const isSelected = selectedConnections.includes(friend.uid);
                                    const isAlreadyInGroup = selectedGroup?.members.includes(friend.uid);

                                    if (isAlreadyInGroup) return null;

                                    return (
                                        <div
                                            key={friend.uid}
                                            onClick={() => {
                                                if (isSelected) setSelectedConnections(prev => prev.filter(id => id !== friend.uid));
                                                else setSelectedConnections(prev => [...prev, friend.uid]);
                                            }}
                                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-secondary'}`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                                {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover" /> : friend.displayName[0]}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{friend.displayName}</p>
                                                <p className="text-xs text-muted-foreground">{friend.college}</p>
                                            </div>
                                            {isSelected && <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs">✓</div>}
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <button
                            onClick={handleAddSelectedMembers}
                            disabled={selectedConnections.length === 0}
                            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl disabled:opacity-50"
                        >
                            Add {selectedConnections.length > 0 ? `${selectedConnections.length} Selected` : ''}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
