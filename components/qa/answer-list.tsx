'use client';

import { Answer, voteAnswer } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';
import { ArrowBigUp, Bot } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnswerListProps {
    answers: Answer[];
}

function AnswerItem({ answer }: { answer: Answer }) {
    const { user } = useAuth();
    const [upvotes, setUpvotes] = useState(answer.upvotes);
    const [hasUpvoted, setHasUpvoted] = useState(user ? answer.upvotedBy?.includes(user.uid) : false);

    const handleVote = async () => {
        if (!user) return;
        const newHasUpvoted = !hasUpvoted;
        setHasUpvoted(newHasUpvoted);
        setUpvotes(prev => newHasUpvoted ? prev + 1 : prev - 1);
        try {
            await voteAnswer(answer.questionId, answer.id, user.uid);
        } catch (error) {
            setHasUpvoted(!newHasUpvoted);
            setUpvotes(prev => !newHasUpvoted ? prev + 1 : prev - 1);
        }
    };

    return (
        <div className={cn(
            "p-4 rounded-xl border mb-3 flex gap-3 transition-colors",
            answer.isAiGenerated ? "bg-purple-500/5 border-purple-500/20" : "bg-card border-border"
        )}>
            {/* Left Vote */}
            <div className="flex flex-col items-center gap-1 min-w-[2rem]">
                <button
                    onClick={handleVote}
                    className={cn(
                        "p-1 hover:bg-secondary rounded",
                        hasUpvoted ? "text-orange-500" : "text-muted-foreground"
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
                <div className="flex items-center gap-2 mb-2">
                    {/* Avatar Logic */}
                    <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-secondary text-foreground overflow-hidden",
                        answer.isAiGenerated && "bg-purple-500 text-white"
                    )}>
                        {answer.isAiGenerated ? <Bot className="w-4 h-4" /> : answer.authorAvatar ? <img src={answer.authorAvatar} alt="Avatar" className="w-full h-full object-cover" /> : answer.authorName?.[0] || 'A'}
                    </div>

                    <span className={cn("text-sm font-semibold", answer.isAiGenerated && "text-purple-500")}>
                        {answer.authorName || 'Anonymous'}
                    </span>

                    {answer.authorBadge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground border border-border">
                            {answer.authorBadge}
                        </span>
                    )}

                    <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(answer.createdAt).toLocaleDateString()}
                    </span>
                </div>

                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {answer.content}
                </div>
            </div>
        </div>
    )
}

export function AnswerList({ answers }: AnswerListProps) {
    if (answers.length === 0) {
        return <div className="text-center py-8 text-muted-foreground text-sm">No answers yet. Be the first to help!</div>
    }

    return (
        <div className="space-y-2">
            {answers.map(a => <AnswerItem key={a.id} answer={a} />)}
        </div>
    );
}
