"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { TimerProvider, useTimer } from '@/providers/TimerProvider';
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
import { ChatInterface } from '@/components/arena/ChatInterface'; // Import ChatInterface

function ArenaContent() {
    const router = useRouter(); // Use Router
    const { isConnected, disconnect, sendMessage, lastMessage, sessionId } = useWebSocket();
    const { timeRemaining, formatTime, resetTimer, startTimer, endTimer } = useTimer();

    // Match State
    // matchData is only set when fully verified
    const [matchData, setMatchData] = useState<wsResponse | null>(null);

    // Handshake / Verification State
    type HandshakeState = 'idle' | 'verifying' | 'verified';
    const [handshakeStatus, setHandshakeStatus] = useState<HandshakeState>('idle');
    const [pendingMatchData, setPendingMatchData] = useState<wsResponse | null>(null);
    const [isSlowConnection, setIsSlowConnection] = useState(false);

    const handleNextMatch = useCallback(() => {
        // Safe guard: Do not reset if we are in Reveal Phase (Game Over)
        // Unless explicit user action.

        // Notify partner before leaving
        if (isConnected) {
            sendMessage({
                type: 'leave',
                username: 'system',
                timestamp: Date.now()
            });
        }

        // Disconnect to ensure fresh connection for new match
        disconnect();

        // Reset state for new match
        resetTimer();
        setMyConsent(false);
        setPartnerConsented(false);
        setMatchData(null);
        setMatchConfirmed(false);
        setHandshakeStatus('idle');
        setPendingMatchData(null);
        setHasRated(false);
        setPartnerDeclined(false);
    }, [isConnected, sendMessage, disconnect, resetTimer]);

    // Consent Logic
    const [myConsent, setMyConsent] = useState(false);
    const [partnerConsented, setPartnerConsented] = useState(false);
    const [matchConfirmed, setMatchConfirmed] = useState(false);
    const [hasRated, setHasRated] = useState(false); // New state for VibeCheck flow

    // Refs to track state for cleanup
    const isConnectedRef = useRef(isConnected);
    const matchDataRef = useRef(matchData);
    const timeRemainingRef = useRef(timeRemaining);

    useEffect(() => {
        isConnectedRef.current = isConnected;
        matchDataRef.current = matchData;
        timeRemainingRef.current = timeRemaining;
    }, [isConnected, matchData, timeRemaining]);

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

    // Cleanup on unmount (navigation away)
    useEffect(() => {
        return () => {
            if (isConnectedRef.current) {
                // Determine if we should send a leave message (only if in a match)
                if (matchDataRef.current) {
                    sendMessage({
                        type: 'leave',
                        username: 'system',
                        timestamp: Date.now()
                    });
                    console.log("👋 Navigated away. Sent leave signal.");
                }

                // Always disconnect when leaving the arena page
                disconnect();
            }
        };
    }, []);

    // 1. Initial Match Signal (From Engine)
    const handleMatchSignal = (data: wsResponse) => {
        console.log("📡 Match Signal Received. Initiating Handshake...", data);
        setPendingMatchData(data);
        setHandshakeStatus('verifying');
        // We start the rapid-fire handshake in the effect below
    };

    // 2. Rapid Handshake Emitter (Robustness Fix)
    useEffect(() => {
        if (handshakeStatus === 'verifying') {
            const sendPing = () => {
                sendMessage({ type: 'ping' } as any);
            };

            // BURST MODE: Send multiple pings immediately to force through network jitter
            // Mobile networks/browsers often drop the first few packets or wake up slowly.
            const burst = () => {
                sendPing();
                setTimeout(sendPing, 100);
                setTimeout(sendPing, 200);
                setTimeout(sendPing, 300);
                setTimeout(sendPing, 400);
            };
            burst();

            // Then repeat regularly (300ms is easier on mobile batteries/throttling than 150ms)
            const interval = setInterval(sendPing, 300);
            return () => clearInterval(interval);
        }
    }, [handshakeStatus, sendMessage]);

    // 3. Handshake Listener & Verification
    useEffect(() => {
        if (handshakeStatus === 'verifying' && lastMessage) {
            if (lastMessage.type === 'ping') {
                console.log("✅ Handshake Verified! Starting Match.");
                setMatchData(pendingMatchData);
                setHandshakeStatus('verified');
                setPendingMatchData(null);
                startTimer();
            }
        }
    }, [lastMessage, handshakeStatus, pendingMatchData, startTimer]);

    // 4. Handshake Timeout (Ghost Session Protection) & Slow Connection Warning
    useEffect(() => {
        let timeout: NodeJS.Timeout;
        let slowWarningTimeout: NodeJS.Timeout;

        if (handshakeStatus === 'verifying' && pendingMatchData) {
            setIsSlowConnection(false);

            // SMART TIMEOUT STRATEGY:
            // Consumer: Matched with someone waiting. They should be online. If silent -> Ghost. Kill fast (2s).
            // Producer: Matched with joiner. They might be slow/loading. Be patient (15s).
            const isConsumer = pendingMatchData.type === 'start' && pendingMatchData.role === 'consumer';
            const timeoutDuration = isConsumer ? config.timeouts.handshakeConsumer : config.timeouts.handshakeProducer;

            console.log(`⏱️ Handshake Timer Started: ${timeoutDuration}ms (${isConsumer ? 'Aggressive/Consumer' : 'Patient/Producer'})`);

            // If verification takes longer than 5s (only for Producers), show warning
            if (!isConsumer) {
                slowWarningTimeout = setTimeout(() => {
                    console.log("⚠️ Connection taking longer than usual (5s)...");
                    setIsSlowConnection(true);
                }, config.timeouts.handshakeWarning);
            }

            timeout = setTimeout(() => {
                console.warn(`⚠️ Handshake Timeout (${timeoutDuration}ms). Ghost Session Detected. Retrying...`);
                // Critical: Reset state cleanly before next attempt
                setHandshakeStatus('idle');
                setPendingMatchData(null);
                handleNextMatch();
            }, timeoutDuration);
        }

        return () => {
            clearTimeout(timeout);
            clearTimeout(slowWarningTimeout);
        };
    }, [handshakeStatus, pendingMatchData, handleNextMatch]); // Added handleNextMatch dependency

    // 4. PREVENT ACCIDENTAL DISCONNECTS
    // Warn user if they try to reload/close while matched
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (matchData || handshakeStatus !== 'idle') {
                e.preventDefault();
                e.returnValue = ''; // Trigger browser warning
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [matchData, handshakeStatus]);


    // 5. Verification Confirmation (The "Victory Lap")
    // If we verify first, we must NOT go silent. The other side might still be waiting for our ping.
    useEffect(() => {
        if (handshakeStatus === 'verified') {
            console.log("📢 Handshake Vendorified! Sending Confirmation Burst...");
            let count = 0;
            const burst = setInterval(() => {
                sendMessage({ type: 'ping' } as any);
                count++;
                if (count >= 5) clearInterval(burst);
            }, 200);
            return () => clearInterval(burst);
        }
    }, [handshakeStatus, sendMessage]);



    const [partnerDeclined, setPartnerDeclined] = useState(false);

    // Handle incoming messages for match control
    useEffect(() => {
        if (!lastMessage) return;

        // Partner disconnected
        if (lastMessage.type === 'leave' && matchData) {
            // Only exit match if NOT in reveal phase
            if (timeRemaining > 0) {
                handleNextMatch();
            } else {
                console.log("Partner left during Reveal Phase -> Treated as Decline.");
                setPartnerDeclined(true);
            }
        }

        // Partner Consented or Declined
        if (lastMessage.type === 'signal') {
            const subtype = (lastMessage as any).subtype;

            if (subtype === 'consent') {
                console.log("Partner consented to reveal!");
                setPartnerConsented(true);
                // Optimistic Instant Match: If I have also consented, we match immediately!
                if (myConsent) {
                    setMatchConfirmed(true);
                }
            }

            if (subtype === 'decline') {
                console.log("Partner declined reveal.");
                setPartnerDeclined(true);
                setPartnerConsented(false); // Override consent if they changed mind or race condition
            }
        }
    }, [lastMessage, matchData, timeRemaining, handleNextMatch, myConsent]); // Added myConsent dependency

    const handleDecline = async () => {
        // Silent Skip: We do NOT notify the partner via P2P signal anymore.
        // They will wait until the timer expires.

        // Notify Backend via Redis (Persistence)
        if (sessionId && matchData && (matchData as any).roomid) {
            try {
                const roomID = (matchData as any).roomid;
                fetch(`${config.getApiUrl()}/con/make-match?userid=${sessionId}&roomid=${roomID}&match=no`)
                    .catch(e => console.error("Backend decline sync failed", e));
            } catch (e) {
                // Ignore errors here
            }
        }
    };

    const handleExit = () => {
        handleDecline(); // Send decline signal before leaving

        // Give the WebSocket a moment to flush the message before we disconnect
        setTimeout(() => {
            handleNextMatch(); // Clean up & Disconnect
            router.push('/');
        }, 300);
    };

    const handleConsent = async () => {
        setMyConsent(true);
        // 1. Keep WS for partner notification (Optimistic UI)
        sendMessage({
            type: 'signal',
            subtype: 'consent',
            data: null
        } as any);

        // Optimistic Instant Match: If partner already consented, we match immediately!
        if (partnerConsented) {
            setMatchConfirmed(true);
        }

        // 2. Call Backend to persist decision
        // Backend Endpoint: /con/make-match?userid=...&roomid=...&match=yes
        // Defined in backend/room/p2plogic.go
        if (sessionId && matchData && (matchData as any).roomid) {
            try {
                const roomID = (matchData as any).roomid;
                // Explicitly send "yes" to set match status in Redis
                await fetch(`${config.getApiUrl()}/con/make-match?userid=${sessionId}&roomid=${roomID}&match=yes`);
                console.log("✅ Backend notified of consent (matched: yes).");
            } catch (e) {
                console.error("Backend sync failed", e);
            }
        }
    };

    // Poll for Match Confirmation from Backend
    useEffect(() => {
        // Only poll if I have consented (optimization)
        if (!myConsent || !matchData || !(matchData as any).roomid || !sessionId) return;

        // Also, if matched is already confirmed, stop polling
        if (matchConfirmed) return;

        const interval = setInterval(async () => {
            try {
                const roomID = (matchData as any).roomid;
                const res = await fetch(`${config.getApiUrl()}/con/check-match?userid=${sessionId}&roomid=${roomID}`);
                const data = await res.json();

                if (data.matched) {
                    console.log("✅ Match Confirmed by Backend!", data);
                    setMatchConfirmed(true);
                    setPartnerConsented(true); // Ensure UI reflects it even if WS missed
                    clearInterval(interval);
                }
            } catch (e) {
                console.error("Polling check-match failed", e);
            }
        }, 1500); // Check every 1.5s

        return () => clearInterval(interval);
    }, [myConsent, matchConfirmed, matchData, sessionId]);


    // Mock Scenario
    const scenario = "Topic: If you could time travel to any concert in history, which one and why? You have 180s to convince the other person to come with you.";

    // Derived state: Time is up, so we are in the "Reveal Phase"
    const isRevealPhase = timeRemaining === 0;

    return (
        <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-black text-white p-4 overflow-hidden">

            {/* Header / Timer */}
            <header className="flex justify-between items-center mb-4 p-4 border border-white/10 rounded-xl bg-neutral-900/50">
                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="font-mono text-sm tracking-widest">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
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
                    {!matchData && handshakeStatus === 'idle' ? (
                        <MatchmakingEngine onMatchFound={handleMatchSignal} key="matchmaker" autoStart={true} />
                    ) : handshakeStatus === 'verifying' ? (
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center p-6 text-center"
                        >
                            <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin mb-6" />
                            <h3 className="text-white font-display font-bold text-xl">
                                {isSlowConnection ? "Optimizing Route..." : "Establishing Connection..."}
                            </h3>
                            <p className="text-neutral-500 text-sm mt-2 font-mono">
                                {isSlowConnection ? "Finalizing secure channel with peer." : "Securing channel with peer."}
                            </p>
                        </motion.div>
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
                            {/* Bottom Sheet Control - Showing VibeCheck if needed or Status */}
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
                                    <VibeCheck onRate={(score) => {
                                        console.log("⭐ Vibe Check Output:", score);
                                        // TODO: Implement backend persistence for karma/ratings when API is available.
                                        // For now, this is a local client-side interaction.
                                        setHasRated(true);
                                    }} />
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
                                        instagram: "@grok_user",
                                        topTrack: "Midnight City - M83"
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

// Wrapper for Providers - No longer needed as they are in layout.tsx
export default function ArenaPage() {
    return <ArenaContent />;
}
