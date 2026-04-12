'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { Home, Users, User, LogOut, Zap, BookOpen, Bell, MessageSquare, Gamepad2, Briefcase, HelpCircle, Menu, ChevronDown } from 'lucide-react';

import { usePathname } from 'next/navigation';
import { useNotifications } from '@/components/notification-manager';
import { LayoutSwitcher } from '@/components/layout-switcher';
import { useLayout } from '@/lib/layout-context';

interface SiteHeaderProps {
    onMenuClick?: () => void;
    isSidebarOpen?: boolean;
}

export function SiteHeader({ onMenuClick, isSidebarOpen }: SiteHeaderProps) {
    const { user, signOut } = useAuth();
    const { layout } = useLayout();
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(true); // Default VISIBLE (Deny-list)

    useEffect(() => {
        if (!user) return;

        let mounted = true;
        const checkVisibility = async () => {
            try {
                const token = await user.getIdTokenResult();
                if (token.claims.admin || token.claims.owner) {
                    if (mounted) setIsVisible(true);
                    return;
                }

                const { getUserProfile } = await import('@/lib/db');
                const profile = await getUserProfile(user.uid);



                // DENY LIST CHECK: Only hide if explicitly incomplete
                if (profile && profile.profileCompleted === false) {
                    if (mounted) setIsVisible(false);
                } else {
                    if (mounted) setIsVisible(true);
                }
            } catch (error) {
                // Default to visible on error (fail safe)
                if (mounted) setIsVisible(true);
            }
        };
        checkVisibility();
        return () => { mounted = false; };
    }, [user]);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    if (!user || !isVisible) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gpu-accelerated">
            <div className="container flex h-14 max-w-7xl items-center justify-between mx-auto px-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <Link href="/" className="font-bold text-xl flex items-center gap-2 shrink-0">
                        <span className="hidden xs:inline">SocialNet</span>
                        <span className="xs:hidden">S</span>
                    </Link>

                    {/* Navigation Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-1 text-sm font-semibold transition-all px-2 py-1 rounded-md ${isDropdownOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                        >
                            Click <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 p-2 animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl bg-card/95">
                                    <Link
                                        href="https://aetheris.vercel.app"
                                        target="_blank"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm font-medium group/item"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="flex-1 text-foreground">Aetheris</span>
                                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity">Launch</span>
                                    </Link>
                                    <Link
                                        href="/"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm font-medium group/item"
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                        <span className="flex-1 text-foreground">SocialNet</span>
                                        <span className="text-[10px] text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity">Current</span>
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto scrollbar-hide ml-2 md:ml-4 flex items-center justify-end">
                    <nav className="flex items-center gap-4 md:gap-6 text-sm font-medium h-14">
                        {/* Mobile Menu Button - ONLY < 768px */}
                        <button
                            onClick={onMenuClick}
                            className="p-2 md:hidden hover:bg-secondary rounded-lg transition-colors mr-auto"
                            aria-label="Toggle Menu"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        {layout === 'header' && (
                            <div className="hidden md:flex items-center gap-6">
                                <Link
                                    href="/"
                                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname === '/' ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <Home className="h-4 w-4" />
                                    <span className="hidden sm:inline">Discovery</span>
                                </Link>
                                <Link
                                    href="/feed"
                                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname === '/feed' ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <Zap className="h-4 w-4" />
                                    <span className="hidden sm:inline">Feed</span>
                                </Link>
                                <Link
                                    href="/network"
                                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname === '/network' ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <Users className="h-4 w-4" />
                                    <span className="hidden sm:inline">Network</span>
                                </Link>
                                <Link
                                    href="/messages"
                                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname === '/messages' ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    <span className="hidden sm:inline">Messages</span>
                                </Link>
                                <Link
                                    href="/profile/edit"
                                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname?.startsWith('/profile') ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <User className="h-4 w-4" />
                                    <span className="hidden sm:inline">Profile</span>
                                </Link>
                                <Link
                                    href="/support"
                                    className={`flex items-center gap-2 transition-colors hover:text-foreground ${pathname === '/support' ? 'text-foreground' : 'text-muted-foreground'}`}
                                >
                                    <HelpCircle className="h-4 w-4" />
                                    <span className="hidden sm:inline">Support and Feedbak</span>
                                </Link>
                            </div>
                        )}
                        <div className="flex items-center gap-2 border-l border-border pl-4 ml-auto">
                            <LayoutSwitcher />
                            <NotificationBell />
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-2 transition-colors text-muted-foreground hover:text-foreground"
                                title="Sign Out"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}

function NotificationBell() {
    const { unreadCount, togglePanel } = useNotifications();

    return (
        <button
            onClick={togglePanel}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors mr-2"
            title="Notifications"
        >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
        </button>
    );
}
