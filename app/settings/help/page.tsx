'use client';

import { HelpCircle, ArrowLeft, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function HelpSettingsPage() {
    return (
        <div className="max-w-xl mx-auto p-4 lg:p-8 space-y-6">
            <Link href="/settings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Settings
            </Link>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-500/10 rounded-full">
                    <HelpCircle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Support and Feedbak</h1>
                    <p className="text-sm text-muted-foreground">FAQs, Guides, and Contact</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* FAQs Section */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" /> Frequently Asked Questions
                    </h3>

                    <div className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium text-sm mb-1">How do I verify my student status?</h4>
                            <p className="text-xs text-muted-foreground">Go to your profile page and click the "Verify" badge to start the process using your college email.</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium text-sm mb-1">Who can see my profile?</h4>
                            <p className="text-xs text-muted-foreground">Currently, all authenticated students can see your basic profile. You can limit details in Privacy settings.</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <h4 className="font-medium text-sm mb-1">How do I delete my account?</h4>
                            <p className="text-xs text-muted-foreground">Please contact support directly to request permanent account deletion.</p>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-muted-foreground" /> Support and Feedbak
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Need help with something else? Reach out to our team.
                    </p>
                    <a
                        href="mailto:support@nearbystudents.com"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium text-sm"
                    >
                        <MailIcon className="w-4 h-4" />
                        Support and Feedbak
                    </a>
                </div>

                {/* Community Guidelines */}
                <div className="bg-card border rounded-xl p-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <ShieldCheckIcon className="w-4 h-4 text-muted-foreground" /> Community Guidelines
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        Read our guidelines to understand what is allowed on NearbyStudents.
                    </p>
                    <Link href="#" className="text-primary text-sm hover:underline flex items-center gap-1">
                        Read Guidelines <ExternalLink className="w-3 h-3" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

function MailIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    )
}

function ShieldCheckIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
