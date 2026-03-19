"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { NetworkManager } from "@/components/games/engine/network-manager";
import GameCanvas from "@/components/games/game-canvas";
import { useAuth } from "@/lib/auth-context";
import { Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ArenaTagPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const joinCode = searchParams.get("code");

    // State
    const [network, setNetwork] = useState<NetworkManager | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [status, setStatus] = useState("Initializing Arena...");

    // We can use this to show a simple Lobby before starting if needed, 
    // or just jump straight in. For MVP, we stick to the plan: Jump in, but maybe a "Start" overlay for Host?
    const [gamePhase, setGamePhase] = useState<'LOBBY' | 'PLAYING' | 'GAME_OVER'>('LOBBY');

    const initializingRef = useRef(false);

    useEffect(() => {
        if (!user) return;
        if (network || initializingRef.current) return;

        initializingRef.current = true;

        const initNetwork = async () => {
            // Initialize Manager
            const net = new NetworkManager({
                onConnect: (peerId) => setStatus(`Connected to Arena Server`),
                onPeerJoin: () => {
                    setStatus("Player Joined!");
                    toast.success("A challenger has entered!");
                },
                onPeerLeave: () => {
                    toast("Player disconnected");
                }
            });

            try {
                // Initialize Peer
                const myId = await net.initialize(user.uid);

                if (joinCode) {
                    // JOINING
                    setStatus(`Joining Arena ${joinCode}...`);
                    net.connectToHost(joinCode);
                    setIsHost(false);
                    setRoomId(joinCode);
                    setGamePhase('PLAYING'); // Joiners jump in? Or wait for host? Let's say jump in for now.
                } else {
                    // HOSTING
                    setStatus(`Hosting Arena: ${myId}`);
                    net.hostGame(myId);
                    setIsHost(true);
                    setRoomId(myId);
                    setGamePhase('LOBBY'); // Host waits for people
                }

                setNetwork(net);
            } catch (e) {
                console.warn("Network Init Failed", e);
                setStatus("Connection Error");
                initializingRef.current = false;
            }
        };

        initNetwork();
    }, [user, joinCode]);

    useEffect(() => {
        return () => {
            network?.cleanup();
        };
    }, [network]);

    const copyCode = () => {
        if (roomId) {
            navigator.clipboard.writeText(window.location.href + "?code=" + roomId);
            toast.success("Invite Link Copied!");
        }
    };

    const startGame = () => {
        if (isHost && network) {
            // TODO: Send specific "START_GAME" event if we want synchronized countdown
            setGamePhase('PLAYING');
        }
    };

    if (!network || !roomId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="font-bold text-xl animate-pulse text-indigo-400">{status}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden touch-none">
            {/* Game Canvas */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${gamePhase === 'PLAYING' ? 'opacity-100' : 'opacity-30 blur-sm'}`}>
                <GameCanvas
                    gameId="arena-tag"
                    config={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000000',
                        physics: {
                            default: 'arcade',
                            arcade: {
                                gravity: { y: 0, x: 0 },
                                debug: false // Set true for debugging physics
                            }
                        }
                    }}
                    sceneData={{
                        isHost,
                        userId: user?.uid || "anon",
                        network: network,
                        roomId
                    }}
                />
            </div>

            {/* UI Overlay - Lobby / HUD */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Header */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
                    <Link href="/network" className="p-2 bg-white/10 backdrop-blur rounded-full hover:bg-white/20 transition-colors">
                        <ArrowLeft className="w-6 h-6 text-white" />
                    </Link>

                    {isHost && gamePhase === 'LOBBY' && (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-5">
                            <div className="text-xs text-white/50 uppercase tracking-widest">Share Code</div>
                            <button
                                onClick={copyCode}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-full font-mono font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                            >
                                {roomId}
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Host Start Button */}
                {isHost && gamePhase === 'LOBBY' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
                        <div className="text-center space-y-6">
                            <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600 italic tracking-tighter drop-shadow-2xl">
                                ARENA TAG
                            </h1>
                            <p className="text-white/60">Waiting for runners...</p>
                            <button
                                onClick={startGame}
                                className="px-12 py-4 bg-white text-black font-black text-2xl uppercase tracking-widest rounded-xl hover:scale-105 hover:bg-indigo-50 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)]"
                            >
                                START MATCH
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
