'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './Canvas.module.css';

interface CanvasElement {
    id: string;
    type: 'link' | 'image' | 'note';
    content: string;
    url?: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
}

interface CanvasProps {
    roomCode: string;
    username: string;
    initialElements: CanvasElement[];
}

export default function Canvas({ roomCode, username, initialElements }: CanvasProps) {
    const [elements, setElements] = useState<CanvasElement[]>(initialElements);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [addType, setAddType] = useState<'link' | 'image' | 'note' | null>(null);
    const [inputValue, setInputValue] = useState('');
    const canvasRef = useRef<HTMLDivElement>(null);

    // Handle context menu (right-click to add)
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        setMenuPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        setShowAddMenu(true);
        setAddType(null);
    }, []);

    // Close menu on outside click
    useEffect(() => {
        const handleClick = () => {
            if (showAddMenu && !addType) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [showAddMenu, addType]);

    // Add new element
    const handleAddElement = (type: 'link' | 'image' | 'note') => {
        setAddType(type);
        setInputValue('');
    };

    const handleSubmitElement = () => {
        if (!inputValue.trim() || !addType) return;

        const newElement: CanvasElement = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: addType,
            content: inputValue.trim(),
            url: addType === 'image' ? inputValue.trim() : undefined,
            position: menuPosition,
        };

        setElements(prev => [...prev, newElement]);
        setShowAddMenu(false);
        setAddType(null);
        setInputValue('');

        // TODO: Emit to socket for real-time sync
        // emitElementAdded(roomCode, newElement);
    };

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
        e.stopPropagation();
        const element = elements.find(el => el.id === elementId);
        if (!element) return;

        setDragging(elementId);
        setDragOffset({
            x: e.clientX - element.position.x,
            y: e.clientY - element.position.y,
        });
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left - dragOffset.x + rect.left;
        const y = e.clientY - rect.top - dragOffset.y + rect.top;

        setElements(prev => prev.map(el =>
            el.id === dragging
                ? { ...el, position: { x: Math.max(0, x), y: Math.max(0, y) } }
                : el
        ));
    }, [dragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        if (dragging) {
            const element = elements.find(el => el.id === dragging);
            if (element) {
                // TODO: Emit position update to socket
                // emitElementMoved(roomCode, element.id, element.position);
            }
            setDragging(null);
        }
    }, [dragging, elements]);

    // Delete element
    const handleDelete = (elementId: string) => {
        setElements(prev => prev.filter(el => el.id !== elementId));
        // TODO: Emit to socket
        // emitElementRemoved(roomCode, elementId);
    };

    // Render element based on type
    const renderElement = (element: CanvasElement) => {
        switch (element.type) {
            case 'link':
                return (
                    <a
                        href={element.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                            <polyline points="15,3 21,3 21,9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        <span>{new URL(element.content).hostname}</span>
                    </a>
                );
            case 'image':
                return (
                    <img
                        src={`/api/proxy?url=${encodeURIComponent(element.content)}`}
                        alt="Shared image"
                        className={styles.imageContent}
                        draggable={false}
                    />
                );
            case 'note':
                return (
                    <div className={styles.noteContent}>
                        {element.content}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div
            ref={canvasRef}
            className={styles.canvas}
            onContextMenu={handleContextMenu}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Grid background */}
            <div className={styles.grid}></div>

            {/* Elements */}
            {elements.map(element => (
                <div
                    key={element.id}
                    className={`${styles.element} ${styles[element.type]} ${dragging === element.id ? styles.dragging : ''}`}
                    style={{
                        left: element.position.x,
                        top: element.position.y,
                    }}
                    onMouseDown={(e) => handleMouseDown(e, element.id)}
                >
                    <div className={styles.elementHeader}>
                        <span className={styles.elementType}>{element.type}</span>
                        <button
                            className={styles.deleteBtn}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(element.id);
                            }}
                        >
                            ×
                        </button>
                    </div>
                    {renderElement(element)}
                </div>
            ))}

            {/* Add menu */}
            {showAddMenu && (
                <div
                    className={styles.addMenu}
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {!addType ? (
                        <>
                            <button onClick={() => handleAddElement('link')}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                                </svg>
                                Add Link
                            </button>
                            <button onClick={() => handleAddElement('image')}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21,15 16,10 5,21" />
                                </svg>
                                Add Image
                            </button>
                            <button onClick={() => handleAddElement('note')}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                    <polyline points="14,2 14,8 20,8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                Add Note
                            </button>
                        </>
                    ) : (
                        <div className={styles.addInput}>
                            <input
                                type="text"
                                placeholder={addType === 'link' ? 'Enter URL...' : addType === 'image' ? 'Image URL...' : 'Enter note...'}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmitElement()}
                                autoFocus
                            />
                            <div className={styles.addInputActions}>
                                <button onClick={() => setAddType(null)}>Cancel</button>
                                <button onClick={handleSubmitElement} className={styles.primary}>Add</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Instructions */}
            {elements.length === 0 && (
                <div className={styles.instructions}>
                    <p>Right-click anywhere to add elements</p>
                    <span>Links • Images • Notes</span>
                </div>
            )}
        </div>
    );
}
