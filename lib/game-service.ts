import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    arrayUnion,
    increment,
    serverTimestamp,
    query,
    where,
    getDocs,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { UserProfile, getUserProfile, addXp } from './db';

// --- Types ---

export type GamePhase = 'LOBBY' | 'ROLE_ASSIGNMENT' | 'DAY_DISCUSSION' | 'DAY_VOTING' | 'NIGHT' | 'GAME_OVER';

export type Role = 'STUDENT' | 'MAFIA' | 'DETECTIVE' | 'DOCTOR'; // Extended with MVP extras if time permits

export interface Player {
    uid: string;
    displayName: string;
    photoURL?: string | null;
    isHost: boolean;
    isAlive: boolean;
    isReady: boolean;
    role?: Role; // Only visible to self or at end
    votesAgainst: number; // For voting phase
    hasVoted: boolean;    // For voting phase
    joinedAt: string;
    level?: number;
    xp?: number;
}

export interface GameState {
    id: string; // Room Code (e.g., ABCD)
    hostId: string;
    phase: GamePhase;
    round: number;
    winner?: 'STUDENTS' | 'MAFIA';
    createdAt: string;
    lastUpdated: string;
    maxPlayers: number;

    // Day/Night Cycle State
    timerEndTimestamp?: string; // ISO string for when phase ends
    narrative?: string; // "Player X was eliminated..."
}

// --- Data Service ---

// Generate a random 4-letter room code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, 1, O, 0 for clarity
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const createGame = async (hostUid: string, maxPlayers: number = 10) => {
    // 1. Get Host Profile
    const hostProfile = await getUserProfile(hostUid);
    if (!hostProfile) throw new Error("Host profile not found");

    // 2. Generate Unique Code (Try twice just in case)
    let roomCode = generateRoomCode();
    let gameRef = doc(db, 'games', roomCode);
    let gameSnap = await getDoc(gameRef);

    if (gameSnap.exists()) {
        roomCode = generateRoomCode();
        gameRef = doc(db, 'games', roomCode);
    }

    // 3. Create Game Doc
    const newGame: GameState = {
        id: roomCode,
        hostId: hostUid,
        phase: 'LOBBY',
        round: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        maxPlayers
    };

    const hostPlayer: Player = {
        uid: hostUid,
        displayName: hostProfile.displayName || "Unknown Host",
        photoURL: hostProfile.photoURL || null, // Fix undefined
        isHost: true,
        isAlive: true,
        isReady: true, // Host is always ready
        votesAgainst: 0,
        hasVoted: false,
        joinedAt: new Date().toISOString()
    };

    const batch = writeBatch(db);
    batch.set(gameRef, newGame);

    // Add Host to 'players' subcollection
    const playerRef = doc(db, 'games', roomCode, 'players', hostUid);
    batch.set(playerRef, hostPlayer as any); // Type assertion if needed but cleaned object usually fine

    await batch.commit();

    return roomCode;
};

export const joinGame = async (gameId: string, userUid: string) => {
    const gameIdUpper = gameId.toUpperCase();
    const gameRef = doc(db, 'games', gameIdUpper);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) throw new Error("Room not found");

    const gameState = gameSnap.data() as GameState;
    if (gameState.phase !== 'LOBBY') throw new Error("Game has already started");

    // Check if full (Need count, usually stored in gameDoc or count collection)
    // For MVP, simplistic check via reading players (less efficient but fine for <15 players)
    const playersRef = collection(db, 'games', gameIdUpper, 'players');
    const playersSnap = await getDocs(playersRef);
    if (playersSnap.size >= gameState.maxPlayers) throw new Error("Room is full");

    // Check if already joined
    if (playersSnap.docs.some(d => d.id === userUid)) return gameIdUpper; // Already joined, just return

    const userProfile = await getUserProfile(userUid);

    const newPlayer: Player = {
        uid: userUid,
        displayName: userProfile?.displayName || "Student",
        photoURL: userProfile?.photoURL || null, // Fix undefined
        isHost: false,
        isAlive: true,
        isReady: false,
        votesAgainst: 0,
        hasVoted: false,
        joinedAt: new Date().toISOString(),
        level: userProfile?.level || 1,
        xp: userProfile?.xp || 0
    };

    await setDoc(doc(playersRef, userUid), newPlayer as any);
    return gameIdUpper;
};

export const toggleReady = async (gameId: string, playerId: string, isReady: boolean) => {
    const playerRef = doc(db, 'games', gameId, 'players', playerId);
    await updateDoc(playerRef, { isReady });
};

export const leaveGame = async (gameId: string, playerId: string) => {
    // If Host leaves, we might need to close room or migrate host. 
    // MVP: Host leaves -> Game ends or broken (User Warning in Plan). 
    // Ideally delete player.
    const playerRef = doc(db, 'games', gameId, 'players', playerId);
    await deleteDoc(playerRef);
};

