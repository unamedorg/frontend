import { DebateEntry } from "@/components/debate/DebateEntry";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function DebatePage() {
    return (
        <div className="min-h-screen bg-[#050a18] text-white flex items-center justify-center p-4 pt-20">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="relative z-10 w-full">
                <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>}>
                    <DebateEntry />
                </Suspense>
            </div>
        </div>
    );
}
