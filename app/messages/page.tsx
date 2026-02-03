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

export default function MessagesPage() {
    const { user } = useAuth();
    const { isSlow } = useNetworkStatus();
    const [conversations, setConversations] = useState<any[]>([]);
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
            console.error("Failed to load cached messages", e);
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
            console.error("Messages list error:", err);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [user]);

    if (loading) return <ChatListSkeleton />;

    return (
        <div className="max-w-2xl mx-auto p-4 lg:p-8">
            <h1 className="text-2xl font-bold mb-6 text-foreground">Messages</h1>

            <div className="space-y-2">
                {conversations.length === 0 ? (
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
                )}
            </div>
        </div>
    );
}
