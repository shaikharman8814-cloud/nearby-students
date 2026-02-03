'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, User, Zap, MessageSquare, Menu, X, HelpCircle, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';


interface SidebarNavProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function SidebarNav({ isOpen, onClose }: SidebarNavProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isVisible, setIsVisible] = useState(true); // Default VISIBLE (Deny-list)

    useEffect(() => {
        let mounted = true;

        const checkVisibility = async () => {
            if (!user) return;

            try {
                const token = await user.getIdTokenResult();
                const adminStatus = !!token.claims.admin;
                if (mounted) setIsAdmin(adminStatus);

                if (adminStatus) {
                    if (mounted) setIsVisible(true);
                    return;
                }

                // Check Profile Completion
                const { getUserProfile } = await import('@/lib/db');
                const profile = await getUserProfile(user.uid);



                // DENY LIST CHECK: Only hide if explicitly incomplete
                if (profile && profile.profileCompleted === false) {
                    if (mounted) setIsVisible(false);
                } else {
                    if (mounted) setIsVisible(true);
                }
            } catch (error) {
                console.error("Sidebar visibility check failed", error);
                if (mounted) setIsVisible(true);
            }
        };

        checkVisibility();

        return () => { mounted = false; };
    }, [user]);

    if (!isVisible) return null;

    const navItems = [
        { href: '/', icon: Home, label: 'Discovery' },
        { href: '/feed', icon: Zap, label: 'Feed' },
        { href: '/network', icon: Users, label: 'Network' },
        { href: '/messages', icon: MessageSquare, label: 'Messages' },
        { href: '/profile/edit', icon: User, label: 'Profile', match: '/profile' },
        { href: '/support', icon: HelpCircle, label: 'Support and Feedbak' },
    ];

    if (isAdmin) {
        navItems.push({ href: '/admin/feedback', icon: ShieldCheck, label: 'Admin Panel' });
    }


    return (
        <aside
            className={`fixed left-0 top-0 z-50 h-[100dvh] border-r border-border bg-background transition-all duration-300 ease-in-out flex flex-col
                ${collapsed ? 'w-16' : 'w-64'}
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                lg:flex
            `}
        >
            <div className="flex h-14 items-center justify-between px-4 border-b border-border shrink-0">
                {!collapsed && (
                    <Link href="/" className="font-bold text-xl flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <span className="animate-in fade-in slide-in-from-left-2 duration-300">Nearby Students</span>
                    </Link>
                )}
                <button
                    onClick={() => {
                        if (window.innerWidth < 1024 && onClose) {
                            onClose();
                        } else {
                            setCollapsed(!collapsed);
                        }
                    }}
                    className={`p-2 hover:bg-secondary rounded-lg transition-colors ${collapsed ? 'mx-auto' : ''} lg:block`}
                >
                    {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-1 p-2 mt-4 pb-20 lg:pb-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.match
                        ? pathname?.startsWith(item.match)
                        : pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => window.innerWidth < 1024 && onClose?.()}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group
                                ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                }
                                ${collapsed ? 'justify-center' : ''}
                            `}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={`h-5 w-5 shrink-0 ${!isActive && 'group-hover:scale-110 transition-transform'}`} />
                            {!collapsed && (
                                <span className="font-medium animate-in fade-in slide-in-from-left-2 duration-300">
                                    {item.label}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {
                !collapsed && (
                    <div className="p-4 border-t border-border mt-auto">
                        <div className="bg-secondary/50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs font-medium">Online</span>
                            </div>
                        </div>
                    </div>
                )
            }
        </aside >
    );
}
