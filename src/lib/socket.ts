import { io, Socket } from 'socket.io-client';
import { CanvasElement, ChatMessage } from './redis';

// Socket.io client instance
let socket: Socket | null = null;

export interface SocketEvents {
    'room-joined': (data: { roomCode: string; userCount: number }) => void;
    'user-joined': (data: { userCount: number }) => void;
    'user-left': (data: { userCount: number }) => void;
    'element-added': (element: CanvasElement) => void;
    'element-moved': (data: { id: string; position: { x: number; y: number } }) => void;
    'element-removed': (data: { id: string }) => void;
    'new-message': (message: ChatMessage) => void;
    'room-state': (data: { elements: CanvasElement[]; chatLog: ChatMessage[] }) => void;
}

/**
 * Initialize Socket.io connection
 */
export function initSocket(): Socket {
    if (socket) return socket;

    socket = io({
        path: '/api/socketio',
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
    });

    return socket;
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
    return socket;
}

/**
 * Join a room
 */
export function joinRoom(roomCode: string, username: string): void {
    if (!socket) return;
    socket.emit('join-room', { roomCode, username });
}

/**
 * Leave current room
 */
export function leaveRoom(roomCode: string): void {
    if (!socket) return;
    socket.emit('leave-room', { roomCode });
}

/**
 * Emit element added
 */
export function emitElementAdded(roomCode: string, element: CanvasElement): void {
    if (!socket) return;
    socket.emit('add-element', { roomCode, element });
}

/**
 * Emit element moved
 */
export function emitElementMoved(
    roomCode: string,
    id: string,
    position: { x: number; y: number }
): void {
    if (!socket) return;
    socket.emit('move-element', { roomCode, id, position });
}

/**
 * Emit element removed
 */
export function emitElementRemoved(roomCode: string, id: string): void {
    if (!socket) return;
    socket.emit('remove-element', { roomCode, id });
}

/**
 * Send chat message
 */
export function sendMessage(roomCode: string, message: ChatMessage): void {
    if (!socket) return;
    socket.emit('send-message', { roomCode, message });
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
