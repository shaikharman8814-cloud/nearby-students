"use client";

import { motion } from "framer-motion";
import { Gamepad2, Rocket, Users, Swords, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function GameHub() {
    const router = useRouter();
    const [joinCode, setJoinCode] = useState("");

    const games = [
        {
            id: "arena-tag",
            name: "Arena Tag",
            description: "High-speed tag with powerups.",
            icon: Swords,
            color: "from-blue-600 to-indigo-900",
            players: "2-10",
            route: "/games/arena-tag",
            isNew: true
        },
        {
            id: "mafia",
            name: "Mafia",
            description: "Social deduction and deception.",
            icon: Users,
            color: "from-red-600 to-rose-900",
            players: "4-15",
            route: "/games/mafia"
        },
        {
            id: "campus-io",
            name: "Campus.io",
            description: "Fast-paced top-down shooter arena.",
            icon: Rocket,
            color: "from-indigo-600 to-purple-900",
            players: "2-20",
            route: "/games/campus-io",
            tag: "COMING SOON"
        },
        {
            id: "kart-arena",
            name: "Kart Arena",
            description: "High-octane kart combat.",
            icon: Gamepad2,
            color: "from-orange-500 to-amber-700",
            players: "2-8",
            route: "/games/kart-arena",
            tag: "COMING SOON"
        }
    ];

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length < 4) {
            toast.error("Invalid room code");
            return;
        }
        // Logic to detect game type from code or just routing generic? 
        // For now, assuming Mafia if 4 letters, or we might need a prefix for new games.
        // Let's assume generic join for now, routing to a join handler.
        // Or simple: direct to Mafia for now as it's the main live game.
        router.push(`/games/mafia/${joinCode}`);
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 pb-24 font-sans">
            <header className="mb-8 pt-4">
                <Link href="/network" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors mb-4 uppercase tracking-widest">
                    <ArrowLeft className="w-3 h-3" /> Back to Network
                </Link>
                <h1 className="text-4xl font-black uppercase tracking-tighter bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                    Arcade
                </h1>
                <p className="text-zinc-400 font-medium">Real-time multiplayer zone</p>
            </header>

            {/* Join Game Input */}
            <form onSubmit={handleJoin} className="mb-10 relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Swords className="w-5 h-5 text-zinc-500" />
                </div>
                <input
                    type="text"
                    placeholder="Enter Room Code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-lg font-bold tracking-widest placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all uppercase"
                />
                <button
                    type="submit"
                    disabled={!joinCode}
                    className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-0 disabled:pointer-events-none text-white px-4 rounded-xl font-bold transition-all"
                >
                    JOIN
                </button>
            </form>

            <div className="grid gap-4">
                {games.map((game, i) => (
                    <motion.button
                        key={game.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => {
                            // Only allow navigation for active games
                            if (game.tag === "COMING SOON") {
                                toast.info("Coming soon!");
                                return;
                            }
                            router.push(game.route);
                        }}
                        className={`
                            relative group overflow-hidden rounded-3xl p-6 text-left border border-white/5
                            bg-gradient-to-br ${game.color}
                        `}
                    >
                        {/* Background Elements */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
                        <div className="absolute -right-4 -bottom-4 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
                            <game.icon className="w-32 h-32" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl">
                                    <game.icon className="w-8 h-8 text-white" />
                                </div>
                                {game.isNew && (
                                    <span className="px-3 py-1 bg-white text-black text-xs font-black uppercase tracking-wider rounded-full">
                                        New
                                    </span>
                                )}
                                {game.tag && (
                                    <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white/70 text-xs font-black uppercase tracking-wider rounded-full border border-white/10">
                                        {game.tag}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-2xl font-black uppercase tracking-wide mb-1 shadow-black drop-shadow-lg">
                                {game.name}
                            </h3>
                            <p className="text-white/80 text-sm font-medium leading-relaxed max-w-[80%] mb-4">
                                {game.description}
                            </p>

                            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-white/60">
                                <span className="flex items-center gap-1 bg-black/20 px-2 py-1 rounded-md">
                                    <Users className="w-3 h-3" />
                                    {game.players}
                                </span>
                                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white">
                                    Play Now <ArrowRight className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
