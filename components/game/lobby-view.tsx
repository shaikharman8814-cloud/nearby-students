"use client";

import { useState } from "react";
import { Player, GameState, toggleReady, startGame, leaveGame, Role } from "@/lib/game-service";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, User, Crown, CheckCircle2, Circle, ArrowLeft, Play, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LobbyViewProps {
    game: GameState;
    players: Player[];
    currentUser: Player | undefined;
}

export default function LobbyView({ game, players, currentUser }: LobbyViewProps) {
    const router = useRouter();
    const [isStarting, setIsStarting] = useState(false);

    // Derived state
    const isHost = currentUser?.isHost;
    const allReady = players.length >= 2 && players.every(p => p.isReady);

    const copyCode = () => {
        navigator.clipboard.writeText(game.id);
        toast.success("Room code copied!");
    };

    const handleToggleReady = async () => {
        if (!currentUser) return;
        try {
            await toggleReady(game.id, currentUser.uid, !currentUser.isReady);
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleStartGame = async () => {
        if (!isHost) return;
        if (players.length < 2) {
            toast.error("Need at least 2 players to start!");
            return;
        }

        setIsStarting(true);
        try {
            await startGame(game.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to start game");
            setIsStarting(false);
        }
    };

    const handleLeave = async () => {
        if (!currentUser) {
            router.push('/games/mafia');
            return;
        }
        if (confirm("Are you sure you want to leave?")) {
            await leaveGame(game.id, currentUser.uid);
            router.push('/games/mafia');
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black text-white relative overflow-hidden">

            {/* Space Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-20 left-10 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="absolute top-40 right-20 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.8s' }} />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[128px]" />
            </div>

            <div className="relative z-10 flex flex-col h-full max-w-lg mx-auto p-6 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <button onClick={handleLeave} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm border border-white/5">
                        <ArrowLeft className="w-6 h-6 text-white/80" />
                    </button>
                    <div className="text-center">
                        <h2 className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">Access Code</h2>
                        <button
                            onClick={copyCode}
                            className="text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 flex items-center justify-center gap-4 hover:scale-105 transition-transform group"
                        >
                            {game.id}
                            <Copy className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
                        </button>
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Players Grid */}
                <div className="flex-1 bg-black/40 rounded-[2rem] p-6 border border-white/10 overflow-hidden backdrop-blur-xl shadow-2xl relative">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 z-10 relative">
                        <h3 className="text-xl font-bold flex items-center gap-2 uppercase tracking-wider">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            Participants
                        </h3>
                        <span className="text-xs font-mono bg-white/10 px-3 py-1 rounded-full text-white/70 border border-white/5">
                            {players.length} / {game.maxPlayers}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 overflow-y-auto h-[calc(100%-3rem)] pr-1 custom-scrollbar">
                        <AnimatePresence mode='popLayout'>
                            {players.map((player, index) => (
                                <motion.div
                                    key={player.uid}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className={`
                                        relative group overflow-hidden
                                        min-h-[140px] rounded-2xl border flex flex-col items-center justify-center gap-3 p-4 transition-all duration-300
                                        ${player.isReady
                                            ? 'bg-gradient-to-br from-indigo-900/40 to-black border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                                            : 'bg-white/5 border-white/5 hover:bg-white/10'}
                                    `}
                                >
                                    {/* Scanline Effect */}
                                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />

                                    {/* Host Crown */}
                                    {player.isHost && (
                                        <div className="absolute top-2 right-2 p-1 bg-yellow-500/20 rounded-full border border-yellow-500/30">
                                            <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        </div>
                                    )}

                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className={`
                                            w-16 h-16 rounded-full p-0.5
                                            ${player.isReady ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 animate-spin-slow' : 'bg-white/10'}
                                        `}>
                                            {player.photoURL ? (
                                                <img src={player.photoURL} alt={player.displayName} className="w-full h-full rounded-full object-cover bg-zinc-900" />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center">
                                                    <User className="w-6 h-6 text-zinc-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Ready Status Icon */}
                                        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-black border-2 border-black z-10`}>
                                            {player.isReady ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500 fill-black" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-zinc-600 fill-black" />
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-center w-full z-10">
                                        <div className="text-sm font-bold truncate w-full text-white/90">
                                            {player.displayName}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mt-1">
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono text-white/50 border border-white/5">
                                                Lvl {player.level || 1}
                                            </span>
                                            {player.uid === currentUser?.uid && (
                                                <div className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold">Me</div>
                                            )}
                                        </div>
                                        {player.isReady && (
                                            <div className="text-[9px] uppercase tracking-widest text-indigo-400 font-bold mt-1 animate-pulse">Ready</div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-4 pt-2">
                    {isHost ? (
                        <button
                            onClick={handleStartGame}
                            disabled={players.length < 2 || isStarting}
                            className={`
                                w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all
                                ${players.length >= 2
                                    ? 'bg-gradient-to-r from-red-600 to-purple-600 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(220,38,38,0.4)] text-white'
                                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}
                            `}
                        >
                            {isStarting ? "Initializing..." : "Start Sequence"}
                            {!isStarting && <Play className="w-5 h-5 fill-current" />}
                        </button>
                    ) : (
                        <button
                            onClick={handleToggleReady}
                            className={`
                                w-full py-5 rounded-2xl font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all
                                ${currentUser?.isReady
                                    ? 'bg-white/10 text-white/60 hover:bg-white/20 border border-white/10'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:scale-[1.02]'}
                            `}
                        >
                            {currentUser?.isReady ? "Cancel Ready" : "Ready Up"}
                        </button>
                    )}

                    {players.length < 2 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center text-xs text-red-400 flex items-center justify-center gap-2 font-mono uppercase tracking-wide bg-red-900/10 p-2 rounded-lg border border-red-500/20"
                        >
                            <ShieldAlert className="w-3 h-3" />
                            Wait for {2 - players.length} more agent(s)
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

