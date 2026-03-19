"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createGame, joinGame } from "@/lib/game-service";
import { Loader2, Users, ArrowRight, Play, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function MafiaLandingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [roomCode, setRoomCode] = useState("");
    const [error, setError] = useState("");

    const handleCreateGame = async () => {
        if (!user) return;
        setIsCreating(true);
        setError("");
        try {
            const code = await createGame(user.uid);
            router.push(`/games/mafia/${code}`);
        } catch (err) {
            console.warn(err);
            setError("Failed to create game. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !roomCode) return;
        setIsJoining(true);
        setError("");
        try {
            const code = await joinGame(roomCode, user.uid);
            router.push(`/games/mafia/${code}`);
        } catch (err: any) {
            console.warn(err);
            setError(err.message || "Failed to join game.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambient Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-900/20 blur-[120px] rounded-full" />
            </div>

            <Link href="/network" className="absolute top-8 left-8 z-20 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest">
                <ArrowLeft className="w-4 h-4" /> Back to Network
            </Link>

            <div className="max-w-md w-full z-10 space-y-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2"
                >
                    <div className="inline-block p-4 rounded-full bg-gradient-to-br from-red-600 to-purple-800 mb-4 shadow-2xl shadow-red-900/40">
                        <Users className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-400">
                        CAMPUS MAFIA
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Trust no one. Suspect everyone.
                    </p>
                </motion.div>

                <div className="grid gap-4">
                    {/* Create Game Button */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreateGame}
                        disabled={isCreating}
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-red-500/50 hover:bg-zinc-800/80 p-6 rounded-2xl flex items-center justify-between transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <Play className="w-6 h-6 fill-current" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    Create Room
                                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                                </h3>
                                <p className="text-sm text-zinc-500">Host a new game for your friends</p>
                            </div>
                        </div>
                    </motion.button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-black px-2 text-zinc-500">Or join existing</span>
                        </div>
                    </div>

                    {/* Join Game Form */}
                    <form onSubmit={handleJoinGame} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Enter Room Code"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                maxLength={4}
                                className="w-full bg-zinc-900 border border-zinc-800 text-center text-2xl font-mono tracking-[0.5em] p-4 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all uppercase placeholder:tracking-normal placeholder:text-zinc-600 placeholder:text-lg"
                            />
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={!roomCode || isJoining}
                            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isJoining ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" /> Joining...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    Join Game <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </motion.button>
                    </form>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-center text-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
