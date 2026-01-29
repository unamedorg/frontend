"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DebateChat } from "@/components/debate/DebateChat";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useDebateSocket } from "@/hooks/useDebateSocket";

export default function DebateRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;

    const {
        messages,
        typingUsers,
        isConnected,
        isExpired,
        currentUser,
        roomTopic,
        connect,
        disconnect,
        sendMessage,
        sendTyping
    } = useDebateSocket();

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (roomId) {
            // Delay connection to allow previous socket to disconnect cleanly
            // This prevents "User already in room" race conditions during Fast Refresh
            timeoutId = setTimeout(() => {
                connect(roomId);
            }, 1000);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            disconnect();
        };
    }, [roomId, connect, disconnect]);

    // Notify user if connection fails definitively
    useEffect(() => {
        if (isExpired) {
            toast.error("Connection failed. The room may not exist or server restarted. Please create a new room.");
        }
    }, [isExpired]);

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Room Link Copied!");
    };

    return (
        <div className="flex flex-col h-[100dvh] bg-[#050a18] text-white overflow-hidden text-sm sm:text-base">
            <ToastContainer autoClose={2000} theme="dark" />

            <header className="px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-between z-20">
                <div className="flex items-center gap-3 overflow-hidden">
                    <button onClick={() => router.push('/')} className="p-2 rounded-full hover:bg-white/10">
                        <ArrowLeft className="w-5 h-5 text-neutral-400" />
                    </button>
                    <div className="flex flex-col min-w-0">
                        <h1 className="font-bold truncate pr-4 text-white/90">{roomTopic}</h1>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                                {isConnected ? 'LIVE' : 'CONNECTING'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                {currentUser}
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={copyLink} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all">
                    <Copy className="w-4 h-4" />
                </button>
            </header>

            <main className="flex-1 relative min-h-0 flex flex-col p-2 sm:p-4 max-w-4xl mx-auto w-full">
                <div className="flex-1 h-full min-h-0 rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black/40 backdrop-blur-sm">
                    <DebateChat
                        messages={messages}
                        typingUsers={typingUsers}
                        isConnected={isConnected}
                        isExpired={isExpired}
                        onSendMessage={sendMessage}
                        onSendTyping={sendTyping}
                        currentUser={currentUser}
                    />
                </div>
            </main>
        </div>
    );
}
