export interface Room {
    id: string;
    topic: string;
    maxClient: number;
    currentclient: number;
    createdAt: string;
    expiresAt: string;
}

export interface CreateRoomRequest {
    topic: string;
    duration: number;
    maxClient: number;
}

export interface CreateRoomResponse {
    roomId: string;
    topic: string;
    expires: string;
}

export interface GetRoomsResponse {
    count: number;
    rooms: Room[];
}

export interface Message {
    sender: string;
    message: string;
    timestamp: string;
}

export interface GetMessagesResponse {
    roomId: string;
    count: number;
    messages: Message[];
}

export interface WebSocketMessage {
    type: 'message' | 'typing' | 'system';
    sender?: string;
    message?: string;
    timestamp?: string;
}

export interface ChatMessage extends Message {
    type: 'message' | 'system';
    isMine?: boolean;
}
