"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useTimer } from '@/providers/TimerProvider'; // Removed TimerProvider if not used
import { MatchmakingEngine } from '@/components/matchmaking/MatchmakingEngine';
import { X } from 'lucide-react';
import { ScenarioCard } from '@/components/arena/ScenarioCard';
import { VibeCheck } from '@/components/arena/VibeCheck';
import { RevealCard } from '@/components/profile/RevealCard';
import { CircularTimer } from '@/components/arena/CircularTimer';
import { motion, AnimatePresence } from 'framer-motion';
import { wsResponse } from '@/types/socket';
import { config } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/arena/ChatInterface';
import { useAuth } from '@/providers/AuthProvider';
import { AuthGuard } from '@/components/auth/AuthGuard';

function ArenaContent() {
    const router = useRouter();
    const { user } = useAuth(); // Get User for Avatar
    const { isConnected, disconnect, sendMessage, lastMessage, sessionId, tabId } = useWebSocket();
    const { timeRemaining, formatTime, resetTimer, startTimer } = useTimer();

    // Match State
    const [matchData, setMatchData] = useState<wsResponse | null>(null);
    const [isSlowConnection, setIsSlowConnection] = useState(false);

    // Consent Logic
    const [myConsent, setMyConsent] = useState(false);
    const [partnerConsented, setPartnerConsented] = useState(false);
    const [matchConfirmed, setMatchConfirmed] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [partnerDeclined, setPartnerDeclined] = useState(false);
    const [handshakeStatus, setHandshakeStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
    const [pendingMatchData, setPendingMatchData] = useState<wsResponse | null>(null);

    // Phase Management
    const [arenaPhase, setArenaPhase] = useState<'chat' | 'vibe' | 'reveal_decision' | 'reveal_result'>('chat');
    const [phaseTimer, setPhaseTimer] = useState(0);

    // Refs
    const isConnectedRef = useRef(isConnected);
    const matchDataRef = useRef(matchData);
    const timeRemainingRef = useRef(timeRemaining);

    useEffect(() => {
        isConnectedRef.current = isConnected;
        matchDataRef.current = matchData;
        timeRemainingRef.current = timeRemaining;
    }, [isConnected, matchData, timeRemaining]);

    const handleNextMatch = useCallback(() => {
        // Notify partner before leaving if connected
        if (isConnected) {
            sendMessage({
                type: 'leave',
                username: 'system',
                timestamp: Date.now()
            });
        }

        // Fresh connection for new match
        disconnect();

        // Reset state
        resetTimer();
        setMyConsent(false);
        setPartnerConsented(false);
        setMatchData(null);
        setHandshakeStatus('idle');
        setPendingMatchData(null);
        setArenaPhase('chat');
        setVibeSubmitted(false);
        setQueuedKarma(0);
        setMatchConfirmed(false);
        setHasRated(false);
        setPartnerDeclined(false);
        setPartnerProfile(null);
    }, [isConnected, sendMessage, disconnect, resetTimer]);

    // Cleanup on unmount (navigation away)
    useEffect(() => {
        return () => {
            if (isConnectedRef.current) {
                if (matchDataRef.current) {
                    sendMessage({
                        type: 'leave',
                        username: 'system',
                        timestamp: Date.now()
                    });
                }
                resetTimer(); // Reset global timer state when leaving
                disconnect();
            }
        };
    }, [resetTimer]);

    const handleBeforeUnload = () => {
        if (isConnected) {
            sendMessage({
                type: 'leave',
                username: 'system',
                timestamp: Date.now()
            });
        }
    };

    useEffect(() => {
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isConnected, sendMessage]);

    // PREVENT ACCIDENTAL DISCONNECTS
    useEffect(() => {
        const handleBeforeUnloadEvent = (e: BeforeUnloadEvent) => {
            if (matchData) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnloadEvent);
        return () => window.removeEventListener('beforeunload', handleBeforeUnloadEvent);
    }, [matchData]);


    // 1. Initial Match Signal
    const handleMatchSignal = useCallback((data: wsResponse) => {
        // 🔒 SAFETY: Prevent Double-Activation
        if (handshakeStatus === 'verifying' || matchData) {
            console.log("🛡️ Ignored duplicate/concurrent match signal.");
            return;
        }

        console.log("📡 Match Signal Received. Verifying ghost status...", data);

        setPendingMatchData(data);
        setHandshakeStatus('verifying');

        // FAILSAFE: If no life sign in 2s, we return to matchmaking.
        const verifyTimer = setTimeout(() => {
            setHandshakeStatus(current => {
                if (current === 'verifying') {
                    console.warn("⚠️ GHOST DETECTED: No Handshake. Resetting...");
                    handleNextMatch();
                    return 'failed';
                }
                return current;
            });
        }, 2000);
        return () => clearTimeout(verifyTimer);
    }, [handshakeStatus, matchData, handleNextMatch]);

    // ⚡ PULSE HANDSHAKE: Aggressively ping partner until verified.
    // This ensures that if they load slightly slower, they still get our signal ASAP.
    useEffect(() => {
        if (handshakeStatus !== 'verifying' || !tabId) return;

        console.log("💓 Starting Handshake Pulse (Turbo Method)...");

        const sendPulse = () => {
            sendMessage({
                type: 'signal',
                subtype: 'handshake',
                sender: tabId,
                data: null
            } as any);
        };

        // 1. Fire immediately (0ms delay)
        sendPulse();

        // 2. Fire rapidly (75ms interval) to catch them ASAP
        const pulseInterval = setInterval(sendPulse, 75);

        return () => {
            clearInterval(pulseInterval);
            console.log("💓 Stopped Handshake Pulse.");
        };
    }, [handshakeStatus, tabId, sendMessage]);


    // Message Handling (Signal/Consent)
    useEffect(() => {
        if (!lastMessage) return;

        // Partner disconnected
        if (lastMessage.type === 'leave') {
            if (matchData || pendingMatchData || handshakeStatus === 'verifying') {
                console.log("Partner left -> Resetting immediately.");
                if (arenaPhase === 'reveal_result' || arenaPhase === 'reveal_decision') {
                    // If late stage, valid decline
                    setPartnerDeclined(true);
                } else {
                    // If early or mid-chat, just next match
                    handleNextMatch();
                }
            }
        }

        // Handshake Logic
        if (lastMessage.type === 'signal') {
            const signal = lastMessage as any;

            // CRITICAL: Ignore own signals (Self-Echo Prevention via TabID)
            if (signal.sender === tabId) return;

            const subtype = signal.subtype;

            if (subtype === 'handshake') {
                console.log("🤝 Handshake received from partner. Reply ack + Fast Start.");
                sendMessage({
                    type: 'signal',
                    subtype: 'handshake_ack',
                    sender: tabId,
                    data: null
                } as any);

                // ⚡ FAST TRACK: Proof of Life received.
                if (pendingMatchData) {
                    setMatchData(pendingMatchData);
                    setPendingMatchData(null);
                    setHandshakeStatus('verified');
                    setArenaPhase('chat');
                    setVibeSubmitted(false);
                    setQueuedKarma(0);
                    startTimer(180);

                    // 📡 RE-ESTABLISH: If we already consented in a previous session, inform partner
                    if (myConsent) {
                        const myProfile = {
                            instagram: typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") || "@user" : "@user",
                            topTrack: typeof window !== 'undefined' ? localStorage.getItem("arena_top_track") || "Midnight City - M83" : "Midnight City - M83"
                        };
                        sendMessage({
                            type: 'signal',
                            subtype: 'consent',
                            sender: tabId,
                            data: myProfile
                        } as any);
                    }
                } else if (handshakeStatus === 'verifying') {
                    setHandshakeStatus('verified');
                }
            }

            if (subtype === 'handshake_ack') {
                console.log("✅ Handshake verified (Ack). Promoting.");
                if (pendingMatchData) {
                    setMatchData(pendingMatchData);
                    setPendingMatchData(null);
                    setArenaPhase('chat');
                    setVibeSubmitted(false);
                    setQueuedKarma(0);
                    startTimer(180);
                }
                setHandshakeStatus('verified');

                // 📡 RE-ESTABLISH: Inform partner about our current consent status
                if (myConsent) {
                    const myProfile = {
                        instagram: typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") || "@user" : "@user",
                        topTrack: typeof window !== 'undefined' ? localStorage.getItem("arena_top_track") || "Midnight City - M83" : "Midnight City - M83"
                    };
                    sendMessage({
                        type: 'signal',
                        subtype: 'consent',
                        sender: tabId,
                        data: myProfile
                    } as any);
                }
            }

            if (subtype === 'consent') {
                console.log("Partner consented to reveal!", signal.data);
                setPartnerConsented(true);
                if (signal.data) {
                    setPartnerProfile(signal.data as any);
                }
                if (myConsent) setMatchConfirmed(true);
            }

            if (subtype === 'decline') {
                console.log("Partner declined reveal.");
                setPartnerDeclined(true);
                setPartnerConsented(false);
            }

            if (subtype === 'status_request') {
                console.log("Partner requested status. Replying if consented...");
                if (myConsent) {
                    const myProfile = {
                        instagram: typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") || "@user" : "@user",
                        topTrack: typeof window !== 'undefined' ? localStorage.getItem("arena_top_track") || "Midnight City - M83" : "Midnight City - M83"
                    };
                    sendMessage({
                        type: 'signal',
                        subtype: 'consent',
                        sender: tabId,
                        data: myProfile
                    } as any);
                }
            }
        }
    }, [lastMessage, matchData, handleNextMatch, myConsent, pendingMatchData, sendMessage, tabId, arenaPhase]);

    // ------------------------------------------------------------
    // 🚦 PHASE MANAGEMENT (Strict 10s Steps)
    // ------------------------------------------------------------
    // State to track user actions within phases
    const [vibeSubmitted, setVibeSubmitted] = useState(false);
    const [partnerProfile, setPartnerProfile] = useState<{ instagram?: string; topTrack?: string } | null>(null);

    // Timer Tick for Phases
    useEffect(() => {
        if (arenaPhase === 'chat') return; // Handled by main timer

        if (phaseTimer > 0) {
            const timer = setInterval(() => setPhaseTimer(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else {
            // Phase Transitions on Timeout
            if (arenaPhase === 'vibe') {
                console.log("⌛ Vibe Phase Ended -> Moving to Reveal Decision");
                setArenaPhase('reveal_decision');
                setPhaseTimer(10);
                // 📡 Broadcast status request to catch any early consents from partner
                sendMessage({
                    type: 'signal',
                    subtype: 'status_request',
                    sender: tabId,
                    data: null
                } as any);
            } else if (arenaPhase === 'reveal_decision') {
                console.log("⌛ Decision Phase Ended -> Showing Results");
                setArenaPhase('reveal_result');
                // Check match immediately upon phase end
                if (myConsent && partnerConsented) {
                    setMatchConfirmed(true);
                }
            }
        }
    }, [arenaPhase, phaseTimer, myConsent, partnerConsented]);

    // Initial Trigger from Chat Timer
    useEffect(() => {
        if (timeRemaining === 0 && arenaPhase === 'chat' && matchData && handshakeStatus === 'verified') {
            console.log("⌛ Chat Time Up -> Starting Vibe Phase");
            setArenaPhase('vibe');
            setPhaseTimer(10);
        }
    }, [timeRemaining, arenaPhase, matchData, handshakeStatus]);


    // ------------------------------------------------------------
    // 💖 VIBE CHECK (Phase 1)
    // ------------------------------------------------------------
    const [queuedKarma, setQueuedKarma] = useState(0);

    const handleVibeSubmit = (score: number) => {
        console.log("⭐ Vibe Recorded (Queued):", score);
        setQueuedKarma(score);
        setVibeSubmitted(true);
        // We DO NOT advance phase. We wait for timer.
    };

    // ------------------------------------------------------------
    // 🔓 REVEAL DECISION (Phase 2)
    // ------------------------------------------------------------
    const handleConsent = async () => {
        setMyConsent(true);

        // Prepare Profile Data to Share
        const myProfile = {
            instagram: typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") || "@user" : "@user",
            topTrack: typeof window !== 'undefined' ? localStorage.getItem("arena_top_track") || "Midnight City - M83" : "Midnight City - M83"
        };

        sendMessage({
            type: 'signal',
            subtype: 'consent',
            sender: tabId,
            data: myProfile // 📤 Sending my profile to partner!
        } as any);

        // Sync "Yes" to backend immediately (Intent is recorded)
        if (sessionId && matchData && (matchData as any).roomid) {
            try {
                if (!user) return;
                const token = await user.getIdToken();
                const roomID = (matchData as any).roomid;
                await fetch(`${config.getApiUrl()}/con/make-match?userid=${sessionId}&roomid=${roomID}&match=yes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                console.error("Backend sync failed", e);
            }
        }
    };

    // ------------------------------------------------------------
    // 🤝 FINAL SYNC (Phase 3)
    // ------------------------------------------------------------
    // Send Karma when we transition to results phase, regardless of mutual match reveal
    useEffect(() => {
        if (matchConfirmed && arenaPhase === 'reveal_result' && queuedKarma !== 0 && matchData && (matchData as any).roomid && user) {
            const syncKarma = async () => {
                try {
                    const token = await user.getIdToken();
                    const res = await fetch(`${config.getApiUrl()}/con/update-karma`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            roomid: (matchData as any).roomid,
                            karma: queuedKarma
                        })
                    });
                    if (res.ok) {
                        console.log("✅ Karma Synced (Mutual Match Confirmed)");
                        setQueuedKarma(0);
                    }
                } catch (e) {
                    console.error("Karma network error", e);
                }
            };
            syncKarma();
        }
    }, [arenaPhase, matchConfirmed, queuedKarma, matchData, user]);

    // Poll for Backend Match Confirmation ONLY in result phase (or late decision)
    useEffect(() => {
        // Only pool if we consented and valid session
        if (!myConsent || !matchData || !(matchData as any).roomid || !sessionId) return;

        // Optimization: Only poll if we don't know the result yet
        if (matchConfirmed) return;

        const interval = setInterval(async () => {
            // ... (Keep existing polling logic, it's fine)
            try {
                if (!user) return;
                const token = await user.getIdToken();
                const roomID = (matchData as any).roomid;
                const res = await fetch(`${config.getApiUrl()}/con/check-match?userid=${sessionId}&roomid=${roomID}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.matched) {
                    console.log("✅ Match Confirmed by Backend!", data);
                    setMatchConfirmed(true);
                    setPartnerConsented(true);
                    clearInterval(interval);
                }
            } catch (e) {
                console.error("Polling check-match failed", e);
            }
        }, 1500);
        return () => clearInterval(interval);
    }, [myConsent, matchConfirmed, matchData, sessionId, user]);

    const handleExit = useCallback(() => {
        if (isConnected) {
            sendMessage({
                type: 'leave',
                username: 'system',
                timestamp: Date.now()
            });
        }
        resetTimer();
        disconnect();
        router.push('/');
    }, [isConnected, sendMessage, disconnect, router, resetTimer]);

    const scenario = (matchData as any)?.topic || "Mission: Get to know your partner.";

    return (
        <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-black text-white p-4 overflow-hidden">

            {/* Header / Timer */}
            <header className="flex justify-between items-center mb-4 p-4 border border-white/10 rounded-xl bg-neutral-900/50">

                {/* Status Only (No Profile Click) */}
                <div className="flex items-center space-x-3">
                    <div className="relative group">
                        <img
                            src={user?.photoURL || "https://ui-avatars.com/api/?background=random"}
                            alt="Profile"
                            className="relative w-10 h-10 rounded-full border-2 border-neutral-800 object-cover opacity-80"
                        />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-neutral-900 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>

                    <div className="hidden sm:flex flex-col">
                        <span className="font-display font-medium text-sm leading-tight text-white/90">
                            {matchData?.type === 'start' ? `Echo Partner` : (user?.displayName?.split(' ')[0] || 'User')}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
                                {isConnected ? 'Link_Active' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center min-w-[120px]">
                    {timeRemaining === 0 ? (
                        <span className="text-red-500 font-mono font-bold text-sm tracking-widest animate-pulse">
                            CHAT ENDED
                        </span>
                    ) : timeRemaining > config.warningTime ? (
                        <span className="text-3xl font-display font-bold tabular-nums tracking-tight text-white">
                            {formatTime(timeRemaining)}
                        </span>
                    ) : (
                        <CircularTimer timeRemaining={timeRemaining} totalTime={config.warningTime} />
                    )}
                </div>
                <button
                    onClick={handleExit}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 relative flex flex-col items-center justify-center min-h-0">

                <AnimatePresence mode="wait">
                    {!matchData ? (
                        handshakeStatus === 'verifying' ? (
                            <motion.div
                                key="verifying"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex flex-col items-center justify-center h-full space-y-6"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 border-2 border-white/5 rounded-full" />
                                    <div className="absolute inset-0 w-16 h-16 border-2 border-t-white rounded-full animate-spin" />
                                    <div className="absolute inset-2 w-12 h-12 border border-white/10 rounded-full animate-pulse" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">
                                        Handshake_Sequence
                                    </p>
                                    <p className="font-display text-xs font-bold tracking-widest text-white/60">
                                        SYNCHRONIZING_UPLINK...
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <MatchmakingEngine onMatchFound={handleMatchSignal} key="matchmaker" autoStart={true} />
                        )
                    ) : (
                        <motion.div
                            key="interaction"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full max-w-2xl h-full flex flex-col min-h-0"
                        >
                            {/* Scenario */}
                            <ScenarioCard scenario={scenario} />

                            {/* Chat Area */}
                            <div className="flex-1 mb-4 overflow-hidden flex flex-col min-h-0">
                                <ChatInterface matchData={matchData} onTimeout={handleNextMatch} />
                            </div>
                            {/* Bottom Sheet Control */}
                            {/* Bottom Sheet Control */}
                            {arenaPhase !== 'chat' && (
                                <div className="text-center text-xs text-neutral-500 font-mono animate-pulse">
                                    {arenaPhase === 'vibe' && "PHASE: VIBE CHECK"}
                                    {arenaPhase === 'reveal_decision' && "PHASE: DECISION PROTOCOL"}
                                    {arenaPhase === 'reveal_result' && "PHASE: MISSION OUTCOME"}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reveal Phase Logic */}
                {arenaPhase !== 'chat' && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50">
                        <AnimatePresence mode="wait">
                            {arenaPhase === 'vibe' ? (
                                <motion.div
                                    key="vibe-check"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <VibeCheck
                                        onRate={handleVibeSubmit}
                                        submitted={vibeSubmitted}
                                        timeLeft={phaseTimer}
                                    />
                                </motion.div>
                            ) : (
                                <RevealCard
                                    key="reveal-card"
                                    isRevealed={matchConfirmed}
                                    hasConsented={myConsent}
                                    partnerConsented={partnerConsented}
                                    partnerDeclined={partnerDeclined}
                                    onConsent={handleConsent}
                                    profileData={partnerProfile || {
                                        instagram: "Pending...",
                                        topTrack: "Pending..."
                                    }}
                                    onNextMatch={handleNextMatch}
                                    onExit={handleExit}
                                    onDecline={handleExit} // Redirect decline to exit flow
                                    phase={arenaPhase === 'reveal_result' ? 'result' : 'decision'}
                                    timeLeft={phaseTimer}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ArenaPage() {
    return (
        <AuthGuard>
            <ArenaContent />
        </AuthGuard>
    );
}
