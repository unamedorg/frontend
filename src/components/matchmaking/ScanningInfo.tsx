"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScanningInfoProps {
    mode: string;
}

const FACTS: Record<string, string[]> = {
    random: [
        "Did you know? 73% of best friends meet by pure chance.",
        "Random connections often lead to the most surprising opportunities.",
        "Breaking your bubble increases creativity by 40%.",
        "Serendipity is the algorithm of real life."
    ],
    college: [
        "University is the peak time for forming lifelong networks.",
        "Students who network are 3x more likely to land internships.",
        "You might be matching with a future founder right now.",
        "Campus connections often outlast the degree itself."
    ],
    tech: [
        "The first computer bug was an actual moth in 1947.",
        "Developers spend 50% of their time debugging (and loving it).",
        "There are over 700 programming languages in use today.",
        "Tabs or Spaces? A debate that never ends."
    ],
    local: [
        "People within 5 miles of you share 80% of your daily context.",
        "Local communities enable the fastest real-world meetups.",
        "Your neighbor might just be your next co-founder.",
        "Hyper-local networking builds the strongest trust."
    ],
    ranked: [
        "Ranked matches prioritize high-karma individuals.",
        "Consistency is key: Top 1% of users hold 50% of the karma.",
        "Competitive conversation sharpens your wit.",
        "You are entering the arena of elite communicators."
    ]
};

const getCategory = (mode: string) => {
    if (mode === 'random' || mode === 'blitz') return 'random';
    if (mode === 'ranked') return 'ranked';
    if (mode.startsWith('iit_') || mode === 'college' || mode.includes('university')) return 'college';
    if (mode === 'coding' || mode === 'startup' || mode === 'ai') return 'tech';
    if (mode === 'pune' || mode === 'bangalore' || mode === 'delhi' || mode === 'mumbai') return 'local';
    return 'random'; // Fallback
};

const getReadableMode = (mode: string) => {
    if (mode === 'iit_bombay') return 'IIT Bombay';
    if (mode === 'iit_delhi') return 'IIT Delhi';
    if (mode === 'random' || mode === 'blitz') return 'Random Vibe';
    return mode.charAt(0).toUpperCase() + mode.slice(1).replace('_', ' ');
};

export function ScanningInfo({ mode }: ScanningInfoProps) {
    const [showFacts, setShowFacts] = useState(false);
    const [factIndex, setFactIndex] = useState(0);

    const category = getCategory(mode);
    const facts = FACTS[category];
    const readableMode = getReadableMode(mode);

    useEffect(() => {
        // Initial 5s delay before showing facts
        const initialTimer = setTimeout(() => {
            setShowFacts(true);
        }, 5000);

        return () => clearTimeout(initialTimer);
    }, []);

    useEffect(() => {
        if (!showFacts) return;

        // Rotate facts every 6 seconds
        const rotateTimer = setInterval(() => {
            setFactIndex((prev) => (prev + 1) % facts.length);
        }, 6000);

        return () => clearInterval(rotateTimer);
    }, [showFacts, facts.length]);

    return (
        <div className="absolute bottom-[-100px] right-0 left-0 flex flex-col items-center justify-center text-center w-full px-4 h-24">
            <AnimatePresence mode="wait">
                {!showFacts ? (
                    <motion.div
                        key="connecting"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-col items-center"
                    >
                        <span className="text-white/60 font-display text-sm tracking-wider uppercase mb-1">
                            Connecting with someone in...
                        </span>
                        <span className="text-vibe font-display font-bold text-lg tracking-widest uppercase drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                            {readableMode}
                        </span>
                    </motion.div>
                ) : (
                    <motion.div
                        key={`fact-${factIndex}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col items-center max-w-sm"
                    >
                        <span className="text-emerald-500/80 font-mono text-[10px] tracking-[0.2em] uppercase mb-2">
                            DID YOU KNOW?
                        </span>
                        <p className="text-neutral-300 font-sans text-sm leading-relaxed font-medium">
                            {facts[factIndex]}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
