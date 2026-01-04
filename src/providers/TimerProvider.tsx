"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

interface TimerContextType {
    timeRemaining: number;
    isActive: boolean;
    startTimer: (seconds?: number) => void;
    resetTimer: () => void;
    endTimer: () => void;
    formatTime: (seconds: number) => string;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const DURATION = 270; // 4 minutes 30 seconds

export function TimerProvider({ children }: { children: React.ReactNode }) {
    const [timeRemaining, setTimeRemaining] = useState(DURATION);
    const [isActive, setIsActive] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startTimer = useCallback((initialSeconds?: number) => {
        // Mode 1: Force Start (Reset + Start)
        if (initialSeconds !== undefined) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsActive(true);
            setTimeRemaining(initialSeconds);

            const startTime = Date.now();
            const endTime = startTime + initialSeconds * 1000;

            intervalRef.current = setInterval(() => {
                const now = Date.now();
                const left = Math.ceil((endTime - now) / 1000);

                if (left <= 0) {
                    setTimeRemaining(0);
                    setIsActive(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                } else {
                    setTimeRemaining(left);
                }
            }, 100);
            return;
        }

        // Mode 2: Resume (Standard)
        if (isActive) return;
        setIsActive(true);

        const startTime = Date.now();
        const endTime = startTime + timeRemaining * 1000;

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const left = Math.ceil((endTime - now) / 1000);

            if (left <= 0) {
                setTimeRemaining(0);
                setIsActive(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
            } else {
                setTimeRemaining(left);
            }
        }, 100);
    }, [isActive, timeRemaining]);

    const resetTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsActive(false);
        setTimeRemaining(DURATION);
    }, []);

    const endTimer = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsActive(false);
        setTimeRemaining(0);
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <TimerContext.Provider value={{ timeRemaining, isActive, startTimer, resetTimer, endTimer, formatTime }}>
            {children}
        </TimerContext.Provider>
    );
}

export const useTimer = () => {
    const context = useContext(TimerContext);
    if (!context) throw new Error("useTimer must be used within TimerProvider");
    return context;
};
