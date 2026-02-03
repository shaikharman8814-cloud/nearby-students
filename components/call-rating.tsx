'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { updateUserCallStats } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';

interface CallRatingProps {
    duration: number; // in seconds
    onClose: () => void;
}

export function CallRating({ duration, onClose }: CallRatingProps) {
    const { user } = useAuth();
    const [rating, setRating] = useState<'helpful' | 'not_helpful' | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const handleRate = async (value: 'helpful' | 'not_helpful') => {
        setRating(value);
        setSubmitted(true);
        if (user) {
            // Update the stats with the rating
            // Note: We already updated duration in CallContext cleanup, 
            // but we can update the rating on top of it or handle it separately.
            // For simplicity, let's just update the rating part here.
            await updateUserCallStats(user.uid, 0, value);
        }
        setTimeout(onClose, 1500);
    };

    const minutes = Math.ceil(duration / 60);

    if (submitted) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full mx-4 border border-border">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                        <ThumbsUp className="w-8 h-8 fill-current" />
                    </div>
                    <h3 className="text-xl font-bold">Thanks for feedback!</h3>
                    <p className="text-muted-foreground text-center">Your input helps improve student matching.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 border border-border relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">Call Ended</h3>
                    <p className="text-muted-foreground">
                        Duration: {minutes} min{minutes !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="space-y-4 w-full">
                    <p className="text-center font-medium">Was this session helpful?</p>

                    <div className="flex gap-4">
                        <button
                            onClick={() => handleRate('not_helpful')}
                            className="flex-1 p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors flex flex-col items-center gap-2 group"
                        >
                            <ThumbsDown className="w-6 h-6 text-muted-foreground group-hover:text-red-500 transition-colors" />
                            <span className="text-sm font-medium">Not really</span>
                        </button>

                        <button
                            onClick={() => handleRate('helpful')}
                            className="flex-1 p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors flex flex-col items-center gap-2 group"
                        >
                            <ThumbsUp className="w-6 h-6 text-primary group-hover:scale-110 transition-transform fill-current" />
                            <span className="text-sm font-medium">Yes, helpful!</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
