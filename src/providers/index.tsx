"use client";

import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { TimerProvider } from "@/providers/TimerProvider";
import { AuthProvider } from "@/providers/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <WebSocketProvider>
                <TimerProvider>
                    {children}
                </TimerProvider>
            </WebSocketProvider>
        </AuthProvider>
    );
}
