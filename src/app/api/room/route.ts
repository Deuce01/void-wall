import { NextRequest, NextResponse } from 'next/server';
import { getRoom, createRoom, roomExists } from '@/lib/redis';
import { decodeRoomCode, isValidRoomCode } from '@/lib/stealth';

/**
 * GET /api/room?id=<encoded_room_id>
 * Check if room exists and get its data
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const encodedId = searchParams.get('id');

    if (!encodedId) {
        return NextResponse.json({ error: 'Missing room ID' }, { status: 400 });
    }

    const roomCode = decodeRoomCode(encodedId);

    if (!roomCode || !isValidRoomCode(roomCode)) {
        return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const room = await getRoom(roomCode);

    if (!room) {
        return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
        exists: true,
        room: {
            roomCode: room.roomCode,
            createdAt: room.createdAt,
            elementCount: room.elements.length,
            messageCount: room.chatLog.length,
        }
    });
}

/**
 * POST /api/room
 * Create a new room or join existing
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomCode: rawCode, action } = body;

        if (!rawCode) {
            return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
        }

        if (!isValidRoomCode(rawCode)) {
            return NextResponse.json({ error: 'Invalid room code format' }, { status: 400 });
        }

        const exists = await roomExists(rawCode);

        if (action === 'create') {
            if (exists) {
                return NextResponse.json({ error: 'Room already exists' }, { status: 409 });
            }
            const room = await createRoom(rawCode);
            return NextResponse.json({ success: true, room });
        }

        if (action === 'join') {
            if (!exists) {
                // Auto-create room on join for convenience
                const room = await createRoom(rawCode);
                return NextResponse.json({ success: true, room, created: true });
            }
            const room = await getRoom(rawCode);
            return NextResponse.json({ success: true, room });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Room API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
