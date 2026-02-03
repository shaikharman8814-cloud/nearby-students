'use client';

import { useEffect, useState } from 'react';
import { UserProfile, getSmartSuggestions } from '@/lib/db';
import { UserCard } from '@/components/user-card';
import { useAuth } from '@/lib/auth-context';
import { Loader2, MapPin, Sparkles } from 'lucide-react';

export function SuggestionFeed() {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            const timeout = setTimeout(() => {
                setLoading(current => {
                    if (current) {
                        console.warn("[Suggestions] Load timed out");
                        return false;
                    }
                    return current;
                });
            }, 3000);

            getSmartSuggestions(user.uid)
                .then(setSuggestions)
                .finally(() => {
                    clearTimeout(timeout);
                    setLoading(false);
                });

            return () => clearTimeout(timeout);
        }
    }, [user]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    if (suggestions.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Recommended for you</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((profile) => (
                    <div key={profile.uid} className="relative group">
                        <UserCard profile={profile} currentUserId={user?.uid || ''} />
                    </div>
                ))}
            </div>
        </div>
    );
}
