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
import { SpinningTimer } from '@/components/arena/SpinningTimer';
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
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

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
                // 🛑 GHOST PREVENTION: Only ACK if we are actually waiting for a match.
                // If we are idle (no pending match), we probably missed the 'start' signal.
                if (!pendingMatchData && !matchData) {
                    console.warn("👻 GHOST SIGNAL: Received handshake but I have no match data. Ignoring.");
                    return;
                }

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
                    startTimer(270);

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
                    startTimer(270);
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
        // Only poll if we consented and valid session
        if (!myConsent || !matchData || !(matchData as any).roomid || !sessionId) return;

        // Optimization: Only poll if we don't know the result yet
        if (matchConfirmed) return;

        const interval = setInterval(async () => {
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

    // 🚨 SAFETY NET: If match verified but no profile (Ghost Socket?), aggressively ping partner
    useEffect(() => {
        if (matchConfirmed && !partnerProfile && isConnected) {
            console.log("⚠️ Match verified but missing profile. Pinging partner for data...");

            // Immediate Ping
            sendMessage({
                type: 'signal',
                subtype: 'status_request',
                sender: tabId,
                data: null
            } as any);

            // Repeat every 1s until resolved or partner leaves
            const recoveryInterval = setInterval(() => {
                if (partnerProfile) {
                    clearInterval(recoveryInterval);
                    return;
                }
                sendMessage({
                    type: 'signal',
                    subtype: 'status_request',
                    sender: tabId,
                    data: null
                } as any);
            }, 1000);

            return () => clearInterval(recoveryInterval);
        }
    }, [matchConfirmed, partnerProfile, isConnected, sendMessage, tabId]);

    const handleDecline = () => {
        // Notify partner immediately
        sendMessage({
            type: 'signal',
            subtype: 'decline',
            sender: tabId,
            data: null
        } as any);
        // We do strictly nothing else here, RevealCard handles the UI state (waiting -> result)
    };

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

    // const scenario = (matchData as any)?.topic || "Mission: Get to know your partner.";
    const scenario = "Debate: Is 'Right Person, Wrong Time' a real phenomenon, or just a coping mechanism?";

    return (
        <div className={`flex flex-col h-[100dvh] max-h-[100dvh] transition-colors duration-700 ${!matchData ? 'bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#050a18_100%)]' : 'bg-[#050a18]'} text-white p-2 sm:p-4 overflow-hidden`}>

            {/* Header / Timer */}
            <header className="flex justify-between items-center mb-2 sm:mb-2 p-2 sm:p-3 border border-white/10 rounded-xl bg-neutral-900/50 backdrop-blur-md relative z-20 min-h-[52px]">

                {/* Status Only (No Profile Click) -> Now Clickable for Disconnect */}
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                        onClick={() => setShowDisconnectModal(true)}
                        className="relative group cursor-pointer focus:outline-none"
                    >
                        {/* Gradient Border Wrapper */}
                        <div className="rounded-full bg-vibe p-[1.5px] group-hover:scale-105 transition-transform duration-200 group-active:scale-95">
                            <img
                                src={user?.photoURL || "https://ui-avatars.com/api/?background=random"}
                                alt="Profile"
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-neutral-900 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </button>


                </div>

                {/* Timer Display */}
                <div className="flex items-center justify-center min-w-[100px] sm:min-w-[120px]">
                    {matchData && <SpinningTimer timeRemaining={timeRemaining} />}
                </div>

                {/* Right Placeholder to balance the flex layout since X is gone */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 opacity-0 pointer-events-none" />
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
                            <div className="flex-1 mb-2 sm:mb-4 overflow-hidden flex flex-col min-h-0">
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
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-500">
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
                                    onDecline={handleDecline} // Redirect decline to exit flow
                                    phase={arenaPhase === 'reveal_result' ? 'result' : 'decision'}
                                    timeLeft={phaseTimer}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Disconnect Confirmation Modal */}
            <AnimatePresence>
                {showDisconnectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        onClick={() => setShowDisconnectModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="w-full max-w-sm bg-[#090909] border border-white/10 rounded-3xl p-1 shadow-2xl relative overflow-hidden group"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Inner Content Wrapper for finer border radius */}
                            <div className="bg-neutral-900/50 backdrop-blur-xl rounded-[20px] p-6 relative overflow-hidden">

                                {/* Subtle Red ambient glow from top */}
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-[60px] pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                        <X className="w-6 h-6 text-red-500" />
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Abort Mission?</h3>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-6 px-2">
                                        Leaving now will end the current connection. Are you sure you want to exit?
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <button
                                            onClick={() => setShowDisconnectModal(false)}
                                            className="py-3 px-4 rounded-xl bg-white/5 border border-white/5 text-neutral-300 font-medium hover:bg-white/10 hover:text-white transition-all text-sm active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleExit}
                                            className="py-3 px-4 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold hover:from-red-500 hover:to-red-600 transition-all shadow-lg shadow-red-900/30 text-sm active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Yes, Exit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
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
