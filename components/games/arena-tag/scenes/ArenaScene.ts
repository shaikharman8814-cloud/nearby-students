import Phaser from 'phaser';
import { NetworkManager, PlayerInput, PlayerState, GameStateSnapshot } from '@/components/games/engine/network-manager';

interface SceneData {
    isHost: boolean;
    userId: string;
    network: NetworkManager;
    roomId: string;
}

interface PowerupState {
    id: string;
    x: number;
    y: number;
    type: 'SPEED' | 'SHIELD';
}

export default class ArenaScene extends Phaser.Scene {
    private isHost: boolean = false;
    private userId: string = '';
    private network!: NetworkManager;

    // Entities
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private otherPlayers!: Phaser.Physics.Arcade.Group;
    private otherPlayersMap: Map<string, Phaser.Types.Physics.Arcade.SpriteWithDynamicBody> = new Map();
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private powerupsGroup!: Phaser.Physics.Arcade.Group;
    private powerupsMap: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();

    // State (Host Only)
    private serverState: { [id: string]: PlayerState } = {};
    private serverPowerups: { [id: string]: PowerupState } = {};

    // Local Game State
    private mySpeedMultiplier: number = 1.0;

    // Input
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
    };

    constructor() {
        super({ key: 'ArenaScene' });
    }

    create(data: SceneData) {
        this.isHost = data.isHost;
        this.userId = data.userId;
        this.network = data.network;

        // 1. World Setup
        this.cameras.main.setBackgroundColor('#101015');
        this.physics.world.setBounds(0, 0, 1600, 1600);

        // Grid
        this.add.grid(800, 800, 1600, 1600, 64, 64, 0x18181b).setAlpha(0.2);
        this.add.grid(800, 800, 1600, 1600, 512, 512, 0x27272a).setAlpha(0.4);

        // Walls
        this.createWalls();

        // 2. Groups
        this.otherPlayers = this.physics.add.group();
        this.powerupsGroup = this.physics.add.group();

        // 3. Create Local Player
        this.createTextures();
        const startX = Phaser.Math.Between(200, 1400);
        const startY = Phaser.Math.Between(200, 1400);

        this.player = this.physics.add.sprite(startX, startY, 'player_runner');
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.0);
        this.player.setData('id', this.userId);
        this.player.setCircle(16);
        this.physics.add.collider(this.player, this.walls);

        // Camera
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.5);

        // 4. Input
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            }) as any;
        }

        // 5. Network Setup
        this.setupNetwork();

        // 6. Host Init
        if (this.isHost) {
            this.serverState[this.userId] = {
                id: this.userId,
                x: startX,
                y: startY,
                angle: 0,
                health: 100,
                score: 0,
                isAlive: true,
                role: 'IT'
            };
            this.player.setTexture('player_it'); // Visual feedback

            // Host Loop
            this.time.addEvent({
                delay: 50,
                callback: this.broadcastGameLoop,
                callbackScope: this,
                loop: true
            });

            // Powerup Spawner
            this.time.addEvent({
                delay: 5000,
                callback: this.spawnPowerup,
                callbackScope: this,
                loop: true
            });
        }
    }

    private createTextures() {
        // RUNNER
        const gRunner = this.make.graphics({ x: 0, y: 0 }, false);
        gRunner.fillStyle(0x6366f1, 1);
        gRunner.fillCircle(16, 16, 16);
        gRunner.lineStyle(2, 0xffffff, 0.5);
        gRunner.strokeCircle(16, 16, 16);
        gRunner.generateTexture('player_runner', 32, 32);

        // IT
        const gIt = this.make.graphics({ x: 0, y: 0 }, false);
        gIt.fillStyle(0xef4444, 1);
        gIt.fillCircle(16, 16, 16);
        gIt.lineStyle(2, 0xffffff, 1);
        gIt.strokeCircle(16, 16, 18);
        gIt.generateTexture('player_it', 32, 32);

        // WALL
        const gWall = this.make.graphics({ x: 0, y: 0 }, false);
        gWall.fillStyle(0x71717a, 1);
        gWall.fillRect(0, 0, 64, 64);
        gWall.lineStyle(2, 0x3f3f46, 1);
        gWall.strokeRect(0, 0, 64, 64);
        gWall.generateTexture('wall', 64, 64);

        // POWERUP (SPEED)
        const gSpeed = this.make.graphics({ x: 0, y: 0 }, false);
        gSpeed.fillStyle(0xeab308, 1); // Yellow
        gSpeed.fillCircle(12, 12, 12);
        gSpeed.generateTexture('powerup_speed', 24, 24);
    }

    private createWalls() {
        this.walls = this.physics.add.staticGroup();
        // Simple Maze
        // Center Block
        this.walls.create(800, 800, 'wall').setScale(4).refreshBody();
        // Random obstacles
        this.walls.create(400, 400, 'wall').setScale(2).refreshBody();
        this.walls.create(1200, 400, 'wall').setScale(2).refreshBody();
        this.walls.create(400, 1200, 'wall').setScale(2).refreshBody();
        this.walls.create(1200, 1200, 'wall').setScale(2).refreshBody();
    }

    private spawnPowerup() {
        if (!this.isHost) return;
        if (Object.keys(this.serverPowerups).length > 5) return; // Cap

        const id = `pu_${Date.now()}`;
        const x = Phaser.Math.Between(100, 1500);
        const y = Phaser.Math.Between(100, 1500);

        this.serverPowerups[id] = { id, x, y, type: 'SPEED' };
    }

    update(time: number, delta: number) {
        if (!this.player) return;

        // --- Movement ---
        const speed = 400 * this.mySpeedMultiplier;
        let vx = 0;
        let vy = 0;

        if (this.cursors?.left.isDown || this.wasd?.left.isDown) vx -= speed;
        if (this.cursors?.right.isDown || this.wasd?.right.isDown) vx += speed;
        if (this.cursors?.up.isDown || this.wasd?.up.isDown) vy -= speed;
        if (this.cursors?.down.isDown || this.wasd?.down.isDown) vy += speed;

        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        this.player.setVelocity(vx, vy);

        // --- Host Logic ---
        if (this.isHost) {
            // Update own state
            const myState = this.serverState[this.userId];
            if (myState) {
                myState.x = this.player.x;
                myState.y = this.player.y;
                myState.angle = this.player.angle;
            }

            this.checkTagging();
            this.checkPowerupsHost();
        } else {
            // --- Client Logic ---
            this.network.sendInput({
                x: this.player.x,
                y: this.player.y,
                angle: 0,
                actions: {},
                timestamp: Date.now()
            });
        }
    }

    private setupNetwork() {
        // HOST: Receive Input
        this.network.events.onInput = (peerId, input) => {
            if (!this.isHost) return;
            if (!this.serverState[peerId]) {
                this.serverState[peerId] = {
                    id: peerId, x: input.x, y: input.y, angle: input.angle,
                    health: 100, score: 0, isAlive: true, role: 'RUNNER'
                };
            } else {
                const p = this.serverState[peerId];
                p.x = input.x;
                p.y = input.y;
            }
        };

        // CLIENT/HOST: Receive State Update
        this.network.events.onStateUpdate = (snapshot) => {
            // Handle Players
            if (!this.isHost) {
                this.syncPlayers(snapshot.players);
            }
            // Handle Powerups (Both Host(for visuals only?) and Client)
            // Host already knows powerups, but good to sync anyway if we want strict authority logic elsewhere
            this.syncPowerups(snapshot.powerups);
        };

        // HOST: Handle Join
        this.network.events.onPeerJoin = (conn) => {
            if (!this.isHost) return;
            this.serverState[conn.peer] = {
                id: conn.peer,
                x: 800,
                y: 800,
                angle: 0,
                health: 100,
                score: 0,
                isAlive: true,
                role: 'RUNNER'
            };
        };

        this.network.events.onPeerLeave = (peerId) => {
            if (!this.isHost) return;
            delete this.serverState[peerId];
        };
    }

    private syncPlayers(players: { [id: string]: PlayerState }) {
        Object.values(players).forEach(pState => {
            if (pState.id === this.userId) {
                if (pState.role === 'IT') this.player.setTexture('player_it');
                else this.player.setTexture('player_runner');
                return;
            }
            let other = this.otherPlayersMap.get(pState.id);
            if (!other) {
                other = this.physics.add.sprite(pState.x, pState.y, pState.role === 'IT' ? 'player_it' : 'player_runner');
                other.setData('id', pState.id);
                this.otherPlayers.add(other);
                this.otherPlayersMap.set(pState.id, other);
            }
            other.setPosition(pState.x, pState.y);
            if (pState.role === 'IT' && other.texture.key !== 'player_it') other.setTexture('player_it');
            if (pState.role === 'RUNNER' && other.texture.key !== 'player_runner') other.setTexture('player_runner');
        });
    }

    private syncPowerups(powerups: { [id: string]: PowerupState }) {
        // Sync map
        const currentIds = new Set(Object.keys(powerups));

        // Remove old
        for (const [id, sprite] of this.powerupsMap) {
            if (!currentIds.has(id)) {
                sprite.destroy();
                this.powerupsMap.delete(id);
            }
        }

        // Add/Update new
        Object.values(powerups).forEach(p => {
            if (!this.powerupsMap.has(p.id)) {
                const sprite = this.powerupsGroup.create(p.x, p.y, 'powerup_speed');
                sprite.setData('id', p.id);
                sprite.setData('type', p.type);
                this.powerupsMap.set(p.id, sprite);

                // Add overlap for self logic (Client prediction for pickup? No, wait for Host)
                // Actually, if we overlap, we can't delete it until Host says so.
            }
        });
    }

    private checkTagging() {
        const players = Object.values(this.serverState);
        const itPlayer = players.find(p => p.role === 'IT');
        if (!itPlayer) return;

        players.forEach(p => {
            if (p.id !== itPlayer.id && p.role === 'RUNNER') {
                const dist = Phaser.Math.Distance.Between(itPlayer.x, itPlayer.y, p.x, p.y);
                if (dist < 32) {
                    itPlayer.role = 'RUNNER';
                    p.role = 'IT';
                }
            }
        });
    }

    private checkPowerupsHost() {
        const players = Object.values(this.serverState);
        const powerups = Object.values(this.serverPowerups);

        powerups.forEach(pu => {
            players.forEach(p => {
                const dist = Phaser.Math.Distance.Between(pu.x, pu.y, p.x, p.y);
                if (dist < 32) {
                    // Pickup!
                    delete this.serverPowerups[pu.id];
                    // Apply Effect (Need to communicate this to client? Or just stat update?)
                    // For MVP simplicity: Speed boost logic is local. 
                    // Host should ideally tell client "You got Speed Boost".
                    // For now, let's just delete it.
                    // If Host picked it up:
                    if (p.id === this.userId) {
                        this.activateSpeedBoost();
                    }
                }
            });
        });
    }

    private activateSpeedBoost() {
        this.mySpeedMultiplier = 1.5;
        this.time.delayedCall(3000, () => {
            this.mySpeedMultiplier = 1.0;
        });
    }

    private broadcastGameLoop() {
        if (!this.isHost) return;
        this.network.broadcastState({
            players: this.serverState,
            powerups: this.serverPowerups,
            timestamp: Date.now()
        });
    }
}
