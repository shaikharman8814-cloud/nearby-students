'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
    Bell,
    User,
    Shield,
    HelpCircle,
    LogOut,
    ChevronRight,
    Settings as SettingsIcon
} from 'lucide-react';
import { ProfileCompleteness } from '@/components/profile-completeness';
import { getUserProfile, UserProfile } from '@/lib/db';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const { user, logout, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (user?.uid) {
            getUserProfile(user.uid).then(setProfile);
        }
    }, [user?.uid]);

    const menuItems = [
        {
            icon: User,
            label: "Account",
            desc: "Email, Password, Security",
            href: "/settings/account",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10"
        },
        {
            icon: Bell,
            label: "Notifications",
            desc: "Messages, Calls, Alerts",
            href: "/settings/notifications",
            color: "text-purple-500",
            bgColor: "bg-purple-500/10"
        },
        {
            icon: Shield,
            label: "Privacy",
            desc: "Visibility, Blocked Users",
            href: "/settings/privacy",
            color: "text-green-500",
            bgColor: "bg-green-500/10"
        },
        {
            icon: HelpCircle,
            label: "Support and Feedbak",
            desc: "FAQ, Contact Us",
            href: "/settings/help",
            color: "text-orange-500",
            bgColor: "bg-orange-500/10"
        }
    ];

    if (loading) return null; // Or a spinner, but AuthWrappers likely handles the prompt logic
    if (!user) return null;

    return (
        <div className="max-w-xl mx-auto p-4 lg:p-8 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-full">
                    <SettingsIcon className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Settings</h1>
            </div>

            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b bg-muted/20 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xl font-bold">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            user.displayName?.charAt(0)
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{user.displayName}</h2>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>

                {profile && (
                    <div className="px-6 pt-6">
                        <ProfileCompleteness profile={profile} />
                    </div>
                )}

                <div className="divide-y">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${item.bgColor} ${item.color}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium">{item.label}</p>
                                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                    ))}
                </div>
            </div>

            <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 rounded-xl transition-colors font-medium border border-red-200 dark:border-red-900"
            >
                <LogOut className="w-5 h-5" />
                Log Out
            </button>

            <div className="text-center text-xs text-muted-foreground py-4">
                NearbyStudents v1.0.0
            </div>
        </div>
    );
}
