export type wsMessage =
    | { type: 'join'; username: string; timestamp: number }
    | { type: 'leave'; username: string; timestamp: number }
    | { type: 'message'; id?: string; username: string; text: string; gifUrl?: string; timestamp: number }
    | { type: 'signal'; subtype: 'offer' | 'answer' | 'candidate' | 'handshake' | 'handshake_ack' | 'reaction'; data: unknown }
    | { type: 'match_request'; collegeId?: string; mode: 'college' | 'random' }
    | { type: 'ping' };

export type wsResponse =
    | { type: 'message'; id?: string; username: string; text: string; gifUrl?: string; timestamp: number }
    | { type: 'start'; role: 'producer' | 'consumer'; roomid: string; peerId?: string }
    | { type: 'userCount'; count: number }
    | { type: 'error'; message: string }
    | { type: 'leave'; username?: string; timestamp?: number }
    | { type: 'signal'; subtype: 'consent' | 'handshake' | 'handshake_ack' | 'reaction'; data: unknown }
    | { type: 'ping' };

export interface WebSocketContextType {
    isConnected: boolean;
    sendMessage: (msg: wsMessage) => void;
    lastMessage: wsResponse | null;
    connect: () => void;
    disconnect: () => void;
    sessionId: string | null;
    tabId: string;
}
