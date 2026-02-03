'use client';

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function MainNav() {
    const { user } = useAuth();
    const pathname = usePathname();

    // Do not render nav on login/signup/reset-password pages implicitly by auth check,
    // assuming unauthenticated users are on those pages.
    // However, if we want to be explicit or if we have public pages:
    // For now, simpler requirement is "not appear before sign or login".

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
                if (mounted) setIsVisible(true);
            }
        };
        checkVisibility();
        return () => { mounted = false; };
    }, [user]);

    if (!user || !isVisible || !pathname?.startsWith('/network')) {
        return null;
    }

    return (
        <div className="flex justify-center border-b py-2 gap-4 bg-muted/20">
            <Link href="/network" className={`text-sm font-medium transition-colors ${pathname === '/network' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>Network</Link>
            <Link href="/groups" className={`text-sm font-medium transition-colors ${pathname === '/groups' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>Groups</Link>
            <Link href="/games" className={`text-sm font-medium transition-colors ${pathname?.startsWith('/games') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}>Games</Link>
        </div>
    );
}
