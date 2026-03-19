'use client';

import { useAuth } from '@/lib/auth-context';
import { SiteHeader } from "@/components/site-header";
import { MainNav } from "@/components/main-nav";
import { Notifications } from "@/components/notifications";
import { CallManager } from "@/components/call-manager";
import { LocationManager } from "@/components/location-manager";
import { PresenceManager } from "@/components/presence-manager";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileNav } from "@/components/mobile-nav";
import { useLayout } from "@/lib/layout-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Menu } from "lucide-react";
import { useState, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { MobileShellSkeleton, FeedSkeleton } from "@/components/ui/skeletons";

export function AuthWrappers({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const { layout } = useLayout();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Check admin status for ErrorBoundary
    useEffect(() => {
        if (user) {
            user.getIdTokenResult().then(token => {
                if (token.claims.admin || token.claims.owner) {
                    setIsAdmin(true);
                }
            }).catch(() => { });
        }
    }, [user]);

    // List of paths that should NOT have the sidebar/header shell
    const EXCLUDED_PATHS = ['/login', '/signup', '/register', '/about', '/landing', '/reset-password'];
    const isExcluded = pathname && EXCLUDED_PATHS.some(path => pathname.startsWith(path));

    // Requirement: Hide navigation on onboarding page for new profiles
    if (pathname === '/onboarding' || isExcluded) {
        if (loading && pathname === '/onboarding') return <div className="min-h-screen bg-background"><FeedSkeleton /></div>;
        return (
            <main className="min-h-screen bg-background">
                {children}
            </main>
        );
    }

    // Optimistic UI: Show shell while loading OR if user exists.
    // This removes the "slow" feeling of waiting for auth to resolve before seeing the Nav bar.
    const showShell = user || loading;

    if (!showShell) {
        return <>{children}</>;
    }

    return (
        <div className={`min-h-[100dvh] transition-all duration-300 ${layout === 'sidebar' ? 'md:pl-64' : ''}`}>
            {layout === 'sidebar' && (
                <>
                    <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                    {/* Mobile Overlay */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}
                </>
            )}
            <SiteHeader onMenuClick={() => setIsSidebarOpen(true)} isSidebarOpen={isSidebarOpen} />
            <div className="flex flex-col flex-1 min-h-[100dvh] pb-16 lg:pb-0">
                <MainNav />
                <main className="flex-1 p-4 lg:p-6 transition-all duration-300 pb-safe">
                    <ErrorBoundary isAdmin={isAdmin}>
                        <Suspense fallback={<FeedSkeleton />}>
                            {loading ? <FeedSkeleton /> : children}
                        </Suspense>
                    </ErrorBoundary>
                    <Notifications />
                    <CallManager />
                    <LocationManager />
                    <PresenceManager />
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
