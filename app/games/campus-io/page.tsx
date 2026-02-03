"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { NetworkManager } from "@/components/games/engine/network-manager";
import GameCanvas from "@/components/games/game-canvas";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CampusIoPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const joinCode = searchParams.get("code");

    // State
    const [network, setNetwork] = useState<NetworkManager | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [roomId, setRoomId] = useState<string | null>(null);
    const [status, setStatus] = useState("Initializing...");

    const initializingRef = useRef(false);

    useEffect(() => {
        if (!user) return;
        if (network || initializingRef.current) return;

        initializingRef.current = true;

        const initNetwork = async () => {
            const net = new NetworkManager({
                onConnect: (peerId) => setStatus(`Connected as ${peerId}`),
                onPeerJoin: () => setStatus("Player Joined! Starting Game..."),
            });

            try {
                const myId = await net.initialize(user.uid);

                if (joinCode) {
                    setStatus(`Connecting to Room ${joinCode}...`);
                    net.connectToHost(joinCode);
                    setIsHost(false);
                    setRoomId(joinCode);
                } else {
                    setStatus(`Hosting Room: ${myId}`);
                    net.hostGame(myId);
                    setIsHost(true);
                    setRoomId(myId);
                }

                setNetwork(net);
            } catch (e) {
                console.error("Network Init Failed", e);
                setStatus("Connection Failed");
                initializingRef.current = false;
            }
        };

        initNetwork();

        return () => {
            // Only cleanup if we actually set state? 
            // Or better: don't cleanup immediately on unmount if we want to persist across hot reloads?
            // Actually, for games, we DO want cleanup.
            // But strict mode unmounts immediately. Ref persists.
            // If strict mode unmounts, we should kill the peer.
            // But if we kill it, the async init might still be running.
            // Complex. For now: simplest fix is just blocking double access.
            // Ideally we track the created peer in a ref too.
        };
    }, [user, joinCode]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            network?.cleanup();
        };
    }, [network]);

    if (!network || !roomId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="font-mono">{status}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black relative">
            <GameCanvas
                gameId="campus-io"
                config={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000000',
                }}
                sceneData={{
                    isHost,
                    userId: user?.uid || "anon",
                    network: network
                }}
            />

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                <Link href="/network" className="pointer-events-auto inline-flex items-center gap-2 text-[10px] font-bold text-white/50 hover:text-white transition-colors uppercase tracking-widest bg-black/40 backdrop-blur-sm p-2 rounded-lg border border-white/10 w-fit">
                    <ArrowLeft className="w-3 h-3" /> Back to Network
                </Link>
                <div className="text-white font-mono text-xs opacity-50">
                    ROOM: {roomId} <br />
                    ROLE: {isHost ? "HOST" : "CLIENT"} <br />
                    STATUS: {status}
                </div>
            </div>
        </div>
    );
}
