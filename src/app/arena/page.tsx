"use client";

import { ArenaContent } from '@/components/arena/ArenaContent';
import { AuthGuard } from '@/components/auth/AuthGuard';

/**
 * Arena Page
 * Entry point for the real-time matchmaking and interaction arena.
 * Protected by AuthGuard to ensure user session exists.
 */
export default function ArenaPage() {
    return (
        <AuthGuard>
            <ArenaContent />
        </AuthGuard>
    );
}
