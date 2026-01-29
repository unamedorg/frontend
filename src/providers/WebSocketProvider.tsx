"use client";

import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { wsMessage, wsResponse, WebSocketContextType } from '@/types/socket';
import { config } from '@/lib/config';
import { useAuth } from '@/providers/AuthProvider';

export const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const MAX_RECONNECT_DELAY = 5000;
const HEARTBEAT_INTERVAL = 30000;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { user, getToken } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<wsResponse | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [dummyName, setDummyName] = useState<string>("");

    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const isExplicitDisconnect = useRef(false);

    // Ref to hold the current connect function to avoid dependency cycles in effects
    const connectRef = useRef<(overrideUrl?: string) => void>(() => { });

    const connect = useCallback(async (overrideUrl?: string) => {
        isExplicitDisconnect.current = false;

        // specific check to avoid redundant connections
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        if (!user) {
            console.log("WAIT: User not authenticated yet.");
            return;
        }

        try {
            // SPEED OPTIMIZATION: Use cached token if available (false)
            // This avoids a ~300ms network roundtrip to Firebase on every connect.
            const token = await user.getIdToken();
            if (!token) throw new Error("No token available");

            // Use strict user.uid for identity to allow session re-establishment on the backend
            const uniqueId = user.uid;

            // Construct URL
            let finalUrl = "";
            if (overrideUrl) {
                finalUrl = overrideUrl;
            } else {
                const url = config.getWsUrl(uniqueId);
                const filter = localStorage.getItem("arena_filter") || "random";
                finalUrl = `${url}&token=${token}&filter=${filter}`;
            }

            console.log("🔌 Connecting to EchoArena...");

            ws.current = new WebSocket(finalUrl);
            setSessionId(uniqueId);

            ws.current.onopen = () => {
                console.log('✅ Connected securely.');
                setIsConnected(true);
                reconnectAttempts.current = 0; // Reset backoff on success
            };

            ws.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // ADAPTER: Unwrap debatrooms message envelope if valid JSON inside
                    if (data.type === 'message' && typeof data.message === 'string') {
                        try {
                            const inner = JSON.parse(data.message);
                            if (inner && inner.type) {
                                // Preserve authentic sender and timestamp from backend
                                inner.sender = data.sender || inner.sender;
                                inner.timestamp = data.timestamp || inner.timestamp;
                                setLastMessage(inner);
                                return;
                            }
                        } catch (e) {
                            // Not JSON, treat as standard text message 
                        }
                    }

                    // Filter out internal messages or handle 'ready' specifically if needed
                    if ((data as any).message === "ready") {
                        // Keep alive / ready signal
                        return;
                    }
                    setLastMessage(data);
                } catch (e) {
                    console.error('Failed to parse WS message:', e);
                }
            };

            ws.current.onclose = (event) => {
                console.log(`❌ Socket closed: ${event.code} ${event.reason}`);
                setIsConnected(false);
                ws.current = null;

                if (isExplicitDisconnect.current) {
                    return; // User manually disconnected, do not reconnect
                }

                // Optimized Backoff: Instant retry (100ms) for first failure, then exponential
                let delay = 100;
                if (reconnectAttempts.current > 0) {
                    delay = Math.min(500 * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY);
                }

                console.log(`...Reconnecting in ${delay}ms`);

                reconnectTimeout.current = setTimeout(() => {
                    reconnectAttempts.current++;
                    connectRef.current();
                }, delay);
            };

            ws.current.onerror = (err) => {
                console.error('WS Error:', err);
                // onerror usually precedes onclose, so we let onclose handle the retry logic
                ws.current?.close();
            };

        } catch (err) {
            console.error("WS Connect failed:", err);
            // If token fetch fails, retry slower
            reconnectTimeout.current = setTimeout(() => {
                connectRef.current();
            }, 5000);
        }
    }, [user]);

    const disconnect = useCallback(() => {
        isExplicitDisconnect.current = true;
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectAttempts.current = 0;

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }
        setIsConnected(false);
        setLastMessage(null);
    }, []);

    const sendMessage = useCallback((msg: wsMessage | string) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            if (typeof msg === 'string') {
                ws.current.send(msg);
            } else {
                ws.current.send(JSON.stringify(msg));
            }
        } else {
            console.warn('⚠️ Cannot send: WS not connected');
        }
    }, []);

    const connectToRoom = useCallback((roomId: string, name: string) => {
        if (!user) return;
        setDummyName(name);

        // Derive backend URL
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
        const debateUrl = `${protocol}://${host}/debate/join?roomid=${roomId}&uid=${user.uid}&dummyname=${name}`;

        console.log("🔀 Switching to Debate Room:", debateUrl);
        disconnect();
        // Small delay to ensure clean socket close before new one
        setTimeout(() => {
            connect(debateUrl);
        }, 100);
    }, [connect, disconnect, user]);

    // Keep connectRef up to date
    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    // Initial connection trigger when user becomes available
    useEffect(() => {
        if (user && !isConnected) {
            connect();
        }
        return () => {
            // Cleanup on unmount handled by disconnect? 
            // Ideally we stay connected unless component unmounts.
            // But strictly:
            // disconnect(); 
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]); // Only trigger when user state changes (login)

    // Network & Visibility Handling for "Fastest Re-establishment"
    useEffect(() => {
        const handleOnline = () => {
            console.log("🌐 Network Online. Attempting immediate reconnect...");
            if (!isConnected) {
                reconnectAttempts.current = 0;
                connectRef.current();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // If socket is dead/closed, try to revive it immediately
                if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
                    console.log("👁️ Tab Visible. Reviving connection...");
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
    }, [isConnected]);

    // Heartbeat
    useEffect(() => {
        const interval = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
                ws.current.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(interval);
    }, []);

    const tabId = useRef(Math.random().toString(36).substring(7)).current;

    return (
        <WebSocketContext.Provider value={{ isConnected, sendMessage, lastMessage, connect, disconnect, sessionId, tabId, dummyName, connectToRoom }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) throw new Error("useWebSocket must be used within WebSocketProvider");
    return context;
};
