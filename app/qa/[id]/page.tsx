'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Question, Answer, getQuestion, getAnswers, addAnswer } from '@/lib/db';
import { AnswerList } from '@/components/qa/answer-list';
import { Loader2, ArrowLeft, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { generateStudyResponse } from '@/lib/ai-service';

export default function QuestionPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const questionId = typeof params.id === 'string' ? params.id : params.id?.[0];

    const [question, setQuestion] = useState<Question | null>(null);
    const [answers, setAnswers] = useState<Answer[]>([]);
    const [loading, setLoading] = useState(true);

    // Answering
    const [newAnswer, setNewAnswer] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(true); // Default to true
    const [submitting, setSubmitting] = useState(false);

    // AI
    const [requestingAi, setRequestingAi] = useState(false);

    useEffect(() => {
        if (questionId) loadData();
    }, [questionId]);

    async function loadData() {
        if (!questionId) return;
        setLoading(true);
        try {
            const [q, a] = await Promise.all([
                getQuestion(questionId),
                getAnswers(questionId)
            ]);
            setQuestion(q);
            setAnswers(a);
        } catch (error) {
            console.warn(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !questionId || !newAnswer.trim()) return;

        setSubmitting(true);
        try {
            await addAnswer(questionId, user.uid, newAnswer, isAnonymous);
            setNewAnswer('');
            const updatedAnswers = await getAnswers(questionId);
            setAnswers(updatedAnswers);
        } catch (e) {
            console.warn(e);
            alert("Failed to submit");
        } finally {
            setSubmitting(false);
        }
    }

    const handleAskAi = async () => {
        if (!questionId || !question) return;
        setRequestingAi(true);
        try {
            const prompt = `Title: ${question.title}\nDetail: ${question.content || ''}`;
            const aiContent = await generateStudyResponse(prompt);

            // Use a specific ID for AI bot or just 'ai-bot'
            // We use 'ai-bot' as authorId, detailed logic in addAnswer handles "isAi" flag
            await addAnswer(questionId, 'ai-bot', aiContent, false, true);

            // Refresh
            const [q, a] = await Promise.all([
                getQuestion(questionId),
                getAnswers(questionId)
            ]);
            setQuestion(q);
            setAnswers(a);
        } catch (e) {
            console.warn("AI Error", e);
            alert("AI Study Buddy is currently overloaded. Please try again later.");
        } finally {
            setRequestingAi(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!question) return <div className="p-8 text-center">Question not found</div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border p-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link href="/qa" className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-lg truncate flex-1">Question Details</h1>
                </div>
            </div>

            <main className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Question Detail */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        {question.category && (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider">
                                {question.category}
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(question.createdAt).toLocaleString()}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold mb-4">{question.title}</h1>
                    <div className="text-foreground whitespace-pre-wrap leading-relaxed text-lg">
                        {question.content}
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>Posted Anonymously</span>
                            <span className="mx-2">•</span>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-foreground">{question.upvotes}</span> Upvotes
                            </div>
                        </div>

                        {/* AI Trigger Button */}
                        {!question.hasAiAnswer && (
                            <button
                                onClick={handleAskAi}
                                disabled={requestingAi}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 font-medium transition-colors text-xs disabled:opacity-50"
                            >
                                {requestingAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {requestingAi ? "Thinking..." : "Ask AI Buddy"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Answer Input */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <h3 className="font-bold mb-2">Write an Answer</h3>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={newAnswer}
                            onChange={e => setNewAnswer(e.target.value)}
                            placeholder="Type your answer here..."
                            className="w-full bg-secondary/30 border border-border rounded-lg p-3 min-h-[100px] mb-3 focus:ring-1 focus:ring-primary outline-none text-sm"
                        />
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer text-sm select-none group">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAnonymous ? 'bg-primary border-primary' : 'border-muted-foreground group-hover:border-primary'}`}>
                                    {isAnonymous && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isAnonymous}
                                    onChange={e => setIsAnonymous(e.target.checked)}
                                    className="hidden"
                                />
                                <span className={isAnonymous ? "text-primary font-medium" : "text-muted-foreground"}>
                                    {isAnonymous ? "Posting Anonymously" : "Posting as " + (user?.displayName || 'User')}
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={submitting || !newAnswer.trim()}
                                className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity text-sm"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Post
                            </button>
                        </div>
                    </form>
                </div>

                {/* Answers List */}
                <div>
                    <h3 className="font-bold text-lg mb-4">{answers.length} Answers</h3>
                    <AnswerList answers={answers} />
                </div>
            </main>
        </div>
    );
}
