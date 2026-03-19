'use client';

import { Question, voteQuestion } from '@/lib/db';
import { ArrowBigUp, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
    question: Question;
}

export function QuestionCard({ question }: QuestionCardProps) {
    const { user } = useAuth();
    const [upvotes, setUpvotes] = useState(question.upvotes);
    const [hasUpvoted, setHasUpvoted] = useState(user ? question.upvotedBy?.includes(user.uid) : false);

    const handleVote = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) return; // Or show login alert

        const newHasUpvoted = !hasUpvoted;
        setHasUpvoted(newHasUpvoted);
        setUpvotes(prev => newHasUpvoted ? prev + 1 : prev - 1);

        try {
            await voteQuestion(question.id, user.uid, newHasUpvoted ? 'up' : 'remove');
        } catch (error) {
            console.warn("Vote failed", error);
            // Revert
            setHasUpvoted(!newHasUpvoted);
            setUpvotes(prev => !newHasUpvoted ? prev + 1 : prev - 1);
        }
    };

    return (
        <Link href={`/qa/${question.id}`} className="block group">
            <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                <div className="flex gap-4">
                    {/* Vote Column */}
                    <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                        <button
                            onClick={handleVote}
                            className={cn(
                                "p-2 rounded-lg transition-colors bg-secondary/30 hover:bg-secondary",
                                hasUpvoted ? "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20" : "text-muted-foreground"
                            )}
                        >
                            <ArrowBigUp className={cn("w-6 h-6", hasUpvoted && "fill-current")} />
                        </button>
                        <span className={cn("text-sm font-bold", hasUpvoted ? "text-orange-500" : "text-muted-foreground")}>
                            {upvotes}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            {question.category && (
                                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border/50">
                                    {question.category}
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                                • Posted anonymously • {new Date(question.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors leading-tight">
                            {question.title}
                        </h3>
                        {question.content && (
                            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                                {question.content}
                            </p>
                        )}

                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{question.answerCount} Answers</span>
                            </div>
                            {question.hasAiAnswer && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                    <span>✨ AI Answered</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
