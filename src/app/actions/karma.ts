"use server";

export async function syncKarma(userId: string, change: number) {
    // Simulate DB latency
    await new Promise(resolve => setTimeout(resolve, 50));

    console.log(`[Server] Syncing karma for ${userId}: ${change > 0 ? '+' : ''}${change}`);

    // TODO: Connect to actual DB
    return { success: true, newScore: 100 + change };
}
