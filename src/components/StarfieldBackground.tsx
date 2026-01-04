"use client";

import { useEffect, useRef } from "react";

/**
 * STARFIELD BACKGROUND
 * A clean, professional backdrop with slowly drifting stars.
 * Optimized: No connection lines, no complex mouse interactions.
 */

interface Star {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
}

export function StarfieldBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;

        // Configuration
        const BASE_SPEED = 0.05; // Very slow drift
        const STAR_COLOR = "#ffffff";

        // State
        let stars: Star[] = [];
        let animationFrameId: number;
        let width = 0;
        let height = 0;

        const initStars = () => {
            // Mobile Optimization: Cap star count to prevent canvas overload
            const starCount = Math.min(Math.floor((width * height) / 15000), 70);
            stars = [];
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * BASE_SPEED,
                    vy: (Math.random() - 0.5) * BASE_SPEED,
                    size: Math.random() * 1.5 + 0.5, // 0.5 to 2.0px
                    opacity: Math.random() * 0.5 + 0.3 // 0.3 to 0.8
                });
            }
        };

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                width = parent.clientWidth;
                height = parent.clientHeight;
                canvas.width = width;
                canvas.height = height;
                initStars();
            }
        };

        // Initial sizing
        resize();

        const render = () => {
            // Draw Background (Clear)
            ctx.clearRect(0, 0, width, height);

            // Draw Stars
            ctx.fillStyle = STAR_COLOR;

            stars.forEach(star => {
                // Update position
                star.x += star.vx;
                star.y += star.vy;

                // Wrap around screen
                if (star.x < 0) star.x = width;
                if (star.x > width) star.x = 0;
                if (star.y < 0) star.y = height;
                if (star.y > height) star.y = 0;

                // Draw: Higher performance rects instead of arcs
                ctx.globalAlpha = star.opacity;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            });
            ctx.globalAlpha = 1.0;

            animationFrameId = requestAnimationFrame(render);
        };

        // Start
        render();

        // Listeners
        window.addEventListener("resize", resize);

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ contain: 'paint layout' }}>
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
            />
        </div>
    );
}
