"use client";

import { useEffect, useState } from "react";

interface CampusRadarProps {
    mode: 'college' | 'random';
}

export function CampusRadar({ mode }: CampusRadarProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 100);
        return () => clearInterval(timer);
    }, []);

    const accentColor = mode === 'college' ? '#1e3a8a' : '#3b82f6'; // Navy or Vibe Blue

    return (
        <div className="relative w-[320px] h-[320px] flex items-center justify-center">
            {/* Visual Layers from Features.tsx (Scaled to 320px) */}

            {/* 1. Outer Static Ring (Faint) - Made more visible */}
            <div className="absolute w-80 h-80 rounded-full border border-white/20" />

            {/* 2. Middle Dashed Ring (Slow Spin) - Made more distinct/white */}
            <div className="absolute w-64 h-64 rounded-full border border-dashed border-white/40 animate-[spin_60s_linear_infinite]" />

            {/* 3. Inner Active Ring (Fast Spin) - The "Scanning" visual */}
            <div
                className="absolute w-48 h-48 rounded-full border-t-2 animate-spin"
                style={{ borderColor: `${accentColor} transparent transparent transparent` }}
            />

            {/* Center Content */}
            <div className="relative z-10 flex flex-col items-center">
                <div className="text-7xl font-mono text-white tracking-tighter drop-shadow-2xl flex items-baseline">
                    {elapsed}
                    <span
                        className={`text-3xl ml-1 ${mode === 'random' ? 'text-vibe' : ''}`}
                        style={mode === 'college' ? { color: accentColor } : {}}
                    >s</span>
                </div>
                {/* EXACT Label Style from Features.tsx */}
                <span
                    className={`text-[10px] font-bold uppercase tracking-[0.3em] mt-2 ${mode === 'random' ? 'text-vibe' : ''}`}
                    style={mode === 'college' ? { color: accentColor } : {}}
                >
                    LIMIT
                </span>
            </div>
        </div>
    );
}
