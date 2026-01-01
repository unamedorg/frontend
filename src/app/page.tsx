"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { config } from "@/lib/config";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/providers/AuthProvider';
import { ProfileModal } from '@/components/profile/ProfileModal';
import { Loader2, Settings, User as UserIcon, Zap, MapPin, Building2, GraduationCap, ArrowRight, Activity, Globe, Lock as LockIcon } from 'lucide-react';

import { FilterModal } from '@/components/FilterModal';

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
      // 1. FAST PATH: Read Local Data Immediately
      const savedInsta = typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") : null;

      // Optimistic Update (Immediate UI unblock)
      if (savedInsta) {
        setProfileExists(true);
        setLoadingProfile(false);
      }

      const savedTrack = localStorage.getItem("arena_top_track");

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
      const savedLinkedin = typeof window !== 'undefined' ? localStorage.getItem("arena_linkedin") : null;

      // Check Instagram fallback
      if (savedInsta && score < 67) {
        score += 33;
      }

      // Check LinkedIn fallback
      if (savedLinkedin && score < 100) {
        score += 33;
      }

      if (!backendSuccess && (savedInsta || savedLinkedin)) {
        console.log("⚠️ Backend failed/missing, but local profile found. Allowing entry.");
        setProfileExists(true);
      } else if (!backendSuccess && !savedInsta && !profileExists) {
        console.log("No profile found anywhere. Forcing modal.");
        setShowProfile(true);
      }

      setCompletion(Math.min(score, 100));

      // Removed Filter from scoring
      setLoadingProfile(false);
    };

    checkCompletion();
  }, [user]);

  // If loading auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  // --- LOGGED IN DASHBOARD (LOBBY) ---
  if (user) {

    const handleEnterArena = () => {
      // Allow entry regardless of profile status (User choice)
      router.push('/arena');
    };

    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-between relative overflow-hidden bg-black text-white font-body selection:bg-blue-500/30 touch-manipulation">
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
          <FilterModal
            isOpen={showFilter}
            onClose={() => setShowFilter(false)}
            onUpdate={(val) => {
              setCurrentFilter(val);
              setShowFilter(false);
            }}
          />
        </div>
        {/* We need pointer events auto for the modals inside the fixed container, wait, ProfileModal handles its own fixed positioning. */}
        {/* Actually, it's better to render them normally. */}
        <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
        <FilterModal
          isOpen={showFilter}
          onClose={() => setShowFilter(false)}
          onUpdate={(val) => {
            setCurrentFilter(val);
            setShowFilter(false);
          }}
        />


        {/* Global Ambient Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,#000_100%)] opacity-80" />
        </div>

        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none mix-blend-overlay" />

        {/* Header / Top Bar */}
        <header className="w-full max-w-5xl mx-auto flex justify-between items-center p-6 z-20">
          <div className="flex items-center gap-3 select-none">
            <span className="font-display text-xl sm:text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-neutral-200 to-neutral-600">
              EchoArena
            </span>
            <span className="bg-white/5 backdrop-blur-md border border-white/10 text-[9px] px-2 py-0.5 rounded-full text-neutral-400 uppercase tracking-widest font-mono">
              Beta
            </span>
          </div>

          <button
            onClick={() => setShowProfile(true)}
            className="group flex items-center gap-4 pl-5 pr-1.5 py-1.5 rounded-full transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <div className="flex flex-col items-end mr-1 text-right">
              <span className="text-sm font-bold leading-none text-neutral-300 group-hover:text-white transition-colors">
                {user.displayName?.split(' ')[0]}
              </span>
              <span className={`text-[10px] font-mono tracking-wider transition-colors mt-0.5 ${completion === 100 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                {loadingProfile ? 'SYNCING...' : completion === 100 ? 'VERIFIED AGENT' : `${completion}% SETUP`}
              </span>
            </div>

            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Profile Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" viewBox="0 0 36 36">
                <path className="text-neutral-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <path
                  className={`${completion === 100 ? 'text-emerald-500' : 'text-blue-500'} transition-all duration-1000 ease-in-out`}
                  strokeDasharray={`${completion}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <img
                src={user.photoURL || "https://ui-avatars.com/api/?background=random"}
                alt="User"
                className="relative w-8 h-8 rounded-full object-cover border border-black group-hover:scale-95 transition-transform duration-300"
              />
            </div>
          </button>
        </header>

        {/* Main Content (Center) */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm mx-auto px-6 z-10 space-y-8">

          {/* Action Banner (Contextual) */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full"
          >
            {!profileExists && !loadingProfile ? (
              <div
                onClick={() => setShowProfile(true)}
                className="w-full bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-red-500/20 transition-all group shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse hover:animate-none"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg text-red-400 group-hover:text-red-300 transition-colors">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Setup Required</div>
                    <div className="text-sm text-neutral-200 group-hover:text-white font-medium">Create profile to enter</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-red-500/50 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
              </div>
            ) : completion < 100 ? (
              <div
                onClick={() => setShowProfile(true)}
                className="w-full bg-blue-500/10 backdrop-blur-md border border-blue-500/20 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-blue-500/20 transition-all group shadow-[0_0_20px_rgba(59,130,246,0.2)]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:text-blue-300 transition-colors">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Profile Incomplete</div>
                    <div className="text-sm text-neutral-200 group-hover:text-white font-medium">Add details (80% more matches)</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500/50 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            ) : (
              // Completed State
              <div className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-white/10 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500 border border-yellow-500/10">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Ranked Season 1</div>
                    <div className="text-sm text-neutral-200 group-hover:text-white font-medium">Climb the Leaderboard</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>


          {/* HOLOGRAPHIC PLAY BUTTON (Pill Style) */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{
              scale: [1, 1.02, 1],
              opacity: 1
            }}
            transition={{
              scale: {
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              },
              opacity: { duration: 0.5, delay: 0.1 }
            }}
            className="relative group cursor-pointer w-full flex justify-center py-4"
            onClick={handleEnterArena}
          >
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-24 rounded-full blur-[60px] transition-all duration-1000 pointer-events-none bg-purple-600/10 group-hover:bg-purple-500/30" />

            {/* Main Button */}
            <button className="relative w-full max-w-[280px] py-6 bg-black rounded-full border border-purple-500/20 shadow-[0_0_20px_-5px_rgba(168,85,247,0.3)] flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-[1.03] active:scale-95 group-hover:border-purple-500/50 group-hover:shadow-[0_0_40px_-5px_rgba(168,85,247,0.5)]">
              {/* Animated Gradient Beam */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />

              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent opacity-50" />
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Text Content */}
              <div className="relative z-10 flex flex-col items-center">
                <span className="font-display text-xl sm:text-2xl font-bold tracking-[0.25em] text-white group-hover:text-purple-100 transition-colors uppercase">
                  Enter Arena
                </span>
                <div className="h-px w-8 bg-purple-500/50 mt-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </div>
            </button>
          </motion.div>


          {/* Matchmaking Status / Filter (Cyberpunk Style) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full pb-8"
          >
            <div className="flex justify-between items-end mb-3 px-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Matchmaking Params</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-600">LATENCY: 12ms</span>
            </div>

            <button
              onClick={() => setShowFilter(true)}
              className="group relative w-full h-20 bg-neutral-900/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden transition-all hover:bg-neutral-800/80 hover:border-white/20 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]"
            >
              {/* Inner Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="absolute inset-0 flex items-center justify-between px-6">
                {/* Left: Icon & Main Info */}
                <div className="flex items-center gap-5">
                  {/* Icon */}
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all shadow-lg ${currentFilter === 'random' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-blue-600/10 border-blue-500/20 text-blue-400'}`}>
                    {currentFilter === 'random' ? <Zap className="w-6 h-6 fill-current" /> : <MapPin className="w-6 h-6 fill-current" />}
                  </div>

                  {/* Text Stack */}
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Target Filter</span>
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase font-display leading-none">
                      {currentFilter === 'random' ? 'Global' : currentFilter}
                    </span>
                  </div>
                </div>

                {/* Right: Status & Chevron */}
                <div className="flex items-center gap-6">
                  {/* Wait Time */}
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="flex items-center gap-1.5 opacity-60">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-mono text-neutral-400">READY</span>
                    </div>
                    <span className="text-xs font-mono text-neutral-500">&lt; 30s wait</span>
                  </div>

                  {/* Big Chevron */}
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 group-hover:scale-110 transition-all">
                    <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-white" />
                  </div>
                </div>
              </div>
            </button>
          </motion.div>

        </div>

      </main>
    );
  }

  // --- LOGGED OUT LANDING PAGE ---
  const handleMatch = (mode: 'signin' | 'signup') => {
    router.push(`/auth?mode=${mode}`);
  };

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center relative overflow-hidden bg-black text-white selection:bg-white selection:text-black font-mono touch-manipulation">

      {/* Background Ambience - Deep Space Feel */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black opacity-80 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none mix-blend-overlay" />

      {/* Animated Grid Floor (Fake 3D) */}
      <div className="absolute bottom-0 inset-x-0 h-[50vh] bg-gradient-to-t from-blue-900/10 to-transparent opacity-50 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center text-center max-w-5xl px-6 w-full"
      >
        {/* Live Status Ticker */}
        <div className="flex items-center gap-3 py-1.5 px-4 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>System Online: 1,420 Agents Active</span>
        </div>

        {/* Hero Title with Glitch/Glow */}
        <div className="relative mb-6">
          <h1 className="relative font-display text-5xl sm:text-7xl md:text-9xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-600 z-10 select-none">
            EchoArena
          </h1>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/20 to-purple-500/20 blur-[60px] -z-10" />
        </div>

        <p className="font-body text-neutral-300 text-base sm:text-lg md:text-2xl max-w-2xl mb-10 tracking-wide leading-relaxed font-light">
          The 180-second social experiment.<br />
          <span className="text-neutral-500 text-sm font-mono mt-2 block uppercase tracking-[0.2em]">Connect • Vibe • Reveal</span>
        </p>

        {/* Feature Triggers (Visual Only) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-12 w-full max-w-lg opacity-80">
          <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <LockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 mb-2" />
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-neutral-500">Anonymous</span>
          </div>
          <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mb-2" />
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-blue-400">Live Voice</span>
          </div>
          <div className="flex flex-col items-center p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 mb-2" />
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-purple-400">Global</span>
          </div>
        </div>

        {/* Main CTA */}
        <div className="relative group flex flex-col items-center gap-6 w-full max-w-[280px] sm:max-w-none">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-1000 animate-pulse" />
          <button
            onClick={() => handleMatch('signup')}
            className="relative w-full sm:w-auto px-8 sm:px-14 py-4 sm:py-5 bg-black rounded-full border border-purple-500/30 shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] flex items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 hover:border-purple-500/60 hover:shadow-[0_0_35px_-5px_rgba(168,85,247,0.6)] z-10"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent opacity-50" />
            <div className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center">
              <span className="font-display text-lg sm:text-xl font-bold tracking-[0.2em] text-white uppercase transition-colors">Initialize Uplink</span>
            </div>
          </button>

          <button
            onClick={() => handleMatch('signin')}
            className="text-[10px] text-neutral-500 hover:text-white transition-colors uppercase tracking-[0.2em] z-10 hover:underline decoration-white/20 underline-offset-4"
          >
            Resume Session // Login
          </button>
        </div>
      </motion.div>

      {/* Footer / Data Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute bottom-6 inset-x-0 w-full flex justify-center"
      >
        <div className="flex items-center gap-8 text-[9px] font-mono uppercase tracking-widest text-neutral-700">
          <span>Latency: 12ms</span>
          <span className="hidden sm:inline">Encrypted: AES-256</span>
          <span>Ver 2.1.0</span>
        </div>
      </motion.div>
    </main>
  );
}
