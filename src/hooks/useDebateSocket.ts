import { useState, useCallback, useRef, useEffect } from 'react';
import { WebSocketMessage, ChatMessage } from '@/types/debate';
import { createWebSocketUrl, generateUserId, generateUsername, getMessages, getRoom } from '@/lib/api';

interface UseWebSocketReturn {
    messages: ChatMessage[];
    typingUsers: string[];
    isConnected: boolean;
    isConnecting: boolean;
    isExpired: boolean;
    currentUser: string;
    roomTopic: string;
    participantCount: number;
    connect: (roomId: string) => Promise<void>;
    disconnect: () => void;
    sendMessage: (message: string) => void;
    sendTyping: () => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const HEARTBEAT_INTERVAL = 30000;

export function useDebateSocket(): UseWebSocketReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [currentUser, setCurrentUser] = useState('');
    const [roomTopic, setRoomTopic] = useState('Loading...');
    const [participantCount, setParticipantCount] = useState(1);

    const socketRef = useRef<WebSocket | null>(null);
    const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const userIdRef = useRef<string>('');
    const usernameRef = useRef<string>('');
    const roomIdRef = useRef<string | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isManualDisconnectRef = useRef(false);

    const clearTypingUser = useCallback((sender: string) => {
        setTypingUsers(prev => prev.filter(u => u !== sender));
        typingTimeoutsRef.current.delete(sender);
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const data: WebSocketMessage = JSON.parse(event.data);

            switch (data.type) {
                case 'message':
                    if (data.sender && data.message) {
                        // Debug log for message reception
                        console.log('📨 Message received:', {
                            msg: data.message,
                            sender: data.sender,
                            me: usernameRef.current,
                            isMine: data.sender === usernameRef.current
                        });

                        const newMessage: ChatMessage = {
                            type: 'message',
                            sender: data.sender,
                            message: data.message,
                            timestamp: data.timestamp || new Date().toISOString(),
                            isMine: data.sender === usernameRef.current,
                        };
                        setMessages(prev => [...prev, newMessage]);

                        // Clear typing indicator for this user
                        clearTypingUser(data.sender);
                    }
                    break;

                case 'typing':
                    if (data.sender && data.sender !== usernameRef.current) {
                        // Clear existing timeout for this user
                        const existingTimeout = typingTimeoutsRef.current.get(data.sender);
                        if (existingTimeout) {
                            clearTimeout(existingTimeout);
                        }

                        // Add user to typing list if not already there
                        setTypingUsers(prev =>
                            prev.includes(data.sender!) ? prev : [...prev, data.sender!]
                        );

                        // Set timeout to remove typing indicator
                        const timeout = setTimeout(() => clearTypingUser(data.sender!), 3000);
                        typingTimeoutsRef.current.set(data.sender, timeout);
                    }
                    break;

                case 'system':
                    if (data.message) {
                        const systemMessage: ChatMessage = {
                            type: 'system',
                            sender: 'System',
                            message: data.message,
                            timestamp: new Date().toISOString(),
                        };
                        setMessages(prev => [...prev, systemMessage]);

                        // Check for room expiry
                        if (data.message.toLowerCase().includes('expired')) {
                            setIsExpired(true);
                            isManualDisconnectRef.current = true;
                        }

                        // Update participant count based on join/leave
                        if (data.message.toLowerCase().includes('joined the room')) {
                            setParticipantCount(prev => prev + 1);
                        } else if (data.message.toLowerCase().includes('left the room')) {
                            setParticipantCount(prev => Math.max(1, prev - 1));
                        }
                    }
                    break;
            }
        } catch (error) {
            console.warn('Failed to parse WebSocket message:', error);
        }
    }, [clearTypingUser]);

    const connect = useCallback(async (roomId: string, isReconnect = false) => {
        if (!isReconnect) {
            roomIdRef.current = roomId;
            reconnectAttemptsRef.current = 0;
            isManualDisconnectRef.current = false;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) return;

        setIsConnecting(true);

        if (!isReconnect) {
            // ONLY generate identity if it doesn't exist yet for this session/room
            if (!userIdRef.current) userIdRef.current = generateUserId();
            if (!usernameRef.current) usernameRef.current = generateUsername();
            setCurrentUser(usernameRef.current);
            setMessages([]);
            setTypingUsers([]);
            setIsExpired(false);

            // Load room details (Topic, etc.)
            try {
                const room = await getRoom(roomId);
                if (room && room.topic) {
                    setRoomTopic(room.topic);
                    setParticipantCount(room.currentclient || 1);
                } else {
                    setRoomTopic('Debate Room');
                    setParticipantCount(1);
                }
            } catch (error) {
                console.warn('Failed to load room details:', error);
                setRoomTopic('Debate Room');
                setParticipantCount(1);
            }

            // Load previous messages
            try {
                const prevMessages = await getMessages(roomId);
                if (prevMessages && Array.isArray(prevMessages.messages)) {
                    const formattedMessages: ChatMessage[] = prevMessages.messages.map((msg: any) => ({
                        ...msg,
                        type: 'message' as const,
                        isMine: msg.sender === usernameRef.current,
                    }));
                    setMessages(formattedMessages);
                }
            } catch (error) {
                console.warn('Failed to load previous messages:', error);
            }
        }

        // Connect WebSocket
        const wsUrl = createWebSocketUrl(roomId, userIdRef.current, usernameRef.current);
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('✅ Socket connected');
            setIsConnected(true);
            setIsConnecting(false);
            reconnectAttemptsRef.current = 0;

            // Start heartbeat
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    // Use __typing__ as heartbeat because backend doesn't save it to Redis
                    socket.send('__typing__');
                }
            }, HEARTBEAT_INTERVAL);
        };

        socket.onmessage = handleMessage;

        socket.onclose = (event) => {
            console.log('❌ Socket closed:', event.code, event.reason);
            setIsConnected(false);
            setIsConnecting(false);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

            if (!isManualDisconnectRef.current && !isExpired && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
                console.log(`📡 Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current + 1})`);

                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectAttemptsRef.current++;
                    connect(roomId, true);
                }, delay);
            } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                console.error('🚫 Max reconnect attempts reached');
                setIsExpired(true);
            }
        };

        socket.onerror = () => {
            setIsConnected(false);
            setIsConnecting(false);
        };

        socketRef.current = socket;
    }, [handleMessage, isExpired]);

    const disconnect = useCallback(() => {
        isManualDisconnectRef.current = true;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
    }, []);

    const sendMessage = useCallback((message: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(message);
        }
    }, []);

    const sendTyping = useCallback(() => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send('__typing__');
        }
    }, []);

    // Robustness Listeners: Reconnect on visibility or network recovery
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && !isConnected && !isManualDisconnectRef.current && roomIdRef.current) {
                console.log('👁️ Tab visible. Attempting recovery...');
                connect(roomIdRef.current, true);
            }
        };

        const handleOnline = () => {
            if (!isConnected && !isManualDisconnectRef.current && roomIdRef.current) {
                console.log('🌐 Network online. Attempting recovery...');
                connect(roomIdRef.current, true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('online', handleOnline);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('online', handleOnline);
        };
    }, [isConnected, connect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        };
    }, []);

    return {
        messages,
        typingUsers,
        isConnected,
        isConnecting,
        isExpired,
        currentUser,
        roomTopic,
        participantCount,
        connect,
        disconnect,
        sendMessage,
        sendTyping,
    };
}
