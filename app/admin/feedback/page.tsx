'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Loader2, MessageSquare, Reply, CheckCircle2, AlertTriangle, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

export default function AdminFeedbackPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                router.push('/login');
            } else {
                checkAdminStatus();
            }
        }
    }, [user, authLoading]);

    async function checkAdminStatus() {
        if (!user) return;

        // Safety timeout for admin check
        const timeout = setTimeout(() => {
            setIsAdmin(current => current === null ? false : current);
            console.warn("[Admin] Admin check timed out");
        }, 3000);

        try {
            const result = await user.getIdTokenResult();
            if (result.claims.admin) {
                clearTimeout(timeout);
                setIsAdmin(true);
                return;
            }

            // Fallback: Check DB Profile
            const { getUserProfile } = await import('@/lib/db');
            const profile = await getUserProfile(user.uid);

            clearTimeout(timeout);
            if (profile && (profile.role === 'admin' || profile.role === 'solver')) {
                setIsAdmin(true);
            } else {
                setIsAdmin(false);
            }
        } catch (e) {
            clearTimeout(timeout);
            console.error("Admin check failed", e);
            setIsAdmin(false);
        }
    }

    useEffect(() => {
        if (!isAdmin) return;

        // Safety timeout for enrichment
        const timeout = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.warn("[Admin] Feedback enrichment timed out");
                    return false;
                }
                return current;
            });
        }, 3000);

        // REAL-TIME LISTENER
        const q = query(
            collection(db, 'feedback'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const feedbackItems = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()?.toISOString(),
                repliedAt: doc.data().repliedAt?.toDate()?.toISOString(),
            }));

            // Client-side Enrichment: Fetch User Details
            const userIds = Array.from(new Set(feedbackItems.map((f: any) => f.userId).filter(Boolean)));
            const userMap = new Map();

            try {
                // Since 'users' is public read, we can fetch
                const userPromises = userIds.map(async (uid) => {
                    if (typeof uid === 'string') {
                        const userDoc = await getDoc(doc(db, 'users', uid));
                        if (userDoc.exists()) {
                            return { id: uid, ...userDoc.data() };
                        }
                    }
                    return null;
                });

                const users = await Promise.all(userPromises);
                users.forEach((u: any) => {
                    if (u) userMap.set(u.id, u);
                });

                const enrichedFeedback = feedbackItems.map((item: any) => {
                    const userProfile = userMap.get(item.userId);
                    return {
                        ...item,
                        userName: userProfile?.name || userProfile?.displayName || item.userName || 'Unknown User',
                        userEmail: userProfile?.email || item.userEmail || 'No Email'
                    };
                });

                clearTimeout(timeout);
                setFeedback(enrichedFeedback);
            } catch (err) {
                clearTimeout(timeout);
                console.error("Error enriching feedback", err);
                setFeedback(feedbackItems);
            } finally {
                setLoading(false);
            }
        }, (err) => {
            clearTimeout(timeout);
            console.error("Real-time feedback error:", err);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [isAdmin]);

    async function handleReply(id: string) {
        if (!replyText.trim()) return;

        setSubmitting(true);
        try {
            const token = await user?.getIdToken();
            const res = await fetch(`/api/feedback/${id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ adminReply: replyText })
            });

            if (res.ok) {
                toast.success("Reply sent successfully");
                setReplyText('');
                setReplyingTo(null);
                // fetchFeedback(); // Handled by real-time listener
            } else {
                const data = await res.json();
                console.error("Reply API Error:", data);
                toast.error(data.error || "Failed to send reply");
            }
        } catch (err) {
            console.error("Reply failed", err);
            toast.error("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    if (authLoading || isAdmin === null || (isAdmin && loading)) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isAdmin === false) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">You do not have administrative privileges to access this page.</p>
                <button onClick={() => router.push('/')} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl">
                    Back to Safety
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-8 space-y-6">
            <header className="flex justify-between items-center bg-card border border-border p-6 rounded-2xl shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-primary" />
                        Admin Feedback Portal
                    </h1>
                    <p className="text-sm text-muted-foreground">Manage and respond to student inquiries.</p>
                </div>
                <div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                    {feedback.length} Submissions
                </div>
            </header>

            <div className="space-y-4">
                {feedback.length === 0 ? (
                    <div className="bg-secondary/5 rounded-2xl p-20 text-center border border-dashed border-border">
                        <p className="text-muted-foreground italic">No student feedback found yet.</p>
                    </div>
                ) : (
                    feedback.map((item) => (
                        <div key={item.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                                <User className="w-4 h-4 text-primary" />
                                                {item.userName || item.userId}
                                            </div>
                                            <div className="text-xs text-muted-foreground ml-6 mb-1">
                                                {item.userEmail}
                                                <span className="mx-1">•</span>
                                                {new Date(item.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <p className="text-base text-foreground/90 font-medium">{item.message}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${['replied', 'resolved'].includes(item.status) ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500 animate-pulse'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>

                                {item.adminReply ? (
                                    <div className="bg-secondary/20 rounded-xl p-4 border border-border/50">
                                        <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase mb-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Sent Reply
                                        </div>
                                        <p className="text-sm text-muted-foreground italic">"{item.adminReply}"</p>
                                        <div className="mt-2 text-[10px] text-muted-foreground opacity-70">
                                            Replied on {new Date(item.repliedAt).toLocaleString()}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {replyingTo === item.id ? (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Type your response to the student..."
                                                    className="w-full min-h-[100px] bg-secondary/10 border border-border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleReply(item.id)}
                                                        disabled={submitting || !replyText.trim()}
                                                        className="bg-primary text-primary-foreground text-sm font-medium px-6 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                                                    >
                                                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Reply className="w-4 h-4" />}
                                                        Send Reply
                                                    </button>
                                                    <button
                                                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                        className="text-sm font-medium px-4 py-2 hover:bg-secondary rounded-xl transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setReplyingTo(item.id)}
                                                className="bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium px-6 py-2 rounded-xl flex items-center gap-2 transition-colors border border-border/50"
                                            >
                                                <Reply className="w-4 h-4" />
                                                Reply to Student
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
