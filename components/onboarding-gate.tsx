'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserProfile } from '@/lib/db';
import { handleLogin } from '@/lib/login-utils';

const PUBLIC_PATHS = ['/login', '/about', '/signup', '/register', '/onboarding', '/reset-password'];

export function OnboardingGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
    const [checkingProfile, setCheckingProfile] = useState(true);

    // Check user's profile completion status
    useEffect(() => {
        async function checkProfile() {
            if (!user) {
                setProfileCompleted(null);
                setCheckingProfile(false);
                return;
            }

            // The library's 3s timeout is sufficient, but we add one more here for absolute safety
            const safetyTimeout = setTimeout(() => {
                setCheckingProfile(current => {
                    if (current) {
                        console.warn("[OnboardingGate] Check timed out after 10s");
                        return false;
                    }
                    return current;
                });
            }, 10000);

            try {
                const profile = await getUserProfile(user.uid);

                if (profile) {
                    // Logic: Explicitly incomplete? show banner. Missing flag or true? complete.
                    setProfileCompleted(profile.profileCompleted !== false);
                } else {
                    // Timeout or doesn't exist? resolve(null) as per mandatory rule 2
                    // App continues rendering non-blocked.
                    setProfileCompleted(null);
                }
            } catch (error) {
                setProfileCompleted(null);
            } finally {
                clearTimeout(safetyTimeout);
                setCheckingProfile(false);
            }
        }

        if (!loading) {
            checkProfile();
        } else {
            setCheckingProfile(true);
        }
    }, [user, loading]);

    // REDIRECTS REMOVED: Profile status is now non-blocking as per strict requirement.
    // Redirection to /onboarding or any blocking logic is forbidden.

    // Handler: User clicks "Get Started"
    const handleGetStarted = () => {
        handleLogin();
    };

    // 1. Public Path? Pass through.
    const isPublicPath = pathname === '/' || PUBLIC_PATHS.some(path => pathname.startsWith(path));
    if (pathname && isPublicPath) {
        return <>{children}</>;
    }

    // 2. Not logged in?
    if (!loading && !user) {
        if (typeof window !== 'undefined') {
            handleLogin();
        }
        return null;
    }

    // 3. Authenticated? ALWAYS render children immediately (NON-BLOCKING)
    // We only show a non-intrusive banner if the profile is incomplete.
    return (
        <>
            {user && profileCompleted === false && !checkingProfile && (
                <div className="bg-primary/10 border-b border-primary/20 p-3 sticky top-0 z-[100] backdrop-blur-md">
                    <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-primary">
                            <span className="font-semibold">Finish setting up your profile to connect with others!</span>
                        </div>
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full font-medium hover:bg-primary/90 transition-colors"
                        >
                            Complete Profile
                        </button>
                    </div>
                </div>
            )}
            {/* Show a skeleton OR nothing while auth is resolving, but once user exists, pass through */}
            {loading ? (
                <div className="h-screen flex items-center justify-center bg-background text-muted-foreground animate-pulse">
                    <Loader2 className="animate-spin h-6 w-6" />
                </div>
            ) : children}
        </>
    );
}
