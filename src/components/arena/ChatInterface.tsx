import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/providers/WebSocketProvider";
import { Send, AlertCircle, MoreHorizontal } from "lucide-react";
import { wsResponse } from "@/types/socket";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    text: string;
    sender: 'me' | 'partner' | 'system';
    timestamp: number;
}

interface ChatInterfaceProps {
    matchData: wsResponse | null;
    onTimeout?: () => void;
}

export function ChatInterface({ matchData, onTimeout }: ChatInterfaceProps) {
    const { sendMessage, lastMessage, sessionId } = useWebSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasSentMessage = useRef(false);
    const [inactivityWarning, setInactivityWarning] = useState<number | null>(null);

    // Initial System Logs
    useEffect(() => {
        if (matchData && matchData.type === 'start') {
            setMessages([]);
        }
    }, [matchData, sessionId]);

    // Inactivity Timeout Logic (Anti-AFK)
    useEffect(() => {
        const warningTimer = setTimeout(() => {
            if (!hasSentMessage.current) {
                setInactivityWarning(5);
            }
        }, 10000); // Trigger warning at 10s

        return () => clearTimeout(warningTimer);
    }, []);

    // Countdown Effect
    useEffect(() => {
        if (inactivityWarning === null) return;

        if (hasSentMessage.current) {
            setInactivityWarning(null); // Clear if user speaks during countdown
            return;
        }

        if (inactivityWarning <= 0) {
            if (onTimeout) {
                console.warn("⚠️ User AFK detected (15s). Ending match.");
                setMessages(prev => [...prev, {
                    id: `timeout-${Date.now()}`,
                    text: "⛔ YOU WERE SILENT: Disconnecting due to inactivity...",
                    sender: 'system',
                    timestamp: Date.now()
                }]);
                onTimeout();
            }
            return;
        }

        const tick = setTimeout(() => setInactivityWarning(prev => (prev !== null ? prev - 1 : null)), 1000);
        return () => clearTimeout(tick);
    }, [inactivityWarning, onTimeout]);


    // Smart Scroll to bottom on new message
    useEffect(() => {
        const div = scrollRef.current;
        if (!div) return;

        const isNearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 100;
        const lastMsg = messages[messages.length - 1];
        const isPriority = lastMsg?.sender === 'me' || lastMsg?.sender === 'system';

        if (isNearBottom || isPriority) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Handle incoming messages
    useEffect(() => {
        if (lastMessage && lastMessage.type === 'message') {
            setMessages(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                text: lastMessage.text || "",
                sender: 'partner',
                timestamp: lastMessage.timestamp || Date.now()
            }]);
        }
    }, [lastMessage]);

    const handleSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        hasSentMessage.current = true;
        setInactivityWarning(null);

        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            text: inputText,
            sender: 'me',
            timestamp: Date.now()
        }]);

        sendMessage({
            type: 'message',
            username: 'me',
            text: inputText,
            timestamp: Date.now()
        });

        setInputText("");
    };

    return (
        <div className="flex flex-col h-full min-h-0 bg-neutral-900/20 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden relative shadow-inner">

            {/* AFK Warning Overlay - Minimal & Fast */}
            <AnimatePresence>
                {inactivityWarning !== null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    >
                        <div className="flex flex-col items-center bg-black/80 p-4 rounded-3xl backdrop-blur-md border border-red-500/20 shadow-2xl">
                            {/* Circular Countdown */}
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle
                                        cx="50%"
                                        cy="50%"
                                        r="40%"
                                        className="fill-none stroke-neutral-800"
                                        strokeWidth="6"
                                    />
                                    <motion.circle
                                        cx="50%"
                                        cy="50%"
                                        r="40%"
                                        className="fill-none stroke-red-500"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={251} // 2 * pi * r (approx)
                                        strokeDashoffset={251 - ((inactivityWarning / 5) * 251)}
                                        initial={{ strokeDashoffset: 251 }}
                                        animate={{ strokeDashoffset: 251 - ((inactivityWarning / 5) * 251) }}
                                        transition={{ duration: 1, ease: "linear" }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold font-display text-white">{inactivityWarning}</span>
                                </div>
                            </div>
                            <span className="mt-4 text-xs font-mono uppercase tracking-widest text-red-500 font-bold bg-black/50 px-3 py-1 rounded-full border border-red-500/30">
                                Still there?
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-scroll overscroll-y-contain touch-pan-y p-6 space-y-6 min-h-0 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 opacity-50">
                        <MoreHorizontal className="w-8 h-8 animate-pulse mb-2" />
                        <span className="text-xs font-mono uppercase tracking-wider">Secure Channel Open</span>
                    </div>
                )}

                {messages.map((msg, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={msg.id}
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}
                    >
                        {msg.sender === 'system' ? (
                            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                                {msg.text}
                            </span>
                        ) : (
                            <div className="max-w-[85%] flex flex-col gap-1">
                                <div
                                    className={`relative px-5 py-3 text-sm leading-relaxed ${msg.sender === 'me'
                                        ? 'bg-white text-black rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                        : 'bg-black/50 text-white border border-white/10 rounded-2xl rounded-tl-sm backdrop-blur-md'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                <span className={`text-[10px] text-neutral-600 font-mono ${msg.sender === 'me' ? 'text-right' : 'text-left'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-neutral-900/50 border border-white/10 rounded-full pl-5 pr-12 py-3 text-base text-white focus:outline-none focus:border-white/30 focus:bg-neutral-900 transition-all font-body placeholder:text-neutral-600"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="absolute right-2 p-2 bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-0 disabled:scale-75 transition-all duration-200"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
