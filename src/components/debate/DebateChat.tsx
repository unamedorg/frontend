import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Send, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { ChatMessage } from "@/types/debate";

interface DebateChatProps {
    messages: ChatMessage[];
    typingUsers?: string[];
    isConnected?: boolean;
    isExpired?: boolean;
    onSendMessage: (message: string) => void;
    onSendTyping?: () => void;
    currentUser: string;
}

// ---------------------------------------------------------------------------
// ⚡ MESSAGE COMPONENT
// ---------------------------------------------------------------------------
const MessageBubble = memo(({
    msg,
    index
}: {
    msg: ChatMessage;
    index: number;
}) => {
    const isMe = msg.isMine;
    const isSystem = msg.type === 'system';

    if (isSystem) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex justify-center my-2"
            >
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                    {msg.message}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'} my-1`}
        >
            <div className="max-w-[85%] flex flex-col gap-1 relative">
                {/* Username Display */}
                {!isMe && !isSystem && msg.sender && (
                    <span className="text-[10px] text-neutral-500 ml-3 mb-1 block font-mono tracking-wide opacity-70">
                        {msg.sender}
                    </span>
                )}

                <div className="relative">
                    <div
                        className={`relative px-5 py-3 text-sm leading-relaxed select-none ${isMe
                            ? 'bg-white text-black rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                            : 'bg-black/50 text-white border border-white/10 rounded-2xl rounded-tl-sm backdrop-blur-md'
                            }`}
                    >
                        {msg.message}
                    </div>
                </div>
                {/* Timestamp: 12:00 AM format */}
                <span className={`text-[10px] text-neutral-600 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                </span>
            </div>
        </motion.div>
    );
});

// ---------------------------------------------------------------------------
// TYPING INDICATOR (Matched to debate-connect logic)
// ---------------------------------------------------------------------------
const TypingIndicator = ({ users }: { users: string[] }) => {
    if (users.length === 0) return null;

    const text = users.length === 1
        ? `${users[0]} is typing...`
        : users.length === 2
            ? `${users[0]} and ${users[1]} are typing...`
            : `${users[0]} and ${users.length - 1} others are typing...`;

    return (
        <div className="flex items-center gap-3 px-6 pb-3 text-xs text-blue-400/90 font-mono font-medium tracking-tight">
            <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-bounce" />
            </div>
            <span className="animate-pulse">{text}</span>
        </div>
    );
};

// ---------------------------------------------------------------------------
// MAIN CHAT INTERFACE
// ---------------------------------------------------------------------------
function DebateChatBase({
    messages,
    typingUsers = [],
    isConnected = true,
    isExpired = false,
    onSendMessage,
    onSendTyping,
    currentUser
}: DebateChatProps) {
    const [inputText, setInputText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);

        // Debounce typing indicator
        if (onSendTyping) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            typingTimeoutRef.current = setTimeout(() => {
                onSendTyping();
            }, 300);
        }
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !isConnected || isExpired) return;

        onSendMessage(inputText.trim());
        setInputText("");
    };

    // Disabled state
    const isInputDisabled = !isConnected || isExpired;

    return (
        <div className="flex flex-col h-full min-h-0 bg-neutral-900/20 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden relative shadow-inner">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-scroll overscroll-y-contain touch-pan-y p-6 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 opacity-50">
                        <span className="text-xs font-mono uppercase tracking-wider">Start the debate</span>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <MessageBubble
                            key={`${msg.timestamp}-${idx}`}
                            msg={msg}
                            index={idx}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Typing Indicator */}
            <TypingIndicator users={typingUsers} />

            {/* Expired Notice */}
            {isExpired && (
                <div className="shrink-0 px-4 py-3 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Room expired or disconnected</span>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent relative z-40 border-t border-white/5">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        placeholder={isInputDisabled ? "Cannot send messages" : "Type your argument..."}
                        disabled={isInputDisabled}
                        className="flex-1 bg-neutral-900/50 border border-white/10 rounded-full pl-5 pr-5 py-3 text-base text-white focus:outline-none focus:border-white/30 focus:bg-neutral-900 transition-all font-body placeholder:text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    <button
                        type="submit"
                        disabled={!inputText.trim() || isInputDisabled}
                        className="p-3 bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-50 transition-all duration-200"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}

export const DebateChat = memo(DebateChatBase);
