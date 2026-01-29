"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { config } from "@/lib/config";
import { useAuth } from '@/providers/AuthProvider';
import dynamic from 'next/dynamic';
import { Loader2, Zap, Swords } from 'lucide-react';
import { StarfieldBackground } from '@/components/StarfieldBackground';
import { CosmicBackground } from '@/components/CosmicBackground';
import { ArenaMain } from '@/components/arena/ArenaMain';
import { DebateEntry } from '@/components/debate/DebateEntry';

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
  const [appMode, setAppMode] = useState<'arena' | 'debate'>('debate');

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
      const cacheKey = `profile_comp_${user.uid}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setCompletion(parseInt(cached));
        setLoadingProfile(false);
        setProfileExists(true);
        return;
      }

      const savedInsta = typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") : null;
      const savedLinkedin = typeof window !== 'undefined' ? localStorage.getItem("arena_linkedin") : null;

      if (savedInsta) {
        setProfileExists(true);
      }

      let score = 0;
      let backendSuccess = false;
      if (user.email) score += 34;

      try {
        const token = await user.getIdToken();
        const res = await fetch(`${config.getApiUrl()}/con/profile-get`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setProfileExists(true);
          backendSuccess = true;
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#02040a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col relative overflow-hidden bg-[#02040a] text-white font-body selection:bg-cyan-400/30 touch-manipulation select-none">
      <CosmicBackground />
      <div className="fixed inset-0 z-0 pointer-events-none">
        <StarfieldBackground />
      </div>

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-500/[0.02] blur-[120px] rounded-full" />
      </div>

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        onUpdate={(val) => {
          setCurrentFilter(val);
          setShowFilter(false);
        }}
      />

      <header className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4">
        <div className="pointer-events-auto flex items-center justify-between gap-6 px-5 py-2.5 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 w-full max-w-4xl">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold tracking-tight text-white/90">
              Connectree
            </span>
            <span className="hidden sm:block px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-none">
              BETA
            </span>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex bg-[#0F0F0F] p-0.5 md:p-1 rounded-full border border-white/5 backdrop-blur-md shadow-lg">
            <div className="relative flex items-center gap-1">
              <button
                onClick={() => setAppMode('debate')}
                className={`relative z-10 px-2.5 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-[9px] md:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 rounded-full ${appMode === 'debate' ? 'text-violet-400 bg-[#1F1F1F] border border-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                <Swords className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-all duration-300 ${appMode === 'debate' ? 'fill-violet-400/30' : ''}`} />
                {appMode === 'debate' && <span>Debate</span>}
              </button>
              <button
                onClick={() => setAppMode('arena')}
                className={`relative z-10 px-2.5 md:px-4 py-1.5 md:py-2 flex items-center gap-1 md:gap-2 text-[9px] md:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 rounded-full ${appMode === 'arena' ? 'text-cyan-400 bg-[#1F1F1F] border border-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                <Zap className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-all duration-300 ${appMode === 'arena' ? 'fill-cyan-400/30' : ''}`} />
                {appMode === 'arena' && <span>Arena</span>}
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowProfile(true)}
            className="group flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-full bg-white/5 border border-white/5 hover:border-white/20 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex flex-col items-end mr-1 text-right hidden sm:flex">
              <span className="text-xs font-bold leading-none text-neutral-300 group-hover:text-white transition-colors">
                {user.displayName?.split(' ')[0]}
              </span>
              <span className={`text-[9px] font-mono tracking-wider transition-colors mt-0.5 ${completion === 100 ? 'text-cyan-400' : 'text-neutral-500'}`}>
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

      {appMode === 'arena' ? (
        <ArenaMain
          user={user}
          currentFilter={currentFilter}
          setCurrentFilter={setCurrentFilter}
          profileExists={profileExists}
          completion={completion}
          loadingProfile={loadingProfile}
          setShowProfile={setShowProfile}
        />
      ) : (
        <div className="flex-1 w-full flex flex-col pt-20 md:pt-28 overflow-hidden h-full">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>}>
            <DebateEntry />
          </Suspense>
        </div>
      )}
    </main >
  );
}
