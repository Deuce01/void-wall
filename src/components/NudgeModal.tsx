'use client';

import { useState } from 'react';
import styles from './NudgeModal.module.css';

interface NudgeModalProps {
    roomCode: string;
    senderName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function NudgeModal({ roomCode, senderName, isOpen, onClose }: NudgeModalProps) {
    const [emails, setEmails] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSend = async () => {
        const emailList = emails
            .split(/[,\n]/)
            .map(e => e.trim())
            .filter(e => e && e.includes('@'));

        if (emailList.length === 0) {
            setResult({ success: false, message: 'Please enter valid email addresses' });
            return;
        }

        setSending(true);
        setResult(null);

        try {
            const res = await fetch('/api/room/nudge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomCode,
                    senderName,
                    message: message.trim(),
                    emails: emailList,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setResult({
                    success: true,
                    message: `Sent to ${data.sent} of ${data.total} recipients`
                });
                setEmails('');
                setMessage('');
            } else {
                setResult({
                    success: false,
                    message: data.error || 'Failed to send notifications'
                });
            }
        } catch (error) {
            setResult({ success: false, message: 'Network error' });
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Nudge Members</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.field}>
                        <label>Email addresses</label>
                        <textarea
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            placeholder="Enter emails, one per line or comma-separated"
                            rows={3}
                            className={styles.textarea}
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Message (optional)</label>
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Check this out!"
                            className={styles.input}
                            maxLength={100}
                        />
                    </div>

                    {result && (
                        <div className={`${styles.result} ${result.success ? styles.success : styles.error}`}>
                            {result.message}
                        </div>
                    )}

                    <button
                        onClick={handleSend}
                        disabled={sending || !emails.trim()}
                        className={styles.sendBtn}
                    >
                        {sending ? 'Sending...' : 'Send Nudge'}
                    </button>

                    <p className={styles.hint}>
                        Recipients will receive an email with a link to this room
                    </p>
                </div>
            </div>
        </div>
    );
}
