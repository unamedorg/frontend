"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { config } from "@/lib/config";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import dynamic from 'next/dynamic';
import { Loader2, Zap, ArrowRight, Globe2, Activity, MapPin, Building2, GraduationCap } from 'lucide-react';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { CosmicBackground } from '@/components/CosmicBackground';

// Dynamic Imports for performance
const ProfileModal = dynamic(() => import('@/components/profile/ProfileModal').then(mod => mod.ProfileModal), { ssr: false });
const FilterModal = dynamic(() => import('@/components/FilterModal').then(mod => mod.FilterModal), { ssr: false });

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [completion, setCompletion] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("random");

  // Load saved filter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("arena_filter");
      if (saved) setCurrentFilter(saved);
    }
  }, []);

  // Fetch Profile Completion logic
  useEffect(() => {
    if (!user) return;

    const checkCompletion = async () => {
      // 0. MEMORY CACHE: Skip if already fetched this session
      const cacheKey = `profile_comp_${user.uid}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setCompletion(parseInt(cached));
        setLoadingProfile(false);
        setProfileExists(true);
        return;
      }

      // 1. FAST PATH: Read Local Data Immediately
      const savedInsta = typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") : null;
      const savedLinkedin = typeof window !== 'undefined' ? localStorage.getItem("arena_linkedin") : null;

      // Optimistic Update (Immediate UI unblock)
      if (savedInsta) {
        setProfileExists(true);
      }

      let score = 0;
      let backendSuccess = false;
      // 1. Email (Mandatory)
      if (user.email) score += 34;

      try {
        // 2. Fetch Backend Data
        const token = await user.getIdToken();
        const res = await fetch(`${config.getApiUrl()}/con/profile-get`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfileExists(true);
          backendSuccess = true;

          // Support both casing styles just in case
          if (data.instagram || data.Instagram) score += 33;
          if (data.linkedin || data.LinkedIn) score += 33;
        } else if (res.status === 404) {
          setProfileExists(false);
          if (!savedInsta) {
            setShowProfile(true);
          }
        }

      } catch (e) {
        console.error("Profile check failed", e);
      }

      // 3. Local Fallbacks (If backend failed or missing data)
      if (savedInsta && score < 67) score += 33;
      if (savedLinkedin && score < 100) score += 33;

      if (!backendSuccess && (savedInsta || savedLinkedin)) {
        setProfileExists(true);
      } else if (!backendSuccess && !savedInsta && !profileExists) {
        setShowProfile(true);
      }

      const finalScore = Math.min(score, 100);
      setCompletion(finalScore);
      sessionStorage.setItem(cacheKey, finalScore.toString());
      setLoadingProfile(false);
    };

    checkCompletion();
  }, [user]);

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showModes, setShowModes] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'vibe' | 'vibe_campus' | 'vibe_local' | 'vibe_tech'>('main');
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isClickActionRef = useRef(true);
  const holdTimersRef = useRef<{ text?: NodeJS.Timeout, complete?: NodeJS.Timeout }>({});
  const [isPressing, setIsPressing] = useState(false);
  const HOLD_DURATION = 1500; // ms - Increased for more deliberate hold

  // Handle Redirection in Effect to avoid 'Update while rendering' warning
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  // If loading auth state
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-void-dark flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }


  // Interaction Handlers
  const startHold = () => {
    setMenuView('main'); // Always reset to main menu on new interaction
    setIsPressing(true);
    isClickActionRef.current = true; // Assume click initially

    // Clear any existing timers
    if (holdTimersRef.current.text) clearTimeout(holdTimersRef.current.text);
    if (holdTimersRef.current.complete) clearTimeout(holdTimersRef.current.complete);

    // 1. Text Change Timer (400ms) - Only then show "HOLDING..."
    holdTimersRef.current.text = setTimeout(() => {
      setIsHolding(true);
      isClickActionRef.current = false;
    }, 400);

    // 2. Completion Timer (1500ms) - Open Modes
    holdTimersRef.current.complete = setTimeout(() => {
      setShowModes(true);
      setIsHolding(false);
      setIsPressing(false); // Stop animation
      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    }, HOLD_DURATION);
  };

  const endHold = () => {
    setIsPressing(false);
    setIsHolding(false);

    // Clear timers immediately
    if (holdTimersRef.current.text) clearTimeout(holdTimersRef.current.text);
    if (holdTimersRef.current.complete) clearTimeout(holdTimersRef.current.complete);

    setMenuView('main');
  };


  const getModeTheme = () => {
    const filter = currentFilter;
    if (filter === 'ranked') {
      return { color: 'text-yellow-500', border: 'border-yellow-500/50', glow: 'shadow-[0_0_100px_-20px_rgba(234,179,8,0.3)]', bg: 'bg-yellow-500/10' };
    }
    if (filter === 'random' || filter === 'blitz') {
      return { color: 'text-cyan-400', border: 'border-cyan-400/50', glow: 'shadow-[0_0_100px_-20px_rgba(34,211,238,0.3)]', bg: 'bg-cyan-400/10' };
    }
    if (['iit', 'nit', 'bits', 'vit', 'colleges'].includes(filter)) {
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
    <main className="flex min-h-[100dvh] flex-col relative overflow-hidden bg-void-dark text-white font-body selection:bg-cyan-glow/30 touch-manipulation select-none">
      {/* 1. Global Background System */}
      <CosmicBackground />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <StarfieldBackground />
      </div>

      {/* 2. Focal Point Glow (From Landing Page Hero) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-500/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Modals */}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onUpdate={(val) => {
          setCurrentFilter(val);
          setShowFilter(false);
        }}
      />

      {/* 3. Floating Header (Pill Style) */}
      <header className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto flex items-center justify-between gap-6 px-5 py-2.5 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 w-full max-w-4xl">

          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold tracking-tight text-white/90">
              Connectree
            </span>
            <span className="hidden sm:block px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-none">
              BETA
            </span>
          </div>

          {/* Right: User Profile (Gradient Border) */}
          <button
            onClick={() => setShowProfile(true)}
            className="group flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-full bg-white/5 border border-white/5 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
          >
            {/* Vibe Gradient Border Overlay (Optional, or just keep specific elements gradient) */}

            <div className="flex flex-col items-end mr-1 text-right hidden sm:flex">
              <span className="text-xs font-bold leading-none text-neutral-300 group-hover:text-white transition-colors">
                {user.displayName?.split(' ')[0]}
              </span>
              {/* Text Vibe Gradient */}
              <span className={`text-[9px] font-mono tracking-wider transition-colors mt-0.5 ${completion === 100 ? 'text-vibe' : 'text-neutral-500'}`}>
                {loadingProfile ? 'SYNCING...' : completion === 100 ? 'VERIFIED' : `${completion}%`}
              </span>
            </div>

            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                <defs>
                  <linearGradient id="vibe-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  className={`${completion === 100 ? '' : 'text-blue-500'} transition-all duration-1000 ease-in-out`}
                  stroke={completion === 100 ? "url(#vibe-gradient)" : "currentColor"}
                  strokeDasharray={`${completion}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-black/50">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                  alt="User"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          </button>

        </div>
      </header>

      {/* Main Content (Centered) */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-6 z-10 gap-12 pb-12 pt-28">

        {/* 1. Status Indicator (Top Center) */}
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

        {/* 2. ENTER ARENA / MODE SELECTOR (Centerpiece) */}
        <div
          className="w-full flex-1 flex flex-col items-center justify-center min-h-[300px] relative"
        >

          {/* A. MODE SELECTOR (Revealed after hold or hover) */}
          {/* A. MODE SELECTOR (Circular / Radial) */}
          {showModes ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative w-[320px] h-[320px] flex items-center justify-center z-20"
            >
              {/* BACKDROP / CLOSE (Click outside to close) */}
              <div
                className="absolute inset-[-100vh] z-0"
                onClick={() => {
                  if (menuView === 'vibe') setMenuView('main');
                  else setShowModes(false);
                }}
              />

              {/* CENTER HUB */}
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

              {/* LEVEL 1: MAIN MODES */}
              <AnimatePresence>
                {menuView === 'main' && (
                  <>
                    {/* TOP: RANKED */}
                    <motion.button
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: -120, opacity: 1 }}
                      exit={{ y: 50, opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      onClick={() => { setCurrentFilter('ranked'); setShowModes(false); }}
                      className="absolute z-20 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-20 h-20 rounded-full bg-void-blue border border-yellow-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.2)] group-hover:scale-110 group-hover:border-yellow-500 group-hover:shadow-[0_0_50px_rgba(234,179,8,0.4)] transition-all">
                        <Activity className="w-8 h-8 text-yellow-500" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Ranked</span>
                        <span className="text-[9px] text-neutral-400">Season 1</span>
                      </div>
                    </motion.button>

                    {/* BOTTOM LEFT: BLITZ */}
                    <motion.button
                      initial={{ x: 30, y: -30, opacity: 0 }}
                      animate={{ x: -100, y: 80, opacity: 1 }}
                      exit={{ x: 30, y: -30, opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                      onClick={() => { setCurrentFilter('random'); setShowModes(false); }}
                      className="absolute z-20 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-20 h-20 rounded-full bg-void-blue border border-cyan-glow/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)] group-hover:scale-110 group-hover:border-cyan-glow group-hover:shadow-[0_0_50px_rgba(6,182,212,0.4)] transition-all">
                        <Zap className="w-8 h-8 text-cyan-glow" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-cyan-glow uppercase tracking-wider">Random</span>
                        <span className="text-[9px] text-neutral-400">Quick Match</span>
                      </div>
                    </motion.button>

                    {/* BOTTOM RIGHT: VIBE (Triggers Level 2) */}
                    <motion.button
                      initial={{ x: -30, y: -30, opacity: 0 }}
                      animate={{ x: 100, y: 80, opacity: 1 }}
                      exit={{ x: -30, y: -30, opacity: 0, scale: 0.5 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                      onClick={() => setMenuView('vibe')}
                      className="absolute z-20 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-20 h-20 rounded-full bg-void-blue border border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)] group-hover:scale-110 group-hover:border-purple-500 group-hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] transition-all">
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


              {/* LEVEL 2: VIBE CATEGORIES */}
              <AnimatePresence>
                {menuView === 'vibe' && (
                  <>


                    {/* RIGHT: Campus */}
                    <motion.button
                      initial={{ x: -50, opacity: 0, scale: 0 }}
                      animate={{ x: 120, opacity: 1, scale: 1 }}
                      exit={{ x: -50, opacity: 0, scale: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.05 }}
                      onClick={() => setMenuView('vibe_campus')}
                      className="absolute z-20 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-16 h-16 rounded-full bg-void-blue border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.2)] group-hover:scale-110 group-hover:border-cyan-400 group-hover:shadow-[0_0_50px_rgba(34,211,238,0.4)] transition-all">
                        <GraduationCap className="w-6 h-6 text-cyan-400" />
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Campus</span>
                    </motion.button>

                    {/* BOTTOM: Local */}
                    <motion.button
                      initial={{ y: -50, opacity: 0, scale: 0 }}
                      animate={{ y: 120, opacity: 1, scale: 1 }}
                      exit={{ y: -50, opacity: 0, scale: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                      onClick={() => setMenuView('vibe_local')}
                      className="absolute z-20 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-16 h-16 rounded-full bg-void-blue border border-fuchsia-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(232,121,249,0.2)] group-hover:scale-110 group-hover:border-fuchsia-400 group-hover:shadow-[0_0_50px_rgba(232,121,249,0.4)] transition-all">
                        <MapPin className="w-6 h-6 text-fuchsia-400" />
                      </div>
                      <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Local</span>
                    </motion.button>

                    {/* LEFT: Tech */}
                    <motion.button
                      initial={{ x: 50, opacity: 0, scale: 0 }}
                      animate={{ x: -120, opacity: 1, scale: 1 }}
                      exit={{ x: 50, opacity: 0, scale: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
                      onClick={() => setMenuView('vibe_tech')}
                      className="absolute z-20 flex flex-col items-center gap-2 group"
                    >
                      <div className="w-16 h-16 rounded-full bg-void-blue border border-emerald-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.2)] group-hover:scale-110 group-hover:border-emerald-400 group-hover:shadow-[0_0_50px_rgba(52,211,153,0.4)] transition-all">
                        <Building2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Tech</span>
                    </motion.button>
                  </>
                )}
              </AnimatePresence>

              {/* LEVEL 3: SUB-MENUS */}
              <AnimatePresence>
                {menuView === 'vibe_campus' && (
                  <>
                    {/* 1. IIT (Top) */}
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
                    {/* 2. VIT (Right) */}
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
                    {/* 3. BITS (Bottom) */}
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
                    {/* 4. NIT (Left) */}
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
            /* B. ENTER BUTTON (Default) */
            /* B. ENTER BUTTON (Default) */
            <div className="relative flex flex-col items-center justify-center">

              {/* STATUS PILL (Fused Top) */}
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
                {/* Progress Fill */}
                <div
                  className={`absolute left-0 inset-y-0 ${theme.bg} ${isPressing ? 'w-full transition-all duration-[1200ms] ease-linear delay-300' : 'w-0 transition-none'}`}
                />

                {/* Active Border Animation (Slim & Glowing) */}
                <div
                  className={`absolute inset-0 rounded-full border-[1.5px] ${theme.color.replace('text-', 'border-')} ${isPressing ? 'opacity-100 shadow-[0_0_15px_currentColor]' : 'opacity-0'} transition-all duration-300 pointer-events-none`}
                />

                {/* Inner Glow & Scanline */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none" />

                {/* NOISE DATA URI REPLACEMENT */}
                <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />

                {/* Main Text Content */}
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

    </main>
  );
}
