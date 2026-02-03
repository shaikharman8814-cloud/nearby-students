
import type { DataConnection, Peer } from 'peerjs';

// Types
export type PlayerInput = {
    x: number;
    y: number;
    angle: number;
    actions: { [key: string]: boolean }; // e.g., { fire: true, drift: false }
    timestamp: number;
};

export type PlayerState = {
    id: string;
    x: number;
    y: number;
    angle: number;
    health: number;
    score: number;
    isAlive: boolean;
    name?: string;
    color?: string;
    role?: 'IT' | 'RUNNER' | 'SPECTATOR';
    custom?: any;
};

export type GameStateSnapshot = {
    players: { [id: string]: PlayerState };
    powerups: { [id: string]: { x: number, y: number, type: string } };
    timestamp: number;
    // Add generic objects like projectiles later
};

export type NetworkEvents = {
    onConnect?: (peerId: string) => void;
    onDisconnect?: () => void;
    onPeerJoin?: (conn: DataConnection) => void;
    onPeerLeave?: (peerId: string) => void;
    onInput?: (peerId: string, input: PlayerInput) => void;
    onStateUpdate?: (state: GameStateSnapshot) => void;
};

export class NetworkManager {
    private peer: Peer | null = null;
    private connections: { [peerId: string]: DataConnection } = {};
    private isHost: boolean = false;
    public events: NetworkEvents = {};

    constructor(events: NetworkEvents) {
        this.events = events;
    }

    async initialize(userId: string): Promise<string> {
        const { default: Peer } = await import('peerjs');

        return new Promise((resolve, reject) => {
            // Ensure check for existing instance if re-initializing aggressively
            if (this.peer) {
                this.peer.destroy();
            }

            // Using a random ID if userId not provided, or a specific one?
            // Usually PeerJS takes an ID or generates one.
            this.peer = new Peer(userId ? `GAME_${userId}_${Math.random().toString(36).substr(2, 5)}` : undefined as any, {
                debug: 0 // Silence internal errors
            });

            this.peer.on('open', (id) => {
                console.log('PeerJS initialized with ID:', id);
                resolve(id);
            });

            this.peer.on('disconnected', () => {
                console.warn('PeerJS disconnected from server. Attempting reconnect...');
                this.peer?.reconnect();
            });

            this.peer.on('close', () => {
                this.peer = null;
            });

            this.peer.on('connection', (conn) => {
                this.handleIncomingConnection(conn);
            });

            this.peer.on('error', (err: any) => {
                // Suppress "Lost connection" noise
                if (err?.type === 'network' || err?.message?.includes('Lost connection')) {
                    return;
                }
                console.error('PeerJS Error:', err);
                reject(err);
            });
        });
    }

    hostGame(roomId: string) {
        this.isHost = true;
        // In this simple P2P model, the Host's Peer ID *is* the Room ID broadly speaking, 
        // OR we use a registry. 
        // For MVP: We can try to use a deterministic ID for the room if PeerJS allows, 
        // but typically we let PeerJS generate ID and share it.
        // If we want "Join by Code", we might need a signaling server or Firestore to map Code -> PeerID.
        // Let's assume passed roomId is the PeerID for now or we map it externally.
    }

    connectToHost(hostPeerId: string) {
        if (!this.peer) return;
        this.isHost = false;
        const conn = this.peer.connect(hostPeerId);
        this.handleIncomingConnection(conn);
    }

    private handleIncomingConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log('Connected to:', conn.peer);
            this.connections[conn.peer] = conn;
            this.events.onPeerJoin?.(conn);
        });

        conn.on('data', (data: any) => {
            this.stats.received++;
            this.logStats();
            if (this.isHost) {
                // Host receives Input from Clients
                if (data.type === 'INPUT') {
                    this.events.onInput?.(conn.peer, data.payload);
                }
            } else {
                // Client receives State from Host
                if (data.type === 'STATE') {
                    this.events.onStateUpdate?.(data.payload);
                }
            }
        });

        conn.on('close', () => {
            console.log('Connection closed:', conn.peer);
            delete this.connections[conn.peer];
            this.events.onPeerLeave?.(conn.peer);
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
        });
    }

    // Debug Stats
    private stats = { sent: 0, received: 0, lastLog: 0 };

    private logStats() {
        const now = Date.now();
        if (now - this.stats.lastLog > 1000) {
            console.log(`[Network] Sent: ${this.stats.sent}/s | Recv: ${this.stats.received}/s | Conns: ${Object.keys(this.connections).length}`);
            this.stats.sent = 0;
            this.stats.received = 0;
            this.stats.lastLog = now;
        }
    }

    sendInput(input: PlayerInput) {
        if (this.isHost) return; // Host processes input locally
        // Send to Host
        const hostPeerId = Object.keys(this.connections)[0]; // Assuming only connected to Host
        if (hostPeerId && this.connections[hostPeerId]) {
            this.connections[hostPeerId].send({ type: 'INPUT', payload: input });
            this.stats.sent++;
            this.logStats();
        }
    }

    broadcastState(state: GameStateSnapshot) {
        if (!this.isHost) return;
        // Broadcast to all clients
        Object.values(this.connections).forEach(conn => {
            if (conn.open) {
                conn.send({ type: 'STATE', payload: state });
                this.stats.sent++;
            }
        });
        this.logStats();
    }

    cleanup() {
        this.peer?.destroy();
        this.connections = {};
    }
}
