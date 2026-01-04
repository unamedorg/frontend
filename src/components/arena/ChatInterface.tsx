import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useWebSocket } from "@/providers/WebSocketProvider";
import { Send, AlertCircle, MoreHorizontal, Loader2 } from "lucide-react";
import { wsResponse } from "@/types/socket";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    id: string;
    text: string;
    gifUrl?: string;
    sender: 'me' | 'partner' | 'system';
    timestamp: number;
    reaction?: string;
}

interface ChatInterfaceProps {
    matchData: wsResponse | null;
    onTimeout?: () => void;
}

// ---------------------------------------------------------------------------
// ⚡ HIGH-PERFORMANCE MESSAGE COMPONENT
// Memoized to prevent re-renders of the entire list when only new items add.
// ---------------------------------------------------------------------------
const MessageBubble = memo(({
    msg,
    mobileActiveMessageId,
    onTouchStart,
    onTouchEnd,
    onContextMenu,
    onReaction
}: {
    msg: Message;
    mobileActiveMessageId: string | null;
    onTouchStart: (id: string) => void;
    onTouchEnd: () => void;
    onContextMenu: (e: React.MouseEvent, id: string) => void;
    onReaction: (id: string, emoji: string) => void;
}) => {
    const isMe = msg.sender === 'me';
    const isSystem = msg.sender === 'system';
    const isActive = mobileActiveMessageId === msg.id;

    if (isSystem) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex justify-center"
            >
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider">
                    {msg.text}
                </span>
            </motion.div>
        );
    }

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`group relative flex ${isMe ? 'justify-end' : 'justify-start'}`}
        >
            <div
                className="max-w-[85%] flex flex-col gap-1 relative"
                onTouchStart={() => onTouchStart(msg.id)}
                onTouchEnd={onTouchEnd}
                onContextMenu={(e) => onContextMenu(e, msg.id)}
            >
                {/* Reaction Overlay (Hover/Hold) */}
                <div className={`reaction-overlay absolute -top-10 ${isMe ? 'right-0' : 'left-0'} flex gap-1 p-1.5 bg-neutral-900/90 backdrop-blur-md rounded-full border border-white/10 transition-all duration-200 shadow-xl z-20 ${isActive ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'}`}>
                    {['👍', '❤️', '😂', '😮', '🔥'].map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => onReaction(msg.id, emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-full transition-colors active:scale-90"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {msg.gifUrl ? (
                    <motion.div
                        className="rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black relative"
                    >
                        <img src={msg.gifUrl} alt="GIF" loading="lazy" className="max-w-full h-auto max-h-60 object-contain" />
                        {msg.reaction && (
                            <div className={`absolute -bottom-2 ${isMe ? '-left-2' : '-right-2'} w-6 h-6 bg-neutral-800 rounded-full border border-white/10 flex items-center justify-center text-xs shadow-md`}>
                                {msg.reaction}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <div className="relative">
                        <div
                            className={`relative px-5 py-3 text-sm leading-relaxed select-none ${isMe
                                ? 'bg-white text-black rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                : 'bg-black/50 text-white border border-white/10 rounded-2xl rounded-tl-sm backdrop-blur-md'
                                }`}
                        >
                            {msg.text}
                        </div>
                        {msg.reaction && (
                            <div className={`absolute -bottom-2 ${isMe ? '-left-2' : '-right-2'} w-6 h-6 bg-neutral-800 rounded-full border border-white/10 flex items-center justify-center text-xs shadow-md z-10`}>
                                {msg.reaction}
                            </div>
                        )}
                    </div>
                )}
                <span className={`text-[10px] text-neutral-600 font-mono ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    return (
        prev.msg.id === next.msg.id &&
        prev.msg.reaction === next.msg.reaction &&
        prev.mobileActiveMessageId === next.mobileActiveMessageId
    );
});

// ---------------------------------------------------------------------------
// MAIN CHAT INTERFACE
// ---------------------------------------------------------------------------
function ChatInterfaceBase({ matchData, onTimeout }: ChatInterfaceProps) {
    const { sendMessage, lastMessage, sessionId } = useWebSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hasSentMessage = useRef(false);
    const [inactivityWarning, setInactivityWarning] = useState<number | null>(null);
    const [mobileActiveMessageId, setMobileActiveMessageId] = useState<string | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const resetInactivityTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setInactivityWarning(null);

        // grace: 60s for the first message, 45s thereafter
        const gracePeriod = hasSentMessage.current ? 45000 : 60000;

        timerRef.current = setTimeout(() => {
            setInactivityWarning(5); // Reverted to 5s visual countdown
        }, gracePeriod);
    }, []);

    // Initial System Logs
    useEffect(() => {
        if (matchData && matchData.type === 'start') {
            setMessages([]);
        }
        resetInactivityTimer();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [matchData, sessionId, resetInactivityTimer]);

    // Close mobile reaction menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (mobileActiveMessageId) {
                const target = e.target as HTMLElement;
                if (!target.closest('.reaction-overlay')) {
                    setMobileActiveMessageId(null);
                }
            }
        };

        window.addEventListener('click', handleClickOutside);
        window.addEventListener('touchstart', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('touchstart', handleClickOutside);
        };
    }, [mobileActiveMessageId]);

    // Countdown Effect
    useEffect(() => {
        if (inactivityWarning === null) return;

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

        const isNearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 150;
        const lastMsg = messages[messages.length - 1];
        const isPriority = lastMsg?.sender === 'me' || lastMsg?.sender === 'system';

        if (isNearBottom || isPriority) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Handle incoming messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'message') {
            setMessages(prev => [...prev, {
                id: lastMessage.id || Math.random().toString(36).substr(2, 9),
                text: lastMessage.text || "",
                gifUrl: lastMessage.gifUrl,
                sender: 'partner',
                timestamp: lastMessage.timestamp || Date.now()
            }]);
        }

        if (lastMessage.type === 'signal' && lastMessage.subtype === 'reaction') {
            const { messageId, emoji } = lastMessage.data as { messageId: string, emoji: string };
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, reaction: emoji } : msg
            ));
        }

    }, [lastMessage]);

    const handleTouchStart = useCallback((id: string) => {
        longPressTimer.current = setTimeout(() => {
            setMobileActiveMessageId(id);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setMobileActiveMessageId(id);
    }, []);

    const handleReaction = useCallback((messageId: string, emoji: string) => {
        setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, reaction: emoji } : msg
        ));
        setMobileActiveMessageId(null);
        sendMessage({
            type: 'signal',
            subtype: 'reaction',
            data: { messageId, emoji }
        } as any);
    }, [sendMessage]);

    const handleSend = (e?: React.FormEvent | React.KeyboardEvent) => {
        e?.preventDefault();
        if (!inputText.trim()) return;

        hasSentMessage.current = true;
        resetInactivityTimer();

        const messageId = crypto.randomUUID();

        setMessages(prev => [...prev, {
            id: messageId,
            text: inputText,
            sender: 'me',
            timestamp: Date.now()
        }]);

        sendMessage({
            type: 'message',
            id: messageId,
            username: 'me',
            text: inputText,
            timestamp: Date.now()
        });

        setInputText("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleGifSelect = useCallback((gifUrl: string) => {
        hasSentMessage.current = true;
        resetInactivityTimer();

        const messageId = crypto.randomUUID();

        setMessages(prev => [...prev, {
            id: messageId,
            text: "GIF",
            gifUrl: gifUrl,
            sender: 'me',
            timestamp: Date.now()
        }]);

        sendMessage({
            type: 'message',
            id: messageId,
            username: 'me',
            text: "GIF",
            gifUrl: gifUrl,
            timestamp: Date.now()
        });
    }, [sendMessage, resetInactivityTimer]);

    const processAndSendFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setIsProcessing(true);

        try {
            const reader = new FileReader();
            if (file.type === 'image/gif') {
                if (file.size > 3.5 * 1024 * 1024) {
                    alert("This GIF is massive (>3.5MB)! It might jam the signal. Try a smaller one.");
                    setIsProcessing(false);
                    return;
                }
                reader.onload = (e) => {
                    handleGifSelect(e.target?.result as string);
                    setIsProcessing(false);
                };
                reader.readAsDataURL(file);
                return;
            }

            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let MAX_WIDTH = 800;
                    let quality = 0.7;

                    if (file.size > 5 * 1024 * 1024) {
                        MAX_WIDTH = 600;
                        quality = 0.6;
                    }

                    const scaleSize = MAX_WIDTH / img.width;
                    const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                    const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    const format = file.type === 'image/png' ? 'image/webp' : 'image/jpeg';
                    const optimizedDataUrl = canvas.toDataURL(format, quality);

                    handleGifSelect(optimizedDataUrl);
                    setIsProcessing(false);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);

        } catch (e) {
            console.error("Image processing failed", e);
            setIsProcessing(false);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (e.clipboardData.files.length > 0) {
            e.preventDefault();
            const file = e.clipboardData.files[0];
            processAndSendFile(file);
            return;
        }
        const pastedText = e.clipboardData.getData('text');
        if (pastedText.match(/^https?:\/\/.*(giphy|tenor|imgur).*\.(gif|webp|png|jpg)$/i)) {
            // Optional auto-embed logic
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files.length > 0) {
            processAndSendFile(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div
            className="flex flex-col h-full min-h-0 bg-neutral-900/20 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden relative shadow-inner transform translate-z-0"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >

            {/* AFK Warning Overlay */}
            <AnimatePresence>
                {inactivityWarning !== null && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                    >
                        <div className="flex flex-col items-center bg-black/80 p-4 rounded-3xl backdrop-blur-md border border-red-500/20 shadow-2xl">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90">
                                    <circle cx="50%" cy="50%" r="40%" className="fill-none stroke-neutral-800" strokeWidth="6" />
                                    <motion.circle
                                        cx="50%" cy="50%" r="40%"
                                        className="fill-none stroke-red-500"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeDasharray={251}
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

            {/* Messages Area - Optimized List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-scroll overscroll-y-contain touch-pan-y p-6 space-y-6 min-h-0 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent will-change-scroll"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-600 opacity-50">
                        <MoreHorizontal className="w-8 h-8 animate-pulse mb-2" />
                        <span className="text-xs font-mono uppercase tracking-wider">Secure Channel Open</span>
                    </div>
                )}

                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        mobileActiveMessageId={mobileActiveMessageId}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onContextMenu={handleContextMenu}
                        onReaction={handleReaction}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent relative z-40">
                <form onSubmit={handleSend} className="relative flex items-end gap-2">
                    <textarea
                        id="chat-message-input"
                        name="message"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={isProcessing ? "Optimizing image..." : "Type a message..."}
                        disabled={isProcessing}
                        rows={1}
                        className="w-full bg-neutral-900/50 border border-white/10 rounded-[24px] pl-5 pr-12 py-3 text-base text-white focus:outline-none focus:border-white/30 focus:bg-neutral-900 transition-all font-body placeholder:text-neutral-600 disabled:opacity-50 disabled:cursor-wait resize-none min-h-[48px] max-h-[120px] overflow-y-auto"
                        enterKeyHint="send"
                        autoCapitalize="sentences"
                        autoCorrect="on"
                        spellCheck="true"
                        inputMode="text"
                    />

                    {isProcessing && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!inputText.trim() && !isProcessing}
                        className="absolute right-2 p-2 bg-white text-black rounded-full hover:bg-neutral-200 disabled:opacity-0 disabled:scale-75 transition-all duration-200"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}

// 🚀 CRITICAL OPTIMIZATION: Prevent re-renders on parent timer updates
export const ChatInterface = memo(ChatInterfaceBase);
