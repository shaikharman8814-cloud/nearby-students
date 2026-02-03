'use client';

import { useEffect, useState } from 'react';
import { getHighlights, Highlight, Story } from '@/lib/db';
import { Plus, Heart } from 'lucide-react';
import { StoryViewer } from './story-viewer';

interface HighlightBarProps {
    userId: string;
    isOwnProfile: boolean;
}

export function HighlightBar({ userId, isOwnProfile }: HighlightBarProps) {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);

    useEffect(() => {
        getHighlights(userId).then(setHighlights).finally(() => setLoading(false));
    }, [userId]);

    if (loading) return null;
    if (highlights.length === 0 && !isOwnProfile) return null;

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1">
            {isOwnProfile && (
                <div className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                    <div
                        className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center bg-secondary"
                        onClick={() => alert("Feature coming: Add Stories to create Highlights!")}
                    >
                        <Plus className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium">New</span>
                </div>
            )}

            {highlights.map(h => (
                <div key={h.id} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0" onClick={() => setViewingHighlight(h)}>
                    <div className="w-16 h-16 rounded-full p-[2px] bg-border">
                        <div className="w-full h-full rounded-full bg-background p-0.5 overflow-hidden">
                            {h.coverUrl ? (
                                <img src={h.coverUrl} className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <div className="w-full h-full bg-secondary flex items-center justify-center text-xs">
                                    <Heart className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    </div>
                    <span className="text-xs font-medium max-w-[64px] truncate">{h.title}</span>
                </div>
            ))}

            {viewingHighlight && (
                <StoryViewer
                    stories={viewingHighlight.stories}
                    initialIndex={0}
                    onClose={() => setViewingHighlight(null)}
                />
            )}
        </div>
    );
}
