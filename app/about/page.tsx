'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Users, MapPin, Lock, GraduationCap, Rocket, Video } from 'lucide-react';
import { handleLogin } from '@/lib/login-utils';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border p-4 sticky top-0 bg-background/95 backdrop-blur z-10">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-secondary rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-bold text-xl">About Student Buzz</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-6 md:py-12 space-y-12">
                {/* Hero Section */}
                <section className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-2">
                        <GraduationCap className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">The Verified Student Network.</h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        Student Buzz is a private social network built exclusively for college students.
                        Connect with peers on your campus and in your city, verified by your institution.
                    </p>
                </section>

                {/* Features Grid */}
                <section className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-semibold">100% Verified</h3>
                        <p className="text-muted-foreground">
                            Every user is verified via their college email or student ID. No bots, no fakes, just real students.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-purple-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Location Based</h3>
                        <p className="text-muted-foreground">
                            Discover what's happening on your campus and at nearby colleges. Find study partners, events, and community.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Private & Secure</h3>
                        <p className="text-muted-foreground">
                            Your data stays within the network. Control your visibility and connect safely with peers.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-orange-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Community First</h3>
                        <p className="text-muted-foreground">
                            Share notes, ask doubts, finding housing, or just vent about finals. Built for student life.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Rocket className="w-5 h-5 text-cyan-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Project Collaboration</h3>
                        <p className="text-muted-foreground">
                            Discover and join student-led projects nearby or remotely. Build teams, collaborate on ideas, and level up your skills together.
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
                        <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
                            <Video className="w-5 h-5 text-pink-500" />
                        </div>
                        <h3 className="text-lg font-semibold">Live Calls & Video</h3>
                        <p className="text-muted-foreground">
                            Jump into encrypted voice and video calls with your peers instantly. Features anonymous modes to help break the ice safely.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-secondary/30 rounded-3xl p-8 text-center space-y-6 border border-border">
                    <h2 className="text-2xl font-bold">Ready to join?</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Get started today and be part of the fastest growing student community in your city.
                    </p>
                    <button
                        onClick={handleLogin}
                        className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                    >
                        Get Started
                    </button>
                </section>
            </main>
        </div>
    );
}
