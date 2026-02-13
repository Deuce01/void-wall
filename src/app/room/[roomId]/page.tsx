'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { decodeRoomCode, isValidRoomCode, encodeRoomCode } from '@/lib/stealth';
import Canvas from '@/components/Canvas';
import Chat from '@/components/Chat';
import QRModal from '@/components/QRModal';
import NudgeModal from '@/components/NudgeModal';
import RoomSettings from '@/components/RoomSettings';
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
    const [showQR, setShowQR] = useState(false);
    const [showNudge, setShowNudge] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [hasAdmin, setHasAdmin] = useState(false);

    const roomId = params.roomId as string;
    const roomCode = decodeRoomCode(roomId);

    // Validate and load room
    useEffect(() => {
        const initRoom = async () => {
            if (!roomCode || !isValidRoomCode(roomCode)) {
                setError('not_found');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/room', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomCode, action: 'join' }),
                });

                if (res.status === 403) {
                    setError('locked');
                    setLoading(false);
                    return;
                }

                if (!res.ok) throw new Error('Failed to join room');

                const data = await res.json();
                setRoom(data.room);
                setHasAdmin(data.hasAdmin || false);
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

    if (error === 'not_found') {
        return (
            <main className={styles.errorPage}>
                <div className={styles.errorContent}>
                    <h1>404</h1>
                    <p>Page Not Found</p>
                    <span className={styles.errorDetail}>
                        The requested resource could not be located on this server.
                    </span>
                    <button onClick={() => router.push('/')} className={styles.backButton}>
                        Return to Portal
                    </button>
                </div>
            </main>
        );
    }

    if (error === 'locked') {
        return (
            <main className={styles.errorPage}>
                <div className={styles.errorContent}>
                    <h1>🔒</h1>
                    <p>Room Locked</p>
                    <span className={styles.errorDetail}>
                        This room has been locked by the administrator.
                    </span>
                    <button onClick={() => router.push('/')} className={styles.backButton}>
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
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.roomCode}>#{roomCode}</span>
                    <button onClick={handleCopyLink} className={styles.copyBtn} title="Copy room link">
                        {copied ? '✓ Copied' : 'Share'}
                    </button>
                    <button onClick={() => setShowQR(true)} className={styles.qrBtn} title="Show QR code">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="3" height="3" />
                            <rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" />
                            <rect x="18" y="18" width="3" height="3" />
                        </svg>
                    </button>
                    <button onClick={() => setShowNudge(true)} className={styles.nudgeBtn} title="Send email nudge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 17H2a3 3 0 003-3V9a7 7 0 0114 0v5a3 3 0 003 3z" />
                            <path d="M9 21h6" /><path d="M12 3v1" />
                        </svg>
                    </button>
                    <button onClick={() => setShowSettings(true)} className={styles.settingsBtn} title="Room settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </button>
                </div>
                <div className={styles.headerRight}>
                    <span className={styles.username}>{username}</span>
                    <button onClick={() => router.push('/')} className={styles.exitBtn}>Exit</button>
                </div>
            </header>

            <div className={styles.workspace}>
                <div className={styles.canvasContainer}>
                    <Canvas roomCode={roomCode} username={username} initialElements={room?.elements || []} />
                </div>
                <div className={styles.sidePanel}>
                    <Chat roomCode={roomCode} username={username} initialMessages={room?.chatLog || []} />
                </div>
            </div>

            <QRModal roomCode={roomCode} isOpen={showQR} onClose={() => setShowQR(false)} />
            <NudgeModal roomCode={roomCode} senderName={username} isOpen={showNudge} onClose={() => setShowNudge(false)} />
            <RoomSettings roomCode={roomCode} isOpen={showSettings} onClose={() => setShowSettings(false)} hasAdmin={hasAdmin} />
        </main>
    );
}
