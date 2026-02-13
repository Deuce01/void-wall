'use client';

import { useState } from 'react';
import styles from './RoomSettings.module.css';

interface ActivityLog {
    action: string;
    user: string;
    ip: string;
    timestamp: string;
    details?: string;
}

interface RoomStats {
    roomCode: string;
    createdAt: string;
    lastActivity: string;
    isLocked: boolean;
    memberCount: number;
    messageCount: number;
    elementCount: number;
    ownerEmail?: string;
    creatorName?: string;
    activityLog: ActivityLog[];
}

interface RoomSettingsProps {
    roomCode: string;
    isOpen: boolean;
    onClose: () => void;
    hasAdmin: boolean;
}

export default function RoomSettings({ roomCode, isOpen, onClose, hasAdmin }: RoomSettingsProps) {
    const [pin, setPin] = useState('');
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState<RoomStats | null>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [showLogs, setShowLogs] = useState(false);
    const [actionResult, setActionResult] = useState('');
    const [loading, setLoading] = useState(false);

    const verifyAdmin = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/room/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, pin, action: 'verify' }),
            });
            const data = await res.json();
            if (data.success) {
                setVerified(true);
                setStats(data.room);
                setLogs(data.room.activityLog || []);
            } else {
                setError(data.error || 'Invalid pin');
            }
        } catch {
            setError('Connection error');
        }
        setLoading(false);
    };

    const executeAction = async (action: string, confirm?: string) => {
        if (confirm && !window.confirm(confirm)) return;

        setActionResult('');
        setLoading(true);
        try {
            const res = await fetch('/api/room/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, pin, action }),
            });
            const data = await res.json();
            if (data.success) {
                setActionResult(data.message || 'Done');
                if (action === 'delete') {
                    window.location.href = '/';
                    return;
                }
                // Refresh stats
                const refreshRes = await fetch('/api/room/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomCode, pin, action: 'verify' }),
                });
                const refreshData = await refreshRes.json();
                if (refreshData.success) {
                    setStats(refreshData.room);
                    setLogs(refreshData.room.activityLog || []);
                }
            } else {
                setActionResult(`Error: ${data.error}`);
            }
        } catch {
            setActionResult('Connection error');
        }
        setLoading(false);
    };

    const formatTime = (ts: string) => {
        try {
            return new Date(ts).toLocaleString();
        } catch {
            return ts;
        }
    };

    const formatAction = (action: string) => {
        const labels: Record<string, string> = {
            room_created: '🏠 Room Created',
            user_joined: '👤 User Joined',
            chat_cleared: '🗑️ Chat Cleared',
            canvas_cleared: '🗑️ Canvas Cleared',
            room_locked: '🔒 Room Locked',
            room_unlocked: '🔓 Room Unlocked',
            room_deleted: '❌ Room Deleted',
            message_sent: '💬 Message Sent',
            element_added: '📌 Element Added',
        };
        return labels[action] || action;
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Room Settings</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                {!hasAdmin ? (
                    <div className={styles.content}>
                        <p className={styles.noAdmin}>This room has no admin pin set.</p>
                    </div>
                ) : !verified ? (
                    <div className={styles.content}>
                        <div className={styles.pinForm}>
                            <label>Enter Admin Pin</label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="••••"
                                className={styles.pinInput}
                                maxLength={6}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && verifyAdmin()}
                            />
                            {error && <span className={styles.error}>{error}</span>}
                            <button
                                onClick={verifyAdmin}
                                disabled={pin.length < 4 || loading}
                                className={styles.verifyBtn}
                            >
                                {loading ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.content}>
                        {/* Room Stats */}
                        <div className={styles.statsGrid}>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Created</span>
                                <span className={styles.statValue}>{formatTime(stats?.createdAt || '')}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Last Activity</span>
                                <span className={styles.statValue}>{formatTime(stats?.lastActivity || '')}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Messages</span>
                                <span className={styles.statValue}>{stats?.messageCount || 0}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Elements</span>
                                <span className={styles.statValue}>{stats?.elementCount || 0}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Members Joined</span>
                                <span className={styles.statValue}>{stats?.memberCount || 0}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>Status</span>
                                <span className={styles.statValue}>{stats?.isLocked ? '🔒 Locked' : '🔓 Open'}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <button
                                onClick={() => executeAction(stats?.isLocked ? 'unlock' : 'lock')}
                                className={styles.actionBtn}
                                disabled={loading}
                            >
                                {stats?.isLocked ? '🔓 Unlock Room' : '🔒 Lock Room'}
                            </button>
                            <button
                                onClick={() => executeAction('clear-chat', 'Delete all chat messages?')}
                                className={styles.actionBtn}
                                disabled={loading}
                            >
                                🗑️ Clear Chat
                            </button>
                            <button
                                onClick={() => executeAction('clear-canvas', 'Delete all canvas elements?')}
                                className={styles.actionBtn}
                                disabled={loading}
                            >
                                🗑️ Clear Canvas
                            </button>
                            <button
                                onClick={() => setShowLogs(!showLogs)}
                                className={styles.actionBtn}
                            >
                                📋 {showLogs ? 'Hide' : 'View'} Activity Logs
                            </button>
                            <button
                                onClick={() => executeAction('delete', 'Permanently delete this room? This cannot be undone.')}
                                className={`${styles.actionBtn} ${styles.danger}`}
                                disabled={loading}
                            >
                                ❌ Delete Room
                            </button>
                        </div>

                        {actionResult && (
                            <div className={styles.result}>{actionResult}</div>
                        )}

                        {/* Activity Logs */}
                        {showLogs && (
                            <div className={styles.logs}>
                                <h3>Activity Logs</h3>
                                {logs.length === 0 ? (
                                    <p className={styles.noLogs}>No activity logged yet</p>
                                ) : (
                                    <div className={styles.logList}>
                                        {[...logs].reverse().map((log, i) => (
                                            <div key={i} className={styles.logEntry}>
                                                <div className={styles.logHeader}>
                                                    <span className={styles.logAction}>{formatAction(log.action)}</span>
                                                    <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                                                </div>
                                                <div className={styles.logDetails}>
                                                    <span>User: {log.user}</span>
                                                    <span className={styles.logIp}>IP: {log.ip}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
