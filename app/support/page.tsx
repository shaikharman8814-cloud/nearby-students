'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Loader2, Send, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function SupportPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isAdmin, setIsAdmin] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    useEffect(() => {
        if (user) {
            user.getIdTokenResult().then((idTokenResult) => {
                // Requirement: Support strict "role === 'admin'" claim AND standard boolean
                setIsAdmin(!!idTokenResult.claims.admin || idTokenResult.claims.role === 'admin');
            });
            // fetchFeedback(); // Removed, handled by separate useEffect
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (!user) return;

        // Safety timeout: Never block the screen for more than 3 seconds
        const timeout = setTimeout(() => {
            setLoading(current => {
                if (current) {
                    console.warn("[Support] Feedback load timed out");
                    return false;
                }
                return current;
            });
        }, 3000);

        const collectionRef = collection(db, 'feedback');
        let q;

        if (isAdmin) {
            // Admin sees all
            q = query(collectionRef, orderBy('createdAt', 'desc'));
        } else {
            // User sees own
            q = query(collectionRef, where('userId', '==', user.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            clearTimeout(timeout);
            let items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()?.toISOString(),
                repliedAt: doc.data().repliedAt?.toDate()?.toISOString(),
            }));

            // Client-side sort to ensure correct order
            items = items.sort((a, b) =>
                new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );

            setFeedback(items);
            setLoading(false);

            // Scroll logic preserved
            setTimeout(() => {
                const hash = window.location.hash;
                if (hash) {
                    const id = hash.replace('#', '');
                    const element = document.getElementById(id);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                        setTimeout(() => element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 3000);
                    }
                }
            }, 500);

        }, (error) => {
            clearTimeout(timeout);
            console.warn("Real-time feedback error:", error);
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [user, isAdmin]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!message.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            const token = await user?.getIdToken();
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });

            if (res.ok) {
                setMessage('');
                // fetchFeedback(); // Handled by snapshot
            } else {
                let errorMessage = 'Failed to submit feedback';
                try {
                    const data = await res.json();
                    errorMessage = data.error || data.details || errorMessage;
                } catch (e) { }
                setError(errorMessage);
            }
        } catch (err: any) {
            console.warn("Submit error:", err);
            setError('Something went wrong: ' + (err.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReply(id: string) {
        if (!replyText.trim()) return;
        setReplying(true);
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
                setReplyText('');
                setReplyingTo(null);
                // fetchFeedback(); // Handled by snapshot
            }
        } catch (err) {
            console.warn("Reply failed", err);
        } finally {
            setReplying(false);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight">Support and Feedback</h1>
                <p className="text-muted-foreground text-lg">
                    Have an issue or a suggestion? We're here to help.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Submission Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm shadow-primary/5">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary" />
                            Submit New
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Describe your issue or suggestion..."
                                className="w-full min-h-[150px] bg-secondary/30 border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                disabled={submitting}
                            />
                            {error && <p className="text-destructive text-xs">{error}</p>}
                            <button
                                type="submit"
                                disabled={submitting || !message.trim()}
                                className="w-full bg-primary text-primary-foreground font-medium py-3 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>

                {/* Feedback History */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Feedback History
                    </h2>

                    {feedback.length === 0 ? (
                        <div className="bg-secondary/10 border border-dashed border-border rounded-2xl p-12 text-center">
                            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">No feedback submitted yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {feedback.map((item) => (
                                <div key={item.id} id={item.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                                    <div className="p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                {/* Admin View: Show User Details */}
                                                {isAdmin && (
                                                    <div className="text-xs text-muted-foreground mb-1">
                                                        <span className="font-semibold text-foreground">{item.userName || 'User'}</span>
                                                        <span className="mx-1">•</span>
                                                        {item.userEmail}
                                                    </div>
                                                )}
                                                <p className="text-sm leading-relaxed text-foreground/90">{item.message}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${item.status === 'replied' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                                        </div>

                                        {item.adminReply && (
                                            <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-2 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 text-primary">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Admin Reply</span>
                                                </div>
                                                <p className="text-sm text-foreground/80 leading-relaxed italic">
                                                    "{item.adminReply}"
                                                </p>
                                                <div className="text-[10px] text-muted-foreground/70">
                                                    Replied on {new Date(item.repliedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Admin Inline Reply Box */}
                                        {isAdmin && !item.adminReply && (
                                            <div className="mt-4 pt-4 border-t border-border">
                                                {replyingTo === item.id ? (
                                                    <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                        <textarea
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            className="w-full text-sm p-3 bg-secondary/50 rounded-xl border border-border focus:ring-1 focus:ring-primary focus:outline-none"
                                                            placeholder="Type reply to user..."
                                                            autoFocus
                                                        />
                                                        <div className="flex items-center gap-2 justify-end">
                                                            <button
                                                                onClick={() => setReplyingTo(null)}
                                                                className="text-xs font-medium px-3 py-1.5 hover:bg-secondary rounded-lg transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleReply(item.id)}
                                                                disabled={replying || !replyText.trim()}
                                                                className="text-xs font-bold px-4 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                                                            >
                                                                {replying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                                Reply
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setReplyingTo(item.id); setReplyText(''); }}
                                                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <MessageSquare className="w-3 h-3" /> Reply to this feedback
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
