'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Group, createChannel, Channel } from '@/lib/db'; // Import Channel related
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2, Users, ArrowLeft, UserPlus, Phone, Video, Hash, Plus, Settings, Menu, X, Volume2, Sparkles, XCircle } from 'lucide-react';

import Link from 'next/link';
import { UserProfile, sendGroupMessage } from '@/lib/db';
import ChatInput from '@/components/chat-input';
import MessageItem from '@/components/message-item';
import { useCall } from '@/lib/call-context';
import { cn } from '@/lib/utils';

export default function GroupChatPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const groupId = typeof params.id === 'string' ? params.id : params.id?.[0];

    // Summary State
    const [summary, setSummary] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);

    const handleSummarize = () => {
        toast.info("Coming Soon!", {
            description: "AI Chat Summary feature will be available in a future update."
        });
    };

    // Group & Channel State
    const [group, setGroup] = useState<Group | null>(null);
    const [activeChannelId, setActiveChannelId] = useState('general');
    const [channels, setChannels] = useState<Channel[]>([]);

    // Messages State
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar
    const [membersModalOpen, setMembersModalOpen] = useState(false);
    const [memberProfiles, setMemberProfiles] = useState<UserProfile[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Channel Creation
    const [createChannelOpen, setCreateChannelOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');

    useEffect(() => {
        if (!user || !groupId) return;

        // Subscribe to Group Details
        const groupRef = doc(db, 'groups', groupId);
        const unsubGroup = onSnapshot(groupRef, async (docSnap) => {
            if (docSnap.exists()) {
                const groupData = docSnap.data() as Group;
                setGroup(groupData);

                // Initialize Channels
                const defaultChannels: Channel[] = [
                    { id: 'general', name: 'General', type: 'text' },
                    ...(groupData.channels || [])
                ];
                // Remove duplicates based on ID just in case
                const uniqueChannels = defaultChannels.filter((c, index, self) =>
                    index === self.findIndex((t) => (t.id === c.id))
                );

                setChannels(uniqueChannels);
                setLoading(false);

                // Load members if needed (lazy load usually better but keeping existing logic)
                if (groupData.members?.length > 0) {
                    loadMembers(groupData.members);
                }
            } else {
                router.push('/groups');
            }
        }, (err) => {
            console.error("[Groups] Group details error:", err);
            setLoading(false);
            if (err.code === 'permission-denied') {
                toast.error("You don't have permission to access this group.");
                router.push('/groups');
            }
        });

        // Subscribe to Messages (Filtered by Channel)
        const messagesRef = collection(db, 'groups', groupId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(msg => {
                    const msgCh = msg.channelId || 'general';
                    return msgCh === activeChannelId;
                });

            setMessages(msgs);
            setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }, (err) => {
            console.error("[Groups] Messages error:", err);
        });

        return () => {
            unsubGroup();
            unsubMessages();
        };
    }, [user, groupId, router, activeChannelId]);

    const loadMembers = async (memberIds: string[]) => {
        setLoadingMembers(true);
        try {
            const { getUserProfile } = await import('@/lib/db');
            const profiles = await Promise.all(
                memberIds.map(async (uid) => {
                    const p = await getUserProfile(uid);
                    return p || { uid, displayName: 'Unknown User' } as UserProfile;
                })
            );
            setMemberProfiles(profiles.filter(p => !!p));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMembers(false);
        }
    };

    const handleSend = async (text: string, attachment?: any) => {
        if (!user || !groupId) return;
        await sendGroupMessage(groupId, user.uid, text, attachment, activeChannelId);
    };

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupId || !newChannelName.trim()) return;
        try {
            await createChannel(groupId, newChannelName, 'text');
            setNewChannelName('');
            setCreateChannelOpen(false);
        } catch (error) {
            console.error(error);
            alert("Failed to create channel");
        }
    };

    // ... Existing Invite/Search handlers ...
    const handleSearch = async (queryText: string) => {
        setSearchQuery(queryText);
        if (!queryText.trim() || queryText.length < 2) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const { getUsers } = await import('@/lib/db');
            const allUsers = await getUsers(undefined, {});
            const q = queryText.toLowerCase();
            const filtered = allUsers.filter((u: any) =>
                (u.displayName?.toLowerCase().includes(q) || u.college?.toLowerCase().includes(q)) &&
                !group?.members.includes(u.uid)
            );
            setSearchResults(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
    };

    const handleInvite = async (friendId: string) => {
        if (!group) return;
        try {
            const { addMemberToGroup } = await import('@/lib/groups');
            await addMemberToGroup(group.id, friendId);
            setSearchResults(prev => prev.filter(f => f.uid !== friendId));
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!group || !groupId) return;
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            const { removeMemberFromGroup } = await import('@/lib/groups');
            await removeMemberFromGroup(groupId, memberId);
        } catch (error) {
            console.error(error);
            alert("Failed to remove member");
        }
    }


    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!group) return null;

    const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
    const isAdmin = group.admins?.includes(user?.uid || '');

    return (
        <div className="flex h-[calc(100vh-113px)] max-w-7xl mx-auto bg-background border-x border-border relative overflow-hidden">

            {/* Summary Modal */}
            {summary && (
                <div className="absolute inset-0 z-[60] bg-background/95 backdrop-blur flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 fill-white" />
                                <h3 className="font-bold">Chat Summary</h3>
                            </div>
                            <button onClick={() => setSummary(null)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto prose dark:prose-invert prose-sm max-w-none">
                            <div className="whitespace-pre-wrap">{summary}</div>
                        </div>
                        <div className="p-4 border-t border-border bg-secondary/50 flex justify-end">
                            <button onClick={() => setSummary(null)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Channels Sidebar */}
            <div className={cn(
                "absolute inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transition-transform transform lg:relative lg:translate-x-0 flex flex-col",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold truncate">{group.name}</h2>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                    {/* PC Settings Link? */}
                    <button className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hidden lg:block" title="Settings">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>

                {/* Channels List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <div className="flex items-center justify-between px-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <span>Channels</span>
                        {isAdmin && (
                            <button onClick={() => setCreateChannelOpen(true)} className="hover:text-foreground">
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {channels.map(channel => (
                        <button
                            key={channel.id}
                            onClick={() => {
                                setActiveChannelId(channel.id);
                                setSidebarOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                activeChannelId === channel.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            {channel.type === 'announcement' ? <Volume2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                            {channel.name}
                        </button>
                    ))}
                </div>

                {/* Members Footer Link */}
                <div className="p-3 border-t border-border mt-auto">
                    <button
                        onClick={() => setMembersModalOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                        <Users className="w-4 h-4" />
                        <span>Members ({group.members.length})</span>
                    </button>
                    <button
                        onClick={() => setInviteModalOpen(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors mt-1"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Friends</span>
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background">
                {/* Chat Header */}
                <div className="h-14 border-b border-border flex items-center px-4 gap-3 bg-background/95 backdrop-blur z-10 sticky top-0">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-muted-foreground hover:bg-secondary rounded-full -ml-2">
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        {activeChannel?.type === 'announcement' ? <Volume2 className="w-5 h-5 text-primary" /> : <Hash className="w-5 h-5 text-muted-foreground" />}
                        <h3 className="font-bold">{activeChannel?.name || 'Loading...'}</h3>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={handleSummarize}
                            disabled={summarizing}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${summarizing ? 'bg-secondary text-muted-foreground animate-pulse' : 'hover:bg-secondary text-indigo-500'}`}
                            title="Summarize Chat"
                        >
                            {summarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            <span className="font-semibold">AI Chat Summary</span>
                        </button>

                        <div className="w-px h-6 bg-border mx-1" />

                        {/* Placeholder Call Buttons */}
                        <div className="flex gap-1">
                            <button className="p-2 text-muted-foreground hover:bg-secondary rounded-full opacity-50"><Phone className="w-4 h-4" /></button>
                            <button className="p-2 text-muted-foreground hover:bg-secondary rounded-full opacity-50"><Video className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/5">
                    {messages.map((msg, idx) => {
                        const isMe = msg.senderId === user?.uid;
                        const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                        return (
                            <MessageItem
                                key={msg.id || idx}
                                message={msg}
                                isMe={isMe}
                                showHeader={showHeader}
                            />
                        );
                    })}
                    <div ref={scrollRef} />
                </div>

                {/* Input */}
                <ChatInput
                    onSendMessage={handleSend}
                    uploadPath={`groups/${groupId}`}
                    lastMessage={(messages.length > 0 && user && messages[messages.length - 1].senderId !== user.uid) ? messages[messages.length - 1].text : undefined}
                    context={`Group Chat: ${group?.name}`}
                />
            </div>

            {/* Modals reuse keeping minimal changes logic */}
            {createChannelOpen && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card w-full max-w-sm rounded-xl border border-border p-6 shadow-xl animate-in zoom-in-95">
                        <h3 className="font-bold text-lg mb-4">Create Channel</h3>
                        <form onSubmit={handleCreateChannel}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Channel Name (e.g. homework)"
                                value={newChannelName}
                                onChange={e => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-2 mb-4 focus:ring-1 focus:ring-primary outline-none"
                            />
                            <div className="flex gap-2 justify-end">
                                <button type="button" onClick={() => setCreateChannelOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg">Cancel</button>
                                <button type="submit" disabled={!newChannelName} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invite Modal & Members Modal (Reused) */}
            {inviteModalOpen && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border w-full max-w-sm rounded-xl shadow-xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-border flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold">Add Members</h3>
                                <button onClick={() => setInviteModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                            <div className="relative">
                                <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by name or college..."
                                    className="w-full bg-secondary/50 border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {searching ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin w-5 h-5" /></div>
                            ) : searchResults.length > 0 ? (
                                <div className="space-y-1">
                                    {searchResults.map((u) => (
                                        <div key={u.uid} className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    {u.photoURL ? (
                                                        <img src={u.photoURL} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold">{u.displayName?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{u.displayName}</span>
                                                    <span className="text-[10px] text-muted-foreground">{u.college}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleInvite(u.uid)}
                                                className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-sm text-muted-foreground p-4">Type to search users...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {membersModalOpen && (
                <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border w-full max-w-sm rounded-xl shadow-xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-bold">Group Members</h3>
                            <button onClick={() => setMembersModalOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingMembers ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin w-5 h-5" /></div>
                            ) : (
                                <div className="space-y-1">
                                    {memberProfiles.map((member) => (
                                        <div key={member.uid} className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                                    <span className="text-xs font-bold">{member.displayName?.charAt(0)}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-sm font-medium">{member.displayName}</span>
                                                        {group.admins?.includes(member.uid) && <span className="text-[9px] bg-yellow-500/20 text-yellow-600 px-1 rounded">Admin</span>}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground">{member.college}</span>
                                                </div>
                                            </div>
                                            {user && group.admins?.includes(user.uid) && user.uid !== member.uid && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.uid)}
                                                    className="px-2 py-1 text-destructive hover:bg-destructive/10 text-xs rounded font-medium"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
