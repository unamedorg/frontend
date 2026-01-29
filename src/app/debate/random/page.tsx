"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";
import { CampusRadar } from "@/components/matchmaking/CampusRadar";
import { ScanningInfo } from "@/components/matchmaking/ScanningInfo";
import { ArrowLeft } from "lucide-react";

export default function RandomDebateRedirect() {
    const router = useRouter();

    useEffect(() => {
        const findAndRedirect = async () => {
            // Give it at least 3 seconds to match the Arena "feel"
            const minWait = new Promise(resolve => setTimeout(resolve, 3000));

            try {
                const [res] = await Promise.all([
                    fetch(`${config.getApiUrl()}/debate/getrooms`),
                    minWait
                ]);

                if (res.ok) {
                    const data = await res.json();
                    const rooms = data.rooms || [];

                    if (rooms.length > 0) {
                        const available = rooms.filter((r: any) => {
                            const current = r.current_client || r.Currentclient || 0;
                            const max = r.max_client || r.MaxClient || 10;
                            return current < max;
                        });
                        const target = available.length > 0
                            ? available[Math.floor(Math.random() * available.length)]
                            : rooms[Math.floor(Math.random() * rooms.length)];

                        const roomId = target.id || target.ID;
                        router.replace(`/debate/${roomId}`);
                    } else {
                        router.replace("/debate?action=create");
                    }
                } else {
                    router.replace("/debate");
                }
            } catch (err) {
                console.error(err);
                router.replace("/debate");
            }
        };

        findAndRedirect();
    }, [router]);

    return (
        <div className="h-screen bg-[radial-gradient(circle_at_center,_#0f172a_0%,_#050a18_100%)] flex flex-col items-center justify-center overflow-hidden relative">
            {/* Header / Back Action */}
            <div className="absolute top-8 left-8 z-20">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-mono text-neutral-500 group-hover:text-white uppercase tracking-widest transition-colors">Abort Search</span>
                </button>
            </div>

            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                {/* Noise Texture */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Matchmaking Visuals (Shared with Arena) */}
            <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="relative">
                    <CampusRadar mode="random" />
                    <ScanningInfo mode="debate" />
                </div>
            </div>

            {/* Corner Tech Accents (Consistent with Arena) */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t border-l border-white/5 opacity-50" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t border-r border-white/5 opacity-50" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b border-l border-white/5 opacity-50" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b border-r border-white/5 opacity-50" />
        </div>
    );
}
