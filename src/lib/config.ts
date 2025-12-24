
/**
 * Global Configuration for EchoArena
 * Centralizes environment variables and runtime configuration logic.
 */

// Helper to determine the dynamic WebSocket URL based on the current window location
// This allows local development on mobile devices via LAN (e.g., 192.168.x.x)
const getDynamicWsUrl = (userId: string) => {
    if (typeof window === 'undefined') return ''; // Server-side safety

    // Priority 1: Environment Variable (Cloud/Production)
    if (process.env.NEXT_PUBLIC_WS_URL) {
        return `${process.env.NEXT_PUBLIC_WS_URL}?userId=${userId}`;
    }

    // Priority 2: Dynamic Localhost/LAN Fallback
    const wsHost = window.location.hostname;
    // Default to port 8080 for the Go Backend
    return `ws://${wsHost}:8080/con/request?userId=${userId}`;
};

// Helper for API URL (HTTP)
const getDynamicApiUrl = () => {
    // 1. Server Side: Always direct to localhost backend
    if (typeof window === 'undefined') return 'http://localhost:8080';

    // 2. Production/Cloud: Use provided Env Var
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // 3. Local Development: Return empty string to usage relative path (e.g. "/con/make-match")
    // This allows Next.js 'rewrites' to proxy the request => No CORS errors.
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
