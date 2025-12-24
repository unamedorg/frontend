"use client";

import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '@/providers/WebSocketProvider';
import { useTimer } from '@/providers/TimerProvider';
import { CampusRadar } from '@/components/matchmaking/CampusRadar';

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

    // Load persistence
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('echo_college_id');
            if (saved) setActiveCollegeId(saved);
        }
    }, []);

    // Save persistence when it changes
    useEffect(() => {
        if (typeof window !== 'undefined' && activeCollegeId !== 'global') {
            localStorage.setItem('echo_college_id', activeCollegeId);
        }
    }, [activeCollegeId]);

    // Trigger search
    const startSearch = useCallback(() => {
        // Backend Architecture: Connecting to the socket IS the match request.
        // Force connection if we are not connected.
        if (!isConnected) {
            connect();
        } else {
            // If we are already connected but restarting search (e.g. next match),
            // ensure we are in a clean state.
            // Note: Ideally, we should disconnect and reconnect to re-enter the queue 
            // if the backend requires a fresh connection for a new match request.
            // Based on p2plogic, a fresh connection is indeed the standard way to "join" the waiting list.
            // So, let's force a reconnect if we are already connected but starting a search manually.
            // However, to avoid 'flicker', we rely on the flow: Disconnect -> Search -> Connect.
        }

        resetTimer(); // Ensure timer starts fresh for new match
        setStatus('searching');
        setSearchMode('college');

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

    }, [isConnected, connect, resetTimer]);

    // Auto-Start Logic and Retry Mechanism
    useEffect(() => {
        if (autoStart) {
            // If scanning but disconnected, RETRY immediately.
            // This handles "Ghost Rooms" where backend closes connection instantly.
            if (!isConnected) {
                console.log("🔄 Auto-starting/Retrying search...");
                // Small delay to prevent tight loop if server is down
                const timer = setTimeout(() => {
                    connect();
                }, 500);
                return () => clearTimeout(timer);
            }
            // Ensure timer is fresh
            resetTimer();
        }
    }, [autoStart, isConnected, connect, resetTimer]);

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
            <div className="flex flex-col items-center justify-center h-full w-full">
                <CampusRadar mode={searchMode} />
                <p className="mt-8 font-mono text-sm text-white/50 animate-pulse">
                    SCANNING_{searchMode.toUpperCase()}...
                </p>
            </div>
        );
    }

    return null; // When matched, this component yields to the Arena UI
}
