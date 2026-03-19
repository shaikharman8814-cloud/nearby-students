'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { sendEmailVerification, reload } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, CheckCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function VerifyEmail() {
    const { user } = useAuth();
    const [sending, setSending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        if (user) {
            setIsVerified(user.emailVerified);
        }
    }, [user]);

    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => setCooldown(c => c - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    const handleSendVerification = async () => {
        if (!user) return;
        setSending(true);
        try {
            await sendEmailVerification(user);
            toast.success("Verification email sent! Check your inbox.");
            setCooldown(60); // 1 minute cooldown
        } catch (error: any) {
            if (error.code === 'auth/too-many-requests') {
                toast.error("Too many requests. Please wait before retrying.");
                setCooldown(60); // Enforce cooldown on error too
            } else {
                console.warn(error); // Only log unknown errors
                toast.error("Failed to send email. Try again later.");
            }
        } finally {
            setSending(false);
        }
    };

    const handleRefreshStatus = async () => {
        if (!user) return;
        setRefreshing(true);
        try {
            await reload(user);

            if (user.emailVerified) {
                // Secure Update via Cloud Functions
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const functions = getFunctions();
                const verifyFn = httpsCallable(functions, 'verifyUserEmail');

                await verifyFn();
                setIsVerified(true);
                toast.success("Account Verified Successfully!");
            } else {
                toast.info("Not verified yet. Please check your email link.");
            }
        } catch (error: any) {
            console.warn("Refresh failed", error);
            toast.error("Failed to refresh status.");
        } finally {
            setRefreshing(false);
        }
    };

    if (!user) return null;

    if (isVerified) {
        return (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                        <p className="font-semibold text-green-800 dark:text-green-300">Verified Student</p>
                        <p className="text-xs text-green-700 dark:text-green-400/80">Your email is verified.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800 p-4 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-300">Verify your Account</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400/80">
                        Get the "Verified Student" badge by verifying your email address.
                    </p>
                </div>
            </div>

            <div className="flex gap-2 pl-8">
                <button
                    onClick={handleSendVerification}
                    disabled={sending || cooldown > 0}
                    className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-100 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                    {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Verify Account"}
                </button>
                <button
                    onClick={handleRefreshStatus}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-background border border-amber-200 dark:border-amber-800 text-xs font-semibold rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                >
                    {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    I verified, Refresh
                </button>
            </div>
        </div>
    );
}
