import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getRoom, updateRoom } from '@/lib/redis';

// Initialize Resend (email service)
const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

/**
 * POST /api/room/nudge
 * Send email notification to room members
 */
export async function POST(request: NextRequest) {
    if (!resend) {
        return NextResponse.json({
            error: 'Email service not configured'
        }, { status: 503 });
    }

    try {
        const body = await request.json();
        const { roomCode, senderName, message, emails } = body;

        if (!roomCode || !emails || emails.length === 0) {
            return NextResponse.json({
                error: 'Missing required fields'
            }, { status: 400 });
        }

        // Validate room exists
        const room = await getRoom(roomCode);
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Generate room URL
        const encodedRoom = Buffer.from(roomCode).toString('base64url');
        const roomUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://void-wall.vercel.app'}/room/${encodedRoom}`;

        // Send emails
        const results = await Promise.all(
            emails.map(async (email: string) => {
                try {
                    await resend.emails.send({
                        from: 'Void Wall <notifications@resend.dev>',
                        to: email,
                        subject: `${senderName || 'Someone'} wants your attention`,
                        html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a1a; color: #d4d4d4;">
                <h2 style="font-size: 18px; margin: 0 0 16px;">You've been nudged!</h2>
                <p style="margin: 0 0 16px; color: #888;">
                  ${senderName || 'Someone'} wants you to check the chat.
                </p>
                ${message ? `<p style="margin: 0 0 16px; padding: 12px; background: #252525; border-radius: 6px;">"${message}"</p>` : ''}
                <a href="${roomUrl}" style="display: inline-block; padding: 12px 24px; background: #525252; color: #fff; text-decoration: none; border-radius: 6px;">
                  Open Room
                </a>
                <p style="margin: 24px 0 0; font-size: 12px; color: #666;">
                  Room code: #${roomCode}
                </p>
              </div>
            `,
                    });
                    return { email, success: true };
                } catch (err) {
                    console.error(`Failed to send to ${email}:`, err);
                    return { email, success: false };
                }
            })
        );

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
            success: true,
            sent: successCount,
            total: emails.length
        });

    } catch (error) {
        console.error('Nudge API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PUT /api/room/nudge
 * Add/update member emails for a room
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { roomCode, email, action } = body;

        if (!roomCode || !email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const room = await getRoom(roomCode);
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Store emails in room data (extend the type)
        const members = (room as any).members || [];

        if (action === 'add' && !members.includes(email)) {
            members.push(email);
        } else if (action === 'remove') {
            const idx = members.indexOf(email);
            if (idx > -1) members.splice(idx, 1);
        }

        await updateRoom(roomCode, { members } as any);

        return NextResponse.json({ success: true, members });

    } catch (error) {
        console.error('Nudge PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
