'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/');
    }, [router]);

    return (
        <div className="h-screen flex items-center justify-center bg-background">
            <div className="animate-pulse text-muted-foreground">Redirecting...</div>
        </div>
    );
}
