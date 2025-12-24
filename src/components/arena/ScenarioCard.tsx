"use client";

import { motion } from "framer-motion";
import { Sparkles, Target } from "lucide-react";

interface ScenarioCardProps {
    scenario: string;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
    // Extract topic and prompt safely if format varies
    const parts = scenario.split(":");
    const title = parts.length > 1 ? parts[0] : "Mission";
    const content = parts.length > 1 ? parts.slice(1).join(":").trim() : scenario;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="w-full max-w-2xl mx-auto mb-4 relative z-10"
        >
            <div className="relative group overflow-hidden rounded-2xl bg-neutral-900/40 backdrop-blur-md border border-white/5 hover:border-white/10 transition-colors duration-500">

                {/* Subtle Gradient Glow */}
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-colors" />

                <div className="relative p-5 flex items-start gap-4">
                    {/* Icon Box */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/5 flex items-center justify-center">
                        <Target className="w-5 h-5 text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400">
                                {title}
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>

                        {/* Content */}
                        <p className="font-display text-base md:text-lg text-neutral-200 leading-snug font-light tracking-wide">
                            {content}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
