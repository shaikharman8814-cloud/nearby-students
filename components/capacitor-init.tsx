'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export function CapacitorInit() {
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            // Style the status bar to be dark smoothly
            StatusBar.setStyle({ style: Style.Dark }).catch(console.warn);
            StatusBar.setBackgroundColor({ color: '#000000' }).catch(console.warn);

            // Hide the splash screen once React has mounted and layout is ready
            setTimeout(() => {
                SplashScreen.hide({
                    fadeOutDuration: 500
                }).catch(console.warn);
            }, 1000); // 1s buffer for WebView to fully render DOM
        }
    }, []);

    return null;
}
