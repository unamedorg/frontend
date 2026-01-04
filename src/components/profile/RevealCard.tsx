"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import { Lock, Instagram, Music, ShieldCheck, UserX, UserCheck, Heart } from "lucide-react";

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
    phase: 'decision' | 'result';
    timeLeft: number;
}

export function RevealCard({ isRevealed, onConsent, hasConsented, partnerConsented, partnerDeclined, profileData, onNextMatch, onExit, onDecline, phase, timeLeft }: RevealCardProps) {
    const [hasSkipped, setHasSkipped] = useState(false);

    const handleSkip = () => {
        setHasSkipped(true);
        if (onDecline) onDecline();
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, y: 10 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { duration: 0.3, ease: "easeOut" }
        },
        exit: { opacity: 0, scale: 0.95, y: -10 }
    };

    // ---------------------------------------------------------------------------
    // RESULT PHASE - MATCH SUCCESS OR FAIL
    // ---------------------------------------------------------------------------
    if (phase === 'result') {
        const isSuccess = isRevealed;

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm"
            >
                {/* Main Card */}
                <div className="bg-black/80 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden relative">

                    {/* Header Strip */}
                    <div className="h-24 bg-gradient-to-r from-neutral-900 to-black relative">
                        {/* Noise Texture Overlay */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                        {/* Status Icon/Badge */}
                        <div className="absolute -bottom-6 left-6 flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 border-black shadow-lg
                                ${isSuccess ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' : 'bg-gradient-to-br from-red-500 to-rose-600 text-white'}`}>
                                {isSuccess ? <ShieldCheck className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
                            </div>
                            <div className="pt-6">
                                <h3 className="font-display font-bold text-white text-lg leading-none">
                                    {isSuccess ? "Match Verified" : "Connection Closed"}
                                </h3>
                                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1 font-mono">
                                    {isSuccess ? "Identity Unlocked" : "Privacy Preserved"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 px-6 pb-6">
                        {/* Result Message */}
                        <p className="text-sm text-neutral-400 mb-6 leading-relaxed border-l-2 border-white/10 pl-3">
                            {isSuccess
                                ? "Digital handshake complete. You can now view your partner's socials."
                                : (hasSkipped
                                    ? "Your privacy is safe. We have not shown your social links profile."
                                    : partnerDeclined
                                        ? "You both have privacy. Social links card not shown."
                                        : "Mutual consent was not reached in time. Identities remain hidden.")}
                        </p>

                        {/* Social Links (Success Only) */}
                        {isSuccess && (
                            <div className="space-y-3 mb-6">
                                {/* Instagram Row */}
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors group cursor-pointer">
                                    <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg text-white shadow-lg shadow-pink-500/10">
                                        <Instagram className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Instagram</p>
                                        <p className="text-sm font-medium text-white truncate">{profileData.instagram || "N/A"}</p>
                                    </div>
                                    <span className="text-[10px] text-white/40 group-hover:text-white uppercase tracking-wider font-bold pr-2 transition-colors">Open</span>
                                </div>

                                {/* Music Row */}
                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors group cursor-pointer">
                                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg text-white shadow-lg shadow-green-500/10">
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">Vibe Anthem</p>
                                        <p className="text-sm font-medium text-white truncate">{profileData.topTrack || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2 border-t border-white/5">
                            <button
                                onClick={onExit || (() => window.location.href = '/')}
                                className="px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Exit
                            </button>
                            <button
                                onClick={onNextMatch}
                                className="flex-1 py-3 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-neutral-200 transition-transform active:scale-[0.98] shadow-lg shadow-white/5"
                            >
                                Next Match
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    // ---------------------------------------------------------------------------
    // DECISION PHASE - WAITING STATE
    // ---------------------------------------------------------------------------
    const isWaitingForTimer = hasConsented || hasSkipped;

    if (isWaitingForTimer) {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="w-full max-w-sm"
            >
                <div className="bg-black/80 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">

                    <div className="relative mb-6">
                        <div className="w-16 h-16 rounded-full border-2 border-white/5 border-t-white animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-white">
                            {timeLeft}
                        </div>
                    </div>

                    <h3 className="text-lg font-display font-bold text-white mb-1">
                        {hasConsented ? "Signal Locked" : "Disconnecting..."}
                    </h3>
                    <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 animate-pulse">
                        Waiting for partner
                    </p>
                </div>
            </motion.div>
        );
    }

    // ---------------------------------------------------------------------------
    // DECISION PHASE - INPUT STATE
    // ---------------------------------------------------------------------------
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-sm"
        >
            <div className="bg-black/90 backdrop-blur-2xl rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
                {/* Header Banner */}
                <div className="h-20 bg-gradient-to-r from-neutral-900 to-black relative flex flex-col items-center justify-center border-b border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                        <Lock className="w-4 h-4 text-white/50" />
                        <span className="font-display font-bold text-white tracking-wide">Identity Check</span>
                    </div>
                    <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">Encrypted Channel</p>
                </div>

                <div className="p-6">
                    {/* Status Nodes - Mimicking 'Link Active' visualization */}
                    <div className="flex justify-between items-center mb-8 px-4">
                        {/* You */}
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300
                                ${hasConsented ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-white/5 border-white/10 text-neutral-500'}`}>
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">You</span>
                        </div>

                        {/* Connector */}
                        <div className="flex-1 h-px bg-white/10 mx-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 w-1/2 animate-[shimmer_2s_infinite]" />
                        </div>

                        {/* Partner */}
                        <div className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300
                                ${partnerConsented ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-white/5 border-white/10 text-neutral-500'}`}>
                                <Heart className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">Partner</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleSkip}
                            className="flex-1 py-4 rounded-xl border border-white/10 text-neutral-500 text-xs font-bold tracking-widest uppercase hover:bg-white/5 transition-all"
                        >
                            Skip ({timeLeft})
                        </button>
                        <button
                            onClick={onConsent}
                            className="flex-[1.5] py-4 bg-white text-black rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-neutral-200 transition-all shadow-lg active:scale-95"
                        >
                            Reveal
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
