import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/proxy?url=<encoded_url>
 * Proxy external images through our domain to avoid firewall detection
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    try {
        // Decode URL
        const decodedUrl = decodeURIComponent(url);

        // Validate URL
        const parsedUrl = new URL(decodedUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 });
        }

        // Fetch the resource
        const response = await fetch(decodedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch resource' }, { status: response.status });
        }

        // Get content type
        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Only allow images
        if (!contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
        }

        // Stream the response
        const data = await response.arrayBuffer();

        return new NextResponse(data, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            },
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy resource' }, { status: 500 });
    }
}
