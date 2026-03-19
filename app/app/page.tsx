'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DiscoveryFeed } from '@/components/discovery-feed';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    }

    if (user) {
        return (
            <div className="min-h-screen bg-background">
                <header className="border-b border-border p-4">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <Link href="/app" className="font-bold text-xl">Student One</Link>
                    </div>
                </header>
                <DiscoveryFeed />
            </div>
        );
    }

    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
}
