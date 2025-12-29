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
