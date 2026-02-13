import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

/**
 * GET /api/admin/migrate?key=SECRET
 * One-time migration: scan all room:* keys and add them to rooms:index
 * Also backfills missing fields on old rooms
 */
export async function GET(request: NextRequest) {
    const key = request.nextUrl.searchParams.get('key');
    const secret = process.env.ADMIN_SECRET_KEY;

    if (!secret || key !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!redis) {
        return NextResponse.json({ error: 'Redis not configured' }, { status: 500 });
    }

    try {
        let cursor = 0;
        let migrated = 0;
        let updated = 0;
        const roomCodes: string[] = [];

        // Scan for all room:* keys
        do {
            const [nextCursor, keys] = await redis.scan(cursor, { match: 'room:*', count: 100 });
            cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;

            for (const key of keys) {
                const roomCode = (key as string).replace('room:', '');
                roomCodes.push(roomCode);

                // Add to index
                await redis.sadd('rooms:index', roomCode);
                migrated++;

                // Backfill missing fields on old rooms
                const room = await redis.get<Record<string, unknown>>(key as string);
                if (room && !room.activityLog) {
                    const patched = {
                        ...room,
                        activityLog: room.activityLog || [{
                            action: 'migrated',
                            user: 'System',
                            ip: 'migration',
                            timestamp: new Date().toISOString(),
                        }],
                        isLocked: room.isLocked ?? false,
                        memberCount: room.memberCount ?? 0,
                        creatorName: room.creatorName || 'Unknown',
                    };
                    await redis.set(key as string, patched);
                    updated++;
                }
            }
        } while (cursor !== 0);

        return NextResponse.json({
            success: true,
            message: `Migration complete`,
            migrated,
            updated,
            rooms: roomCodes,
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed', details: String(error) }, { status: 500 });
    }
}
