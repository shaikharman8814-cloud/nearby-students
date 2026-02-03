'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { requestNotificationPermission, getNotificationSettings, toggleNotifications } from '@/lib/notifications';
import { Loader2, Bell, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NotificationSettingsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [enabled, setEnabled] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!user) return;
        getNotificationSettings(user.uid).then(settings => {
            setEnabled(settings.enabled);
            setLoading(false);
        });
    }, [user]);

    const handleToggle = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            if (!enabled) {
                // Enable: Request Permission + Save Token
                const token = await requestNotificationPermission(user.uid);
                if (token) {
                    setEnabled(true);
                    toast.success("Notifications Enabled!");
                } else {
                    toast.error("Permission denied or failed. Check browser settings.");
                }
            } else {
                // Disable: Just update DB flag
                await toggleNotifications(user.uid, false);
                setEnabled(false);
                toast.success("Notifications Disabled.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Something went wrong");
        } finally {
            setProcessing(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-xl mx-auto p-4 lg:p-8 space-y-6">
            <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Link>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/10 rounded-full">
                    <Bell className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Push Notifications</h1>
                    <p className="text-sm text-muted-foreground">Stay updated on messages and requests</p>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg">Enable Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive alerts for messages, connections, and applications.</p>
                </div>
                {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                    <button
                        onClick={handleToggle}
                        disabled={processing}
                        className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                    >
                        <span
                            className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'} shadow-sm flex items-center justify-center`}
                        >
                            {processing && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                        </span>
                    </button>
                )}
            </div>

            {/* Test Notification Section */}
            {enabled && (
                <div className="bg-card border rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">Test Notifications</h3>
                        <p className="text-sm text-muted-foreground">Send a test alert to this device.</p>
                    </div>
                    <button
                        onClick={async () => {
                            if (!user) return;
                            try {
                                setProcessing(true);
                                // Dynamic import to avoid circular dep issues if any, or just standard import
                                const { createNotification } = await import('@/lib/db');
                                await createNotification(user.uid, {
                                    type: 'system',
                                    title: 'NearbyStudents',
                                    body: 'Test notification successful ✅',
                                    link: '/settings/notifications',
                                    senderId: 'system',
                                    isAnonymous: false
                                });
                                toast.success("Test Sent! Check your notifications.");
                            } catch (e) {
                                console.error(e);
                                toast.error("Failed to send test.");
                            } finally {
                                setProcessing(false);
                            }
                        }}
                        disabled={processing}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors text-sm font-medium"
                    >
                        Send Test
                    </button>
                </div>
            )}

            <div className="text-xs text-muted-foreground p-4 bg-secondary/20 rounded-lg">
                <p>Note: Notifications require browser permission. If you denied it previously, please reset existing permissions in your browser settings (Lock icon &gt; Site Settings).</p>
            </div>
        </div>
    );
}
