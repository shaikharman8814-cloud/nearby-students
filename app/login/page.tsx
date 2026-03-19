'use client';

import { useState, useMemo } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isReset, setIsReset] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    const googleProvider = useMemo(() => new GoogleAuthProvider(), []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const cleanEmail = email.trim();

            // 1. Call proxy login
            const res = await fetch('/api/auth/proxy-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Invalid email or password');
                setLoading(false);
                return;
            }

            const data = await res.json();
            const { signInWithCustomToken } = await import('firebase/auth');
            await signInWithCustomToken(auth, data.customToken);

            router.push('/');
        } catch (err: any) {
            console.warn("Login Error:", err);
            setError('Account login failed. Please try again.');
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email address.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            console.log(`[Reset Password] Requesting custom reset email for ${email}`);

            const res = await fetch('/api/auth/custom-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send reset email');
            }

            setSuccessMessage('Professional reset email sent! Check your inbox.');
        } catch (err: any) {
            console.warn("Reset Password Error:", err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await signInWithPopup(auth, googleProvider);

            // Successfully signed in. OnboardingGate will handle redirection based on profile status.
            router.push('/');
        } catch (err: any) {
            if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
                console.log("Google Login: Interrupted by user or duplicate request.");
                setLoading(false);
                return;
            } else if (err.code === 'auth/unauthorized-domain') {
                console.warn("Google Login Error:", err);
                setError('Domain not authorized. Go to Firebase Console -> Auth -> Settings -> Authorized Domains and add your current IP/Domain.');
            } else {
                console.warn("Google Login Error:", err);
                setError(err.message || 'Failed to sign in with Google');
            }
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        {isReset ? 'Reset Password' : 'Welcome Back'}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isReset
                            ? 'Enter your email to receive a reset link'
                            : 'Sign in to your account'}
                    </p>
                </div>

                {isReset ? (
                    <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
                        <div className="space-y-4">
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
                        </div>

                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                        {successMessage && <div className="text-green-500 text-sm text-center">{successMessage}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Send Reset Link'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setIsReset(false);
                                setError('');
                                setSuccessMessage('');
                            }}
                            className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Login
                        </button>
                    </form>
                ) : (
                    <>
                        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                            <div className="space-y-4">
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
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="password" className="block text-sm font-medium text-muted-foreground">
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setIsReset(true)}
                                            className="text-sm font-medium text-primary hover:text-primary/90"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="relative mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            required
                                            className="block w-full rounded-md border border-input bg-background/50 px-3 py-2 pr-10 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                                            ) : (
                                                <Eye className="h-4 w-4" aria-hidden="true" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {error && <div className="text-red-500 text-sm text-center">{error}</div>}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign in'}
                                </button>
                            </div>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="flex w-full justify-center items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
                        >
                            <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 0.507 5.387 0 12s5.36 12 12 12c3.627 0 6.627-1.2 9.493-3.893 2.827-2.693 3.2-6.613 2.88-8.24h-11.9z" fill="currentColor" /></svg>
                            Continue with Google
                        </button>


                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-semibold text-primary hover:text-primary/90">
                                Sign up
                            </Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
