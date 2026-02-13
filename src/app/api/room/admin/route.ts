import { NextRequest, NextResponse } from 'next/server';
import { getRoom, updateRoom, deleteRoom, verifyPin, addActivityLog } from '@/lib/redis';

// Extract IP from request
function getClientIP(request: NextRequest): string {
    return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
}

/**
 * POST /api/room/admin
 * Verify admin pin and execute admin actions
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomCode, pin, action } = body;

        if (!roomCode || !pin) {
            return NextResponse.json({ error: 'Missing room code or pin' }, { status: 400 });
        }

        const room = await getRoom(roomCode);
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Verify pin
        if (!room.adminPinHash || !verifyPin(pin, room.adminPinHash)) {
            return NextResponse.json({ error: 'Invalid admin pin' }, { status: 403 });
        }

        const ip = getClientIP(request);

        switch (action) {
            case 'verify':
                // Just verify the pin is correct
                return NextResponse.json({
                    success: true,
                    room: {
                        roomCode: room.roomCode,
                        createdAt: room.createdAt,
                        lastActivity: room.lastActivity,
                        isLocked: room.isLocked,
                        memberCount: room.memberCount,
                        messageCount: room.chatLog.length,
                        elementCount: room.elements.length,
                        ownerEmail: room.ownerEmail,
                        creatorName: room.creatorName,
                        activityLog: room.activityLog || [],
                    }
                });

            case 'clear-chat':
                await updateRoom(roomCode, { chatLog: [] });
                await addActivityLog(roomCode, 'chat_cleared', 'Admin', ip);
                return NextResponse.json({ success: true, message: 'Chat cleared' });

            case 'lock':
                await updateRoom(roomCode, { isLocked: true });
                await addActivityLog(roomCode, 'room_locked', 'Admin', ip);
                return NextResponse.json({ success: true, message: 'Room locked' });

            case 'unlock':
                await updateRoom(roomCode, { isLocked: false });
                await addActivityLog(roomCode, 'room_unlocked', 'Admin', ip);
                return NextResponse.json({ success: true, message: 'Room unlocked' });

            case 'clear-canvas':
                await updateRoom(roomCode, { elements: [] });
                await addActivityLog(roomCode, 'canvas_cleared', 'Admin', ip);
                return NextResponse.json({ success: true, message: 'Canvas cleared' });

            case 'delete':
                await addActivityLog(roomCode, 'room_deleted', 'Admin', ip);
                await deleteRoom(roomCode);
                return NextResponse.json({ success: true, message: 'Room deleted' });

            case 'get-logs':
                return NextResponse.json({
                    success: true,
                    logs: room.activityLog || []
                });

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

    } catch (error) {
        console.error('Admin API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
