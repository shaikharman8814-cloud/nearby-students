"use client";

import { useEffect, useState } from "react";
import {
    GameState,
    Player,
    Role,
    getMyRole,
    castVote,
    performNightAction,
    processDayResults,
    processNightResults
} from "@/lib/game-service";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Skull, Eye, Moon, Sun, Clock, Hand, HeartPulse, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

interface ActiveGameViewProps {
    game: GameState;
    players: Player[];
    currentUser: Player | undefined;
}

export default function ActiveGameView({ game, players, currentUser }: ActiveGameViewProps) {
    const [role, setRole] = useState<Role | null>(null);
    const [showRole, setShowRole] = useState(false); // Default to confidential/closed
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!currentUser) return;
        getMyRole(game.id, currentUser.uid).then(r => setRole(r));
    }, [game.id, currentUser?.uid]);

    // Phase Helpers
    const isNight = game.phase === 'NIGHT';
    const isDay = game.phase.startsWith('DAY');

    // Timer Logic
    const [timeLeft, setTimeLeft] = useState(0);
    useEffect(() => {
        if (!game.timerEndTimestamp) return;
        const interval = setInterval(() => {
            const end = new Date(game.timerEndTimestamp!).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.ceil((end - now) / 1000));
            setTimeLeft(diff);

            if (diff <= 0 && currentUser?.isHost && !isProcessing) {
                handlePhaseTimeout();
            }

            if (diff <= 0) clearInterval(interval);
        }, 1000);
        return () => clearInterval(interval);
    }, [game.timerEndTimestamp, currentUser?.isHost, game.phase]);

    const handlePhaseTimeout = async () => {
        if (isProcessing) return;
        if (game.phase === 'DAY_DISCUSSION') {
            await processDayResults(game.id, players);
        } else if (game.phase === 'NIGHT') {
            await processNightResults(game.id);
        }
    };

    const handleAction = async () => {
        if (!currentUser || !selectedPlayerId || !role) return;
        if (!currentUser.isAlive) return;
        setIsProcessing(true);

        try {
            if (isDay) {
                await castVote(game.id, currentUser.uid, selectedPlayerId);
                toast.success("Vote Cast");
            } else if (isNight) {
                if (role === 'MAFIA') {
                    await performNightAction(game.id, currentUser.uid, selectedPlayerId, 'KILL');
                    toast.success("Target Marked");
                } else if (role === 'DOCTOR') {
                    await performNightAction(game.id, currentUser.uid, selectedPlayerId, 'SAVE');
                    toast.success("Patient Secured");
                } else if (role === 'DETECTIVE') {
                    await performNightAction(game.id, currentUser.uid, selectedPlayerId, 'INVESTIGATE');
                    toast.success("Investigating...");
                }
            }
            setSelectedPlayerId(null);
        } catch (e) {
            toast.error("Action Failed");
            console.warn(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const canAct = currentUser?.isAlive && (
        (isDay && !currentUser.hasVoted) ||
        (isNight && role !== 'STUDENT')
    );

    // Dynamic Background Classes
    const bgClass = isNight
        ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black'
        : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400/20 via-slate-900 to-black';

    const accentColor = isNight ? 'text-indigo-400' : 'text-sky-400';
    const glowColor = isNight ? 'shadow-indigo-500/20' : 'shadow-sky-500/20';

    return (
        <div className={`h-full flex flex-col ${bgClass} transition-all duration-1000 relative overflow-hidden text-white`}>

            {/* Ambient Particles/Stars */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                <div className="absolute top-1/4 right-20 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-1/3 left-1/4 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                {isNight && (
                    <>
                        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
                    </>
                )}
                {isDay && (
                    <>
                        <div className="absolute top-0 left-1/2 w-[500px] h-[300px] bg-orange-500/10 rounded-full blur-[120px] -translate-x-1/2" />
                    </>
                )}
            </div>

            {/* Top Bar */}
            <div className="p-4 flex items-center justify-between z-20 backdrop-blur-md bg-black/20 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isNight ? 'bg-indigo-500/20' : 'bg-orange-500/20'}`}>
                        {isNight ? <Moon className="w-5 h-5 text-indigo-300" /> : <Sun className="w-5 h-5 text-orange-300" />}
                    </div>
                    <div>
                        <h2 className="font-black text-lg leading-none uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                            {game.phase.replace('_', ' ')}
                        </h2>
                        <p className="text-[10px] font-bold tracking-[0.2em] opacity-60 text-white">ROUND {game.round}</p>
                    </div>
                </div>

                <div className={`
                    flex items-center gap-2 font-mono text-xl font-bold 
                    ${timeLeft < 10 ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-white'}
                `}>
                    <Clock className="w-5 h-5" />
                    <span>0:{timeLeft.toString().padStart(2, '0')}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 overflow-y-auto pb-32 z-10 custom-scrollbar">

                {/* Role Dossier */}
                {!game.phase.includes('GAME_OVER') && (
                    <div className="mb-8 flex justify-center perspective-[1000px]">
                        <motion.button
                            initial={false}
                            animate={{ rotateX: showRole ? 180 : 0 }}
                            transition={{ duration: 0.6, type: "spring" }}
                            onClick={() => setShowRole(!showRole)}
                            className="relative w-full max-w-sm h-32 group cursor-pointer perspective-[1000px]"
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* Front (Hidden) */}
                            <div className="absolute inset-0 backface-hidden bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 shadow-2xl bg-[url('/noise.png')]">
                                <Shield className="w-8 h-8 opacity-20" />
                                <span className="text-sm font-bold uppercase tracking-[0.3em] opacity-50">Confidential Identity</span>
                                <span className="text-xs text-zinc-500">Tap to Reveal</span>
                                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            </div>

                            {/* Back (Revealed) */}
                            <div
                                className={`
                                    absolute inset-0 backface-visible rounded-2xl p-4 flex items-center gap-4 shadow-xl border overflow-hidden
                                    ${role === 'MAFIA' ? 'bg-red-950/90 border-red-500/30' : 'bg-blue-950/90 border-blue-500/30'}
                                `}
                                style={{ transform: 'rotateX(180deg)' }}
                            >
                                <div className={`
                                    w-20 h-20 rounded-xl flex items-center justify-center shrink-0
                                    ${role === 'MAFIA' ? 'bg-red-500/20' : 'bg-blue-500/20'}
                                `}>
                                    {role === 'MAFIA' ? <Skull className="w-10 h-10 text-red-500" /> : <Shield className="w-10 h-10 text-blue-500" />}
                                </div>
                                <div className="text-left">
                                    <h1 className={`text-2xl font-black uppercase tracking-widest ${role === 'MAFIA' ? 'text-red-500 drop-shadow-lg' : 'text-blue-400 drop-shadow-lg'}`}>
                                        {role}
                                    </h1>
                                    <p className="text-xs text-white/60 leading-tight">
                                        {role === 'MAFIA'
                                            ? "Eliminate students. Don't get caught."
                                            : "Find and vote out the Mafia."}
                                    </p>
                                </div>
                            </div>
                        </motion.button>
                    </div>
                )}

                {/* Narrative */}
                <AnimatePresence mode='wait'>
                    {game.narrative && (
                        <motion.div
                            key={game.narrative}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mb-8 text-center"
                        >
                            <p className="italic text-lg text-white/90 font-medium leading-relaxed drop-shadow-md">
                                "{game.narrative}"
                            </p>
                            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mt-4" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Players Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {players.map(player => {
                        const isSelected = selectedPlayerId === player.uid;
                        const isMe = currentUser?.uid === player.uid;
                        const isDead = !player.isAlive;

                        return (
                            <motion.button
                                key={player.uid}
                                whileHover={{ scale: isDead ? 1 : 1.02 }}
                                whileTap={{ scale: isDead ? 1 : 0.98 }}
                                disabled={isDead || !canAct || isMe}
                                onClick={() => setSelectedPlayerId(player.uid)}
                                className={`
                                    relative p-3 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300
                                    ${isDead ? 'opacity-40 grayscale blur-[1px]' : 'hover:bg-white/5'}
                                    ${isSelected
                                        ? `bg-white/10 border border-${isNight ? 'indigo' : 'sky'}-500/50 ring-2 ring-${isNight ? 'indigo' : 'sky'}-500/30`
                                        : 'bg-black/40 border border-white/5'}
                                `}
                            >
                                <div className="relative">
                                    <div className={`
                                        w-14 h-14 rounded-full p-0.5
                                        ${isSelected ? `bg-gradient-to-tr from-${isNight ? 'indigo' : 'sky'}-500 to-white animate-spin-slow` : 'bg-white/10'}
                                    `}>
                                        {player.photoURL ? (
                                            <img src={player.photoURL} className="w-full h-full rounded-full object-cover bg-zinc-900" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-zinc-800" />
                                        )}
                                    </div>

                                    {isDead && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full backdrop-blur-[1px]">
                                            <Skull className="w-6 h-6 text-zinc-300 drop-shadow-md" />
                                        </div>
                                    )}

                                    {/* Vote Count Badge */}
                                    {isDay && player.votesAgainst > 0 && (
                                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg ring-2 ring-black">
                                            {player.votesAgainst}
                                        </div>
                                    )}
                                </div>

                                <div className="text-center w-full">
                                    <div className="text-sm font-bold truncate w-full text-white/90">
                                        {player.displayName}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <span className="text-[10px] bg-white/10 px-1.5 rounded-sm font-mono text-white/60">
                                            LVL {player.level || 1}
                                        </span>
                                        {isMe && <div className="text-[9px] uppercase tracking-wider text-indigo-400 font-bold">You</div>}
                                    </div>
                                </div>

                                {isSelected && (
                                    <motion.div
                                        layoutId="selection-glow"
                                        className="absolute inset-0 rounded-2xl bg-white/5 -z-10"
                                    />
                                )}
                            </motion.button>
                        )
                    })}
                </div>

            </div>

            {/* Action Bar (Floating) */}
            {currentUser?.isAlive && !game.phase.includes('GAME_OVER') && (
                <div className="fixed bottom-6 left-4 right-4 z-50">
                    <div className="max-w-md mx-auto relative group">
                        {/* Glow Effect */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${isNight ? 'from-indigo-600 to-purple-600' : 'from-sky-500 to-blue-600'} rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`} />

                        <div className="relative bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-center justify-between pl-4 shadow-2xl">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Target</span>
                                <span className="text-sm font-medium text-white truncate max-w-[120px]">
                                    {selectedPlayerId
                                        ? players.find(p => p.uid === selectedPlayerId)?.displayName
                                        : "Select Player"}
                                </span>
                            </div>

                            {canAct ? (
                                <button
                                    onClick={handleAction}
                                    disabled={!selectedPlayerId || isProcessing}
                                    className={`
                                        px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg
                                        ${isNight && role === 'MAFIA' ? 'bg-gradient-to-r from-red-600 to-red-500 hover:shadow-red-500/20' : ''}
                                        ${isNight && role === 'DOCTOR' ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-green-500/20' : ''}
                                        ${isDay
                                            ? 'bg-white text-black hover:bg-zinc-200 hover:shadow-white/10'
                                            : !role || role === 'STUDENT' ? 'bg-zinc-700' : 'text-white'}
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    `}
                                >
                                    {isProcessing ? <span className="animate-pulse">...</span> : (
                                        <>
                                            {isDay && <><Hand className="w-4 h-4" /> VOTE</>}
                                            {isNight && role === 'MAFIA' && <><Skull className="w-4 h-4" /> KILL</>}
                                            {isNight && role === 'DOCTOR' && <><HeartPulse className="w-4 h-4" /> SAVE</>}
                                        </>
                                    )}
                                </button>
                            ) : (
                                <div className="px-4 py-3 text-xs text-white/40 italic">
                                    {currentUser.hasVoted && isDay ? "Vote submitted" : "Wait for phase..."}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Overlay */}
            <AnimatePresence>
                {game.phase === 'GAME_OVER' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: "spring", duration: 0.8 }}
                            className="max-w-sm w-full relative"
                        >
                            <div className={`absolute inset-0 blur-[100px] ${game.winner === 'MAFIA' ? 'bg-red-600/30' : 'bg-blue-600/30'}`} />

                            <div className="relative z-10">
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="mb-8"
                                >
                                    {game.winner === 'MAFIA' ? <Skull className="w-24 h-24 mx-auto text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" /> : <Shield className="w-24 h-24 mx-auto text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />}
                                </motion.div>

                                <h1 className="text-6xl font-black mb-2 tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                                    {game.winner === 'MAFIA' ? 'MAFIA WINS' : 'TOWN WINS'}
                                </h1>
                                <div className={`h-1 mx-auto w-24 mb-6 rounded-full ${game.winner === 'MAFIA' ? 'bg-red-500' : 'bg-blue-500'}`} />

                                <div className="mb-8 flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">Rewards</span>
                                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10">
                                        <Zap className="w-4 h-4 text-yellow-500" />
                                        <span className="font-mono font-bold text-yellow-400">
                                            {game.winner === 'MAFIA' && role === 'MAFIA' ? '+100 XP' :
                                                game.winner === 'STUDENTS' && role !== 'MAFIA' ? '+100 XP' : '+25 XP'}
                                        </span>
                                    </div>
                                </div>

                                <p className="text-zinc-400 mb-10 text-lg font-medium">
                                    {game.winner === 'MAFIA' ? "Darkness has taken over the campus." : "The students successfully defended the school."}
                                </p>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-xl"
                                    >
                                        Play Again
                                    </button>
                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="w-full py-4 bg-white/5 text-white rounded-xl font-bold hover:bg-white/10 transition-colors uppercase tracking-widest text-sm"
                                    >
                                        Exit to Home
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
