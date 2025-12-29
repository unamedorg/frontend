"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onIdTokenChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    token: string | null;
    getToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    token: null,
    getToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState<string | null>(null);

    // Determines if we are fully initialized (listen for first callback)
    useEffect(() => {
        // onIdTokenChanged triggers on sign-in, sign-out, AND token refresh
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // Getting the token immediately updates our state
                    const idToken = await currentUser.getIdToken();
                    setToken(idToken);
                } catch (e) {
                    console.error("Failed to retrieve token:", e);
                    setToken(null);
                }
            } else {
                setToken(null);
            }

            setLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    // Manual helper to get token, useful for API calls before requests
    const getToken = useCallback(async (forceRefresh = false) => {
        if (!auth.currentUser) return null;
        try {
            const freshToken = await auth.currentUser.getIdToken(forceRefresh);
            setToken(freshToken); // Update state to reflect fresh token
            return freshToken;
        } catch (error) {
            console.error("Error fetching token:", error);
            return null;
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, token, getToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
