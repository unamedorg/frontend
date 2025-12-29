
/**
 * Global Configuration for EchoArena
 * Centralizes environment variables and runtime configuration logic.
 */

// Helper to determine the dynamic WebSocket URL based on the current window location
const getDynamicWsUrl = (userId: string) => {
    // Priority 1: Environment Variable (Explicit Override for Cloud/Hybrid Dev)
    if (process.env.NEXT_PUBLIC_WS_URL) {
        return `${process.env.NEXT_PUBLIC_WS_URL}?userId=${userId}`;
    }

    if (typeof window === 'undefined') return ''; // Server-side safety

    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');

    // Priority 2: If we are on localhost and NO env var is set, assume local backend
    if (isLocal) {
        return `ws://${host}:8080/con/request?userId=${userId}`;
    }

    // Priority 3: Fallback for cloud deployments without config (assume relative/same-origin)
    // Note: WSS is safer for modern deployments
    console.warn("⚠️ NEXT_PUBLIC_WS_URL not set. Defaulting to current origin WSS.");
    return `wss://${host}/con/request?userId=${userId}`;
};

// Helper for API URL (HTTP)
const getDynamicApiUrl = () => {
    // 1. Server Side: Use Internal Env Vars or public ones
    if (typeof window === 'undefined') {
        return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    }

    // 2. Priority: Environment Variable (Explicit Override for Cloud/Hybrid Dev)
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // 3. Dynamic Localhost/LAN Fallback
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');

    if (isLocal) {
        return `http://${host}:8080`;
    }

    // 4. Proxy Mode (Cleanest for CORS on same-domain deployments):
    // Return empty string to force relative path (e.g. fetch("/con/profile"))
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
