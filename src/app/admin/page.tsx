'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './admin.module.css';

interface RoomSummary {
    roomCode: string;
    createdAt: string;
    lastActivity: string;
    messageCount: number;
    elementCount: number;
    memberCount: number;
    isLocked: boolean;
    hasAdmin: boolean;
    ownerEmail?: string;
    creatorName?: string;
    logCount: number;
}

interface ActivityLog {
    action: string;
    user: string;
    ip: string;
    timestamp: string;
}

function AdminContent() {
    const searchParams = useSearchParams();
    const key = searchParams.get('key') || '';

    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRooms: 0, totalMessages: 0, totalElements: 0 });
    const [rooms, setRooms] = useState<RoomSummary[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [roomLogs, setRoomLogs] = useState<ActivityLog[]>([]);
    const [error, setError] = useState('');

    const fetchRooms = async () => {
        try {
            const res = await fetch(`/api/admin?key=${key}`);
            if (res.status === 401) {
                setAuthorized(false);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setAuthorized(true);
            setStats({
                totalRooms: data.totalRooms,
                totalMessages: data.totalMessages,
                totalElements: data.totalElements,
            });
            setRooms(data.rooms);
            setLoading(false);
        } catch {
            setError('Failed to load');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (key) fetchRooms();
        else setLoading(false);
    }, [key]);

    const viewLogs = async (roomCode: string) => {
        setSelectedRoom(roomCode);
        try {
            const res = await fetch(`/api/admin?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode }),
            });
            const data = await res.json();
            setRoomLogs(data.activityLog || []);
        } catch {
            setRoomLogs([]);
        }
    };

    const deleteRoomAction = async (roomCode: string) => {
        if (!confirm(`Delete room "${roomCode}"?`)) return;
        await fetch(`/api/admin?key=${key}&room=${roomCode}`, { method: 'DELETE' });
        fetchRooms();
        if (selectedRoom === roomCode) setSelectedRoom(null);
    };

    const formatTime = (ts: string) => {
        try { return new Date(ts).toLocaleString(); } catch { return ts; }
    };

    const timeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    if (loading) {
        return <main className={styles.page}><p className={styles.loading}>Loading...</p></main>;
    }

    if (!key || !authorized) {
        return (
            <main className={styles.page}>
                <div className={styles.unauthorized}>
                    <h1>401</h1>
                    <p>Unauthorized</p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <h1>Platform Admin</h1>
                <button onClick={fetchRooms} className={styles.refreshBtn}>↻ Refresh</button>
            </header>

            {/* Stats Bar */}
            <div className={styles.statsBar}>
                <div className={styles.statCard}>
                    <span className={styles.statNum}>{stats.totalRooms}</span>
                    <span className={styles.statLabel}>Active Rooms</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statNum}>{stats.totalMessages}</span>
                    <span className={styles.statLabel}>Total Messages</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statNum}>{stats.totalElements}</span>
                    <span className={styles.statLabel}>Canvas Elements</span>
                </div>
            </div>

            <div className={styles.layout}>
                {/* Room List */}
                <div className={styles.roomList}>
                    <h2>Rooms</h2>
                    {rooms.length === 0 ? (
                        <p className={styles.empty}>No active rooms</p>
                    ) : (
                        rooms.map(room => (
                            <div
                                key={room.roomCode}
                                className={`${styles.roomCard} ${selectedRoom === room.roomCode ? styles.selected : ''}`}
                                onClick={() => viewLogs(room.roomCode)}
                            >
                                <div className={styles.roomHeader}>
                                    <span className={styles.roomName}>
                                        #{room.roomCode}
                                        {room.isLocked && ' 🔒'}
                                        {room.hasAdmin && ' 🔑'}
                                    </span>
                                    <span className={styles.roomTime}>{timeAgo(room.lastActivity)}</span>
                                </div>
                                <div className={styles.roomMeta}>
                                    <span>💬 {room.messageCount}</span>
                                    <span>📌 {room.elementCount}</span>
                                    <span>👤 {room.memberCount}</span>
                                    {room.creatorName && <span>By: {room.creatorName}</span>}
                                </div>
                                <div className={styles.roomActions}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteRoomAction(room.roomCode); }}
                                        className={styles.deleteBtn}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Log Viewer */}
                <div className={styles.logViewer}>
                    {selectedRoom ? (
                        <>
                            <h2>Logs: #{selectedRoom}</h2>
                            <div className={styles.logList}>
                                {roomLogs.length === 0 ? (
                                    <p className={styles.empty}>No logs available</p>
                                ) : (
                                    [...roomLogs].reverse().map((log, i) => (
                                        <div key={i} className={styles.logEntry}>
                                            <div className={styles.logRow}>
                                                <span className={styles.logAction}>{log.action}</span>
                                                <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                                            </div>
                                            <div className={styles.logRow}>
                                                <span>👤 {log.user}</span>
                                                <code className={styles.logIp}>{log.ip}</code>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <p className={styles.hint}>Select a room to view logs</p>
                    )}
                </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
        </main>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={<main className={styles.page}><p className={styles.loading}>Loading...</p></main>}>
            <AdminContent />
        </Suspense>
    );
}