// --- Subscriptions ---

export const subscribeToGame = (gameId: string, callback: (game: GameState | null) => void) => {
    const gameRef = doc(db, 'games', gameId);
    return onSnapshot(gameRef, (snap) => {
        if (snap.exists()) {
            callback(snap.data() as GameState);
        } else {
            callback(null);
        }
    });
};

export const subscribeToPlayers = (gameId: string, callback: (players: Player[]) => void) => {
    const playersRef = collection(db, 'games', gameId, 'players');
    return onSnapshot(playersRef, (snap) => {
        const players = snap.docs.map(d => d.data() as Player);
        // Sort: Host first, then join time
        players.sort((a, b) => {
            if (a.isHost) return -1;
            if (b.isHost) return 1;
            return a.joinedAt.localeCompare(b.joinedAt);
        });
        callback(players);
    });
};

// --- Game Logic Actions (Host Only mainly) ---

export const startGame = async (gameId: string) => {
    const gameRef = doc(db, 'games', gameId);
    await updateDoc(gameRef, {
        phase: 'ROLE_ASSIGNMENT',
        round: 1,
        lastUpdated: new Date().toISOString()
    });
    // Triggers client-side role assignment logic
};

// Used by Host Client to save assigned roles
export const setPlayerRoles = async (gameId: string, roleMap: Record<string, Role>) => {
    const batch = writeBatch(db);

    Object.entries(roleMap).forEach(([uid, role]) => {
        // Store strictly in 'secrets' collection so opponents can't peek easily
        // (Assuming security rules will eventually block reads here)
        const secretRef = doc(db, 'games', gameId, 'secrets', uid);
        batch.set(secretRef, { role });
    });

    // Move to next phase
    const gameRef = doc(db, 'games', gameId);
    batch.update(gameRef, {
        phase: 'DAY_DISCUSSION',
        narrative: "Rise and shine! The Mafia is among us. Discuss and find them.",
        // 2 minutes discussion
        timerEndTimestamp: new Date(Date.now() + 120 * 1000).toISOString()
    });

    await batch.commit();
};

export const getMyRole = async (gameId: string, userId: string): Promise<Role | null> => {
    const secretRef = doc(db, 'games', gameId, 'secrets', userId);
    const snap = await getDoc(secretRef);
    if (snap.exists()) return snap.data().role as Role;
    return null;
};

// --- Gameplay Actions ---

export const castVote = async (gameId: string, voterId: string, targetId: string) => {
    const batch = writeBatch(db);

    // 1. Mark voter as having voted
    const voterRef = doc(db, 'games', gameId, 'players', voterId);
    batch.update(voterRef, { hasVoted: true });

    // 2. Increment votes on target
    if (targetId !== 'SKIP') {
        const targetRef = doc(db, 'games', gameId, 'players', targetId);
        batch.update(targetRef, { votesAgainst: increment(1) });
    }

    await batch.commit();
};

export const performNightAction = async (gameId: string, actorId: string, targetId: string, action: 'KILL' | 'SAVE' | 'INVESTIGATE') => {
    // For MVP, we store night actions in a subcollection to process at end of phase
    const actionRef = doc(db, 'games', gameId, 'actions', actorId);
    await setDoc(actionRef, {
        actorId,
        targetId,
        action,
        createdAt: new Date().toISOString()
    });
};

/*
 * HELPERS for Host Logic (to be called by Host Client)
 */

const checkWinCondition = async (gameId: string, players: Player[]) => {
    // Need to fetch roles to check win condition reliably (or trust we tracked them? We tracked them in secrets).
    // Host client doesn't know WHO is Mafia easily without fetching secrets again or keeping local state.
    // BUT, 'players' collection doesn't have roles.
    // Host CAN read 'secrets' collection if we allow it in rules or if we just fetch it.
    // Let's assume Host fetches all secrets at start or we just query count of alive mafia.

    // Better approach for MVP: Host fetches all secrets once at start and keeps in memory? 
    // Or we query secrets based on alive players.

    const secretsRef = collection(db, 'games', gameId, 'secrets');
    const secretsSnap = await getDocs(secretsRef);
    const roles: Record<string, Role> = {};
    secretsSnap.forEach(d => roles[d.id] = d.data().role as Role);

    let mafiaCount = 0;
    let studentCount = 0;

    players.forEach(p => {
        if (p.isAlive) {
            if (roles[p.uid] === 'MAFIA') mafiaCount++;
            else studentCount++;
        }
    });

    if (mafiaCount === 0) return 'STUDENTS';
    if (mafiaCount >= studentCount) return 'MAFIA';
    return null;
};

