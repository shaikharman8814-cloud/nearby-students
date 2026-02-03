'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Question, getQuestions, createQuestion } from '@/lib/db';
import { QuestionCard } from '@/components/qa/question-card';
import { Loader2, Plus, X } from 'lucide-react';

export default function QAPage() {
    const { user } = useAuth();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    // Create Modal UI
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('General');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadQuestions();
    }, [filter]);

    async function loadQuestions() {
        const CACHE_KEY = `sone_qa_cache_${filter}`;
        let hasCached = false;

        // 1. Try Cache
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                setQuestions(JSON.parse(cached));
                setLoading(false);
                hasCached = true;
            }
        } catch (e) { }

        // Only show loader if no cache
        if (!hasCached) setLoading(true);

        try {
            const data = await getQuestions(filter);
            setQuestions(data);

            // 2. Update Cache
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            } catch (e) { }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newTitle.trim()) return;

        setSubmitting(true);
        try {
            await createQuestion(user.uid, newTitle, newContent, newCategory);
            setIsCreateOpen(false);
            setNewTitle('');
            setNewContent('');
            setNewCategory('General');
            loadQuestions(); // Refresh
        } catch (error) {
            console.error(error);
            alert("Failed to post question");
        } finally {
            setSubmitting(false);
        }
    };

    const categories = ['All', 'General', 'Academic', 'Social', 'Career', 'Campus Life'];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header / Filter Bar */}
            <div className="sticky top-14 z-20 bg-background/80 backdrop-blur border-b border-border">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <h1 className="font-bold text-xl hidden md:block">Anonymous Q&A</h1>

                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 md:flex-none">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${filter === cat
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="p-2 md:px-4 md:py-1.5 bg-primary text-primary-foreground rounded-full flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity shrink-0"
                    >
                        <Plus className="w-5 h-5 md:w-4 md:h-4" />
                        <span className="hidden md:inline font-medium">Ask Question</span>
                    </button>
                </div>
            </div>

            <main className="max-w-3xl mx-auto p-4 space-y-4 pt-6">
                {/* Intro Card */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6 text-center mb-8">
                    <h2 className="text-lg font-bold text-orange-600 mb-2">Ask Anything, Anonymously. 🕵️</h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                        This is a safe space to ask about exams, confess your crushes, or get career advice.
                        Your identity is hidden, but be kind!
                    </p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No questions in {filter} yet. Be the first!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {questions.map(q => (
                            <QuestionCard key={q.id} question={q} />
                        ))}
                    </div>
                )}
            </main>

            {/* Create Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-6">Ask Question</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={e => setNewTitle(e.target.value)}
                                    placeholder="What's your question?"
                                    className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2 focus:ring-1 focus:ring-primary outline-none"
                                    required
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
                                <textarea
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    placeholder="Add more context..."
                                    className="w-full bg-secondary/30 border border-border rounded-lg px-4 py-2 min-h-[100px] focus:ring-1 focus:ring-primary outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Category</label>
                                <div className="flex flex-wrap gap-2">
                                    {categories.filter(c => c !== 'All').map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setNewCategory(cat)}
                                            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${newCategory === cat
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-secondary/50 text-muted-foreground border-transparent hover:border-border'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg border border-border font-medium hover:bg-secondary/50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !newTitle.trim()}
                                    className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Post Anonymously
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
