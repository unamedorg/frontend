"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { config } from "@/lib/config";
import { Users, Timer, Sparkles, Plus, Search, Shuffle, MessageSquare, ArrowRight, X, Hash, Mic, Swords, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

// --- Types ---
interface DebateRoom {
    id: string;      // Changed from ID
    topic: string;   // Changed from Topic
    max_client: number; // Changed from MaxClient
    Currentclient: number; // Backend uses Go logic but JSON might differ, keeping as is based on previous page.tsx insight or verifying usage
    created_at: string; // Changed from CreatedAt
    expires_at: string; // Changed from ExpiresAt
}

interface RoomListResponse {
    count: number;
    rooms: DebateRoom[];
}

export function DebateEntry() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [rooms, setRooms] = useState<DebateRoom[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [activeModal, setActiveModal] = useState<'none' | 'create' | 'join'>('none');

    // Create Form State
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState(15);
    const [maxPeople, setMaxPeople] = useState(10);
    const [isCreating, setIsCreating] = useState(false);

    // Join Form State
    const [joinId, setJoinId] = useState("");

    // Button State
    const [isHolding, setIsHolding] = useState(false);
    const [showModes, setShowModes] = useState(false);
    const [isPressing, setIsPressing] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'random' | 'create' | 'join'>('random');

    const holdTimersRef = useRef<{ text?: NodeJS.Timeout, complete?: NodeJS.Timeout, visual?: NodeJS.Timeout }>({});
    const HOLD_DURATION = 1500;

    // --- Fetch Rooms ---
    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    // Handle URL actions (e.g. from Random redirect)
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setActiveModal('create');
        }
    }, [searchParams]);

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${config.getApiUrl()}/debate/getrooms`);
            if (res.ok) {
                const wrapper = await res.json();
                const data: DebateRoom[] = wrapper.rooms || [];
                // Sort by newest created
                const sorted = data.sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setRooms(sorted);
            }
        } catch (err) {
            console.error("Failed to fetch rooms", err);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---
    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch(`${config.getApiUrl()}/debate/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: topic,
                    duration: duration,
                    maxClient: maxPeople
                })
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/debate/${data.roomId}`);
            } else {
                alert("Failed to create room. Please try again.");
            }
        } catch (error) {
            console.error(error);
            alert("Error creating room.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        const input = joinId.trim();
        if (!input) return;

        // Handle if user pastes full URL
        let finalId = input;
        try {
            if (input.includes('http') || input.includes('debate/')) {
                // Try to extract from URL
                if (input.startsWith('http')) {
                    const url = new URL(input);
                    const parts = url.pathname.split('/').filter(p => p.length > 0);
                    finalId = parts[parts.length - 1];
                } else {
                    // Handle partial path like "debate/123/"
                    const parts = input.split('/').filter(p => p.length > 0);
                    finalId = parts[parts.length - 1];
                }
            }
        } catch (e) {
            // Fallback to original input if parsing fails
            console.warn("Failed to parse room URL:", e);
        }

        if (finalId) {
            router.push(`/debate/${finalId}`);
        }
    };

    // --- Interaction Handlers ---
    const startHold = () => {
        // Clear existing timers
        if (holdTimersRef.current.text) clearTimeout(holdTimersRef.current.text);
        if (holdTimersRef.current.complete) clearTimeout(holdTimersRef.current.complete);
        if (holdTimersRef.current.visual) clearTimeout(holdTimersRef.current.visual);

        // Delay visual feedback to prevent click-flash
        holdTimersRef.current.visual = setTimeout(() => {
            setIsPressing(true);
        }, 200);

        // Delay text change
        holdTimersRef.current.text = setTimeout(() => {
            setIsHolding(true);
        }, 500);

        // Completion trigger
        holdTimersRef.current.complete = setTimeout(() => {
            setShowModes(true);
            setIsHolding(false);
            setIsPressing(false);
            if (navigator.vibrate) navigator.vibrate(20);
        }, HOLD_DURATION);
    };

    const endHold = () => {
        // Clear all timers immediately
        if (holdTimersRef.current.text) clearTimeout(holdTimersRef.current.text);
        if (holdTimersRef.current.complete) clearTimeout(holdTimersRef.current.complete);
        if (holdTimersRef.current.visual) clearTimeout(holdTimersRef.current.visual);

        setIsPressing(false);
        setIsHolding(false);
    };

    // --- Render Helpers ---

    const formatTimeLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        const minutes = Math.floor(diff / 60000);
        if (minutes <= 0) return "< 1m";
        return `${minutes}m`;
    };

    return (
        <div className="flex flex-col md:flex-row w-full max-w-7xl mx-auto h-[100dvh] md:h-full flex-1 gap-3 md:gap-12 px-4 md:px-6 relative overflow-hidden">

            {/* --- MODALS --- */}
            <AnimatePresence>
                {/* ... (Modal code remains unchanged) ... */}
                {activeModal !== 'none' && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveModal('none')}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* ... Modal Content ... */}
                            {activeModal === 'create' ? (
                                <form onSubmit={handleCreateRoom} className="w-full relative z-10">

                                    {/* Header Banner - RevealCard Style */}
                                    <div className="h-24 bg-gradient-to-r from-neutral-900 to-black relative flex flex-col items-center justify-center border-b border-white/5">
                                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="p-2 bg-white/5 rounded-lg border border-white/10 backdrop-blur-md">
                                                    <Swords className="w-5 h-5 text-white" />
                                                </div>
                                                <span className="font-display font-bold text-white text-lg tracking-wide">Create Debate</span>
                                            </div>
                                            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Broadcast Your Topic</p>
                                        </div>
                                    </div>

                                    {/* Form Content */}
                                    <div className="p-8 space-y-8">
                                        {/* Topic Input */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold font-mono text-neutral-500 uppercase tracking-widest ml-1">Debate Topic</label>
                                            <div className="group relative">
                                                <input
                                                    type="text"
                                                    value={topic}
                                                    onChange={(e) => setTopic(e.target.value)}
                                                    placeholder="What's on your mind?"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-neutral-700 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all font-medium shadow-inner"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {/* Duration Selector */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold font-mono text-neutral-500 uppercase tracking-widest ml-1">Duration</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {[10, 15, 20].map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setDuration(m)}
                                                        className={`relative py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${duration === m
                                                            ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                                                            : 'bg-white/5 text-neutral-500 border-white/5 hover:bg-white/10 hover:text-neutral-300'
                                                            }`}
                                                    >
                                                        {m} Min
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Creative Capacity Slider - Segmented Bar Style */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end px-1">
                                                <label className="text-[10px] font-bold font-mono text-neutral-500 uppercase tracking-widest">Capacity</label>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3 h-3 text-neutral-500" />
                                                    <span className="text-white text-[12px] font-bold font-mono">{maxPeople} <span className="text-neutral-600">Max</span></span>
                                                </div>
                                            </div>

                                            <div className="relative h-12 flex items-center justify-between px-1 gap-1 select-none group cursor-pointer bg-white/5 border border-white/5 rounded-xl transition-colors hover:bg-white/10">
                                                {/* Hidden Range Input for functionality */}
                                                <input
                                                    type="range"
                                                    min="2"
                                                    max="15"
                                                    value={maxPeople}
                                                    onChange={(e) => setMaxPeople(parseInt(e.target.value))}
                                                    className="absolute inset-0 z-20 opacity-0 cursor-pointer w-full h-full"
                                                />

                                                {/* Visual Segments */}
                                                {Array.from({ length: 14 }).map((_, i) => {
                                                    const val = i + 2; // scale 2 to 15
                                                    const isActive = val <= maxPeople;

                                                    return (
                                                        <div
                                                            key={val}
                                                            className={`flex-1 h-full flex items-center justify-center relative transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-20'}`}
                                                        >
                                                            {/* Bar Segment */}
                                                            <div
                                                                className={`w-1 rounded-full transition-all duration-300 ${isActive ? 'h-5 bg-white' : 'h-2 bg-neutral-500 scale-y-75 group-hover:scale-y-100'}`}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <p className="text-[10px] text-center text-neutral-600 font-mono tracking-widest uppercase">Slide to adjust crowd size</p>
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            type="submit"
                                            disabled={!topic.trim() || isCreating}
                                            className="w-full py-4 bg-white text-black font-bold text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {isCreating ? (
                                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <span>Launch Debate</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleJoinRoom} className="p-8 relative z-10">
                                    {/* ... Join Form ... */}
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full" />
                                            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/20">
                                                <Hash className="w-8 h-8 text-blue-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-display font-bold text-white tracking-wide">Join Arena</h2>
                                            <p className="text-xs text-neutral-400 uppercase tracking-[0.2em] mt-1">Enter Frequency ID</p>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold font-mono text-blue-300/70 uppercase tracking-widest ml-1">Room ID</label>
                                            <input
                                                type="text"
                                                value={joinId}
                                                onChange={(e) => setJoinId(e.target.value)}
                                                placeholder="Paste ID here..."
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-lg text-white placeholder:text-neutral-700 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-mono tracking-wider shadow-inner"
                                                autoFocus
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!joinId.trim()}
                                            className="w-full py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_50px_rgba(6,182,212,0.5)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 relative overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                                            <span className="relative z-10 flex items-center gap-2">
                                                Connect <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </span>
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- LEFT SIDE: ROOM LIST (Always visible on Debate page) --- */}
            <div className="flex flex-col h-[55dvh] md:h-[75dvh] min-h-0 max-w-md md:max-w-none mx-auto w-full bg-[#0a0a1a]/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl relative group shadow-2xl transition-all duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]/50 backdrop-blur-xl z-10 relative overflow-hidden">
                    {/* Subtle top gloss */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-50" />

                    <div className="flex items-center gap-3 z-10">
                        <h2 className="text-xl font-black tracking-widest uppercase font-display text-white">
                            Live Debates
                        </h2>
                    </div>

                    <div className="z-10 px-3 py-1">
                        {/* Count removed as requested */}
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                            <div className="w-8 h-8 border-2 border-violet-500/50 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-neutral-500 uppercase tracking-widest font-mono">Scanning Frequencies...</span>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-5 opacity-100">
                            <div className="p-5 rounded-full bg-white/5 mb-2 ring-1 ring-white/10">
                                <MessageSquare className="w-8 h-8 text-neutral-600" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-base font-bold text-white/90 font-display">No Active Debates</span>
                                <span className="text-xs text-neutral-500 max-w-[200px] leading-relaxed">Be the first to ignite the conversation in the arena.</span>
                            </div>
                            <button
                                onClick={() => setActiveModal('create')}
                                className="mt-4 px-8 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-neutral-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                            >
                                Create Room
                            </button>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {rooms.map((room) => (
                                <motion.div
                                    key={room.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => router.push(`/debate/${room.id}`)}
                                    className="group/room relative w-full bg-black/40 border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-500 backdrop-blur-md"
                                >
                                    {/* Background Effects */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover/room:opacity-100 transition-opacity duration-500" />
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

                                    {/* Scanline Effect (Creative) */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent translate-y-[-100%] group-hover/room:translate-y-[100%] transition-transform duration-1000 ease-in-out pointer-events-none" />

                                    <div className="relative p-4 flex flex-col gap-2 z-10">
                                        {/* Header: Status & Visualizer */}
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                                </div>
                                                <span className="text-[9px] font-mono text-red-400/80 tracking-widest uppercase shadow-red-500/20 drop-shadow-sm leading-none">Live Signal</span>
                                            </div>

                                            {/* Creative Frequency Visualizer */}
                                            <div className="flex gap-0.5 items-end h-3 opacity-50 group-hover/room:opacity-100 transition-opacity">
                                                {[1, 2, 3, 2, 4, 2, 1].map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-0.5 bg-violet-500 rounded-full animate-pulse"
                                                        style={{ height: `${h * 25}%`, animationDelay: `${i * 0.1}s` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Main Topic & Timer */}
                                        <div className="flex justify-between items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-display font-bold text-white leading-tight group-hover/room:text-violet-100 transition-colors truncate">
                                                    {room.topic}
                                                </h3>
                                                <div className="h-0.5 w-8 bg-white/10 rounded-full group-hover/room:w-16 group-hover/room:bg-gradient-to-r group-hover/room:from-violet-500 group-hover/room:to-transparent transition-all duration-500 mt-1" />
                                            </div>

                                            {/* Sleek Timer Pill - Compact */}
                                            <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 backdrop-blur-sm group-hover/room:border-violet-500/30 group-hover/room:bg-violet-500/10 transition-all duration-300 shadow-sm">
                                                <Timer className="w-3 h-3 text-neutral-400 group-hover/room:text-violet-400 transition-colors" />
                                                <span className="text-[10px] font-mono font-bold text-neutral-300 group-hover/room:text-white transition-colors tracking-wide">
                                                    {formatTimeLeft(room.expires_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer Action - Compact */}
                                        <div className="flex items-center justify-end h-4 overflow-hidden">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-white opacity-0 translate-y-full group-hover/room:opacity-100 group-hover/room:translate-y-0 transition-all duration-300">
                                                <span className="tracking-widest text-violet-300/80">ESTABLISH LINK</span>
                                                <ArrowRight className="w-2.5 h-2.5 text-violet-400" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}

                    {/* Spacer for bottom fade (Desktop Only) */}
                    <div className="hidden md:block h-12" />
                </div>

                {/* Bottom Fade Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-20" />
            </div>


            {/* --- RIGHT SIDE: INTERACTION (Bottom on mobile, Side on desktop) --- */}
            <div className="flex-shrink-0 h-[40dvh] md:h-auto md:flex-1 flex flex-col items-center justify-center relative -mt-10 md:mt-0 py-2 md:py-0">

                {showModes ? (
                    /* --- MODE SELECTION --- */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-[320px] aspect-square relative flex items-center justify-center"
                    >
                        {/* Close Overlay */}
                        <div className="absolute inset-[-50vh] z-0" onClick={() => setShowModes(false)} />

                        {/* Center Hub */}
                        <div className="absolute z-10 w-24 h-24 rounded-full bg-[#0a0a1a] border border-violet-500/30 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(139,92,246,0.2)]">
                            <span className="text-[10px] text-violet-500/60 uppercase tracking-widest mb-1">Debate</span>
                            <span className="text-sm font-display font-bold text-white uppercase tracking-wider">Mode</span>
                        </div>

                        {/* 1. RANDOM (Top) */}
                        <motion.button
                            initial={{ y: 40, opacity: 0 }} animate={{ y: -100, opacity: 1 }}
                            onClick={() => {
                                setSelectedMode('random');
                                setShowModes(false);
                            }}
                            className={`absolute z-20 flex flex-col items-center gap-2 group transition-opacity ${selectedMode === 'random' ? 'opacity-100' : 'opacity-70'}`}
                        >
                            <div className={`w-16 h-16 rounded-full bg-[#0a0a1a] border flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-black/50 ${selectedMode === 'random' ? 'border-violet-400 bg-violet-500/10' : 'border-neutral-700 hover:border-violet-400'}`}>
                                <Shuffle className={`w-6 h-6 ${selectedMode === 'random' ? 'text-violet-400' : 'text-white group-hover:text-violet-400'}`} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedMode === 'random' ? 'text-violet-400' : 'text-neutral-400 group-hover:text-violet-400'}`}>Random</span>
                        </motion.button>

                        {/* 2. CREATE (Bottom Left) */}
                        <motion.button
                            initial={{ x: 30, y: -30, opacity: 0 }} animate={{ x: -80, y: 70, opacity: 1 }}
                            onClick={() => {
                                setSelectedMode('create');
                                setShowModes(false);
                            }}
                            className={`absolute z-20 flex flex-col items-center gap-2 group transition-opacity ${selectedMode === 'create' ? 'opacity-100' : 'opacity-70'}`}
                        >
                            <div className={`w-16 h-16 rounded-full bg-[#0a0a1a] border flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-black/50 ${selectedMode === 'create' ? 'border-violet-400 bg-violet-500/10' : 'border-neutral-700 hover:border-violet-400'}`}>
                                <Plus className={`w-6 h-6 ${selectedMode === 'create' ? 'text-violet-400' : 'text-white group-hover:text-violet-400'}`} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedMode === 'create' ? 'text-violet-400' : 'text-neutral-400 group-hover:text-violet-400'}`}>Create</span>
                        </motion.button>

                        {/* 3. JOIN (Bottom Right) */}
                        <motion.button
                            initial={{ x: -30, y: -30, opacity: 0 }} animate={{ x: 80, y: 70, opacity: 1 }}
                            onClick={() => {
                                setSelectedMode('join');
                                setShowModes(false);
                            }}
                            className={`absolute z-20 flex flex-col items-center gap-2 group transition-opacity ${selectedMode === 'join' ? 'opacity-100' : 'opacity-70'}`}
                        >
                            <div className={`w-16 h-16 rounded-full bg-[#0a0a1a] border flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-black/50 ${selectedMode === 'join' ? 'border-violet-400 bg-violet-500/10' : 'border-neutral-700 hover:border-violet-400'}`}>
                                <Search className={`w-6 h-6 ${selectedMode === 'join' ? 'text-violet-400' : 'text-white group-hover:text-violet-400'}`} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedMode === 'join' ? 'text-violet-400' : 'text-neutral-400 group-hover:text-violet-400'}`}>Join ID</span>
                        </motion.button>

                    </motion.div>
                ) : (
                    /* --- MAIN BUTTON --- */
                    <div className="relative flex flex-col items-center justify-center">

                        {/* Top Badge (Extended) */}
                        <div className="relative z-20 -mb-5">
                            <div className="bg-[#0a0a1a] border border-violet-500/50 px-6 py-2 rounded-full flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.2)]">

                                <span className="text-[10px] font-bold tracking-[0.2em] text-violet-100 uppercase">
                                    {selectedMode === 'create' ? 'Create Room' : selectedMode === 'join' ? 'Join By ID' : 'Random Match'}
                                </span>
                            </div>
                        </div>

                        <motion.button
                            onMouseDown={startHold}
                            onMouseUp={endHold}
                            onMouseLeave={endHold}
                            onTouchStart={startHold}
                            onTouchEnd={endHold}
                            onClick={() => {
                                if (!isHolding) {
                                    // Execute Action based on Selected Mode
                                    if (selectedMode === 'create') setActiveModal('create');
                                    else if (selectedMode === 'join') setActiveModal('join');
                                    else {
                                        // Random Mode Logic
                                        if (rooms.length === 0) {
                                            // Fallback to Create if no rooms exist
                                            setActiveModal('create');
                                            setSelectedMode('create');
                                        } else {
                                            router.push('/debate/random');
                                        }
                                    }
                                }
                            }}
                            className="group relative w-[300px] sm:w-[360px] h-[100px] rounded-full bg-[#0a0a1a] border border-violet-500/30 overflow-hidden transition-all duration-300 hover:border-violet-500/80 hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] flex items-center justify-center"
                        >
                            {/* Progress Fill */}
                            <div
                                className={`absolute left-0 inset-y-0 bg-violet-600/20 ${isPressing ? 'w-full transition-all duration-[1500ms] ease-linear' : 'w-0 transition-none'}`}
                            />

                            {/* Text */}
                            <div className="relative z-10 flex flex-col items-center justify-center pt-2">
                                <span className={`font-display text-3xl sm:text-4xl font-bold tracking-[0.1em] transition-colors uppercase drop-shadow-2xl ${isHolding ? 'text-violet-400' : 'text-white'} group-hover:text-violet-100`}>
                                    {isHolding ? 'HOLDING...' : 'ENTER DEBATE'}
                                </span>
                            </div>
                        </motion.button>

                        <span className="absolute -bottom-10 text-[10px] text-neutral-500 font-mono tracking-widest uppercase">
                            {isHolding ? 'Release to Cancel' : 'Hold to Select Modes'}
                        </span>
                    </div>
                )}

            </div>
        </div>
    );
}
