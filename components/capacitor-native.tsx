'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useRouter, usePathname } from 'next/navigation';
import { WifiOff, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { initPushNotifications } from '@/lib/push-notifications';

export function CapacitorNative() {
    const router = useRouter();
    const pathname = usePathname();
    const [isOffline, setIsOffline] = useState(false);
    const [backPressTime, setBackPressTime] = useState(0);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // 1. Native Theming & Blank Screen Fixes
        StatusBar.setStyle({ style: Style.Dark }).catch(console.warn);
        StatusBar.setBackgroundColor({ color: '#000000' }).catch(console.warn);

        const timer = setTimeout(() => {
            SplashScreen.hide({ fadeOutDuration: 500 }).catch(console.warn);
        }, 800);

        // Firebase Cloud Messaging Push Notifications Init
        initPushNotifications();

        // 2. Add Haptic Feedback globally to all touchable elements
        const handleInteraction = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            if (target && (target.closest('button') || target.closest('a') || target.closest('[role="button"]'))) {
                Haptics.impact({ style: ImpactStyle.Light }).catch(() => { });
            }
        };
        document.addEventListener('touchstart', handleInteraction, { passive: true });

        // 3. Network Detection (Offline App Fallback)
        Network.getStatus().then(status => setIsOffline(!status.connected));
        const networkListener = Network.addListener('networkStatusChange', status => {
            setIsOffline(!status.connected);
            if (status.connected) {
                toast.success('Back online!', { duration: 2000 });
            } else {
                toast.error('Connection lost', { duration: 3000 });
            }
        });

        // 4. Capacitor App Deep Linking for OAuth Returns
        const urlListener = CapApp.addListener('appUrlOpen', data => {
            // Check if URL matches custom scheme: nearbystudents://app
            const url = new URL(data.url);
            if (data.url.startsWith('nearbystudents://')) {
                Browser.close().catch(() => { });
                router.push(url.pathname || '/app');
            }
        });

        return () => {
            clearTimeout(timer);
            document.removeEventListener('touchstart', handleInteraction);
            networkListener.then(l => l.remove());
            urlListener.then(l => l.remove());
        };
    }, [router]);

    // 5. Perfect Android Back Button Handling (Separate effect due to dependencies)
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
            const isHome = pathname === '/' || pathname === '/login' || pathname === '/feed';

            if (isHome) {
                const now = new Date().getTime();
                if (now - backPressTime < 2000) {
                    CapApp.exitApp();
                } else {
                    setBackPressTime(now);
                    toast('Press back again to exit', { duration: 2000 });
                }
            } else if (canGoBack) {
                router.back();
            } else {
                router.push('/');
            }
        });

        return () => {
            backListener.then(l => l.remove());
        };
    }, [pathname, backPressTime, router]);

    // Fallback UI overlay if offline
    if (isOffline) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background p-4 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <WifiOff className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">No Internet</h1>
                <p className="mt-2 text-muted-foreground max-w-sm mb-8">
                    You're offline. Check your network or mobile data connection and try again.
                </p>
                <button
                    onClick={async () => {
                        const status = await Network.getStatus();
                        if (status.connected) setIsOffline(false);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-full hover:bg-primary/90 transition-all active:scale-95 shadow-lg"
                >
                    <RotateCcw className="w-4 h-4" /> Try Again
                </button>
            </div>
        );
    }

    return null;
}
