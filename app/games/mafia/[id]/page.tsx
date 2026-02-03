"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
    GameState,
    Player,
    subscribeToGame,
    subscribeToPlayers,
    setPlayerRoles,
    Role
} from "@/lib/game-service";
import LobbyView from "@/components/game/lobby-view";
import ActiveGameView from "@/components/game/active-game-view"; // We will create this next
import { Loader2 } from "lucide-react";

export default function GameRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // Unwrap params using React 19 'use' or standard await if content is async
    // Next 15+ params are async props often, but let's stick to safe 'use' or effect
    // Actually in Next 15 params is async. let's handle it.
    const { id } = use(params);

    const [game, setGame] = useState<GameState | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscriptions
    useEffect(() => {
        if (!id) return;

        // Subscribe to Game
        const unsubGame = subscribeToGame(id, (g) => {
            setGame(g);
            if (g === null) setLoading(false); // Game not found
        });

        // Subscribe to Players
        const unsubPlayers = subscribeToPlayers(id, (p) => {
            setPlayers(p);
            setLoading(false);
        });

        return () => {
            unsubGame();
            unsubPlayers();
        };
    }, [id]);

    // Handle Host Logic: Role Assignment
    useEffect(() => {
        if (!game || !user || !players || players.length < 2) return; // Min 2 players for testing

        // Only Host runs this
        if (game.hostId !== user.uid) return;

        // Check if we just entered ROLE_ASSIGNMENT phase
        if (game.phase === 'ROLE_ASSIGNMENT') {
            const assignRoles = async () => {
                // 1. Define Roles Distribution
                const playerCount = players.length;
                let mafiaCount = 1;
                if (playerCount >= 6) mafiaCount = 2; // 6-10 players = 2 Mafia
                // MVP: just Mafia and Students for now to simplify

                // 2. Shuffle Players
                const shuffled = [...players].sort(() => 0.5 - Math.random());

                const secrets: Record<string, Role> = {};

                shuffled.forEach((p, index) => {
                    if (index < mafiaCount) {
                        secrets[p.uid] = 'MAFIA';
                    } else {
                        secrets[p.uid] = 'STUDENT';
                    }
                });

                // 3. Save to DB
                await setPlayerRoles(game.id, secrets);
            };

            assignRoles();
        }
    }, [game?.phase, game?.hostId, user?.uid, players]);


    if (authLoading || loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black text-white">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!game) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Game Not Found</h1>
                <p className="text-zinc-400">This room does not exist or has ended.</p>
                <button
                    onClick={() => router.push('/games/mafia')}
                    className="bg-zinc-800 px-6 py-2 rounded-xl"
                >
                    Back to Lobby
                </button>
            </div>
        );
    }

    const currentUser = players.find(p => p.uid === user?.uid);

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden">
            {game.phase === 'LOBBY' ? (
                <LobbyView game={game} players={players} currentUser={currentUser} />
            ) : (
                <ActiveGameView game={game} players={players} currentUser={currentUser} />
            )}
        </div>
    );
}
