'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LandingPageProps {
    onGetStarted?: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
    const router = useRouter();

    const handleStart = () => {
        if (onGetStarted) {
            onGetStarted();
        } else {
            router.push('/login');
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 lg:p-24 bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl transform-gpu will-change-transform" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl transform-gpu will-change-transform" />

            <div className="z-10 w-full max-w-7xl flex flex-col items-center text-center gap-8">

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border backdrop-blur-sm text-secondary-foreground">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Verified Student Network</span>
                </div>

                <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground">
                    Connect with students <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                        around you.
                    </span>
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    A private network for college students to find peers, collaborate, and connect based on location and campus.
                </p>

                <div className="flex gap-4 mt-4">
                    <button
                        onClick={handleStart}
                        className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        Get Started <ArrowRight className="w-4 h-4" />
                    </button>
                    <a href="/about" className="px-8 py-3 rounded-full bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors">
                        Learn More
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
                    <div className="p-6 rounded-2xl bg-card border border-border">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                            <MapPin className="w-5 h-5 text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Location Based</h3>
                        <p className="text-muted-foreground">Find students in your city or college campus safely.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-card border border-border">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                            <Users className="w-5 h-5 text-purple-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Verified Peers</h3>
                        <p className="text-muted-foreground">Connect only with verified students from your institution.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-card border border-border">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <Shield className="w-5 h-5 text-green-500" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Private & Safe</h3>
                        <p className="text-muted-foreground">No public feeds. Full control over who you connect with.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
