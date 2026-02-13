'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { encodeRoomCode, isValidRoomCode, generateRoomCode } from '@/lib/stealth';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = query.trim();

    if (!trimmed) {
      setError('Please enter a search query');
      return;
    }

    // Check if it looks like a room code
    if (isValidRoomCode(trimmed)) {
      const encoded = encodeRoomCode(trimmed);
      router.push(`/room/${encoded}`);
      return;
    }

    // Fake search - show "no results"
    setError('No results found for your query');
  };

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    const encoded = encodeRoomCode(code);
    router.push(`/room/${encoded}`);
  };

  // Triple-click on logo to show hint
  const handleLogoClick = () => {
    setShowHint(prev => !prev);
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Fake header */}
        <header className={styles.header}>
          <div className={styles.logo} onClick={handleLogoClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span>Company Portal</span>
          </div>
          <div className={styles.navLinks}>
            <span className={styles.navLink}>Dashboard</span>
            <span className={styles.navLink}>Settings</span>
            <span className={styles.navLink}>Help</span>
          </div>
        </header>

        {/* Main content - looks like internal search */}
        <div className={styles.content}>
          <h1 className={styles.title}>Internal Documentation</h1>
          <p className={styles.subtitle}>Search knowledge base and resources</p>

          <form onSubmit={handleSearch} className={styles.searchForm}>
            <div className={styles.searchBox}>
              <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search documentation..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <button type="submit" className={styles.searchButton}>
              Search
            </button>
          </form>

          {error && <p className={styles.error}>{error}</p>}

          {/* Hidden hint for users who know */}
          {showHint && (
            <div className={styles.hint}>
              <p>Enter a room code to join, or create your own</p>
              <div className={styles.createRoom}>
                <input
                  type="text"
                  className={styles.roomInput}
                  placeholder="Enter custom code (e.g. my-team)"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''));
                    setError('');
                  }}
                  maxLength={32}
                />
                <div className={styles.roomActions}>
                  <button
                    onClick={() => {
                      const code = query.trim();
                      if (code.length < 3) {
                        setError('Code must be at least 3 characters');
                        return;
                      }
                      if (isValidRoomCode(code)) {
                        const encoded = encodeRoomCode(code);
                        router.push(`/room/${encoded}`);
                      }
                    }}
                    className={styles.joinButton}
                    disabled={query.trim().length < 3}
                  >
                    Join / Create
                  </button>
                  <button onClick={handleCreateRoom} className={styles.hintButton}>
                    Random Room
                  </button>
                </div>
                <span className={styles.codeHint}>
                  3-32 characters: letters, numbers, dashes, underscores
                </span>
              </div>
            </div>
          )}

          {/* Fake categories */}
          <div className={styles.categories}>
            <div className={styles.category}>
              <h3>Getting Started</h3>
              <ul>
                <li>Onboarding Guide</li>
                <li>System Requirements</li>
                <li>Quick Start Tutorial</li>
              </ul>
            </div>
            <div className={styles.category}>
              <h3>Technical Docs</h3>
              <ul>
                <li>API Reference</li>
                <li>Integration Guide</li>
                <li>Troubleshooting</li>
              </ul>
            </div>
            <div className={styles.category}>
              <h3>Policies</h3>
              <ul>
                <li>Security Guidelines</li>
                <li>Data Handling</li>
                <li>Compliance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Fake footer */}
        <footer className={styles.footer}>
          <span>© 2026 Internal Systems</span>
          <span>v2.4.1</span>
        </footer>
      </div>
    </main>
  );
}
