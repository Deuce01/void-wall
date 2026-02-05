import { Redis } from '@upstash/redis';

// Check if Redis is configured
const isRedisConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
);

// Initialize Redis client only if configured
const redis = isRedisConfigured
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    : null;

// Room TTL in seconds (default 24 hours)
const ROOM_TTL = parseInt(process.env.ROOM_TTL_HOURS || '24') * 60 * 60;

// In-memory storage for demo mode (data lost on restart)
const memoryStore = new Map<string, RoomData>();

// Types
export interface CanvasElement {
    id: string;
    type: 'link' | 'image' | 'note';
    content: string;
    url?: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
    createdAt: string;
    createdBy: string;
}

export interface ChatMessage {
    id: string;
    sender: string;
    msg: string;
    time: string;
}

export interface RoomData {
    roomCode: string;
    createdAt: string;
    lastActivity: string;
    elements: CanvasElement[];
    chatLog: ChatMessage[];
}

/**
 * Check if running in demo mode (no Redis)
 */
export function isDemoMode(): boolean {
    return !isRedisConfigured;
}

/**
 * Get room data from Redis or memory
 */
export async function getRoom(roomCode: string): Promise<RoomData | null> {
    // Demo mode: use memory
    if (!redis) {
        return memoryStore.get(roomCode) || null;
    }

    try {
        const data = await redis.get<RoomData>(`room:${roomCode}`);
        return data;
    } catch (error) {
        console.error('Redis getRoom error:', error);
        return null;
    }
}

/**
 * Create a new room
 */
export async function createRoom(roomCode: string): Promise<RoomData> {
    const now = new Date().toISOString();
    const roomData: RoomData = {
        roomCode,
        createdAt: now,
        lastActivity: now,
        elements: [],
        chatLog: [],
    };

    // Demo mode: use memory
    if (!redis) {
        memoryStore.set(roomCode, roomData);
        return roomData;
    }

    await redis.set(`room:${roomCode}`, roomData, { ex: ROOM_TTL });
    return roomData;
}

/**
 * Update room data and refresh TTL
 */
export async function updateRoom(roomCode: string, data: Partial<RoomData>): Promise<void> {
    const existing = await getRoom(roomCode);
    if (!existing) return;

    const updated: RoomData = {
        ...existing,
        ...data,
        lastActivity: new Date().toISOString(),
    };

    // Demo mode: use memory
    if (!redis) {
        memoryStore.set(roomCode, updated);
        return;
    }

    await redis.set(`room:${roomCode}`, updated, { ex: ROOM_TTL });
}

/**
 * Add element to room canvas
 */
export async function addElement(roomCode: string, element: CanvasElement): Promise<void> {
    const room = await getRoom(roomCode);
    if (!room) return;

    room.elements.push(element);
    await updateRoom(roomCode, { elements: room.elements });
}

/**
 * Update element position
 */
export async function updateElementPosition(
    roomCode: string,
    elementId: string,
    position: { x: number; y: number }
): Promise<void> {
    const room = await getRoom(roomCode);
    if (!room) return;

    const element = room.elements.find(e => e.id === elementId);
    if (element) {
        element.position = position;
        await updateRoom(roomCode, { elements: room.elements });
    }
}

/**
 * Remove element from canvas
 */
export async function removeElement(roomCode: string, elementId: string): Promise<void> {
    const room = await getRoom(roomCode);
    if (!room) return;

    room.elements = room.elements.filter(e => e.id !== elementId);
    await updateRoom(roomCode, { elements: room.elements });
}

/**
 * Add chat message
 */
export async function addChatMessage(roomCode: string, message: ChatMessage): Promise<void> {
    const room = await getRoom(roomCode);
    if (!room) return;

    room.chatLog.push(message);
    // Keep only last 100 messages
    if (room.chatLog.length > 100) {
        room.chatLog = room.chatLog.slice(-100);
    }
    await updateRoom(roomCode, { chatLog: room.chatLog });
}

/**
 * Check if room exists
 */
export async function roomExists(roomCode: string): Promise<boolean> {
    // Demo mode: use memory
    if (!redis) {
        return memoryStore.has(roomCode);
    }

    try {
        const exists = await redis.exists(`room:${roomCode}`);
        return exists === 1;
    } catch {
        return false;
    }
}

/**
 * Delete room (manual cleanup)
 */
export async function deleteRoom(roomCode: string): Promise<void> {
    // Demo mode: use memory
    if (!redis) {
        memoryStore.delete(roomCode);
        return;
    }

    await redis.del(`room:${roomCode}`);
}

export default redis;
