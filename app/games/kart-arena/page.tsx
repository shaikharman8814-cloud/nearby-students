"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { NetworkManager } from "@/components/games/engine/network-manager";
import GameCanvas from "@/components/games/game-canvas";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function KartArenaPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const joinCode = searchParams.get("code");

    // State
    const [network, setNetwork] = useState<NetworkManager | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [status, setStatus] = useState("Initializing Engine...");

    const initializingRef = useRef(false);

    useEffect(() => {
        if (!user) return;
        if (network || initializingRef.current) return;

        initializingRef.current = true;

        const initNetwork = async () => {
            const net = new NetworkManager({
                onConnect: (peerId) => setStatus(`Connected to Kart Server`),
                onPeerJoin: () => setStatus("Racer Joined!"),
            });

            try {
                const myId = await net.initialize(user.uid);

                if (joinCode) {
                    setStatus(`Joining Grid ${joinCode}...`);
                    net.connectToHost(joinCode);
                    setIsHost(false);
                    setRoomId(joinCode);
                } else {
                    setStatus(`Hosting GP: ${myId}`);
                    net.hostGame(myId);
                    setIsHost(true);
                    setRoomId(myId);
                }

                setNetwork(net);
            } catch (e) {
                console.error("Network Init Failed", e);
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

    if (!network || !roomId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-900 text-white">
                <p className="font-bold text-xl animate-pulse">{status}</p>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black relative">
            <GameCanvas
                gameId="kart-arena"
                config={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#18181b', // Zinc-900
                }}
                sceneData={{
                    isHost,
                    userId: user?.uid || "racer",
                    network: network
                }}
            />
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                <Link href="/network" className="pointer-events-auto inline-flex items-center gap-2 text-[10px] font-bold text-white/50 hover:text-white transition-colors uppercase tracking-widest bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/10 w-fit">
                    <ArrowLeft className="w-3 h-3" /> Back to Network
                </Link>
                <div className="text-white font-mono text-xs opacity-50">
                    GP CODE: {roomId}
                </div>
            </div>
        </div>
    );
}
