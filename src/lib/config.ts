
/**
 * Global Configuration for EchoArena
 * Centralizes environment variables and runtime configuration logic.
 */

// Helper to determine the dynamic WebSocket URL based on the current window location
const getDynamicWsUrl = (userId: string) => {
    if (typeof window === 'undefined') return ''; // Server-side safety

    // Priority 1: Environment Variable (Cloud/Production)
    if (process.env.NEXT_PUBLIC_WS_URL) {
        return `${process.env.NEXT_PUBLIC_WS_URL}?userId=${userId}`;
    }

    // Priority 2: Dynamic Localhost/LAN Fallback
    const wsHost = window.location.hostname;

    // Safety: Only assume :8080 if we are clearly on localhost or a private IP
    // If we are on 'vercel.app', we shouldn't try port 8080 unless configured.
    const isLocal = wsHost === 'localhost' || wsHost === '127.0.0.1' || wsHost.startsWith('192.168.');

    if (isLocal) {
        return `ws://${wsHost}:8080/con/request?userId=${userId}`;
    }

    // Fallback for cloud without config (likely to fail, but safer than arbitrary port)
    console.warn("⚠️ NEXT_PUBLIC_WS_URL not set in Cloud environment. defaulting to current origin WSS.");
    return `wss://${wsHost}/con/request?userId=${userId}`;
};

// Helper for API URL (HTTP)
const getDynamicApiUrl = () => {
    // 1. Server Side: Use Internal Env Vars or public ones
    if (typeof window === 'undefined') {
        return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    }

    // 2. Production/Cloud w/ Direct Access: Use provided Env Var to bypass proxy
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // 3. Proxy Mode (Cleanest for CORS):
    // Return empty string to force relative path (e.g. "/con/make-match")
    // This allows Next.js 'rewrites' (next.config.ts) to handle the routing.
    return '';
};

export const config = {
    // Application
    appVersion: '2.0.0',

    // Networking
    getWsUrl: getDynamicWsUrl,
    getApiUrl: getDynamicApiUrl,

    // Timeouts (ms)
    timeouts: {
        handshakeConsumer: 2000,
        handshakeProducer: 15000,
        handshakeWarning: 5000,
        heartbeat: 30000,
    },

    // Game Settings
    gameDuration: 180, // seconds
    warningTime: 15,   // seconds
    criticalTime: 5,   // seconds
};
