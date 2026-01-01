"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { Gauge, ThumbsUp, Activity } from "lucide-react";

interface VibeCheckProps {
    onRate: (score: number) => void;
    submitted: boolean;
    timeLeft: number;
}

export function VibeCheck({ onRate, submitted, timeLeft }: VibeCheckProps) {
    const [value, setValue] = useState(1);

    const handleCommit = () => {
        if (!submitted) {
            if (navigator.vibrate) navigator.vibrate(20);
            onRate(value);
        }
    };

    // Auto-commit handled by parent phase transition now
    // But we can trigger commit locally if timer ends? 
    // No, parent handles phase end. But parent doesn't know 'value'.
    // Parent blindly moves to next phase. 
    // IF user hasn't committed, we should commit for them on unmount?
    // Or we just rely on explicit click. 
    // User requirement: "wait 10 seconds even if they click".
    // So if they click, we just set `submitted` to true and show wait screen.

    // Auto-commit on 0?
    useEffect(() => {
        if (timeLeft === 0 && !submitted) {
            handleCommit();
        }
    }, [timeLeft, submitted]);

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.9, rotateX: 10 },
        visible: {
            opacity: 1,
            scale: 1,
            rotateX: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 20
            } as const
        },
        exit: { opacity: 0, scale: 0.9 }
    };

    const getMoodText = (val: number) => {
        if (val <= -3) return "Disconnect";
        if (val < 0) return "No Vibe";
        if (val === 0) return "Neutral";
        if (val < 5) return "Good Talk";
        if (val < 8) return "Great Energy";
        return "Electric";
    };

    // Normalized value 0-100 for slider width
    const min = -3;
    const max = 10;
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-sm relative group"
        >
            {/* Standard Glass Background */}
            <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-0" />

            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col items-center">

                {submitted ? (
                    <div className="flex flex-col items-center justify-center h-64 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 mb-4 rounded-full border-2 border-white/10 border-t-white animate-spin" />
                        <h3 className="text-xl font-display font-bold text-white mb-2">Syncing Vibes...</h3>
                        <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                            Wait {timeLeft}s
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Icon Ring */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse" />
                            <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md relative z-10">
                                <Gauge className="w-8 h-8 text-white/80" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-display font-bold text-white mb-2 tracking-tight">Vibe Check</h3>
                        <p className="text-neutral-400 text-sm text-center mb-8 px-4 leading-relaxed">
                            Rate the interaction to help refine your future matchmaking.
                        </p>

                        {/* Rating Display */}
                        <div className="flex flex-col items-center justify-center mb-10 w-full">
                            <div className="flex items-baseline space-x-1 mb-2">
                                <span className="text-6xl font-display font-bold text-white tracking-tighter">
                                    {value > 0 ? `+${value}` : value}
                                </span>
                            </div>

                            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                <Activity className="w-3 h-3 text-neutral-400" />
                                <span className="text-xs font-mono uppercase tracking-widest text-neutral-300">
                                    {getMoodText(value)}
                                </span>
                            </div>
                        </div>

                        {/* Slider Control */}
                        <div className="relative w-full h-12 mb-8 select-none touch-none group/slider">
                            {/* Track */}
                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 rounded-full -translate-y-1/2 overflow-hidden">
                                <motion.div
                                    className="h-full bg-white absolute left-0"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            {/* Step Markers */}
                            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-1 pointer-events-none">
                                {Array.from({ length: 14 }).map((_, i) => (
                                    <div key={i} className={`w-[1px] h-1 ${i === 3 ? 'bg-white/30 h-2' : 'bg-white/5'}`} />
                                ))}
                            </div>

                            {/* Input Overlay */}
                            <input
                                type="range"
                                min={min}
                                max={max}
                                step="1"
                                value={value}
                                onChange={(e) => {
                                    setValue(parseInt(e.target.value));
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-50"
                            />

                            {/* Thumb */}
                            <motion.div
                                className="absolute top-1/2 -mt-3 -ml-3 w-6 h-6 bg-black border-2 border-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] pointer-events-none z-20 flex items-center justify-center"
                                style={{ left: `${percentage}%` }}
                            >
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                            </motion.div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleCommit}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-white/10 relative overflow-hidden"
                        >
                            <span className="relative z-10">Commit Rating ({timeLeft}s)</span>
                            <div
                                className="absolute inset-0 bg-neutral-200/50 origin-left transition-transform duration-1000 ease-linear"
                                style={{ transform: `scaleX(${timeLeft / 10})` }}
                            />
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}