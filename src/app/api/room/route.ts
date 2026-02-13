import { NextRequest, NextResponse } from 'next/server';
import { getRoom, createRoom, roomExists, addActivityLog } from '@/lib/redis';
import { decodeRoomCode, isValidRoomCode } from '@/lib/stealth';

// Extract IP from request
function getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

/**
 * GET /api/room?code=xxx
 * Check if room exists
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    const exists = await roomExists(code);
    return NextResponse.json({ exists });
}

/**
 * POST /api/room
 * Create or join a room
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomCode, action, adminPin, ownerEmail, creatorName } = body;

        if (!roomCode) {
            return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
        }

        // Decode if needed
        const rawCode = isValidRoomCode(roomCode) ? roomCode : decodeRoomCode(roomCode);

        if (!rawCode || !isValidRoomCode(rawCode)) {
            return NextResponse.json({ error: 'Invalid room code' }, { status: 400 });
        }

        const ip = getClientIP(request);
        const exists = await roomExists(rawCode);

        if (action === 'create') {
            if (exists) {
                return NextResponse.json({ error: 'Room already exists' }, { status: 409 });
            }
            const room = await createRoom(rawCode, { adminPin, ownerEmail, creatorName });
            // Log creation with IP
            await addActivityLog(rawCode, 'room_created', creatorName || 'Anonymous', ip);
            // Don't expose admin pin hash
            const { adminPinHash, ...safeRoom } = room;
            return NextResponse.json({
                success: true,
                room: safeRoom,
                created: true,
                hasAdmin: !!adminPinHash
            });
        }

        if (action === 'join') {
            if (!exists) {
                // Auto-create room on join
                const room = await createRoom(rawCode, { adminPin, ownerEmail, creatorName });
                await addActivityLog(rawCode, 'room_created', creatorName || 'Anonymous', ip);
                const { adminPinHash, ...safeRoom } = room;
                return NextResponse.json({
                    success: true,
                    room: safeRoom,
                    created: true,
                    hasAdmin: !!adminPinHash
                });
            }

            const room = await getRoom(rawCode);
            if (!room) {
                return NextResponse.json({ error: 'Room not found' }, { status: 404 });
            }

            // Check if room is locked
            if (room.isLocked) {
                return NextResponse.json({ error: 'Room is locked' }, { status: 403 });
            }

            // Log join with IP
            await addActivityLog(rawCode, 'user_joined', creatorName || 'Anonymous', ip);

            // Increment member count
            room.memberCount = (room.memberCount || 0) + 1;

            const { adminPinHash, activityLog, ...safeRoom } = room;
            return NextResponse.json({
                success: true,
                room: safeRoom,
                hasAdmin: !!adminPinHash
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Room API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
