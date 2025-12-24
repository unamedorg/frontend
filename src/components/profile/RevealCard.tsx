"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Instagram, Music, UserX, UserCheck, ShieldCheck, Heart } from "lucide-react";

interface RevealCardProps {
    isRevealed: boolean;
    onConsent: () => void;
    hasConsented: boolean;
    partnerConsented: boolean;
    partnerDeclined?: boolean;
    profileData: {
        instagram?: string;
        snapchat?: string;
        topTrack?: string;
    };
    onNextMatch: () => void;
    onExit?: () => void;
    onDecline?: () => void;
}

export function RevealCard({ isRevealed, onConsent, hasConsented, partnerConsented, partnerDeclined, profileData, onNextMatch, onExit, onDecline }: RevealCardProps) {
    const [hasSkipped, setHasSkipped] = useState(false);
    const [flowEnded, setFlowEnded] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);

    const handleSkip = () => {
        setHasSkipped(true);
        if (onDecline) onDecline();
    };

    // Timer Logic
    useEffect(() => {
        // If matched or skipped, stop timer
        if (isRevealed || hasSkipped) return;

        if (timeLeft <= 0) {
            setFlowEnded(true);
            // If time acts as a force-skip:
            // if (onDecline) onDecline(); 
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isRevealed, hasSkipped, onDecline]);

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

    // 1. Matched State (Both Consented) - Handled by Parent usually, but if isRevealed is true, we assume parent might unmount this or show matched UI. 
    // Wait, the parent *switches* to this component? No, this component *handles* the reveal logic.
    // Looking at previous code, `isRevealed` (matchConfirmed) passed in triggers `matchConfirmed` Logic? 
    // NO! Structure is: `RevealCard` handles both Pending AND Reveal UI?
    // Let's check `ArenaPage`. `isRevealed={matchConfirmed}`. 
    // In `RevealCard`, `if (isRevealed || ...)` it shows the result.
    // So if `isRevealed` is true, we show "Match Verified".

    // 2. Result State: Matched, Skipped, or Timeout (Flow Ended)
    // Note: 'partnerDeclined' is included here if provided, but per new logic, we might suppress it visually until timeout? 
    // No, if `partnerDeclined` is passed as TRUE, it means we KNOW. But the goal is to NOT know. 
    // So ArenaPage acts as the gatekeeper. Here we just render what we know.
    const showResult = isRevealed || hasSkipped || partnerDeclined || flowEnded;

    if (showResult) {
        // Determine Status Text
        let statusTitle = "Connection Closed";
        let statusSubtitle = "Privacy Maintained";
        let statusIcon = <UserX className="w-5 h-5 text-red-500" />;
        let isSuccess = false;

        if (isRevealed) {
            statusTitle = "Match Verified";
            statusSubtitle = "Mutual Consent";
            statusIcon = <ShieldCheck className="w-5 h-5 text-green-500" />;
            isSuccess = true;
        } else if (hasSkipped) {
            statusTitle = "Connection Declined";
            statusSubtitle = "You chose privacy";
        } else if (partnerDeclined) {
            statusTitle = "Partner Declined";
        }

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm relative overflow-hidden"
            >
                {/* Background Effects */}
                <div className="absolute inset-0 bg-black rounded-2xl border border-white/10 shadow-2xl z-0" />
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${isSuccess ? 'from-green-400 via-emerald-500 to-green-400' : 'from-red-500 via-red-900 to-red-500'} z-10`} />

                <div className="relative z-20 p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${!isSuccess ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                                {statusIcon}
                            </div>
                            <div>
                                <h3 className="text-lg font-display font-bold text-white leading-none">
                                    {statusTitle}
                                </h3>
                                <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
                                    {statusSubtitle}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-4 mb-8">
                        {!isSuccess ? (
                            <div className="p-6 bg-neutral-900/50 rounded-xl border border-white/5 text-center">
                                <p className="text-neutral-400 text-sm leading-relaxed">
                                    {hasSkipped ? (
                                        "You chose to keep your profile private."
                                    ) : partnerDeclined ? (
                                        "Partner chose to keep their profile private."
                                    ) : (
                                        // Timeout Case
                                        hasConsented
                                            ? "Partner did not reveal in time."
                                            : "You chose to keep your profile private."
                                    )}
                                    <br />
                                    <span className="text-neutral-600 text-xs mt-2 block">Identities remain hidden.</span>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Instagram */}
                                <div className="group flex items-center justify-between p-4 bg-neutral-900/80 rounded-xl border border-white/5 hover:border-pink-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-black rounded-full border border-white/10 group-hover:border-pink-500/50 transition-colors">
                                            <Instagram className="w-4 h-4 text-pink-500" />
                                        </div>
                                        <span className="text-white font-mono text-sm tracking-tight">{profileData.instagram || "Not Linked"}</span>
                                    </div>
                                    <button className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider hover:text-white transition-colors">
                                        Open
                                    </button>
                                </div>

                                {/* Music */}
                                <div className="group flex items-center justify-between p-4 bg-neutral-900/80 rounded-xl border border-white/5 hover:border-green-500/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-black rounded-full border border-white/10 group-hover:border-green-500/50 transition-colors">
                                            <Music className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium text-sm leading-tight">{profileData.topTrack || "Unknown Track"}</span>
                                            <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Vibe Anthem</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onExit || (() => window.location.href = '/')}
                            className="py-3 bg-neutral-900 border border-white/10 rounded-xl text-neutral-400 text-xs font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                        >
                            Exit
                        </button>
                        <button
                            onClick={onNextMatch}
                            className="py-3 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 hover:scale-[1.02] transition-transform shadow-lg shadow-white/10"
                        >
                            Next Match
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Pending State (Prior to Match Reveal)
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-sm relative group"
        >
            {/* Glassmorphism Background */}
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-0" />

            {/* Content */}
            <div className="relative z-10 p-8 flex flex-col items-center">

                {/* Icon Ring */}
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-xl animate-pulse" />
                    <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-md relative z-10">
                        <Lock className="w-8 h-8 text-white/80" />
                    </div>
                </div>

                <h3 className="text-2xl font-display font-bold text-white mb-2 tracking-tight">Identity Locked</h3>
                <p className="text-neutral-400 text-sm text-center mb-8 px-4 leading-relaxed">
                    Both parties must reveal within the time limit.
                </p>

                {/* Status Indicators */}
                <div className="flex w-full justify-center gap-10 mb-8">
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${hasConsented ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-neutral-700 bg-neutral-900'}`}>
                            {hasConsented ? <UserCheck className="w-5 h-5 text-green-500" /> : <div className="w-2 h-2 rounded-full bg-neutral-600" />}
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">You</span>
                    </div>

                    {/* Connection Line */}
                    <div className="h-px w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent self-center -mt-6" />

                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${partnerConsented ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-neutral-700 bg-neutral-900'}`}>
                            {partnerConsented ? <Heart className="w-5 h-5 text-green-500" /> : <div className="w-2 h-2 rounded-full bg-neutral-600" />}
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Partner</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 w-full">
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-4 bg-transparent border border-white/10 hover:bg-white/5 rounded-xl text-neutral-400 text-xs font-bold tracking-widest uppercase transition-colors"
                    >
                        Skip ({timeLeft}s)
                    </button>
                    <button
                        onClick={onConsent}
                        disabled={hasConsented}
                        className={`flex-1 py-4 rounded-xl text-black text-xs font-bold tracking-widest uppercase transition-all shadow-lg
                            ${hasConsented
                                ? 'bg-neutral-600 cursor-wait opacity-50'
                                : 'bg-white hover:bg-neutral-200 hover:scale-[1.02] shadow-white/10'}`}
                    >
                        {hasConsented ? "Waiting..." : "Reveal"}
                    </button>
                </div>
            </div>
        </motion.div>
    );
    return null;
}
