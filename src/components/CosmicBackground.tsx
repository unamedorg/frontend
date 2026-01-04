"use client";

import React from 'react';

// Reliable Noise Data URI
const NOISE_URI = "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E";

export function CosmicBackground() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#02040a]" style={{ backfaceVisibility: 'hidden', perspective: 1000 }}>
            {/* 1. Deep Base Layer - Ultra Dark OLED Navy */}
            <div className="absolute inset-0 bg-[#02040a]" />

            {/* 2. Four Corners Neon Gradient Mesh - Unified Style */}
            <div className="absolute inset-0 opacity-60 transform-gpu will-change-transform">
                {/* TOP: Yellow/Orange (Random) */}
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-yellow-500/20 blur-[100px] rounded-full mix-blend-screen" />

                {/* RIGHT: Cyan (Campus) */}
                <div className="absolute top-1/2 right-[-15%] -translate-y-1/2 w-[50vw] h-[70vh] bg-cyan-500/15 blur-[100px] rounded-full mix-blend-screen" />

                {/* BOTTOM: Pink/Fuchsia (Local) */}
                <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[80vw] h-[40vh] bg-fuchsia-500/20 blur-[100px] rounded-full mix-blend-screen" />

                {/* LEFT: Emerald/Green (Tech) */}
                <div className="absolute top-1/2 left-[-15%] -translate-y-1/2 w-[50vw] h-[70vh] bg-emerald-500/15 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            {/* 3. Central Focal Glow (Subtle) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] bg-indigo-900/10 blur-[100px] rounded-full mix-blend-screen transform-gpu" />

            {/* 4. The Grain (Texture) - SUBTLE */}
            <div
                className="absolute inset-0 z-[20] opacity-[0.05] mix-blend-overlay pointer-events-none"
                style={{
                    backgroundImage: `url("${NOISE_URI}")`,
                    filter: 'contrast(100%) brightness(100%)'
                }}
            />

            {/* 5. Vignette - Soft edges */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.95)_100%)]" />
        </div>
    );
}

// Removing the previous complex CosmicAtmosphere component to strictly follow "Gradient + Grain" request
