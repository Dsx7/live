'use client';
import { useState, useRef, useCallback } from 'react';

interface NavbarProps {
  onSearch: (q: string) => void;
  total: number;
  onToggleSidebar: () => void;
  searchQuery: string;
}

export default function Navbar({ onSearch, total, onToggleSidebar, searchQuery }: NavbarProps) {
  const [query, setQuery] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(val), 350);
  }, [onSearch]);

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="nav-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="url(#navLg)" />
            <polygon points="11,9 20,14 11,19" fill="white" />
            <defs>
              <linearGradient id="navLg" x1="0" y1="0" x2="28" y2="28">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="nav-title">StreamVault</span>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="nav-search">
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="Search 29K+ channels..."
            value={query}
            onChange={handleChange}
            autoComplete="off"
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); onSearch(''); }}>✕</button>
          )}
        </div>
      </div>

      <div className="nav-right">
        <div className="stats-pill">
          <span className="dot-live"></span>
          <span>{total.toLocaleString()} channels</span>
        </div>
        <button className="btn-hamburger" onClick={onToggleSidebar} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  );
}
