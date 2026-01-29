"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useTimer } from '@/providers/TimerProvider';
import { MatchmakingEngine } from '@/components/matchmaking/MatchmakingEngine';
import { X } from 'lucide-react';
import { ScenarioCard } from '@/components/arena/ScenarioCard';
import { VibeCheck } from '@/components/arena/VibeCheck';
import { RevealCard } from '@/components/profile/RevealCard';
import { SpinningTimer } from '@/components/arena/SpinningTimer';
import { motion, AnimatePresence } from 'framer-motion';
import { wsResponse } from '@/types/socket';
import { config } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/arena/ChatInterface';
import { useAuth } from '@/providers/AuthProvider';

export function ArenaContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { isConnected, disconnect, sendMessage, lastMessage, sessionId, tabId, connectToRoom } = useWebSocket();
    const { timeRemaining, resetTimer, startTimer } = useTimer();

    // Match State
    const [matchData, setMatchData] = useState<wsResponse | null>(null);
    const [myConsent, setMyConsent] = useState(false);
    const [partnerConsented, setPartnerConsented] = useState(false);
    const [matchConfirmed, setMatchConfirmed] = useState(false);
    const [partnerDeclined, setPartnerDeclined] = useState(false);
    const [handshakeStatus, setHandshakeStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');
    const [pendingMatchData, setPendingMatchData] = useState<wsResponse | null>(null);

    // Phase Management
    const [arenaPhase, setArenaPhase] = useState<'chat' | 'vibe' | 'reveal_decision' | 'reveal_result'>('chat');
    const [phaseTimer, setPhaseTimer] = useState(0);
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);
    const [showTimeUpModal, setShowTimeUpModal] = useState(false);

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
        if (isConnected) {
            sendMessage({
                type: 'leave',
                username: 'system',
                timestamp: Date.now()
            });
        }
        disconnect();
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
        setPartnerDeclined(false);
        setPartnerProfile(null);
    }, [isConnected, sendMessage, disconnect, resetTimer]);

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
                resetTimer();
                disconnect();
            }
        };
    }, [resetTimer, disconnect, sendMessage]);

    const handleBeforeUnload = useCallback(() => {
        if (isConnectedRef.current) {
            sendMessage({
                type: 'leave',
                username: 'system',
                timestamp: Date.now()
            });
        }
    }, [sendMessage]);

    useEffect(() => {
        window.addEventListener('beforeunload', handleBeforeUnload);
        const handleBeforeUnloadEvent = (e: BeforeUnloadEvent) => {
            if (matchDataRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnloadEvent);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('beforeunload', handleBeforeUnloadEvent);
        };
    }, [handleBeforeUnload]);

    const handleMatchSignal = useCallback(async (data: wsResponse) => {
        if (handshakeStatus === 'verifying' || matchData) return;

        setPendingMatchData(data);
        setHandshakeStatus('verifying');

        if ((data as any).role === 'producer') {
            try {
                const topic = (data as any).topic || "General Debate";
                const res = await fetch(`${config.getApiUrl()}/debate/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: topic,
                        duration: 10,
                        maxClient: 2
                    })
                });
                const roomData = await res.json();
                if (roomData.roomId) {
                    sendMessage({
                        type: 'signal',
                        subtype: 'switch_room',
                        data: { roomId: roomData.roomId }
                    } as any);
                    const myDummyName = "User_" + Math.random().toString(36).substring(7);
                    connectToRoom(roomData.roomId, myDummyName);
                } else {
                    handleNextMatch();
                }
            } catch (e) {
                console.error("Error creating debate room:", e);
                handleNextMatch();
            }
        }

        const verifyTimer = setTimeout(() => {
            setHandshakeStatus(current => {
                if (current === 'verifying') {
                    handleNextMatch();
                    return 'failed';
                }
                return current;
            });
        }, 8000);
        return () => clearTimeout(verifyTimer);
    }, [handshakeStatus, matchData, handleNextMatch, sendMessage, connectToRoom]);

    useEffect(() => {
        if (handshakeStatus !== 'verifying' || !tabId) return;

        const sendPulse = () => {
            sendMessage({
                type: 'signal',
                subtype: 'handshake',
                sender: tabId,
                data: null
            } as any);
        };

        const pulseInterval = setInterval(sendPulse, 75);
        return () => clearInterval(pulseInterval);
    }, [handshakeStatus, tabId, sendMessage]);

    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'leave') {
            if (matchData || pendingMatchData || handshakeStatus === 'verifying') {
                if (arenaPhase === 'reveal_result' || arenaPhase === 'reveal_decision') {
                    setPartnerDeclined(true);
                } else {
                    handleNextMatch();
                }
            }
        }

        if (lastMessage.type === 'system' && (lastMessage as any).message === 'Room expired') {
            setShowTimeUpModal(true);
        }

        if (lastMessage.type === 'signal') {
            const signal = lastMessage as any;
            if (signal.sender === tabId) return;
            const subtype = signal.subtype;

            if (subtype === 'switch_room') {
                const { roomId } = signal.data as { roomId: string };
                if (roomId) {
                    const myDummyName = "User_" + Math.random().toString(36).substring(7);
                    connectToRoom(roomId, myDummyName);
                }
            }

            if (subtype === 'handshake') {
                if (!pendingMatchData && !matchData) return;
                sendMessage({
                    type: 'signal',
                    subtype: 'handshake_ack',
                    sender: tabId,
                    data: null
                } as any);

                if (pendingMatchData) {
                    setMatchData(pendingMatchData);
                    setPendingMatchData(null);
                    setHandshakeStatus('verified');
                    setArenaPhase('chat');
                    setVibeSubmitted(false);
                    setQueuedKarma(0);
                    startTimer(270);

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
                if (pendingMatchData) {
                    setMatchData(pendingMatchData);
                    setPendingMatchData(null);
                    setArenaPhase('chat');
                    setVibeSubmitted(false);
                    setQueuedKarma(0);
                    startTimer(270);
                }
                setHandshakeStatus('verified');

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
                setPartnerConsented(true);
                if (signal.data) setPartnerProfile(signal.data as any);
                if (myConsent) setMatchConfirmed(true);
            }

            if (subtype === 'decline') {
                setPartnerDeclined(true);
                setPartnerConsented(false);
            }

            if (subtype === 'status_request') {
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
    }, [lastMessage, matchData, handleNextMatch, myConsent, pendingMatchData, sendMessage, tabId, arenaPhase, connectToRoom, handshakeStatus, startTimer]);

    const [vibeSubmitted, setVibeSubmitted] = useState(false);
    const [partnerProfile, setPartnerProfile] = useState<{ instagram?: string; topTrack?: string } | null>(null);

    useEffect(() => {
        if (arenaPhase === 'chat') return;
        if (phaseTimer > 0) {
            const timer = setInterval(() => setPhaseTimer(prev => prev - 1), 1000);
            return () => clearInterval(timer);
        } else {
            if (arenaPhase === 'vibe') {
                setArenaPhase('reveal_decision');
                setPhaseTimer(10);
                sendMessage({
                    type: 'signal',
                    subtype: 'status_request',
                    sender: tabId,
                    data: null
                } as any);
            } else if (arenaPhase === 'reveal_decision') {
                setArenaPhase('reveal_result');
                if (myConsent && partnerConsented) setMatchConfirmed(true);
            }
        }
    }, [arenaPhase, phaseTimer, myConsent, partnerConsented, sendMessage, tabId]);

    useEffect(() => {
        if (timeRemaining === 0 && arenaPhase === 'chat' && matchData && handshakeStatus === 'verified') {
            setArenaPhase('vibe');
            setPhaseTimer(10);
        }
    }, [timeRemaining, arenaPhase, matchData, handshakeStatus]);

    const [queuedKarma, setQueuedKarma] = useState(0);
    const handleVibeSubmit = (score: number) => {
        setQueuedKarma(score);
        setVibeSubmitted(true);
    };

    const handleConsent = async () => {
        setMyConsent(true);
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

        if (sessionId && matchData && (matchData as any).roomid && user) {
            try {
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
                    if (res.ok) setQueuedKarma(0);
                } catch (e) {
                    console.error("Karma network error", e);
                }
            };
            syncKarma();
        }
    }, [arenaPhase, matchConfirmed, queuedKarma, matchData, user]);

    useEffect(() => {
        if (!myConsent || !matchData || !(matchData as any).roomid || !sessionId || matchConfirmed || !user) return;
        const interval = setInterval(async () => {
            try {
                const token = await user.getIdToken();
                const roomID = (matchData as any).roomid;
                const res = await fetch(`${config.getApiUrl()}/con/check-match?userid=${sessionId}&roomid=${roomID}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.matched) {
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

    useEffect(() => {
        if (matchConfirmed && !partnerProfile && isConnected) {
            sendMessage({
                type: 'signal',
                subtype: 'status_request',
                sender: tabId,
                data: null
            } as any);
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
        sendMessage({
            type: 'signal',
            subtype: 'decline',
            sender: tabId,
            data: null
        } as any);
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

    const scenario = "Debate: Is 'Right Person, Wrong Time' a real phenomenon, or just a coping mechanism?";

    return (
        <div className={`flex flex-col h-[100dvh] max-h-[100dvh] transition-colors duration-700 ${!matchData ? 'bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#050a18_100%)]' : 'bg-[#050a18]'} text-white p-2 sm:p-4 overflow-hidden`}>
            <header className="flex justify-between items-center mb-2 sm:mb-2 p-2 sm:p-3 border border-white/10 rounded-xl bg-neutral-900/50 backdrop-blur-md relative z-20 min-h-[52px]">
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <button onClick={() => setShowDisconnectModal(true)} className="relative group cursor-pointer focus:outline-none">
                        <div className="rounded-full bg-vibe p-[1.5px] group-hover:scale-105 transition-transform duration-200 group-active:scale-95">
                            <img src={user?.photoURL || "https://ui-avatars.com/api/?background=random"} alt="Profile" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-neutral-900 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    </button>
                </div>
                <div className="flex items-center justify-center min-w-[100px] sm:min-w-[120px]">
                    {matchData && <SpinningTimer timeRemaining={timeRemaining} />}
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 opacity-0 pointer-events-none" />
            </header>

            <div className="flex-1 relative flex flex-col items-center justify-center min-h-0">
                <AnimatePresence mode="wait">
                    {!matchData ? (
                        handshakeStatus === 'verifying' ? (
                            <motion.div key="verifying" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center h-full space-y-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-2 border-white/5 rounded-full" />
                                    <div className="absolute inset-0 w-16 h-16 border-2 border-t-white rounded-full animate-spin" />
                                    <div className="absolute inset-2 w-12 h-12 border border-white/10 rounded-full animate-pulse" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="font-mono text-[10px] tracking-[0.3em] text-white/40 uppercase animate-pulse">Handshake_Sequence</p>
                                    <p className="font-display text-xs font-bold tracking-widest text-white/60">SYNCHRONIZING_UPLINK...</p>
                                </div>
                            </motion.div>
                        ) : (
                            <MatchmakingEngine onMatchFound={handleMatchSignal} key="matchmaker" autoStart={true} />
                        )
                    ) : (
                        <motion.div key="interaction" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-2xl h-full flex flex-col min-h-0">
                            <ScenarioCard scenario={scenario} />
                            <div className="flex-1 mb-2 sm:mb-4 overflow-hidden flex flex-col min-h-0">
                                <ChatInterface matchData={matchData} onTimeout={handleNextMatch} />
                            </div>
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

                {arenaPhase !== 'chat' && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-500">
                        <AnimatePresence mode="wait">
                            {arenaPhase === 'vibe' ? (
                                <motion.div key="vibe-check" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }}>
                                    <VibeCheck onRate={handleVibeSubmit} submitted={vibeSubmitted} timeLeft={phaseTimer} />
                                </motion.div>
                            ) : (
                                <RevealCard
                                    key="reveal-card"
                                    isRevealed={matchConfirmed}
                                    hasConsented={myConsent}
                                    partnerConsented={partnerConsented}
                                    partnerDeclined={partnerDeclined}
                                    onConsent={handleConsent}
                                    profileData={partnerProfile || { instagram: "Pending...", topTrack: "Pending..." }}
                                    onNextMatch={handleNextMatch}
                                    onExit={handleExit}
                                    onDecline={handleDecline}
                                    phase={arenaPhase === 'reveal_result' ? 'result' : 'decision'}
                                    timeLeft={phaseTimer}
                                />
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showDisconnectModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowDisconnectModal(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 350, damping: 25 }} className="w-full max-w-sm bg-[#090909] border border-white/10 rounded-3xl p-1 shadow-2xl relative overflow-hidden group" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-neutral-900/50 backdrop-blur-xl rounded-[20px] p-6 relative overflow-hidden">
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-[60px] pointer-events-none" />
                                <div className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                                        <X className="w-6 h-6 text-red-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">Abort Mission?</h3>
                                    <p className="text-sm text-neutral-400 leading-relaxed mb-6 px-2">Leaving now will end the current connection. Are you sure you want to exit?</p>
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        <button onClick={() => setShowDisconnectModal(false)} className="py-3 px-4 rounded-xl bg-white/5 border border-white/5 text-neutral-300 font-medium hover:bg-white/10 hover:text-white transition-all text-sm active:scale-95">Cancel</button>
                                        <button onClick={handleExit} className="py-3 px-4 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold hover:from-red-500 hover:to-red-600 transition-all shadow-lg shadow-red-900/30 text-sm active:scale-95 flex items-center justify-center gap-2">Yes, Exit</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showTimeUpModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 350, damping: 25 }} className="w-full max-w-sm bg-[#090909] border border-white/10 rounded-3xl p-1 shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-neutral-900/50 backdrop-blur-xl rounded-[20px] p-8 text-center">
                                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 mb-4 mx-auto">
                                    <span className="text-2xl">⏰</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Time's Up!</h3>
                                <p className="text-sm text-neutral-400 mb-8">The debate session has expired. What would you like to do next?</p>
                                <div className="flex flex-col gap-3">
                                    <button onClick={handleNextMatch} className="py-3 px-4 rounded-xl bg-vibe text-white font-bold hover:opacity-90 transition-all text-sm shadow-lg shadow-blue-900/20 active:scale-95">Find Next Match</button>
                                    <button onClick={() => router.push('/')} className="py-3 px-4 rounded-xl bg-white/5 border border-white/5 text-neutral-300 font-medium hover:bg-white/10 transition-all text-sm active:scale-95">Back to Home</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
