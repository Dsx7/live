'use client';

interface BottomNavProps {
  onHome: () => void;
  onSearch: () => void;
  onCategories: () => void;
  onFavorites: () => void;
  showFavs: boolean;
}

export default function BottomNav({ onHome, onSearch, onCategories, onFavorites, showFavs }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button className="bn-btn" onClick={onHome}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
        <span>Home</span>
      </button>
      <button className="bn-btn" onClick={onSearch}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Search</span>
      </button>
      <button className="bn-btn" onClick={onCategories}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <span>Categories</span>
      </button>
      <button className={`bn-btn ${showFavs ? 'active' : ''}`} onClick={onFavorites}>
        <svg viewBox="0 0 24 24" fill={showFavs ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span>Favorites</span>
      </button>
    </nav>
  );
}