export const processDayResults = async (gameId: string, players: Player[]) => {
    // Find who has most votes
    let maxVotes = 0;
    let victimId: string | null = null;
    let isTie = false;

    players.forEach(p => {
        if (p.votesAgainst > maxVotes) {
            maxVotes = p.votesAgainst;
            victimId = p.uid;
            isTie = false;
        } else if (p.votesAgainst === maxVotes) {
            isTie = true;
        }
    });

    const batch = writeBatch(db);
    const gameRef = doc(db, 'games', gameId);
    let narrative = "The town could not agree on who to eliminate.";

    // Eliminate if strict majority (or custom rule). Let's say simple majority.
    if (victimId && !isTie && maxVotes > 0) {
        const victim = players.find(p => p.uid === victimId);
        narrative = `${victim?.displayName} was voted out.`;

        const victimRef = doc(db, 'games', gameId, 'players', victimId!);
        batch.update(victimRef, { isAlive: false });

        // Update local players array for win check immediately
        const vIndex = players.findIndex(p => p.uid === victimId);
        if (vIndex !== -1) players[vIndex].isAlive = false;
    }

    // Reset votes
    players.forEach(p => {
        const pRef = doc(db, 'games', gameId, 'players', p.uid);
        batch.update(pRef, { votesAgainst: 0, hasVoted: false });
    });

    // Check Win
    const winner = await checkWinCondition(gameId, players);
    if (winner) {
        batch.update(gameRef, {
            phase: 'GAME_OVER',
            winner,
            narrative: `Game Over! ${winner} Wins!`
        });

        // Award XP
        // Need roles to know who won
        const secretsRef = collection(db, 'games', gameId, 'secrets');
        const secretsSnap = await getDocs(secretsRef);
        const userRoles: Record<string, Role> = {};
        secretsSnap.forEach(d => userRoles[d.id] = d.data().role as Role);

        players.forEach(p => {
            const role = userRoles[p.uid];
            let isWinner = false;
            if (winner === 'MAFIA' && role === 'MAFIA') isWinner = true;
            if (winner === 'STUDENTS' && (role === 'STUDENT' || role === 'DETECTIVE' || role === 'DOCTOR')) isWinner = true;

            const xpAmount = isWinner ? 100 : 25;
            // Fire and forget XP update
            addXp(p.uid, xpAmount);
        });

    } else {
        // Move to Night
        batch.update(gameRef, {
            phase: 'NIGHT',
            narrative,
            timerEndTimestamp: new Date(Date.now() + 30 * 1000).toISOString() // 30s Night
        });
    }

    await batch.commit();
};

export const processNightResults = async (gameId: string) => {
    const actionsRef = collection(db, 'games', gameId, 'actions');
    const snap = await getDocs(actionsRef);

    const kills = new Set<string>();
    const saves = new Set<string>();

    snap.forEach(doc => {
        const data = doc.data();
        if (data.action === 'KILL') kills.add(data.targetId);
        if (data.action === 'SAVE') saves.add(data.targetId);
    });

    const victims: string[] = [];
    kills.forEach(target => {
        if (!saves.has(target)) {
            victims.push(target);
        }
    });

    const batch = writeBatch(db);
    victims.forEach(v => {
        const vRef = doc(db, 'games', gameId, 'players', v);
        batch.update(vRef, { isAlive: false });
    });

    // Cleanup actions
    snap.forEach(d => batch.delete(d.ref));

    // Get fresh players to check win
    const playersRef = collection(db, 'games', gameId, 'players');
    const pSnap = await getDocs(playersRef);
    const players = pSnap.docs.map(d => d.data() as Player);
    // Apply deaths locally
    victims.forEach(vId => {
        const p = players.find(p => p.uid === vId);
        if (p) p.isAlive = false;
    });

    // Check Win
    const winner = await checkWinCondition(gameId, players);

    const gameRef = doc(db, 'games', gameId);

    if (winner) {
        batch.update(gameRef, {
            phase: 'GAME_OVER',
            winner,
            narrative: `Game Over! ${winner} Wins!`
        });

        // Award XP
        const secretsRef = collection(db, 'games', gameId, 'secrets');
        const secretsSnap = await getDocs(secretsRef);
        const userRoles: Record<string, Role> = {};
        secretsSnap.forEach(d => userRoles[d.id] = d.data().role as Role);

        players.forEach(p => {
            const role = userRoles[p.uid];
            let isWinner = false;
            if (winner === 'MAFIA' && role === 'MAFIA') isWinner = true;
            if (winner === 'STUDENTS' && (role === 'STUDENT' || role === 'DETECTIVE' || role === 'DOCTOR')) isWinner = true;

            const xpAmount = isWinner ? 100 : 25;
            addXp(p.uid, xpAmount);
        });

    } else {
        // Move to Day
        const narrative = victims.length > 0
            ? `${victims.length} student(s) were found dead this morning.`
            : "It was a peaceful night. No one died.";

        batch.update(gameRef, {
            phase: 'DAY_DISCUSSION',
            round: increment(1),
            narrative,
            timerEndTimestamp: new Date(Date.now() + 60 * 1000).toISOString()
        });
    }

    await batch.commit();
};
