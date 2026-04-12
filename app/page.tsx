'use client';

import { Check, MapPin, Rocket, Search, MessageSquare, Bell, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { handleLogin } from '@/lib/login-utils';
import { useAuth } from '@/lib/auth-context';
import { DiscoveryFeed } from '@/components/discovery-feed';
import { FeedSkeleton } from '@/components/ui/skeletons';

export default function Home() {
    const { user, loading } = useAuth();
    const [showPopup, setShowPopup] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [liveUsers, setLiveUsers] = useState(1284);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const updateUsers = () => {
            setLiveUsers(prev => prev + Math.floor(Math.random() * 4) + 1);
            timeout = setTimeout(updateUsers, Math.random() * 3000 + 2000);
        };
        timeout = setTimeout(updateUsers, 3000);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            const timer = setTimeout(() => {
                setShowPopup(true);
            }, 5000); // 5 sec
            return () => clearTimeout(timer);
        }
    }, [loading, user]);

    const closePopup = () => {
        setShowPopup(false);
    };

    // DEBUG FAST: temporary Auth state log as requested by user
    if (typeof window !== 'undefined') {
        console.log("loading:", loading);
        console.log("user:", user);
    }

    return (
        <>
            {loading ? (
                <div className="min-h-screen bg-background"><FeedSkeleton /></div>
            ) : user ? (
                <DiscoveryFeed />
            ) : (
                <main className="relative min-h-[100dvh] bg-[#000000] text-white flex flex-col items-center px-4 overflow-x-hidden font-sans">
                    {/* Floating Header for Landing Page */}
                    <header className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 flex items-center justify-between backdrop-blur-md bg-black/20 border-b border-white/5">
                        <div className="flex items-center gap-6">
                            <Link href="/" className="font-bold text-lg tracking-tight">SocialNet</Link>

                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className={`flex items-center gap-1.5 text-[13px] font-medium transition-all py-1 px-3 rounded-full border ${isDropdownOpen ? 'bg-white text-black border-white' : 'text-gray-400 hover:text-white bg-white/5 border-white/10 hover:border-white/20'}`}
                                >
                                    Click <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isDropdownOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsDropdownOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-3 w-48 bg-[#0D0D0D] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                                            <Link
                                                href="https://aetheris.vercel.app"
                                                target="_blank"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium group/item"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                <span className="flex-1 text-gray-300 group-hover/item:text-white">Aetheris</span>
                                            </Link>
                                            <Link
                                                href="/"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium group/item"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                <span className="flex-1 text-gray-300 group-hover/item:text-white">SocialNet</span>
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={handleLogin} className="text-[13px] font-medium text-gray-400 hover:text-white transition-colors">Log in</button>
                            <button onClick={handleLogin} className="text-[13px] font-medium bg-white text-black px-4 py-1.5 rounded-full hover:bg-white/90 transition-all">Join free</button>
                        </div>
                    </header>
                    {/* Bottom Left Logo */}
                    <div className="absolute bottom-8 left-8 w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white font-medium text-sm z-50">
                        N
                    </div>

                    {/* Background Subtle Glow / Noise */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none z-0" />

                    <div className="relative max-w-6xl mx-auto w-full flex flex-col items-center flex-1 justify-center pt-24 pb-12 md:pt-16">

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

                                    <p className="mt-4 text-gray-500 text-xs font-medium tracking-wide flex items-center gap-1.5 opacity-80 select-none">
                                        ⚡️ Setup takes less than 10 seconds
                                    </p>

                                    {/* Live Connector Counter */}
                                    <div className="mt-12 flex flex-col items-center select-none">
                                        <div className="text-gray-200 font-medium text-[15px] sm:text-[16px] text-center flex flex-wrap items-center justify-center gap-1.5 px-4">
                                            🚀 <span className="text-white font-bold text-[17px] sm:text-[18px] tabular-nums tracking-tight">{liveUsers.toLocaleString()}</span> students are connecting right now — don't miss out
                                        </div>
                                        <div className="text-gray-500 text-[11px] uppercase tracking-widest mt-2 flex items-center gap-2">
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                            </span>
                                            Updating live...
                                        </div>
                                    </div>

                                    {/* Activity Signals */}
                                    <div className="mt-10 flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl mx-auto">
                                        <div className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] cursor-default transition-colors px-4 py-2 rounded-full border border-white/[0.08] backdrop-blur-md shadow-lg">
                                            <span className="relative flex h-2 w-2 mr-1">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                            </span>
                                            <span className="text-[13.5px] text-gray-300 font-medium"><span className="text-white font-semibold">23</span> students online near you</span>
                                        </div>

                                        <div className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] cursor-default transition-colors px-4 py-2 rounded-full border border-white/[0.08] backdrop-blur-md shadow-lg">
                                            <span className="text-[13.5px] text-gray-300 font-medium">👀 <span className="text-white font-semibold">5</span> new users joined in last hour</span>
                                        </div>

                                        <div className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] cursor-default transition-colors px-4 py-2 rounded-full border border-white/[0.08] backdrop-blur-md shadow-lg">
                                            <span className="text-[13.5px] text-gray-300 font-medium">📍 Showing students within <span className="text-white font-semibold">5 km</span></span>
                                        </div>
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

                    {/* Popup */}
                    {showPopup && (
                        <>
                            <style>{`
                                @keyframes slideUpFade {
                                    0% { transform: translate(-50%, 20px); opacity: 0; }
                                    100% { transform: translate(-50%, 0); opacity: 1; }
                                }
                                .fomo-popup {
                                    animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                                }
                            `}</style>
                            <div className="fomo-popup fixed bottom-8 md:bottom-10 left-1/2 w-[92vw] max-w-sm md:w-auto bg-[#1A1A1A] border border-white/10 px-4 md:px-5 py-3 rounded-2xl md:rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 z-[1000]">
                                <span className="text-[13px] md:text-[14.5px] font-medium text-white leading-tight drop-shadow-md flex-1">
                                    👀 Students near you are joining right now
                                </span>
                                <button
                                    onClick={closePopup}
                                    className="text-gray-400 hover:text-white transition-colors w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </main>
            )}
        </>
    );
}
