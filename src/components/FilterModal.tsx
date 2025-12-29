"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, MapPin, Building2, GraduationCap, ArrowRight, Sparkles } from "lucide-react";

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (val: string) => void;
}

export function FilterModal({ isOpen, onClose, onUpdate }: FilterModalProps) {
    const [activeSection, setActiveSection] = useState("random");
    const [filter, setFilter] = useState("random");
    const [rotation, setRotation] = useState(0);

    const sections = [
        {
            id: 'random',
            label: 'Random',
            icon: Zap,
            color: 'text-yellow-400',
            bg: 'bg-yellow-400/20',
            border: 'border-yellow-400/50',
            glow: 'shadow-[0_0_30px_-5px_rgba(250,204,21,0.5)]',
            description: 'Pure chaos. Instant match.'
        },
        {
            id: 'colleges',
            label: 'Campus',
            icon: GraduationCap,
            color: 'text-cyan-400',
            bg: 'bg-cyan-400/20',
            border: 'border-cyan-400/50',
            glow: 'shadow-[0_0_30px_-5px_rgba(34,211,238,0.5)]',
            description: 'IITs, NITs, & Uni vibes.',
            options: [
                { value: 'iit', label: 'IIT' },
                { value: 'nit', label: 'NIT' },
                { value: 'bits', label: 'BITS' },
                { value: 'vit', label: 'VIT' }
            ]
        },
        {
            id: 'cities',
            label: 'Local',
            icon: MapPin,
            color: 'text-fuchsia-400',
            bg: 'bg-fuchsia-400/20',
            border: 'border-fuchsia-400/50',
            glow: 'shadow-[0_0_30px_-5px_rgba(232,121,249,0.5)]',
            description: 'Who’s near you?',
            options: [
                { value: 'mumbai', label: 'Mumbai' },
                { value: 'pune', label: 'Pune' },
                { value: 'bangalore', label: 'BLR' },
                { value: 'delhi', label: 'Delhi' }
            ]
        },
        {
            id: 'companies',
            label: 'Tech',
            icon: Building2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/20',
            border: 'border-emerald-400/50',
            glow: 'shadow-[0_0_30px_-5px_rgba(52,211,153,0.5)]',
            description: 'Network & Chill.',
            options: [
                { value: 'tcs', label: 'TCS' },
                { value: 'infosys', label: 'Infy' },
                { value: 'wipro', label: 'Wipro' },
                { value: 'startup', label: 'Founders' }
            ]
        }
    ];

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem("arena_filter");
            if (saved) {
                setFilter(saved);
                const foundSec = sections.find(s => s.id === saved || s.options?.some(o => o.value === saved));
                if (foundSec) rotateTo(foundSec.id);
            } else {
                rotateTo('random');
            }
        }
    }, [isOpen]);

    const rotateTo = (id: string) => {
        const index = sections.findIndex(s => s.id === id);
        if (index === -1) return;

        const targetRotation = -index * 90;
        let delta = targetRotation - (rotation % 360);
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        setRotation(prev => prev + delta);
        setActiveSection(id);

        // Auto-select first option logic if not already set correctly
        if (id === 'random') handleSelect('random');
        else {
            const sec = sections[index];
            const isAlreadySelectedInThisSec = sec.options?.some(o => o.value === filter);
            if (!isAlreadySelectedInThisSec) {
                const firstOpt = sec.options?.[0]?.value;
                if (firstOpt) handleSelect(firstOpt);
            }
        }
    };

    const handleSelect = (value: string) => {
        setFilter(value);
        localStorage.setItem("arena_filter", value);
    };

    const handleConfirm = () => {
        if (onUpdate) onUpdate(filter);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />

            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 350 }}
                className="relative w-full max-w-sm bg-[#0a0a0a] border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl flex flex-col h-[650px] max-h-[95vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-8 pb-0">
                    <h2 className="text-2xl font-display font-black tracking-tight text-white italic">
                        VIBE <span className="text-white/40 not-italic font-medium">CHECK</span>
                    </h2>
                    <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all">
                        <X className="w-5 h-5 text-white/50" />
                    </button>
                </div>

                {/* Dial Section */}
                <div className="flex-1 flex flex-col items-center justify-between py-6">

                    {/* Radial Selector */}
                    <div className="relative w-[280px] h-[280px] flex items-center justify-center mt-2">
                        {/* Target Indicator */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-[-12px] w-[3px] h-6 bg-white/60 rounded-full z-50 shadow-[0_0_10px_white]" />

                        {/* Hub Display */}
                        <div className="absolute z-10 w-32 h-32 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-center p-4">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeSection}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    className="space-y-1"
                                >
                                    <span className="text-[10px] font-bold tracking-widest text-white/30 block mb-1">MODE</span>
                                    <span className={`text-lg font-black tracking-tight uppercase ${sections.find(s => s.id === activeSection)?.color}`}>
                                        {sections.find(s => s.id === activeSection)?.label}
                                    </span>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Rotating Icons Ring */}
                        <motion.div
                            className="absolute w-full h-full"
                            animate={{ rotate: rotation }}
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                        >
                            {sections.map((section, index) => {
                                const angle = index * 90;
                                const isActive = activeSection === section.id;
                                const radius = 105;
                                const rad = (angle - 90) * (Math.PI / 180);
                                const x = radius * Math.cos(rad);
                                const y = radius * Math.sin(rad);

                                return (
                                    <button
                                        key={section.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            rotateTo(section.id);
                                        }}
                                        className={`absolute top-1/2 left-1/2 w-14 h-14 -ml-7 -mt-7 flex items-center justify-center rounded-full border-2 transition-all duration-300 z-30 cursor-pointer ${isActive
                                                ? `bg-black ${section.border} ${section.glow} scale-110`
                                                : 'bg-black/90 border-white/5 text-white/20'
                                            }`}
                                        style={{ transform: `translate(${x}px, ${y}px)` }}
                                    >
                                        <motion.div animate={{ rotate: -rotation }} transition={{ type: "spring", stiffness: 450, damping: 35 }}>
                                            <section.icon className={`w-6 h-6 ${isActive ? section.color : ''}`} />
                                        </motion.div>
                                    </button>
                                );
                            })}
                        </motion.div>
                    </div>

                    {/* Sub-Options (Grid) */}
                    <div className="w-full px-8 h-32 z-[60]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeSection}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="h-full flex items-center justify-center"
                            >
                                {activeSection === 'random' ? (
                                    <span className="text-white/40 text-xs font-mono uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5 shadow-inner">
                                        No filter selected
                                    </span>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        {sections.find(s => s.id === activeSection)?.options?.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSelect(opt.value);
                                                }}
                                                className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all cursor-pointer relative z-[70] ${filter === opt.value
                                                        ? 'bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.35)]'
                                                        : 'bg-[#0a0a0a] text-white/30 border-white/5 hover:border-white/10 hover:text-white/60'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-8 pt-2">
                    <button
                        onClick={handleConfirm}
                        className="group relative w-full py-5 bg-white text-black font-black text-lg uppercase tracking-widest rounded-3xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_60px_-15px_rgba(255,255,255,0.5)] cursor-pointer overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            CONNECT NOW <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </button>
                </div>

            </motion.div>
        </div>
    );
}
