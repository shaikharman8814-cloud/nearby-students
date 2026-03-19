'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Post, UserProfile, getUserConnections, sendMessage, Connection } from '@/lib/db';
import { X, Search, Send, Loader2, Check } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore'; // Import needed for direct query if not using db helper
import { db } from '@/lib/firebase';

interface SharePostModalProps {
    post: Post;
    isOpen: boolean;
    onClose: () => void;
}

export function SharePostModal({ post, isOpen, onClose }: SharePostModalProps) {
    const { user } = useAuth();
    const [connections, setConnections] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState<string | null>(null); // ID of user being sent to
    const [sentIds, setSentIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadConnections() {
            if (!user || !isOpen) return;
            setLoading(true);
            try {
                const friends = await getUserConnections(user.uid);
                setConnections(friends);
            } catch (error) {
                console.warn("Failed to load connections for sharing", error);
            } finally {
                setLoading(false);
            }
        }
        loadConnections();
    }, [user, isOpen]);

    const handleSend = async (recipient: UserProfile) => {
        if (!user || sending) return;
        setSending(recipient.uid);

        try {
            // 1. Find the connection ID between these two users
            // We can reuse logic from db.ts or just query quickly here
            const ids = [user.uid, recipient.uid].sort();
            const connectionId = ids.join('_');

            // 2. Send the message
            const authorName = post.isAnonymous ? 'Anonymous Student' : post.authorName;
            await sendMessage(connectionId, user.uid, '', {
                type: 'shared_post',
                postId: post.id,
                postContent: post.content, // Snippet for preview
                url: post.imageUrl, // Optional preview image
                postAuthor: authorName,
                postAuthorId: post.isAnonymous ? undefined : post.authorId
            });

            // 3. Mark as sent
            setSentIds(prev => [...prev, recipient.uid]);

        } catch (error) {
            console.warn("Failed to share post", error);
        } finally {
            setSending(null);
        }
    };

    const filteredConnections = connections.filter(c =>
        c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.college?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-md flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-bold text-lg">Share Post</h3>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-secondary/50 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : filteredConnections.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No matching connections.</p>
                    ) : (
                        filteredConnections.map(friend => {
                            const isSent = sentIds.includes(friend.uid);
                            const isSending = sending === friend.uid;

                            return (
                                <div key={friend.uid} className="flex items-center justify-between p-2 hover:bg-secondary/30 rounded-lg transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                                            {friend.photoURL ? (
                                                <img src={friend.photoURL} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="font-bold text-muted-foreground">{friend.displayName.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{friend.displayName}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{friend.college}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => !isSent && handleSend(friend)}
                                        disabled={isSent || isSending}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isSent
                                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            } disabled:opacity-50`}
                                    >
                                        {isSending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isSent ? (
                                            <span className="flex items-center gap-1">Sent <Check className="w-3 h-3" /></span>
                                        ) : (
                                            'Send'
                                        )}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
