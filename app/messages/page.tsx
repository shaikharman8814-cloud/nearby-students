'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUserConversations, getUserProfile } from '@/lib/db';
import { VenetianMask, Flame } from 'lucide-react';
import { ChatListSkeleton } from '@/components/ui/skeleton-loaders';
import { FadeIn } from '@/components/ui/fade-in';
import { useNetworkStatus } from '@/lib/hooks/use-network-status';
import Link from 'next/link';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';

export default function MessagesPage() {
    const { user } = useAuth();
    const { isSlow } = useNetworkStatus();
    const [conversations, setConversations] = useState<any[]>([]);
    const [callLogs, setCallLogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'chats' | 'calls'>('chats');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // CACHE STRATEGY: Instant Load
        const CACHE_KEY = `sone_messages_cache_${user.uid}`;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setConversations(parsed);
                    setLoading(false); // INSTANT LOAD
                }
            }
        } catch (e) {
            console.warn("Failed to load cached messages", e);
        }

        // Safety timeout: Never block the screen for more than 3 seconds
        const timeout = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.warn("[Messages] Messages load timed out");
                    return false;
                }
                return current;
            });
        }, 3000);

        const q = query(
            collection(db, 'connections'),
            where('users', 'array-contains', user.uid),
            where('status', '==', 'accepted')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            clearTimeout(timeout);
            const newConversations = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const otherUserId = data.users.find((u: string) => u !== user.uid);

                let otherUser = null;
                if (otherUserId) {
                    otherUser = await getUserProfile(otherUserId);
                }

                return {
                    id: docSnap.id,
                    ...data,
                    otherUser
                };
            }));

            newConversations.sort((a, b) => { // @ts-ignore
                return new Date(b.lastMessageTimestamp || 0).getTime() - new Date(a.lastMessageTimestamp || 0).getTime();
            });

            setConversations(newConversations);
            setLoading(false);

            // Update Cache
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(newConversations));
            } catch (e) { }
        }, (err) => {
            clearTimeout(timeout);
            console.warn("Messages list error:", err);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [user]);

    // CALLS FETCHER
    useEffect(() => {
        if (!user) return;

        const callsRef = collection(db, 'call_logs');
        const qFrom = query(callsRef, where('fromUser', '==', user.uid));
        const qTo = query(callsRef, where('toUser', '==', user.uid));

        const callsMap = new Map();
        let timeout: any;

        const processCalls = async () => {
            const result = Array.from(callsMap.values());
            result.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());

            // Enrich
            const enriched = await Promise.all(result.map(async (c) => {
                const otherId = c.fromUser === user.uid ? c.toUser : c.fromUser;
                const profile = await getUserProfile(otherId);
                return { ...c, otherUser: profile };
            }));

            setCallLogs(enriched);
        };

        const debouncedProcess = () => {
            clearTimeout(timeout);
            timeout = setTimeout(processCalls, 100);
        };

        const unsubFrom = onSnapshot(qFrom, (snap) => {
            snap.docChanges().forEach(change => {
                if (change.type === 'removed') callsMap.delete(change.doc.id);
                else callsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            });
            debouncedProcess();
        }, () => { });

        const unsubTo = onSnapshot(qTo, (snap) => {
            snap.docChanges().forEach(change => {
                if (change.type === 'removed') callsMap.delete(change.doc.id);
                else callsMap.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
            });
            debouncedProcess();
        }, () => { });

        return () => {
            unsubFrom();
            unsubTo();
            clearTimeout(timeout);
        };
    }, [user]);

    if (loading) return <ChatListSkeleton />;

    return (
        <div className="max-w-2xl mx-auto p-4 lg:p-8">
            <h1 className="text-2xl font-bold mb-4 text-foreground">Messages</h1>

            <div className="flex bg-secondary/30 p-1 rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'chats' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Chats
                </button>
                <button
                    onClick={() => setActiveTab('calls')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'calls' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Calls
                </button>
            </div>

            <div className="space-y-2">
                {activeTab === 'chats' ? (
                    conversations.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-border">
                            <p className="text-muted-foreground mb-4">No conversations yet.</p>
                            <Link href="/network">
                                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                                    Find people to chat with
                                </button>
                            </Link>
                        </div>
                    ) : (
                        <FadeIn show={!loading}>
                            <div className="space-y-2">
                                {conversations.map(chat => {
                                    const isUnread = chat[`unread_${user?.uid}`] === true;
                                    const isAnonymous = chat.lastMessageIsAnonymous && chat.lastMessageSenderId !== user?.uid;
                                    const displayPhoto = isAnonymous ? null : chat.otherUser?.photoURL;
                                    const displayName = isAnonymous ? 'Anonymous Student' : (chat.otherUser?.displayName || 'Student');
                                    const displayInitial = isAnonymous ? '?' : (chat.otherUser?.displayName?.charAt(0) || 'S');

                                    const getDateDisplay = (timestamp: string) => {
                                        if (!timestamp) return '';
                                        const date = new Date(timestamp);
                                        const now = new Date();
                                        const isToday = date.toDateString() === now.toDateString();
                                        return isToday
                                            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : date.toLocaleDateString();
                                    };

                                    return (
                                        <Link key={chat.id} href={`/messages/${chat.id}`}>
                                            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card border-border hover:bg-muted/50'}`}>
                                                <div className="relative">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-border ${isAnonymous ? 'bg-zinc-800 text-zinc-400' : 'bg-secondary text-primary'}`}>
                                                        {isAnonymous ? (
                                                            <VenetianMask className="w-6 h-6" />
                                                        ) : displayPhoto ? (
                                                            <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            displayInitial
                                                        )}
                                                    </div>
                                                    {isUnread && (
                                                        <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <h3 className={`truncate ${isUnread ? 'font-bold text-foreground' : 'font-semibold text-zinc-700 dark:text-zinc-200'}`}>
                                                            {displayName}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            {chat.streak > 0 && (
                                                                <div className="flex items-center gap-0.5 text-orange-500 font-bold text-xs" title={`${chat.streak} Day Streak!`}>
                                                                    <Flame className="w-3.5 h-3.5 fill-orange-500" />
                                                                    {chat.streak}
                                                                </div>
                                                            )}
                                                            {chat.lastMessageTimestamp && (
                                                                <span className={`text-xs ${isUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                                                    {getDateDisplay(chat.lastMessageTimestamp)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm truncate ${isUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                                        {chat.lastMessage || "Start a conversation"}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </FadeIn>
                    )) : (
                    callLogs.length === 0 ? (
                        <div className="text-center py-12 bg-card rounded-xl border border-border">
                            <p className="text-muted-foreground mb-4">No recent calls.</p>
                            <div className="flex justify-center p-4">
                                <Phone className="w-12 h-12 text-muted-foreground opacity-20" />
                            </div>
                        </div>
                    ) : (
                        <FadeIn show={!loading}>
                            <div className="space-y-2">
                                {callLogs.map(log => {
                                    const isIncoming = log.toUser === user?.uid;
                                    const isMissed = log.status === 'missed' || (log.duration || 0) < 2; // Treat short uncompleted as missed conceptually
                                    const displayName = log.otherUser?.displayName || 'Unknown Student';
                                    const displayInitial = displayName.charAt(0);
                                    const displayPhoto = log.otherUser?.photoURL;

                                    const formatDuration = (secs: number) => {
                                        if (!secs) return '';
                                        const m = Math.floor(secs / 60);
                                        const s = secs % 60;
                                        return m > 0 ? `${m}m ${s}s` : `${s}s`;
                                    };

                                    return (
                                        <div key={log.id} className={`flex items-center gap-4 p-4 rounded-xl border bg-card border-border hover:bg-muted/50 transition-all`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0 border border-border bg-secondary text-primary`}>
                                                {displayPhoto ? (
                                                    <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    displayInitial
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className={`truncate font-semibold ${isMissed && isIncoming ? 'text-red-500' : 'text-foreground'}`}>
                                                        {displayName}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(log.startedAt).toLocaleDateString() === new Date().toLocaleDateString()
                                                                ? new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                : new Date(log.startedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    {isIncoming ? (
                                                        isMissed ? <PhoneMissed className="w-3.5 h-3.5 text-red-500" /> : <PhoneIncoming className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                        <PhoneOutgoing className="w-3.5 h-3.5" />
                                                    )}

                                                    {log.type === 'video' ? <Video className="w-3.5 h-3.5 ml-1" /> : <Phone className="w-3.5 h-3.5 ml-1" />}

                                                    <span className="truncate ml-1">
                                                        {isMissed && isIncoming ? 'Missed Call' : (log.duration ? formatDuration(log.duration) : 'Call ended')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </FadeIn>
                    )
                )}
            </div>
        </div>
    );
}
