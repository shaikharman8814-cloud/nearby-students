'use client';

import { useEffect, useRef } from 'react';
import { AudioAnalyzer } from '@/lib/audio-utils';

interface AudioVisualizerProps {
    stream: MediaStream | null;
    className?: string;
    isEnabled?: boolean;
}

export function AudioVisualizer({ stream, className = '', isEnabled = true }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyzerRef = useRef<AudioAnalyzer | null>(null);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stream || !isEnabled) {
            if (analyzerRef.current) analyzerRef.current.disconnect();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        if (!analyzerRef.current) {
            analyzerRef.current = new AudioAnalyzer();
        }

        analyzerRef.current.connect(stream);

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            const data = analyzerRef.current?.getFrequencyData();
            if (!data) {
                animationRef.current = requestAnimationFrame(draw);
                return;
            }

            // Clear with fade effect for trails
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) * 0.4;

            // Calculate average volume for scale
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            const average = sum / data.length;
            const scale = 1 + (average / 256) * 0.5;

            ctx.beginPath();
            ctx.strokeStyle = '#a855f7'; // Purple-500
            ctx.lineWidth = 3;

            // Draw circular wave
            for (let i = 0; i <= 360; i++) {
                const angle = (i * Math.PI) / 180;
                // Map angle to frequency index (0-360 -> 0-data.length)
                const dataIndex = Math.floor((i / 360) * data.length);
                const value = data[dataIndex] || 0;

                // Radius variation based on frequency data
                const r = radius * scale + (value / 255) * 30 * Math.sin(angle * 5 + Date.now() / 1000);

                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.stroke();

            // Glow effect
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#d8b4fe'; // Purple-300

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            analyzerRef.current?.disconnect();
        };

    }, [stream, isEnabled]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={100}
            className={`w-full h-full object-contain ${className}`}
        />
    );
}
