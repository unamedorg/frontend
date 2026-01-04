"use client";

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useTimer } from '@/providers/TimerProvider';
import { CampusRadar } from '@/components/matchmaking/CampusRadar';
import { ScanningInfo } from '@/components/matchmaking/ScanningInfo';
import { AlertCircle } from 'lucide-react';

type MatchState = 'idle' | 'searching' | 'matched' | 'timeout' | 'error';

interface MatchmakingEngineProps {
    onMatchFound?: (data: any) => void;
    collegeId?: string;
    autoStart?: boolean;
}

export function MatchmakingEngine({ onMatchFound, collegeId = "global", autoStart = false }: MatchmakingEngineProps) {
    const { sendMessage, lastMessage, isConnected, connect } = useWebSocket();
    const { startTimer, resetTimer } = useTimer();

    // Initialize directly to searching if autoStart is true to prevent UI flash
    const [status, setStatus] = useState<MatchState>(autoStart ? 'searching' : 'idle');
    const [searchMode, setSearchMode] = useState<'college' | 'random'>('college');
    const [activeCollegeId, setActiveCollegeId] = useState(collegeId);
    const [retryCount, setRetryCount] = useState(0);

    // Load persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('arena_filter');
            if (saved) setActiveCollegeId(saved);
        }
    }, []);

    // Save persistence when it changes
    useEffect(() => {
        if (typeof window !== 'undefined' && activeCollegeId !== 'global') {
            localStorage.setItem('arena_filter', activeCollegeId);
        }
    }, [activeCollegeId]);

    // Trigger search
    const startSearch = useCallback(() => {
        // Reset flags to allow immediate connection
        resetTimer();
        setStatus('searching');
        setSearchMode('college');

        // FORCE A FRESH UPLINK: The fastest way to find a partner is a fresh socket.
        // This flushes any stale sessions tied to the old socket.
        connect();

        // Fallback visual transition
        setTimeout(() => {
            setSearchMode(prev => {
                if (prev === 'college') {
                    console.log("⚠️ College match timeout (Visual)...");
                    return 'random';
                }
                return prev;
            });
        }, 15000);

    }, [connect, resetTimer]);

    // Auto-Start Logic and Retry Mechanism
    useEffect(() => {
        if (autoStart && status !== 'error') {
            // If scanning but disconnected, RETRY with limit
            if (!isConnected) {
                if (retryCount > 10) {
                    setStatus('error');
                    console.error("⛔ Matchmaking paused: Too many connection failures.");
                    return;
                }

                console.log(`🔄 Auto-starting/Retrying search... (${retryCount}/10)`);
                const timer = setTimeout(() => {
                    setRetryCount(prev => prev + 1);
                    connect();
                }, 1000);
                return () => clearTimeout(timer);
            }

            // On successful connection, reset retry count
            if (isConnected && retryCount > 0) {
                setRetryCount(0);
            }

            // Ensure timer is fresh
            resetTimer();
        }
    }, [autoStart, isConnected, connect, resetTimer, retryCount]);

    // Handle incoming messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'start' && status !== 'matched') {
            setStatus('matched');
            // startTimer(); // Moved to ArenaPage to ensure it starts only after Handshake
            onMatchFound?.(lastMessage);
        }
    }, [lastMessage, startTimer, onMatchFound, status]);

    // Render Logic
    if (status === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center p-10">
                <button
                    onClick={startSearch}
                    disabled={isConnected && status !== 'idle'}
                    className="group relative px-8 py-4 bg-transparent border border-white/20 text-white rounded-full overflow-hidden hover:border-white/50 transition-all font-display text-lg tracking-wider"
                >
                    <span className="relative z-10 group-hover:text-black transition-colors">ENTER ARENA</span>
                    <div className="absolute inset-0 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500 ease-out" />
                </button>
            </div>
        );
    }

    if (status === 'searching') {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full relative">
                <div className="relative">
                    <CampusRadar mode={searchMode} />
                    <ScanningInfo mode={activeCollegeId} />
                </div>

                {retryCount > 2 && (
                    <p className="mt-24 text-[10px] text-amber-500/50 font-mono absolute bottom-20">
                        Slow connection reported. Optimizing tunnel...
                    </p>
                )}
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-white font-display font-bold text-xl mb-2">Arena Unavailable</h3>
                <p className="text-neutral-500 text-sm max-w-xs mb-8">
                    We're having trouble connecting to the Arena servers. Please try again in a few minutes.
                </p>
                <button
                    onClick={() => { setRetryCount(0); setStatus('searching'); startSearch(); }}
                    className="px-6 py-2 bg-white text-black rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors"
                >
                    RETRY CONNECTION
                </button>
            </div>
        );
    }

    return null; // When matched, this component yields to the Arena UI
}
