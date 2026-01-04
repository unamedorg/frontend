"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SpinningTimerProps {
    timeRemaining: number;
}

function DigitalTimer({ minutes, seconds }: { minutes: number, seconds: number }) {
    return (
        <motion.div
            key="digital"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-0.5 font-mono text-white"
        >
            <span className="countdown font-bold text-2xl sm:text-4xl text-white/90">
                {/* @ts-ignore */}
                <span style={{ "--value": minutes }}></span>
            </span>

            <span className="text-2xl sm:text-4xl font-bold pb-1 animate-pulse opacity-50 mx-1">:</span>

            <span className="countdown font-bold text-2xl sm:text-4xl text-white/90">
                {/* @ts-ignore */}
                <span style={{ "--value": seconds }}></span>
            </span>
        </motion.div>
    );
}

function UrgentCircularTimer({ timeRemaining }: { timeRemaining: number }) {
    // 0-10s countdown. 
    // We want the ring to drain smoothly. 
    // timeRemaining updates every 1s. 

    // Calculate accurate circumference
    const radius = 32; // slightly smaller to fit glow
    const circumference = 2 * Math.PI * radius;

    // While time > 0, we want to animate linearly to the NEXT second's offsets.
    // Actually, simple linear interpolation between seconds works best for "smooth" sweep.
    const progress = Math.max(0, timeRemaining - 1) / 10; // offset by 1 to drain completely at 0
    // Fix: Just standard linear map 10->100%, 0->0%
    const percent = (timeRemaining / 10) * 100;
    const dashOffset = circumference - (percent / 100) * circumference;

    const isCritical = timeRemaining <= 5;

    return (
        <motion.div
            key="circular"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative flex items-center justify-center w-[60px] h-[60px] sm:w-[80px] sm:h-[80px]"
        >
            {/* 1. Ambient Background Glow - Subtle, not too crazy */}
            <motion.div
                className="absolute inset-0 rounded-full bg-red-500/20 blur-xl"
                animate={{ opacity: isCritical ? [0.4, 0.7, 0.4] : 0.4 }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* 2. SVG Timer */}
            <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                {/* Track */}
                <circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    className="fill-none stroke-red-500/10"
                    strokeWidth="4"
                />

                {/* Progress Ring - Smooth Interpolation */}
                <motion.circle
                    cx="50%"
                    cy="50%"
                    r="40%"
                    className="fill-none stroke-red-500"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference} // Note: This might need adjustment for responsive radius if strictly pixel based, but SVG percent radius (r="40%") works better.
                    // However, original code used circumference based on fixed radius=32.
                    // For simply resizing the svg container, keeping the viewbox/internal coords relative or just scaling the container works.
                    // Let's rely on standard SVG scaling if we don't change the internal geometry logic too much.
                    // Actually, to support both sizes cleanly without complex prop drilling, let's just stick to the container scaling.
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: dashOffset }}
                    // duration: 1 ensures it interpolates smoothly from current sec to next sec
                    transition={{ duration: 1, ease: "linear" }}
                />
            </svg>

            {/* 3. Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="font-mono font-bold text-2xl sm:text-3xl text-red-100 drop-shadow-md">
                    {timeRemaining}
                </span>
            </div>
        </motion.div>
    );
}

export function SpinningTimer({ timeRemaining }: SpinningTimerProps) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const isUrgent = timeRemaining > 0 && timeRemaining <= 10;
    const isEnded = timeRemaining === 0;

    return (
        <div className="flex items-center justify-center min-w-[100px] sm:min-w-[120px] h-[50px] sm:h-[60px] relative">
            <AnimatePresence mode="wait">
                {isEnded ? (
                    <motion.div
                        key="ended"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center justify-center"
                    >
                        <span className="text-red-500 font-display font-bold text-sm tracking-[0.2em] uppercase whitespace-nowrap animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                            Chat Ended
                        </span>
                    </motion.div>
                ) : isUrgent ? (
                    <UrgentCircularTimer key="urgent" timeRemaining={timeRemaining} />
                ) : (
                    <DigitalTimer key="normal" minutes={minutes} seconds={seconds} />
                )}
            </AnimatePresence>
        </div>
    );
}
