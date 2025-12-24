"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { wsMessage, wsResponse, WebSocketContextType } from '@/types/socket';
import { config } from '@/lib/config';

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const MAX_RECONNECT_DELAY = 5000;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<wsResponse | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);

    // Use a ref to hold the connect function to allow safe recursion/timeout calls
    const connectRef = useRef<() => void>(() => { });
    const userIdRef = useRef<string>("");

    useEffect(() => {
        // Generate or load UserID once
        if (typeof window !== 'undefined') {
            let id = localStorage.getItem("echo_user_id");
            if (!id) {
                id = "user_" + Math.random().toString(36).substr(2, 9);
                localStorage.setItem("echo_user_id", id);
            }
            userIdRef.current = id;
        }
    }, []);

    const isExplicitDisconnect = useRef(false);
    // Persist session suffix across reconnects to maintain identity (Redis consistency)
    const sessionSuffixRef = useRef(Math.random().toString(36).substr(2, 5));

    const connect = useCallback(() => {
        // Vital: Reset this flag so we can auto-reconnect if connection drops accidentally
        isExplicitDisconnect.current = false;

        // Prevent multiple connection attempts
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
            console.log("⚠️ Connection already in progress or active. Skipping.");
            return;
        }

        // Backend expects userId in query: /con/request?userId=...
        // APPEND RANDOM SUFFIX to ensure unique session per tab. 
        // This fixes the "Same User ID" collision when testing with multiple tabs.
        const uniqueSessionId = userIdRef.current ? `${userIdRef.current}-${sessionSuffixRef.current}` : `anon-${sessionSuffixRef.current}`;

        const url = config.getWsUrl(uniqueSessionId);

        console.log("🔌 Connecting to WS:", url);
        ws.current = new WebSocket(url);
        setSessionId(uniqueSessionId);

        ws.current.onopen = () => {
            console.log('✅ Connected to EchoArena');
            setIsConnected(true);
            reconnectAttempts.current = 0;
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Backend Quirk: Sends { "message": "ready" } (no type) for Producer waiting state
                if ((data as any).message === "ready") {
                    console.log("Server Ready / Waiting for partner...");
                    return;
                }

                setLastMessage(data);
            } catch (e) {
                console.log('Received raw:', event.data, e);
            }
        };

        ws.current.onclose = () => {
            console.log('❌ Disconnected');
            setIsConnected(false);

            if (isExplicitDisconnect.current) {
                console.log("Disconnected explicitly. Not reconnecting.");
                return;
            }

            // Aggressive Reconnection logic
            // Start very fast (250ms) to recover from minor flickers (e.g. mobile data switch)
            const delay = Math.min(250 * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY);
            reconnectTimeout.current = setTimeout(() => {
                reconnectAttempts.current++;
                // Safe access via ref
                connectRef.current();
            }, delay);
        };

        ws.current.onerror = (err) => {
            console.error('WS Error:', err);
            // Close will trigger onclose
            ws.current?.close();
        };
    }, []);

    // ROBUSTNESS: Handle Network & Visibility Changes
    useEffect(() => {
        const handleOnline = () => {
            console.log("🌐 Network Online detected. Reconnecting immediately...");
            // Reset attempts to allow fast reconnect
            reconnectAttempts.current = 0;
            connectRef.current();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log("👁️ Tab Visible. Checking connection...");
                if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
                    console.log("...Connection dead. Reconnecting.");
                    reconnectAttempts.current = 0;
                    connectRef.current();
                }
            }
        };

        window.addEventListener('online', handleOnline);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('online', handleOnline);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Update ref whenever connect changes
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        isExplicitDisconnect.current = true; // Flag to stop auto-reconnect
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectAttempts.current = 0;
        ws.current?.close();
        ws.current = null;
        setLastMessage(null); // Clear stale message
    }, []);

    const sendMessage = useCallback((msg: wsMessage) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(msg));
        } else {
            console.warn('⚠️ Cannot send: WS not connected');
        }
    }, []);

    // HEARTBEAT LOGIC: Keep connection alive on mobile networks
    useEffect(() => {
        const interval = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                // Send a lightweight packet to update NAT tables and detect dead sockets
                ws.current.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, 30000); // 30s Heartbeat

        return () => clearInterval(interval);
    }, []);

    const [sessionId, setSessionId] = useState<string | null>(null);

    return (
        <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage, connect, disconnect, sessionId }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) throw new Error("useWebSocket must be used within WebSocketProvider");
    return context;
};
