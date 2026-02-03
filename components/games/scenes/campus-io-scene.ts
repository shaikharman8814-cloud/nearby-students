
import * as Phaser from 'phaser';
import { NetworkManager, PlayerInput, GameStateSnapshot } from '../engine/network-manager';

export default class CampusIoScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    private otherPlayers: { [id: string]: Phaser.GameObjects.Image } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private network!: NetworkManager;
    private userId!: string;
    private isHost: boolean = false;
    private lastInputTime: number = 0;

    // Debug
    private fpsText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'CampusIoScene' });
    }

    init(data: { isHost: boolean; userId: string; network: NetworkManager }) {
        this.isHost = data.isHost;
        this.userId = data.userId;
        this.network = data.network;
    }

    preload() {
        // No assets to preload
    }

    create() {
        // Background - Use Grid GameObject instead of generating texture
        // Note: Grid origin is 0.5, 0.5 by default
        this.add.grid(1000, 1000, 2000, 2000, 64, 64, 0x000000).setOutlineStyle(0x333333);

        this.physics.world.setBounds(0, 0, 2000, 2000);

        // UI / Instructions
        const uiContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
        const instructions = this.add.text(20, 20,
            'Controls:\nMove: WASD / Arrows\nAim: Mouse\nShoot: Space', {
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 10, y: 10 }
        });
        uiContainer.add(instructions);

        // Debug FPS
        this.fpsText = this.add.text(10, 100, 'FPS: 0', {
            fontSize: '16px',
            color: '#00ff00',
            backgroundColor: '#000000'
        }).setScrollFactor(0).setDepth(200);

        // Setup Controls (WASD + Arrows)
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.input.keyboard.addKeys('W,A,S,D'); // Activate these keys
        }

        // Camera
        this.cameras.main.setBounds(0, 0, 2000, 2000);
        this.cameras.main.setZoom(1); // Default zoom

        // Create Local Player using Circle Shape
        const playerShape = this.add.circle(
            Math.random() * 1000 + 500,
            Math.random() * 1000 + 500,
            20, // Slightly larger
            0x00ff00
        );
        this.physics.add.existing(playerShape);
        this.player = playerShape as unknown as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

        // Fix body size for circle and Physics Props
        if (this.player.body) {
            const body = this.player.body as Phaser.Physics.Arcade.Body;
            body.setCircle(20);
            body.setCollideWorldBounds(true);

            // Physics Polish (Smoothness)
            body.setDrag(800); // Friction (Simulated)
            body.setMaxVelocity(400); // Terminal velocity
        }

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Smooth camera

        // Network Events
        if (this.network) {
            this.network['events'].onInput = (peerId, input) => {
                if (!this.otherPlayers[peerId]) {
                    // Create other player as circle
                    const otherShape = this.add.circle(input.x, input.y, 20, 0xff0000);
                    this.otherPlayers[peerId] = otherShape as unknown as Phaser.GameObjects.Image;
                }
                const other = this.otherPlayers[peerId];

                // Simple Interpolation could go here, for now snap
                other.setPosition(input.x, input.y);
            };

            this.network['events'].onStateUpdate = (state) => {
                Object.entries(state.players).forEach(([id, pState]) => {
                    if (id === this.userId) return;
                    if (!this.otherPlayers[id]) {
                        const otherShape = this.add.circle(pState.x, pState.y, 20, 0xff0000);
                        this.otherPlayers[id] = otherShape as unknown as Phaser.GameObjects.Image;
                    }
                    this.otherPlayers[id].setPosition(pState.x, pState.y);
                });
            };

            if (this.isHost) {
                this.time.addEvent({
                    delay: 50, // 20 ticks/sec
                    loop: true,
                    callback: () => {
                        const playersState: any = {};
                        // Add Host
                        playersState[this.userId] = {
                            id: this.userId,
                            x: this.player.x,
                            y: this.player.y,
                            angle: 0,
                            isAlive: true,
                            health: 100,
                            score: 0
                        };
                        // Add Clients
                        Object.entries(this.otherPlayers).forEach(([id, sprite]) => {
                            playersState[id] = {
                                id,
                                x: sprite.x,
                                y: sprite.y,
                                angle: 0,
                                isAlive: true,
                                health: 100,
                                score: 0
                            };
                        });
                        this.network.broadcastState({
                            players: playersState,
                            powerups: {},
                            timestamp: Date.now()
                        });
                    }
                });
            }
        }
    }

    update(time: number, delta: number) {
        // Update FPS
        if (this.fpsText) {
            this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}\nDelta: ${Math.round(delta)}ms`);
        }

        // 1. Process Input
        // Shooting
        if (this.input.keyboard?.addKey('SPACE').isDown && time > this.lastInputTime + 200) {
            const bullet = this.add.circle(this.player.x, this.player.y, 6, 0xffff00);
            this.physics.add.existing(bullet);
            this.physics.moveTo(bullet, this.input.activePointer.x + this.cameras.main.scrollX, this.input.activePointer.y + this.cameras.main.scrollY, 800);
            this.time.delayedCall(1000, () => bullet.destroy());
            this.lastInputTime = time; // Simple cooldown
        }

        // Local Movement (Physics Based)
        const acceleration = 1200;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const keys = this.input.keyboard?.addKeys('W,A,S,D') as any;

        if (body && keys && this.cursors) {
            // Reset acceleration
            body.setAcceleration(0);

            // Horizontal
            if (this.cursors.left.isDown || keys.A.isDown) {
                body.setAccelerationX(-acceleration);
            } else if (this.cursors.right.isDown || keys.D.isDown) {
                body.setAccelerationX(acceleration);
            } else {
                body.setAccelerationX(0); // Let Drag handle stopping
            }

            // Vertical
            if (this.cursors.up.isDown || keys.W.isDown) {
                body.setAccelerationY(-acceleration);
            } else if (this.cursors.down.isDown || keys.S.isDown) {
                body.setAccelerationY(acceleration);
            } else {
                body.setAccelerationY(0);
            }
        }

        // Send Input to Host (if Client)
        if (!this.isHost && this.network) {
            // Throttle network updates slightly (e.g., every 3rd frame or 50ms)
            // Using time check is better
            if (time % 60 < 20) { // Approx 20-30 times a sec
                // We are sending Position for MVP Client Auth
                const input: PlayerInput = {
                    x: this.player.x,
                    y: this.player.y,
                    angle: 0,
                    actions: {},
                    timestamp: time
                };
                this.network.sendInput(input);
            }
        }
    }
}
