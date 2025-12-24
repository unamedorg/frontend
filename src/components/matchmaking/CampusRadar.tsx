"use client";

import { motion } from "framer-motion";

interface CampusRadarProps {
    mode: 'college' | 'random';
}

export function CampusRadar({ mode }: CampusRadarProps) {
    return (
        <div className="relative flex items-center justify-center w-64 h-64">
            {/* Core Core */}
            <div className="w-4 h-4 bg-white rounded-full z-10 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

            {/* Radar Sweep */}
            <motion.div
                className="absolute w-full h-full rounded-full border border-white/10"
                style={{
                    background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.1) 60deg, transparent 61deg)"
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />

            {/* Pulse Waves */}
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="absolute border border-white/30 rounded-full"
                    initial={{ width: "0%", height: "0%", opacity: 1 }}
                    animate={{ width: "100%", height: "100%", opacity: 0 }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.6,
                        ease: "easeOut"
                    }}
                />
            ))}

            {/* Mode Indicator Ring */}
            <motion.div
                className={`absolute inset-0 rounded-full border-2 ${mode === 'college' ? 'border-blue-500/50' : 'border-purple-500/50'}`}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}
