'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './Chat.module.css';

interface ChatMessage {
    id: string;
    sender: string;
    msg: string;
    time: string;
}

interface ChatProps {
    roomCode: string;
    username: string;
    initialMessages: ChatMessage[];
}

export default function Chat({ roomCode, username, initialMessages }: ChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();

        const trimmed = newMessage.trim();
        if (!trimmed) return;

        const message: ChatMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sender: username,
            msg: trimmed,
            time: new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }),
        };

        setMessages(prev => [...prev, message]);
        setNewMessage('');

        // TODO: Emit to socket for real-time sync
        // sendMessage(roomCode, message);
    };

    // Format link in messages
    const formatMessage = (text: string) => {
        // Simple URL detection
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className={styles.chat}>
            {/* Header */}
            <div className={styles.header}>
                <span className={styles.title}>Messages</span>
                <span className={styles.count}>{messages.length}</span>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
                {messages.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No messages yet</p>
                        <span>Start the conversation</span>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`${styles.message} ${msg.sender === username ? styles.own : ''}`}
                        >
                            <div className={styles.messageMeta}>
                                <span className={styles.sender}>{msg.sender}</span>
                                <span className={styles.time}>{msg.time}</span>
                            </div>
                            <div className={styles.messageContent}>
                                {formatMessage(msg.msg)}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className={styles.inputForm}>
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    maxLength={500}
                />
                <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={!newMessage.trim()}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22,2 15,22 11,13 2,9 22,2" />
                    </svg>
                </button>
            </form>
        </div>
    );
}
