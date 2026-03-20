'use client';

import { Check, MapPin, Rocket, Search, MessageSquare, Bell } from 'lucide-react';
import Link from 'next/link';
import { handleLogin } from '@/lib/login-utils';
import { useAuth } from '@/lib/auth-context';
import { DiscoveryFeed } from '@/components/discovery-feed';
import { FeedSkeleton } from '@/components/ui/skeletons';

export default function Home() {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen bg-background"><FeedSkeleton /></div>;
    }

    if (user) {
        return <DiscoveryFeed />;
    }

    return (
        <main className="relative min-h-[100dvh] bg-[#000000] text-white flex flex-col items-center justify-center px-4 overflow-hidden font-sans">
            {/* Bottom Left Logo */}
            <div className="absolute bottom-8 left-8 w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white font-medium text-sm z-50">
                N
            </div>

            {/* Background Subtle Glow / Noise */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />

            <div className="relative max-w-6xl mx-auto w-full flex flex-col items-center flex-1 justify-center mt-12 md:mt-16">

                {/* hero-container */}
                <div className="relative w-full grid grid-cols-1 lg:grid-cols-2 lg:items-center">

                    {/* hero-content */}
                    <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left w-full lg:col-span-2">
                        <div className="flex flex-col items-center w-full">
                            {/* Top Badge */}
                            <div className="mb-6 flex items-center gap-2 text-[13px] font-medium text-gray-300 bg-white/[0.02] border border-white/[0.08] pl-2 pr-4 py-1.5 rounded-full shadow-lg">
                                <div className="bg-green-500/10 rounded-full p-1 border border-green-500/20">
                                    <Check className="w-3 h-3 text-green-500" />
                                </div>
                                Verified Student Network
                            </div>

                            {/* Heading */}
                            <h1 className="text-5xl md:text-7xl font-semibold text-center tracking-tight text-white drop-shadow-sm">
                                Find your circle.
                            </h1>

                            {/* Subheading */}
                            <p className="mt-6 text-gray-400 text-lg md:text-xl text-center max-w-xl">
                                No fake profiles. Just real people around you.
                            </p>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full max-w-md mx-auto">
                                <button
                                    onClick={handleLogin}
                                    className="group bg-[#EFEFEF] hover:bg-white w-full sm:w-auto justify-center transition-colors text-black px-6 py-3.5 rounded-full font-medium flex items-center gap-2 text-sm"
                                >
                                    Get Started <span className="text-lg leading-none transition-transform group-hover:translate-x-1">→</span>
                                </button>

                                <Link
                                    href="/about"
                                    className="bg-black/50 hover:bg-white/5 w-full sm:w-auto justify-center transition-colors border border-white/[0.12] px-6 py-3.5 rounded-full text-gray-300 font-medium text-sm backdrop-blur-md"
                                >
                                    Explore Live Network
                                </Link>
                            </div>

                            {/* Online Counter */}
                            <div className="mt-8 text-sm text-gray-400 gap-2 flex items-center justify-center">
                                <span className="relative flex h-2 w-2">
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                43 students online right now
                            </div>
                        </div>
                    </div>

                    {/* preview-card */}
                    <div className="absolute left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 md:-right-[5%] lg:right-[2%] xl:right-[15%] top-[5%] md:top-[10%] scale-[0.4] sm:scale-50 md:scale-[0.65] lg:scale-[0.85] xl:scale-100 opacity-30 md:opacity-60 xl:opacity-100 z-0 select-none pointer-events-none fade-in transition-all duration-1000">

                        {/* Phone Back (Nearby Students List) */}
                        <div className="absolute top-0 left-0 w-[300px] h-[400px] bg-black border border-white/5 rounded-[2rem] shadow-2xl transform rotate-[8deg] opacity-80 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    <Search className="w-4 h-4 text-gray-500" /> Nearby Students
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded bg-white/10" />
                                    <Bell className="w-4 h-4 text-gray-500" />
                                </div>
                            </div>

                            {/* List Item 1 */}
                            <div className="flex gap-4 p-5 border-b border-white/[0.02]">
                                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/5" />
                                <div className="flex flex-col justify-center">
                                    <div className="text-white text-sm font-medium">Ishana</div>
                                    <div className="text-gray-500 text-xs mt-1">122 m • 15h ago</div>
                                </div>
                            </div>

                            {/* List Item 2 */}
                            <div className="flex gap-4 p-5">
                                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/5" />
                                <div className="flex flex-col justify-center">
                                    <div className="text-white text-sm font-medium">Aari</div>
                                    <div className="text-gray-500 text-xs mt-1">14 Year Aman Col...</div>
                                </div>
                            </div>
                        </div>

                        {/* Phone Front (Profile Card) */}
                        <div className="absolute top-28 left-20 w-[320px] h-[380px] bg-[#0A0A0A] border border-white/10 rounded-[2rem] shadow-2xl transform rotate-[4deg] flex flex-col overflow-hidden backdrop-blur-xl">
                            <div className="h-28 bg-white/[0.02] relative border-b border-white/[0.05]">
                                <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl bg-[#1A1A1A] border-4 border-[#0A0A0A]" />
                            </div>
                            <div className="p-6 pt-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-lg font-semibold text-white">Ishana</div>
                                        <div className="text-[11px] text-gray-400 mt-1">122 m • 15h ago</div>
                                        <div className="text-[11px] text-gray-500 mt-1">Aman College</div>
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium bg-white/[0.05] border border-white/[0.1] px-2 py-1 rounded flex items-center">
                                        Offline
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-col gap-2">
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-md px-3 py-2.5 flex items-center gap-2 text-xs text-gray-400">
                                        <Check className="w-3.5 h-3.5" /> Friendly
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-md px-3 py-2.5 flex items-center gap-2 text-xs text-gray-400">
                                        <Check className="w-3.5 h-3.5" /> Public
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <div className="px-5 bg-[#141414] border border-white/10 text-gray-300 rounded-lg py-2 flex items-center justify-center text-[11px] font-medium">
                                        Connect
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Three Cards */}
                <div className="grid md:grid-cols-3 gap-6 mt-16 w-full relative z-20 pb-10">
                    <div className="p-8 border border-white/[0.06] rounded-[1.5rem] bg-[#050505]/90 backdrop-blur-xl shadow-2xl transition-transform hover:-translate-y-1 duration-300 group">
                        <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6 group-hover:bg-white/[0.06] transition-colors">
                            <MapPin className="w-4 h-4 text-gray-400" />
                        </div>
                        <h3 className="text-[17px] font-medium text-white shadow-sm mb-3.5">Location Based</h3>
                        <p className="text-gray-400 text-sm leading-relaxed pr-4">
                            Find students in your city or college campus safely.
                        </p>
                    </div>

                    <div className="p-8 border border-white/[0.06] rounded-[1.5rem] bg-[#050505]/90 backdrop-blur-xl shadow-2xl transition-transform hover:-translate-y-1 duration-300 group">
                        <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6 group-hover:bg-white/[0.06] transition-colors">
                            <Check className="w-4 h-4 text-gray-400" />
                        </div>
                        <h3 className="text-[17px] font-medium text-white shadow-sm mb-3.5">Verified Peers</h3>
                        <p className="text-gray-400 text-sm leading-relaxed pr-4">
                            Connect only with verified students from your institution.
                        </p>
                    </div>

                    <div className="p-8 border border-white/[0.06] rounded-[1.5rem] bg-[#050505]/90 backdrop-blur-xl shadow-2xl transition-transform hover:-translate-y-1 duration-300 group">
                        <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6 group-hover:bg-white/[0.06] transition-colors">
                            <Rocket className="w-4 h-4 text-gray-400" />
                        </div>
                        <h3 className="text-[17px] font-medium text-white shadow-sm mb-3.5">Projects & Teams</h3>
                        <p className="text-gray-400 text-sm leading-relaxed pr-4">
                            Collaborate on nearby or remote projects to attract students & build skills.
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
