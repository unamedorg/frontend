"use client";

import { WebSocketProvider } from "@/providers/WebSocketProvider";
import { TimerProvider } from "@/providers/TimerProvider";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WebSocketProvider>
            <TimerProvider>
                {children}
            </TimerProvider>
        </WebSocketProvider>
    );
}
