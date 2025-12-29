"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface CircularTimerProps {
    timeRemaining: number;
    totalTime?: number;
}

export function CircularTimer({ timeRemaining, totalTime = 180 }: CircularTimerProps) {
    const progress = (timeRemaining / totalTime) * 100;
    const isCritical = timeRemaining <= 10;
    const isEmergency = timeRemaining <= 5;

    // Pulse effect for the last 5 seconds
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (isEmergency) {
            const interval = setInterval(() => {
                setScale(prev => prev === 1 ? 1.1 : 1);
            }, 500);
            return () => clearInterval(interval);
        } else {
            setScale(1);
        }
    }, [isEmergency]);

    const circumference = 2 * Math.PI * 45; // r=45
    const dashOffset = ((100 - progress) / 100) * circumference;

    return (
        <motion.div
            className="relative flex items-center justify-center w-16 h-16"
            animate={{ scale: scale }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90">
                {/* Track */}
                <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    className="fill-none stroke-neutral-800"
                    strokeWidth="4"
                />

                {/* Progress Indicator */}
                <motion.circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    className={`fill-none transition-colors duration-500 ${isCritical ? 'stroke-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'stroke-white'}`}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 1, ease: "linear" }}
                    strokeLinecap="round"
                    style={{
                        filter: isCritical ? "drop-shadow(0 0 4px rgba(220, 38, 38, 0.8))" : "none"
                    }}
                />
            </svg>

            {/* Centered Number */}
            <div className={`absolute inset-0 flex items-center justify-center font-display font-bold text-xl tabular-nums tracking-tighter ${isCritical ? 'text-red-500' : 'text-white'}`}>
                {timeRemaining}
            </div>
        </motion.div>
    );
}
