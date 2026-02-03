'use client';

import { SuggestionFeed } from '@/components/suggestion-feed';
import Link from 'next/link';

export default function NetworkPage() {
    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
            <h1 className="text-2xl font-bold mb-6">My Network</h1>

            <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-6">
                    <div className="mb-6 flex gap-3 items-center">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                <span className="text-lg">👋</span>
                            </div>
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full"></span>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-sm font-semibold">What are you up to?</h2>
                            <p className="text-xs text-muted-foreground">Set a status so others can join you.</p>
                        </div>
                        <Link href="/profile/edit" className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium hover:bg-primary/20 transition-colors">
                            Update Status
                        </Link>
                    </div>

                    <div className="mt-4">
                        <SuggestionFeed />
                    </div>
                </div>
            </div>
        </div>
    );
}
