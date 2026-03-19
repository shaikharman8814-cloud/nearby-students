'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { createUserProfile } from '@/lib/db';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log(`[Signup Debug] Attempting Proxy Signup for: '${email}'`);

            // 1. Call our custom server-side proxy signup
            const res = await fetch('/api/auth/proxy-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName: name }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to create account');
                return;
            }

            // 2. Sign in on the client using the Custom Token from the server
            const { signInWithCustomToken } = await import('firebase/auth');
            await signInWithCustomToken(auth, data.customToken);

            router.push('/onboarding');
        } catch (err: any) {
            console.warn("--- PROXY SIGNUP ERROR ---");
            console.warn("Code:", err.code);
            console.warn("Message:", err.message);
            console.warn("----------------------------");

            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Create Account</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Join the exclusive student network</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
                                Full Name
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background/50 px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background/50 px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="mt-1 block w-full rounded-md border border-input bg-background/50 px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex flex-col gap-2 items-center text-center">
                            <p>{error}</p>
                            {error.includes('already registered') && (
                                <Link href="/login" className="font-semibold underline hover:bg-destructive/20 px-2 py-1 rounded">
                                    Go to Login
                                </Link>
                            )}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign Up'}
                        </button>
                    </div>
                </form>

                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:text-primary/90">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
