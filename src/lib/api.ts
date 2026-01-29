import { auth } from "./firebase";
import { config } from "./config";

interface AuthenticatedFetchOptions extends RequestInit {
    forceRefresh?: boolean;
}

/**
 * Enhanced fetch wrapper that handles Authentication token attachment automatically.
 * Ensures we always send a fresh token to the backend.
 */
export async function authenticatedFetch(endpoint: string, options: AuthenticatedFetchOptions = {}) {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("User not authenticated");
    }

    // Always get a fresh token (Firebase SDK handles caching, so this is efficient)
    const token = await user.getIdToken(options.forceRefresh);

    const url = `${config.getApiUrl()}${endpoint}`;

    // Merge headers
    const headers = {
        ...options.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
    };

    const response = await fetch(url, {
        ...options,
        headers,
    });

    // Optional: Handle 401 globally?
    if (response.status === 401) {
        // Token might have expired mid-flight or user disabled.
        // potentially force refresh or logout?
        console.warn("Unauthorized request to", endpoint);
    }

    return response;
}

// --- Helpers adapted from debate-connect ---

export function generateUserId(): string {
    return crypto.randomUUID();
}

export function generateUsername(): string {
    const adjectives = ['Swift', 'Clever', 'Bold', 'Wise', 'Quick', 'Sharp', 'Keen', 'Bright'];
    const nouns = ['Debater', 'Thinker', 'Speaker', 'Mind', 'Voice', 'Sage', 'Scholar', 'Critic'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

export function createWebSocketUrl(roomId: string, uid: string, username: string): string {
    const apiBase = config.getApiUrl();
    const wsProtocol = apiBase.startsWith('https') ? 'wss' : 'ws';
    // Remove protocol and trailing slashes for clean base
    const cleanBase = apiBase.replace(/^https?:\/\//, '').replace(/\/+$/, '');

    const url = `${wsProtocol}://${cleanBase}/debate/join?roomid=${roomId}&uid=${uid}&dummyname=${encodeURIComponent(username)}`;
    console.log('🔌 Generated WS URL:', url);
    return url;
}

export async function getMessages(roomId: string) {
    const response = await fetch(`${config.getApiUrl()}/debate/getmessages?roomId=${roomId}`);

    if (!response.ok) {
        throw new Error('Failed to fetch messages');
    }

    return response.json();
}

export async function getRoom(roomId: string) {
    const response = await fetch(`${config.getApiUrl()}/debate/getrooms`);
    if (!response.ok) {
        throw new Error('Failed to fetch room details');
    }
    const data = await response.json();
    return data.rooms.find((r: any) => r.id === roomId);
}
