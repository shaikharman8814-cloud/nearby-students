'use client';

import { useAuth } from '@/lib/auth-context';

export function AuthDebugStatus() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="p-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse">
                <p className="text-sm text-gray-500">Loading Auth State...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="p-4 rounded bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900">
                <h3 className="font-semibold text-red-700 dark:text-red-400">Not Authenticated</h3>
                <p className="text-sm text-red-600 dark:text-red-300">Firebase Auth is initialized but no user is signed in.</p>
            </div>
        );
    }

    return (
        <div className="p-4 rounded bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900">
            <h3 className="font-semibold text-green-700 dark:text-green-400">Authenticated</h3>
            <p className="text-sm text-green-600 dark:text-green-300">Signed in as: {user.email || 'Anonymous'}</p>
            <p className="text-xs text-gray-500 mt-2">UID: {user.uid}</p>
        </div>
    );
}
