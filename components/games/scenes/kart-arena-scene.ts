
import Phaser from 'phaser';
import { NetworkManager, PlayerInput } from '../engine/network-manager';

export default class KartArenaScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    private otherPlayers: { [id: string]: Phaser.GameObjects.Image } = {};
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private network!: NetworkManager;
    private userId!: string;
    private isHost: boolean = false;

    // Car Physics
    private speed = 0;
    private maxSpeed = 400;
    private acceleration = 10;
    private drag = 0.96;
    private turnSpeed = 3;

    constructor() {
        super({ key: 'KartArenaScene' });
    }

    init(data: { isHost: boolean; userId: string; network: NetworkManager }) {
        this.isHost = data.isHost;
        this.userId = data.userId;
        this.network = data.network;
    }

    preload() {
        const graphics = this.make.graphics({ x: 0, y: 0 });

        // Kart Sprite (Rectangle with "wheels")
        graphics.fillStyle(0xff8800, 1);
        graphics.fillRect(0, 0, 32, 48); // Body
        graphics.fillStyle(0x000000, 1);
        graphics.fillRect(-4, 4, 8, 12); // Wheels
        graphics.fillRect(28, 4, 8, 12);
        graphics.fillRect(-4, 32, 8, 12);
        graphics.fillRect(28, 32, 8, 12);
        graphics.generateTexture('kart_orange', 40, 48);

        graphics.clear();
        graphics.fillStyle(0x0088ff, 1);
        graphics.fillRect(0, 0, 32, 48);
        graphics.generateTexture('kart_blue', 40, 48);

        // Track
        graphics.clear();
        graphics.fillStyle(0x333333, 1);
        graphics.fillRect(0, 0, 64, 64);
        graphics.generateTexture('asphalt', 64, 64);
    }

    create() {
        this.add.tileSprite(0, 0, 3000, 3000, 'asphalt');
        this.physics.world.setBounds(0, 0, 3000, 3000);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        this.player = this.physics.add.image(1500, 1500, 'kart_orange');
        this.player.setCollideWorldBounds(true);
        this.player.setDrag(0.5); // Arcade drag
        this.cameras.main.startFollow(this.player);

        // Network Setup (reuse logic from Campus IO roughly)
        if (this.network) {
            this.network['events'].onStateUpdate = (state) => {
                Object.entries(state.players).forEach(([id, pState]) => {
                    if (id === this.userId) return;
                    if (!this.otherPlayers[id]) {
                        this.otherPlayers[id] = this.physics.add.image(pState.x, pState.y, 'kart_blue');
                    }
                    this.otherPlayers[id].setPosition(pState.x, pState.y);
                    this.otherPlayers[id].setRotation(pState.angle);
                });
            };

            // Host logic similar to Campus IO
            if (this.isHost) {
                this.time.addEvent({
                    delay: 50,
                    loop: true,
                    callback: () => {
                        const playersState: any = {};
                        playersState[this.userId] = { id: this.userId, x: this.player.x, y: this.player.y, angle: this.player.rotation, isAlive: true };
                        Object.entries(this.otherPlayers).forEach(([id, sprite]) => {
                            playersState[id] = { id, x: sprite.x, y: sprite.y, angle: sprite.rotation, isAlive: true };
                        });
                        this.network.broadcastState({ players: playersState, timestamp: Date.now() });
                    }
                });
            }
        }
    }

    update(time: number, delta: number) {
        // Car Physics (Drift/Stearing)
        if (this.cursors.up.isDown) {
            this.speed += this.acceleration;
        } else if (this.cursors.down.isDown) {
            this.speed -= this.acceleration;
        } else {
            this.speed *= this.drag;
        }

        // Cap Speed
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        if (this.speed < -this.maxSpeed / 2) this.speed = -this.maxSpeed / 2;

        // Steering (only when moving)
        if (Math.abs(this.speed) > 10) {
            if (this.cursors.left.isDown) {
                this.player.angle -= this.turnSpeed * (this.speed > 0 ? 1 : -1);
            } else if (this.cursors.right.isDown) {
                this.player.angle += this.turnSpeed * (this.speed > 0 ? 1 : -1);
            }
        }

        // Apply Velocity based on angle
        const vec = this.physics.velocityFromAngle(this.player.angle - 90, this.speed); // -90 because Sprite up is 0? Actually Phaser angle 0 is Right. Sprite up is -90 usually if drawn up. 
        // My sprite is drawn standard vertical? Graphics fillRect(0,0,32,48).
        // Let's assume standard Rotation.

        this.player.setVelocity(vec.x, vec.y);


        // Network Send
        if (!this.isHost && this.network) {
            const input: PlayerInput = {
                x: this.player.x,
                y: this.player.y,
                angle: this.player.rotation,
                actions: {},
                timestamp: time
            };
            // Rate limit
            if (time % 50 < delta) { // Roughly every 50ms
                this.network.sendInput(input);
            }
        }
    }
}
