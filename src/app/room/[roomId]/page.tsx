'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { decodeRoomCode, isValidRoomCode, encodeRoomCode } from '@/lib/stealth';
import Canvas from '@/components/Canvas';
import Chat from '@/components/Chat';
import styles from './room.module.css';

interface RoomData {
    roomCode: string;
    createdAt: string;
    elements: Array<{
        id: string;
        type: 'link' | 'image' | 'note';
        content: string;
        url?: string;
        position: { x: number; y: number };
    }>;
    chatLog: Array<{
        id: string;
        sender: string;
        msg: string;
        time: string;
    }>;
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [room, setRoom] = useState<RoomData | null>(null);
    const [username, setUsername] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(true);
    const [copied, setCopied] = useState(false);

    const roomId = params.roomId as string;
    const roomCode = decodeRoomCode(roomId);

    // Validate and load room
    useEffect(() => {
        const initRoom = async () => {
            // Validate room code
            if (!roomCode || !isValidRoomCode(roomCode)) {
                setError('not_found');
                setLoading(false);
                return;
            }

            try {
                // Try to join/create room
                const res = await fetch('/api/room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomCode, action: 'join' }),
                });

                if (!res.ok) {
                    throw new Error('Failed to join room');
                }

                const data = await res.json();
                setRoom(data.room);
                setLoading(false);
            } catch (err) {
                console.error('Room init error:', err);
                setError('error');
                setLoading(false);
            }
        };

        initRoom();
    }, [roomCode]);

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        const name = username.trim() || `User${Math.floor(Math.random() * 9999)}`;
        setUsername(name);
        setShowNamePrompt(false);
    };

    const handleCopyLink = async () => {
        const url = `${window.location.origin}/room/${encodeRoomCode(roomCode)}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Show 404 for invalid rooms
    if (error === 'not_found') {
        return (
            <main className={styles.errorPage}>
                <div className={styles.errorContent}>
                    <h1>404</h1>
                    <p>Page Not Found</p>
                    <span className={styles.errorDetail}>
                        The requested resource could not be located on this server.
                    </span>
                    <button
                        onClick={() => router.push('/')}
                        className={styles.backButton}
                    >
                        Return to Portal
                    </button>
                </div>
            </main>
        );
    }

    if (error === 'error') {
        return (
            <main className={styles.errorPage}>
                <div className={styles.errorContent}>
                    <h1>503</h1>
                    <p>Service Unavailable</p>
                    <span className={styles.errorDetail}>
                        Unable to connect to the backend service. Please try again later.
                    </span>
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className={styles.loadingPage}>
                <div className={styles.loader}></div>
                <span>Loading configuration...</span>
            </main>
        );
    }

    // Name prompt before entering
    if (showNamePrompt) {
        return (
            <main className={styles.promptPage}>
                <div className={styles.promptCard}>
                    <h2>Access Portal</h2>
                    <p>Enter display name (optional)</p>
                    <form onSubmit={handleJoin}>
                        <input
                            type="text"
                            className="ghost-input"
                            placeholder="Anonymous"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={20}
                            autoFocus
                        />
                        <button type="submit" className="ghost-btn primary">
                            Continue
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.room}>
            {/* Minimal header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.roomCode}>#{roomCode}</span>
                    <button
                        onClick={handleCopyLink}
                        className={styles.copyBtn}
                        title="Copy room link"
                    >
                        {copied ? '✓ Copied' : 'Share'}
                    </button>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.username}>{username}</span>
                    <button
                        onClick={() => router.push('/')}
                        className={styles.exitBtn}
                    >
                        Exit
                    </button>
                </div>
            </header>

            {/* Main workspace */}
            <div className={styles.workspace}>
                <div className={styles.canvasContainer}>
                    <Canvas
                        roomCode={roomCode}
                        username={username}
                        initialElements={room?.elements || []}
                    />
                </div>
                <div className={styles.sidePanel}>
                    <Chat
                        roomCode={roomCode}
                        username={username}
                        initialMessages={room?.chatLog || []}
                    />
                </div>
            </div>
        </main>
    );
}
