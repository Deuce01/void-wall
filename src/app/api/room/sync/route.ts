import { NextRequest, NextResponse } from 'next/server';
import { addChatMessage, getRoom, addElement, updateElementPosition, removeElement } from '@/lib/redis';
import type { ChatMessage, CanvasElement } from '@/lib/redis';

/**
 * POST /api/room/sync
 * Sync room data (messages, elements) to Redis
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomCode, action, data } = body;

        if (!roomCode) {
            return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
        }

        // Check room exists
        const room = await getRoom(roomCode);
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        switch (action) {
            case 'add-message':
                const message = data as ChatMessage;
                await addChatMessage(roomCode, message);
                return NextResponse.json({ success: true });

            case 'add-element':
                const element = data as CanvasElement;
                await addElement(roomCode, element);
                return NextResponse.json({ success: true });

            case 'move-element':
                const { id, position } = data;
                await updateElementPosition(roomCode, id, position);
                return NextResponse.json({ success: true });

            case 'remove-element':
                await removeElement(roomCode, data.id);
                return NextResponse.json({ success: true });

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Sync API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * GET /api/room/sync?roomCode=xxx
 * Get latest room state
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const roomCode = searchParams.get('roomCode');

    if (!roomCode) {
        return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const room = await getRoom(roomCode);

    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
        elements: room.elements,
        chatLog: room.chatLog,
    });
}
