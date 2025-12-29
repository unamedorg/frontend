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
        setMatchConfirmed(false);
        setHasRated(false);
        setPartnerDeclined(false);
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
                    console.log("👋 Navigated away. Sent leave signal.");
                }
                disconnect();
            }
        };
    }, []);

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

        console.log("💓 Starting Handshake Pulse...");
        const pulseInterval = setInterval(() => {
            sendMessage({
                type: 'signal',
                subtype: 'handshake',
                sender: tabId,
                data: null
            } as any);
        }, 250); // Pulse every 250ms

        return () => {
            clearInterval(pulseInterval);
            console.log("💓 Stopped Handshake Pulse.");
        };
    }, [handshakeStatus, tabId, sendMessage]);


    // Message Handling (Signal/Consent)
    useEffect(() => {
        if (!lastMessage) return;

        // Partner disconnected
        if (lastMessage.type === 'leave' && matchData) {
            if (timeRemainingRef.current > 0) {
                handleNextMatch();
            } else {
                console.log("Partner left during Reveal Phase -> Treated as Decline.");
                setPartnerDeclined(true);
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
                    startTimer(180);
                } else if (handshakeStatus === 'verifying') {
                    setHandshakeStatus('verified');
                }
            }

            if (subtype === 'handshake_ack') {
                console.log("✅ Handshake verified (Ack). Promoting.");
                if (pendingMatchData) {
                    setMatchData(pendingMatchData);
                    setPendingMatchData(null);
                    startTimer(180);
                }
                setHandshakeStatus('verified');
            }

            if (subtype === 'consent') {
                console.log("Partner consented to reveal!");
                setPartnerConsented(true);
                if (myConsent) setMatchConfirmed(true);
            }

            if (subtype === 'decline') {
                console.log("Partner declined reveal.");
                setPartnerDeclined(true);
                setPartnerConsented(false);
            }
        }
    }, [lastMessage, matchData, handleNextMatch, myConsent, pendingMatchData, sendMessage, tabId]);

    const handleDecline = async () => {
        if (sessionId && matchData && (matchData as any).roomid) {
            try {
                if (!user) return;
                const token = await user.getIdToken();
                const roomID = (matchData as any).roomid;
                await fetch(`${config.getApiUrl()}/con/make-match?userid=${sessionId}&roomid=${roomID}&match=no`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) {
                // Ignore errors here
            }
        }
    };

    const handleExit = () => {
        handleDecline();
        setTimeout(() => {
            handleNextMatch();
            router.push('/');
        }, 300);
    };

    const handleConsent = async () => {
        setMyConsent(true);
        sendMessage({
            type: 'signal',
            subtype: 'consent',
            data: null
        } as any);

        if (partnerConsented) {
            setMatchConfirmed(true);
        }

        if (sessionId && matchData && (matchData as any).roomid) {
            try {
                if (!user) return;
                const token = await user.getIdToken();
                const roomID = (matchData as any).roomid;
                await fetch(`${config.getApiUrl()}/con/make-match?userid=${sessionId}&roomid=${roomID}&match=yes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log("✅ Backend notified of consent (matched: yes).");
            } catch (e) {
                console.error("Backend sync failed", e);
            }
        }
    };

    // Poll for Match Confirmation
    useEffect(() => {
        if (!myConsent || !matchData || !(matchData as any).roomid || !sessionId) return;
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


    const scenario = "Topic: If you could time travel to any concert in history, which one and why? You have 180s to convince the other person to come with you.";

    // Karma & Deferred Sending
    const [queuedKarma, setQueuedKarma] = useState(0);

    const handleKarma = (score: number) => {
        console.log("⭐ Vibe Check Recorded (Queued):", score);
        setQueuedKarma(score);
        setHasRated(true);
    };

    // Auto-sync Karma once Match is Confirmed
    useEffect(() => {
        if (matchConfirmed && queuedKarma !== 0 && matchData && (matchData as any).roomid && user) {
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
                    } else {
                        const err = await res.json().catch(() => ({}));
                        console.error("❌ Karma Sync Failed:", res.status, err.error);
                    }
                } catch (e) {
                    console.error("❌ Karma Network Error:", e);
                }
            };
            syncKarma();
        }
    }, [matchConfirmed, queuedKarma, matchData, user]);

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
                            {timeRemaining > 0 && (
                                <div className="text-center text-xs text-neutral-500 font-mono animate-pulse">
                                    CONNECTION SECURE. TIME REMAINING: {timeRemaining}s
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reveal Phase Logic */}
                {timeRemaining === 0 && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50">
                        <AnimatePresence mode="wait">
                            {!hasRated ? (
                                <motion.div
                                    key="vibe-check"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <VibeCheck onRate={handleKarma} />
                                </motion.div>
                            ) : (
                                <RevealCard
                                    key="reveal-card"
                                    isRevealed={matchConfirmed}
                                    hasConsented={myConsent}
                                    partnerConsented={partnerConsented}
                                    partnerDeclined={partnerDeclined}
                                    onConsent={handleConsent}
                                    profileData={{
                                        instagram: typeof window !== 'undefined' ? localStorage.getItem("arena_instagram") || "@user" : "@user",
                                        topTrack: typeof window !== 'undefined' ? localStorage.getItem("arena_top_track") || "Midnight City - M83" : "Midnight City - M83"
                                    }}
                                    onNextMatch={handleNextMatch}
                                    onExit={handleExit}
                                    onDecline={handleDecline}
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
