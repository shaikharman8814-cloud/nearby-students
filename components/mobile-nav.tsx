'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, Users, MessageSquare, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';

export function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuth(); // Import useAuth
    const [isVisible, setIsVisible] = useState(true); // Default VISIBLE (Deny-list)
    const [isAdmin, setIsAdmin] = useState(false);

    // Need useEffect to check profile status
    useEffect(() => {
        if (!user) return;

        let mounted = true;

        const checkVisibility = async () => {
            try {
                // 1. Check Admin/Owner Role
                const token = await user.getIdTokenResult();
                const adminStatus = !!token.claims.admin;
                const isOwner = !!token.claims.owner; // Assuming owner claim exists or similar logic

                if (mounted) setIsAdmin(adminStatus);

                if (adminStatus || isOwner) {
                    if (mounted) setIsVisible(true);
                    return;
                }

                // 2. Check Profile Completion
                const { getUserProfile } = await import('@/lib/db');
                const profile = await getUserProfile(user.uid);



                // DENY LIST CHECK: Only hide if explicitly incomplete
                if (profile && profile.profileCompleted === false) {
                    if (mounted) setIsVisible(false);
                } else {
                    if (mounted) setIsVisible(true);
                }

            } catch (error) {
                console.warn("Nav visibility check failed", error);
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
    ];

    if (isAdmin) {
        navItems.push({ href: '/admin/feedback', icon: ShieldCheck, label: 'Admin' });
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 md:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.match
                        ? pathname?.startsWith(item.match)
                        : pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 min-w-[64px]
                                ${isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''}`} />
                            <span className="text-[10px] font-medium leading-none">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
