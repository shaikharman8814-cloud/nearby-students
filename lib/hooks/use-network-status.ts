'use client';

import { useState, useEffect } from 'react';

export type NetworkSpeed = 'fast' | 'slow';

export function useNetworkStatus(delayMs: number = 800) {
    const [speed, setSpeed] = useState<NetworkSpeed>('fast');
    const [isSlow, setIsSlow] = useState(false);

    useEffect(() => {
        // 1. Browser API check (if available)
        const connection = (navigator as any).connection;
        if (connection) {
            const checkConnection = () => {
                const effectiveType = connection.effectiveType;
                if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
                    setSpeed('slow');
                    setIsSlow(true);
                } else {
                    setSpeed('fast');
                    setIsSlow(false);
                }
            };

            connection.addEventListener('change', checkConnection);
            checkConnection();
            return () => connection.removeEventListener('change', checkConnection);
        }

        // 2. Fallback: Timeout based "slow" detection
        // Note: This is more for UI state management than raw network measuring
        const timer = setTimeout(() => {
            setSpeed('slow');
            setIsSlow(true);
        }, delayMs);

        return () => clearTimeout(timer);
    }, [delayMs]);

    return { speed, isSlow };
}
