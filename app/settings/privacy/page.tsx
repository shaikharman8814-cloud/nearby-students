'use client';

import { Shield, ArrowLeft, Eye, UserX, Lock, Globe } from 'lucide-react';
import Link from 'next/link';

export default function PrivacySettingsPage() {
    return (
        <div className="max-w-xl mx-auto p-4 lg:p-8 space-y-6">
            <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Link>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/10 rounded-full">
                    <Shield className="w-6 h-6 text-green-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Privacy</h1>
                    <p className="text-sm text-muted-foreground">Manage profile visibility and data</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Profile Visibility */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" /> Profile Visibility
                    </h3>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-transparent hover:border-border transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded-full">
                                <Globe className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Public Profile</p>
                                <p className="text-xs text-muted-foreground">Your profile is visible to all verified students.</p>
                            </div>
                        </div>
                        <div className="h-6 w-10 bg-primary rounded-full relative cursor-pointer">
                            <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-sm" />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 px-1">
                        Note: Basic info like name and college is always visible to connect with peers.
                    </p>
                </div>

                {/* Blocked Users */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <UserX className="w-4 h-4 text-muted-foreground" /> Blocked Accounts
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Manage the users you have blocked.
                    </p>
                    <button className="w-full py-2 bg-secondary/50 hover:bg-secondary text-secondary-foreground rounded-lg transition-colors text-sm font-medium">
                        View Blocked List
                    </button>
                </div>

                {/* Data Privacy */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" /> Data Privacy
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Your data is stored securely. We do not share your personal information with third parties without consent.
                    </p>
                    <Link href="#" className="text-primary text-sm hover:underline">
                        Read Privacy Policy
                    </Link>
                </div>
            </div>
        </div>
    );
}
