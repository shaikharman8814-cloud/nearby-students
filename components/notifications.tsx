'use client';

import { useEffect, useState } from 'react';
import { app } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Bell } from 'lucide-react';

export function Notifications() {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);

            if (permission === 'granted' && user) {
                // Dynamically import messaging to avoid SSR issues
                const { getMessaging, getToken } = await import('firebase/messaging');

                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });

                if (currentToken) {
                    console.log("FCM Token:", currentToken);
                    // Save token logic would go here
                }
            }
        } catch (error) {
            console.warn('An error occurred while retrieving token. ', error);
        }
    };

    if (permission === 'granted') {
        return null;
    }

    return (
        <button
            onClick={requestPermission}
            className="fixed bottom-24 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all z-50"
            title="Enable Notifications"
        >
            <Bell className="w-6 h-6" />
        </button>
    );
}
