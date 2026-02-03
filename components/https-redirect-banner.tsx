'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

export function HttpsRedirectBanner() {
    const [needsRedirect, setNeedsRedirect] = useState(false);
    const [httpsUrl, setHttpsUrl] = useState('');

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isHttp = window.location.protocol === 'http:';

        // If we are on network IP (not localhost) AND using HTTP, we must switch to HTTPS
        if (!isLocalhost && isHttp) {
            // Construct the HTTPS URL pointing to port 3001 (where our proxy lives)
            const targetUrl = `https://${window.location.hostname}:3001${window.location.pathname}${window.location.search}`;
            setHttpsUrl(targetUrl);
            setNeedsRedirect(true);
        }
    }, []);

    if (!needsRedirect) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-white">Security Check Required</h1>
                    <p className="text-zinc-400">
                        Camera and Geolocation features are blocked by your browser because this connection is not secure (HTTP).
                    </p>
                    <div className="text-sm text-zinc-500 bg-zinc-800/50 p-4 rounded-lg">
                        You must switch to our Secure HTTPS Server to proceed.
                    </div>
                </div>

                <button
                    onClick={() => window.location.href = httpsUrl}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white text-lg font-bold rounded-xl transition-all shadow-lg active:scale-95 flex flex-col items-center justify-center -gap-1"
                >
                    <span>Switch to HTTPS Now</span>
                    <span className="text-[10px] opacity-70 font-mono font-normal">({httpsUrl})</span>
                </button>

                <p className="text-xs text-zinc-600">
                    If you see a security warning on the next page, click "Advanced" → "Proceed".
                </p>
            </div>
        </div>
    );
}
