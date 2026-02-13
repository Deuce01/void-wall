import { NextRequest, NextResponse } from 'next/server';
import { listAllRooms, deleteRoom, getRoom } from '@/lib/redis';

/**
 * Verify admin secret key from environment
 */
function verifyAdminKey(request: NextRequest): boolean {
    const key = request.nextUrl.searchParams.get('key')
        || request.headers.get('x-admin-key');
    const secret = process.env.ADMIN_SECRET_KEY;
    return !!secret && key === secret;
}

/**
 * GET /api/admin?key=SECRET
 * List all rooms with stats
 */
export async function GET(request: NextRequest) {
    if (!verifyAdminKey(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rooms = await listAllRooms();

        const summary = rooms.map(room => ({
            roomCode: room.roomCode,
            createdAt: room.createdAt,
            lastActivity: room.lastActivity,
            messageCount: room.chatLog?.length || 0,
            elementCount: room.elements?.length || 0,
            memberCount: room.memberCount || 0,
            isLocked: room.isLocked || false,
            hasAdmin: !!room.adminPinHash,
            ownerEmail: room.ownerEmail,
            creatorName: room.creatorName,
            logCount: room.activityLog?.length || 0,
        }));

        return NextResponse.json({
            totalRooms: rooms.length,
            totalMessages: summary.reduce((sum, r) => sum + r.messageCount, 0),
            totalElements: summary.reduce((sum, r) => sum + r.elementCount, 0),
            rooms: summary,
        });
    } catch (error) {
        console.error('Admin API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin?key=SECRET&room=CODE
 * Delete a specific room
 */
export async function DELETE(request: NextRequest) {
    if (!verifyAdminKey(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomCode = request.nextUrl.searchParams.get('room');
    if (!roomCode) {
        return NextResponse.json({ error: 'Missing room code' }, { status: 400 });
    }

    await deleteRoom(roomCode);
    return NextResponse.json({ success: true, message: `Room ${roomCode} deleted` });
}

/**
 * POST /api/admin?key=SECRET
 * Get detailed room info including logs
 */
export async function POST(request: NextRequest) {
    if (!verifyAdminKey(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { roomCode } = await request.json();
        const room = await getRoom(roomCode);

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        return NextResponse.json({
            roomCode: room.roomCode,
            createdAt: room.createdAt,
            lastActivity: room.lastActivity,
            isLocked: room.isLocked,
            memberCount: room.memberCount,
            messageCount: room.chatLog?.length || 0,
            elementCount: room.elements?.length || 0,
            ownerEmail: room.ownerEmail,
            creatorName: room.creatorName,
            activityLog: room.activityLog || [],
        });
    } catch (error) {
        console.error('Admin detail error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
