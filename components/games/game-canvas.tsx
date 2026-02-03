"use client";

import { useEffect, useRef } from 'react';
import type { Game } from 'phaser';

export default function GameCanvas({
    gameId,
    config,
    sceneData,
}: {
    gameId: string;
    config: Phaser.Types.Core.GameConfig;
    sceneData?: any;
}) {
    const gameRef = useRef<Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Dynamic import to avoid SSR issues with Phaser (window usage)
        let game: Game;
        const initGame = async () => {
            const Phaser = await import('phaser');
            const { default: CampusIoScene } = await import('./scenes/campus-io-scene');

            if (!containerRef.current) return;

            const { clientWidth, clientHeight } = containerRef.current;
            if (clientWidth === 0 || clientHeight === 0) {
                console.warn("GameCanvas: Container has 0 dimensions, skipping init");
                return;
            }

            const finalConfig: Phaser.Types.Core.GameConfig = {
                ...config,
                type: Phaser.CANVAS, // Force CANVAS to avoid WebGL Framebuffer incomplete errors
                parent: containerRef.current,
                scene: [CampusIoScene], // Add other scenes here
                width: Math.max(1, clientWidth),
                height: Math.max(1, clientHeight),
                scale: {
                    mode: Phaser.Scale.RESIZE,
                    autoCenter: Phaser.Scale.CENTER_BOTH,
                },
                physics: {
                    default: 'arcade',
                    arcade: {
                        gravity: { x: 0, y: 0 },
                        debug: false,
                    },
                },
            };

            game = new Phaser.Game(finalConfig);
            gameRef.current = game;

            // Pass data to the scene immediately after boot
            // We use a slight timeout or event listener, OR we just start the scene explicitly if strictly needed.
            // But Phaser's 'scene' config array auto-starts the first one.
            // Better way: Re-start the scene with data.
            game.events.once('ready', () => {
                const scene = game.scene.getScene('CampusIoScene');
                if (scene) {
                    scene.scene.restart(sceneData); // Restart to pass init data
                }
            });
        };

        initGame();

        return () => {
            if (game) {
                game.destroy(true);
            }
        };
    }, [gameId]); // Re-init if gameId changes, though usually we mount/unmount

    return (
        <div
            ref={containerRef}
            className="w-full h-full absolute inset-0 bg-black overflow-hidden"
        />
    );
}
