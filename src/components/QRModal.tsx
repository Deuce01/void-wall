'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import styles from './QRModal.module.css';

interface QRModalProps {
    roomCode: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function QRModal({ roomCode, isOpen, onClose }: QRModalProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [roomUrl, setRoomUrl] = useState<string>('');

    useEffect(() => {
        if (isOpen && roomCode) {
            const url = `${window.location.origin}/room/${btoa(roomCode).replace(/=/g, '')}`;
            setRoomUrl(url);

            QRCode.toDataURL(url, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#d4d4d4',
                    light: '#1a1a1a',
                },
            }).then(setQrDataUrl);
        }
    }, [isOpen, roomCode]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Share Room</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <div className={styles.content}>
                    <div className={styles.qrContainer}>
                        {qrDataUrl && (
                            <img src={qrDataUrl} alt="Room QR Code" className={styles.qrCode} />
                        )}
                    </div>

                    <div className={styles.roomInfo}>
                        <span className={styles.label}>Room Code</span>
                        <code className={styles.code}>#{roomCode}</code>
                    </div>

                    <div className={styles.urlBox}>
                        <input
                            type="text"
                            value={roomUrl}
                            readOnly
                            className={styles.urlInput}
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(roomUrl);
                            }}
                            className={styles.copyBtn}
                        >
                            Copy
                        </button>
                    </div>

                    <p className={styles.hint}>
                        Scan the QR code or share the link to invite others
                    </p>
                </div>
            </div>
        </div>
    );
}
