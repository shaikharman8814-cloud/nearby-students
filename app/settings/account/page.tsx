'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
// import { sendPasswordResetEmail } from 'firebase/auth'; // Removed in favor of custom API
import { auth } from '@/lib/firebase';
import { Loader2, Mail, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { VerifyEmail } from '@/components/verification/verify-email';

export default function AccountSettingsPage() {
    const { user } = useAuth();
    const [resetting, setResetting] = useState(false);

    const handlePasswordReset = async () => {
        if (!user || !user.email) return;

        // Confirm
        if (!confirm(`Send password reset email to ${user.email}?`)) return;

        setResetting(true);
        try {
            // Use the same custom API as the login page for consistent, high-quality emails
            const res = await fetch('/api/auth/custom-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send reset email');
            }

            toast.success("Professional reset email sent! Check your inbox.");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to send reset email");
        } finally {
            setResetting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-xl mx-auto p-4 lg:p-8 space-y-6">
            <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Link>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-500/10 rounded-full">
                    <Lock className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Account Security</h1>
                    <p className="text-sm text-muted-foreground">Manage your credentials and access</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Email Section */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" /> Email Address
                    </h3>
                    <div className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center mb-4">
                        <code className="text-sm">{user.email}</code>
                    </div>

                    {/* Verification Component */}
                    <VerifyEmail />

                    <p className="text-xs text-muted-foreground mt-3">
                        To change your email, please contact support.
                    </p>
                </div>

                {/* Password Section */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" /> Password
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        We will send a link to your email to reset your password.
                    </p>
                    <button
                        onClick={handlePasswordReset}
                        disabled={resetting}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                    >
                        {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        Send Reset Link
                    </button>
                </div>

                {/* Danger Zone removed for cleaner UI */}
            </div>
        </div>
    );
}
