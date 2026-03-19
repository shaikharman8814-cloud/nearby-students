'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { updateUserProfile } from '@/lib/db';

export function LocationManager() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        if (!navigator.geolocation) {
            console.log("Geolocation not supported");
            return;
        }

        // Request location immediately on mount
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Silently update location in background
                updateUserProfile(user.uid, {
                    location: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                }).catch(err => console.warn("Failed to update auto-location", err));
            },
            (error) => {
                // Check for Insecure Origin (common in dev on IP)
                if (error.message.includes("Origin does not have permission") || error.code === 1) { // 1 = PERMISSION_DENIED
                    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                        console.warn("[LocationManager] Geolocation blocked due to Insecure Context (HTTP + IP). Use localhost or HTTPS.");
                    }
                }
                console.log("Auto-location skipped:", error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 1000 * 60 * 5 // Accept cached location up to 5 mins old
            }
        );
    }, [user]);

    return null; // This component renders nothing
}
