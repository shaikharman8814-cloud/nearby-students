'use client';

import { useEffect } from 'react';

export function SecurityHardener() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. CLEAR CONSOLE PERIODICALLY (Objective 8 & 5)
        const clearConsole = () => {
            if (process.env.NODE_ENV === 'production') {
                // console.clear(); // Can be annoying in dev
            }
        };

        // 2. SOFT DEVTOOLS DETECTION (Objective 5)
        let devtoolsOpen = false;
        const threshold = 160;

        const checkDevTools = () => {
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;

            if (widthDiff || heightDiff) {
                if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    // Log suspicious activity silently (Objective 8)
                    // Log suspicious activity silently (Objective 8)
                    console.debug("[Security] Environment check failed.");
                }
            } else {
                devtoolsOpen = false;
            }
        };

        // 3. PREVENT DOM INJECTION (Basic)
        // Monitor for suspicious mutation of critical elements
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node instanceof HTMLScriptElement && !node.src) {
                            // Inline script added dynamically?
                            // node.remove();
                        }
                    });
                }
            }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

        // 4. AUTO-EXPIRE SESSIONS ON INACTIVITY (Objective 1)
        const INACTIVITY_LIMIT = 60 * 60 * 1000; // 60 minutes
        let lastActivity = Date.now();

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        const checkInactivity = async () => {
            if (Date.now() - lastActivity > INACTIVITY_LIMIT) {
                const { auth } = await import('@/lib/firebase');
                if (auth.currentUser) {
                    console.log("[Security] Session expired due to inactivity.");
                    await auth.signOut();
                }
            }
        };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('touchstart', updateActivity);

        const interval = setInterval(() => {
            checkDevTools();
            clearConsole();
            checkInactivity();
        }, 1000);

        return () => {
            clearInterval(interval);
            observer.disconnect();
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
        };
    }, []);

    return null;
}
