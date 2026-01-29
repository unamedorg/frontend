"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Globe2, MapPin, Building2, GraduationCap, ArrowRight } from 'lucide-react';

interface ArenaMainProps {
    user: any;
    currentFilter: string;
    setCurrentFilter: (val: string) => void;
    profileExists: boolean;
    completion: number;
    loadingProfile: boolean;
    setShowProfile: (val: boolean) => void;
}

export function ArenaMain({
    user,
    currentFilter,
    setCurrentFilter,
    profileExists,
    completion,
    loadingProfile,
    setShowProfile
}: ArenaMainProps) {
    const router = useRouter();
    const [showModes, setShowModes] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'vibe' | 'vibe_campus' | 'vibe_local' | 'vibe_tech'>('main');
    const [isPressing, setIsPressing] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const holdTimersRef = useRef<{ text?: NodeJS.Timeout, complete?: NodeJS.Timeout }>({});
    const HOLD_DURATION = 1500;

    const startHold = () => {
        setMenuView('main');
        setIsPressing(true);

        if (holdTimersRef.current.text) clearTimeout(holdTimersRef.current.text);
        if (holdTimersRef.current.complete) clearTimeout(holdTimersRef.current.complete);

        holdTimersRef.current.text = setTimeout(() => {
            setIsHolding(true);
        }, 400);

        holdTimersRef.current.complete = setTimeout(() => {
            setShowModes(true);
            setIsHolding(false);
            setIsPressing(false);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(20);
            }
        }, HOLD_DURATION);
    };

    const endHold = () => {
        setIsPressing(false);
        setIsHolding(false);
        if (holdTimersRef.current.text) clearTimeout(holdTimersRef.current.text);
        if (holdTimersRef.current.complete) clearTimeout(holdTimersRef.current.complete);
        setMenuView('main');
    };

    const getModeTheme = () => {
        const filter = currentFilter;
        if (filter === 'ranked') {
            return { color: 'text-yellow-500', border: 'border-yellow-500/50', glow: 'shadow-[0_0_100px_-20px_rgba(234,179,8,0.3)]', bg: 'bg-yellow-500/10' };
        }
        if (['random', 'blitz', 'iit', 'nit', 'bits', 'vit', 'colleges'].includes(filter)) {
            return { color: 'text-cyan-400', border: 'border-cyan-400/50', glow: 'shadow-[0_0_100px_-20px_rgba(34,211,238,0.3)]', bg: 'bg-cyan-400/10' };
        }
        if (['mumbai', 'delhi', 'pune', 'bangalore', 'cities'].includes(filter)) {
            return { color: 'text-fuchsia-400', border: 'border-fuchsia-400/50', glow: 'shadow-[0_0_100px_-20px_rgba(232,121,249,0.3)]', bg: 'bg-fuchsia-400/10' };
        }
        if (['tcs', 'startup', 'wipro', 'infosys', 'companies'].includes(filter)) {
            return { color: 'text-emerald-400', border: 'border-emerald-400/50', glow: 'shadow-[0_0_100px_-20px_rgba(52,211,153,0.3)]', bg: 'bg-emerald-400/10' };
        }
        return { color: 'text-cyan-glow', border: 'border-white/10', glow: 'shadow-[0_0_100px_-20px_rgba(0,240,255,0.2)]', bg: 'bg-cyan-glow/10' };
    };

    const theme = getModeTheme();

    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-6 z-10 gap-12 pb-12 pt-28">
            {(!profileExists || completion < 100) && (
                <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    onClick={() => setShowProfile(true)}
                    className="cursor-pointer flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md hover:bg-red-500/20 transition-all group"
                >
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-medium text-red-200 uppercase tracking-widest">Setup Required</span>
                    <ArrowRight className="w-3 h-3 text-red-400 group-hover:translate-x-1 transition-transform" />
                </motion.div>
            )}

            <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] relative">
                {showModes ? (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="relative w-[320px] h-[320px] flex items-center justify-center z-20"
                    >
                        <div
                            className="absolute inset-[-100vh] z-0"
                            onClick={() => {
                                if (menuView === 'vibe') setMenuView('main');
                                else setShowModes(false);
                            }}
                        />

                        <div className="absolute z-10 w-24 h-24 rounded-full bg-[#0a0a1a] border border-white/10 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[100]">
                            <AnimatePresence mode='wait'>
                                {menuView === 'main' ? (
                                    <motion.div
                                        key="main-hub"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center"
                                    >
                                        <span className="text-[10px] text-neutral-500 uppercase tracking-widest mb-1">Select</span>
                                        <span className="text-sm font-display font-bold text-white uppercase tracking-wider">Mode</span>
                                    </motion.div>
                                ) : (
                                    <motion.button
                                        key="vibe-hub"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={() => setMenuView('main')}
                                        className="flex flex-col items-center justify-center w-full h-full rounded-full hover:bg-white/5 transition-colors"
                                    >
                                        <span className="text-[10px] text-red-400 uppercase tracking-widest mb-1">Back</span>
                                        <span className="text-sm font-display font-bold text-white uppercase tracking-wider">Vibe</span>
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>

                        <AnimatePresence>
                            {menuView === 'main' && (
                                <>
                                    <motion.button
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: -120, opacity: 1 }}
                                        exit={{ y: 50, opacity: 0, scale: 0.5 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        onClick={() => { setCurrentFilter('ranked'); setShowModes(false); }}
                                        className="absolute z-20 flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-[#02040a] border border-yellow-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.2)] group-hover:scale-110 group-hover:border-yellow-500 group-hover:shadow-[0_0_50px_rgba(234,179,8,0.4)] transition-all">
                                            <Activity className="w-8 h-8 text-yellow-500" />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Ranked</span>
                                            <span className="text-[9px] text-neutral-400">Season 1</span>
                                        </div>
                                    </motion.button>

                                    <motion.button
                                        initial={{ x: 30, y: -30, opacity: 0 }}
                                        animate={{ x: -100, y: 80, opacity: 1 }}
                                        exit={{ x: 30, y: -30, opacity: 0, scale: 0.5 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                                        onClick={() => { setCurrentFilter('random'); setShowModes(false); }}
                                        className="absolute z-20 flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-[#02040a] border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)] group-hover:scale-110 group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all">
                                            <Zap className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Random</span>
                                            <span className="text-[9px] text-neutral-400">Quick Match</span>
                                        </div>
                                    </motion.button>

                                    <motion.button
                                        initial={{ x: -30, y: -30, opacity: 0 }}
                                        animate={{ x: 100, y: 80, opacity: 1 }}
                                        exit={{ x: -30, y: -30, opacity: 0, scale: 0.5 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                                        onClick={() => setMenuView('vibe')}
                                        className="absolute z-20 flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-[#02040a] border border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)] group-hover:scale-110 group-hover:border-purple-500 group-hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] transition-all">
                                            <Globe2 className="w-8 h-8 text-purple-500" />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">Vibe</span>
                                            <span className="text-[9px] text-neutral-400">Custom</span>
                                        </div>
                                    </motion.button>
                                </>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {menuView === 'vibe' && (
                                <>
                                    <motion.button
                                        initial={{ x: -50, opacity: 0, scale: 0 }}
                                        animate={{ x: 120, opacity: 1, scale: 1 }}
                                        exit={{ x: -50, opacity: 0, scale: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                                        onClick={() => setMenuView('vibe_campus')}
                                        className="absolute z-20 flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[#02040a] border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)] group-hover:scale-110 group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-all">
                                            <GraduationCap className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Campus</span>
                                    </motion.button>

                                    <motion.button
                                        initial={{ y: -50, opacity: 0, scale: 0 }}
                                        animate={{ y: 120, opacity: 1, scale: 1 }}
                                        exit={{ y: -50, opacity: 0, scale: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                                        onClick={() => setMenuView('vibe_local')}
                                        className="absolute z-20 flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[#02040a] border border-fuchsia-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(232,121,249,0.2)] group-hover:scale-110 group-hover:border-fuchsia-400 group-hover:shadow-[0_0_50px_rgba(232,121,249,0.4)] transition-all" >
                                            <MapPin className="w-6 h-6 text-fuchsia-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Local</span>
                                    </motion.button>

                                    <motion.button
                                        initial={{ x: 50, opacity: 0, scale: 0 }}
                                        animate={{ x: -120, opacity: 1, scale: 1 }}
                                        exit={{ x: 50, opacity: 0, scale: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                                        onClick={() => setMenuView('vibe_tech')}
                                        className="absolute z-20 flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-[#02040a] border border-emerald-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.2)] group-hover:scale-110 group-hover:border-emerald-400 group-hover:shadow-[0_0_50px_rgba(52,211,153,0.4)] transition-all">
                                            <Building2 className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Tech</span>
                                    </motion.button>
                                </>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {menuView === 'vibe_campus' && (
                                <>
                                    <motion.button
                                        initial={{ y: 20, opacity: 0 }} animate={{ y: -110, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                        onClick={() => { setCurrentFilter('iit'); setShowModes(false); }}
                                        className="absolute z-20 flex flex-col items-center gap-1"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-cyan-900/40 border border-cyan-400/50 flex items-center justify-center hover:bg-cyan-400 hover:text-black hover:scale-110 transition-all text-cyan-400">
                                            <span className="font-bold text-sm">IIT</span>
                                        </div>
                                    </motion.button>
                                    <motion.button
                                        initial={{ x: -20, opacity: 0 }} animate={{ x: 110, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                                        onClick={() => { setCurrentFilter('vit'); setShowModes(false); }}
                                        className="absolute z-20 flex flex-col items-center gap-1"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-cyan-900/40 border border-cyan-400/50 flex items-center justify-center hover:bg-cyan-400 hover:text-black hover:scale-110 transition-all text-cyan-400">
                                            <span className="font-bold text-sm">VIT</span>
                                        </div>
                                    </motion.button>
                                    <motion.button
                                        initial={{ y: -20, opacity: 0 }} animate={{ y: 110, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                                        onClick={() => { setCurrentFilter('bits'); setShowModes(false); }}
                                        className="absolute z-20 flex flex-col items-center gap-1"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-cyan-900/40 border border-cyan-400/50 flex items-center justify-center hover:bg-cyan-400 hover:text-black hover:scale-110 transition-all text-cyan-400">
                                            <span className="font-bold text-sm">BITS</span>
                                        </div>
                                    </motion.button>
                                    <motion.button
                                        initial={{ x: 20, opacity: 0 }} animate={{ x: -110, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                                        onClick={() => { setCurrentFilter('nit'); setShowModes(false); }}
                                        className="absolute z-20 flex flex-col items-center gap-1"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-cyan-900/40 border border-cyan-400/50 flex items-center justify-center hover:bg-cyan-400 hover:text-black hover:scale-110 transition-all text-cyan-400">
                                            <span className="font-bold text-sm">NIT</span>
                                        </div>
                                    </motion.button>
                                </>
                            )}
                            {menuView === 'vibe_local' && (
                                <>
                                    <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: -110, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('mumbai'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-fuchsia-900/40 border border-fuchsia-400/50 flex items-center justify-center hover:bg-fuchsia-400 hover:text-black hover:scale-110 transition-all text-fuchsia-400 font-bold text-[10px] uppercase">
                                        Mumbai
                                    </motion.button>
                                    <motion.button initial={{ x: -20, opacity: 0 }} animate={{ x: 110, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('delhi'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-fuchsia-900/40 border border-fuchsia-400/50 flex items-center justify-center hover:bg-fuchsia-400 hover:text-black hover:scale-110 transition-all text-fuchsia-400 font-bold text-[10px] uppercase">
                                        Delhi
                                    </motion.button>
                                    <motion.button initial={{ y: -20, opacity: 0 }} animate={{ y: 110, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('pune'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-fuchsia-900/40 border border-fuchsia-400/50 flex items-center justify-center hover:bg-fuchsia-400 hover:text-black hover:scale-110 transition-all text-fuchsia-400 font-bold text-[10px] uppercase">
                                        Pune
                                    </motion.button>
                                    <motion.button initial={{ x: 20, opacity: 0 }} animate={{ x: -110, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('bangalore'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-fuchsia-900/40 border border-fuchsia-400/50 flex items-center justify-center hover:bg-fuchsia-400 hover:text-black hover:scale-110 transition-all text-fuchsia-400 font-bold text-[10px] uppercase">
                                        BLR
                                    </motion.button>
                                </>
                            )}
                            {menuView === 'vibe_tech' && (
                                <>
                                    <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: -110, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('tcs'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-400/50 flex items-center justify-center hover:bg-emerald-400 hover:text-black hover:scale-110 transition-all text-emerald-400 font-bold text-[10px] uppercase">
                                        TCS
                                    </motion.button>
                                    <motion.button initial={{ x: -20, opacity: 0 }} animate={{ x: 110, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('startup'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-400/50 flex items-center justify-center hover:bg-emerald-400 hover:text-black hover:scale-110 transition-all text-emerald-400 font-bold text-[10px] uppercase">
                                        Founders
                                    </motion.button>
                                    <motion.button initial={{ y: -20, opacity: 0 }} animate={{ y: 110, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('wipro'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-400/50 flex items-center justify-center hover:bg-emerald-400 hover:text-black hover:scale-110 transition-all text-emerald-400 font-bold text-[10px] uppercase">
                                        Wipro
                                    </motion.button>
                                    <motion.button initial={{ x: 20, opacity: 0 }} animate={{ x: -110, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                                        onClick={() => { setCurrentFilter('infosys'); setShowModes(false); }}
                                        className="absolute z-20 w-14 h-14 rounded-full bg-emerald-900/40 border border-emerald-400/50 flex items-center justify-center hover:bg-emerald-400 hover:text-black hover:scale-110 transition-all text-emerald-400 font-bold text-[10px] uppercase">
                                        Infy
                                    </motion.button>
                                </>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="relative flex flex-col items-center justify-center">
                        {profileExists && completion === 100 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className={`relative z-20 -mb-5 px-6 py-1.5 rounded-full border ${theme.border} bg-[#0a0a1a] shadow-[0_0_20px_-5px_rgba(0,0,0,0.8)] flex items-center justify-center transition-all duration-300`}
                            >
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-50`} />
                                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] ${theme.color} relative z-10 whitespace-nowrap`}>
                                    {currentFilter === 'random' ? 'Quick Match · Random' :
                                        currentFilter === 'ranked' ? 'Season 1 · Ranked' :
                                            currentFilter === 'blitz' ? 'Quick Match · Blitz' :
                                                ['iit', 'nit', 'bits', 'vit'].includes(currentFilter) ? `Campus · ${currentFilter}` :
                                                    ['mumbai', 'delhi', 'pune', 'bangalore'].includes(currentFilter) ? `Local · ${currentFilter}` :
                                                        ['tcs', 'startup', 'wipro', 'infosys'].includes(currentFilter) ? `Tech · ${currentFilter}` :
                                                            currentFilter.toUpperCase()}
                                </span>
                            </motion.div>
                        )}

                        <motion.button
                            onClick={() => {
                                if (currentFilter === 'ranked') router.push('/arena?mode=ranked');
                                else if (currentFilter === 'random' || currentFilter === 'blitz') router.push('/arena?mode=blitz');
                                else router.push(`/arena?mode=vibe&filter=${currentFilter}`);
                            }}
                            onMouseDown={startHold}
                            onMouseUp={endHold}
                            onMouseLeave={endHold}
                            onTouchStart={startHold}
                            onTouchEnd={endHold}
                            className={`group relative w-[300px] sm:w-[360px] h-[100px] sm:h-[120px] rounded-full bg-[#0a0a1a]/40 border ${theme.border} backdrop-blur-xl overflow-hidden transition-all duration-300`}
                        >
                            <div
                                className={`absolute left-0 inset-y-0 ${theme.bg} ${isPressing ? 'w-full transition-all duration-[1200ms] ease-linear delay-300' : 'w-0 transition-none'}`}
                            />
                            <div
                                className={`absolute inset-0 rounded-full border-[1.5px] ${theme.color.replace('text-', 'border-')} ${isPressing ? 'opacity-100 shadow-[0_0_15px_currentColor]' : 'opacity-0'} transition-all duration-300 pointer-events-none`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none" />
                            <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />

                            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pt-2">
                                <span className={`font-display text-3xl sm:text-4xl font-bold tracking-[0.15em] transition-colors uppercase drop-shadow-lg ${isHolding ? theme.color : 'text-white'} group-hover:${theme.color}`}>
                                    {isHolding ? 'HOLDING...' : 'ENTER ARENA'}
                                </span>
                            </div>
                        </motion.button>

                        <span className="absolute -bottom-12 text-xs text-white/40 font-mono font-bold tracking-widest transition-colors pointer-events-none">
                            {isHolding ? 'Release to Cancel' : 'Hold to Select Modes'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
