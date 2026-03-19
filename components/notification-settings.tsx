'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getUserProfile, updateNotificationPreferences, NotificationPreferences } from '@/lib/db';
import { Loader2, Bell, MessageSquare, Phone, Gift, Heart, Users, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [prefs, setPrefs] = useState<NotificationPreferences>({
        messages: true,
        calls: true,
        birthdays: true,
        mentions: true,
        likes: true,
        comments: true,
        follows: true,
        smartAlerts: true,
        anonymous: true,
        smartReplies: true, // Default ON
    });

    useEffect(() => {
        if (!user) return;
        getUserProfile(user.uid).then(profile => {
            if (profile?.notificationPreferences) {
                // Merge with defaults to ensure all keys exist
                setPrefs(prev => ({ ...prev, ...profile.notificationPreferences }));
            }
            setLoading(false);
        });
    }, [user]);

    const handleToggle = async (key: keyof NotificationPreferences) => {
        if (!user) return;

        // Optimistic update
        const newVal = !prefs[key];
        setPrefs(prev => ({ ...prev, [key]: newVal }));

        try {
            await updateNotificationPreferences(user.uid, { [key]: newVal });
            // toast.success("Settings saved"); // Maybe too noisy
        } catch (error) {
            console.warn(error);
            // Revert on error
            setPrefs(prev => ({ ...prev, [key]: !newVal }));
            toast.error("Failed to save setting");
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    const sections = [
        {
            title: "Core Updates",
            items: [
                { key: 'messages', label: 'Messages', icon: MessageSquare, desc: 'Direct messages and chats' },
                { key: 'calls', label: 'Incoming Calls', icon: Phone, desc: 'Voice and video calls' },
                { key: 'birthdays', label: 'Birthdays', icon: Gift, desc: 'Friends\' birthday alerts' },
            ]
        },
        {
            title: "Social Interactions",
            items: [
                { key: 'likes', label: 'Likes', icon: Heart, desc: 'When someone likes your posts' },
                { key: 'comments', label: 'Comments', icon: MessageSquare, desc: 'Replies to your posts or comments' },
                { key: 'follows', label: 'New Followers', icon: Users, desc: 'When someone follows you' },
            ]
        },
        {
            title: "Privacy & Smart Alerts",
            items: [
                { key: 'smartAlerts', label: 'Smart Alerts', icon: Zap, desc: 'Exam reminders, deadlines, and AI tips' },
                { key: 'smartReplies', label: 'Smart Replies', icon: MessageSquare, desc: 'Show AI suggested replies in chat' },
                { key: 'anonymous', label: 'Anonymous Activity', icon: Shield, desc: 'Notifications from anonymous users' },
            ]
        }
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-8 p-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Bell className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Notification Preferences</h2>
                    <p className="text-sm text-muted-foreground">Control what you get notified about</p>
                </div>
            </div>

            {sections.map((section, idx) => (
                <div key={idx} className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{section.title}</h3>
                    <div className="bg-card border rounded-xl divide-y">
                        {section.items.map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <item.icon className="w-5 h-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={prefs[item.key as keyof NotificationPreferences]}
                                        onChange={() => handleToggle(item.key as keyof NotificationPreferences)}
                                    />
                                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
