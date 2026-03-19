'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { updateLastActive } from '@/lib/db';

export function PresenceManager() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        // Update immediately on mount
        updateLastActive(user.uid).catch(console.warn);

        // Update every 5 minutes
        const interval = setInterval(() => {
            updateLastActive(user.uid).catch(console.warn);
        }, 5 * 60 * 1000);

        // Update on window focus
        const handleFocus = () => {
            updateLastActive(user.uid).catch(console.warn);
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [user]);

    return null;
}
