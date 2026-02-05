// URL Obfuscation utilities
// Makes room codes look like system file paths

/**
 * Encode a room code to Base64 for URL obfuscation
 * "Falcon99" -> "RmFsY29uOTk="
 */
export function encodeRoomCode(roomCode: string): string {
    if (typeof window !== 'undefined') {
        return btoa(roomCode).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }
    return Buffer.from(roomCode).toString('base64url');
}

/**
 * Decode a Base64 room code back to original
 * "RmFsY29uOTk" -> "Falcon99"
 */
export function decodeRoomCode(encoded: string): string {
    try {
        // Add back padding if needed
        const padded = encoded + '='.repeat((4 - encoded.length % 4) % 4);
        const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');

        if (typeof window !== 'undefined') {
            return atob(base64);
        }
        return Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
        return '';
    }
}

/**
 * Validate that a decoded room code is safe
 */
export function isValidRoomCode(roomCode: string): boolean {
    // Only allow alphanumeric and basic punctuation
    const safePattern = /^[a-zA-Z0-9_-]{3,32}$/;
    return safePattern.test(roomCode);
}

/**
 * Generate a random room code
 */
export function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
