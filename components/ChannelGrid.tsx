'use client';
import type { Channel } from '@/lib/parser';

interface ChannelGridProps {
  channels: Channel[];
  loading: boolean;
  total: number;
  page: number;
  pages: number;
  selectedGroup: string;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  favorites: number[];
  onChannelClick: (ch: Channel) => void;
  onPageChange: (p: number) => void;
  onViewModeChange: (m: 'grid' | 'list') => void;
  onToggleFavorite: (id: number) => void;
}

const FALLBACK_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' rx='8' fill='%231e2235'/%3E%3Cpolygon points='30,25 60,40 30,55' fill='%237c3aed'/%3E%3C/svg%3E";

function ChannelCard({ ch, viewMode, isFav, onPlay, onFav }: {
  ch: Channel;
  viewMode: 'grid' | 'list';
  isFav: boolean;
  onPlay: () => void;
  onFav: () => void;
}) {
  if (viewMode === 'list') {
    return (
      <div className="channel-list-item" onClick={onPlay}>
        <div className="ch-list-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ch.logo || FALLBACK_LOGO}
            alt={ch.name}
            className="ch-list-logo"
            onError={e => { e.currentTarget.src = FALLBACK_LOGO; }}
          />
        </div>
        <div className="ch-list-info">
          <span className="ch-list-name">{ch.name}</span>
          <span className="ch-list-group">{ch.group}</span>
        </div>
        <div className="ch-list-meta">
          <span className={`type-badge ${ch.type}`}>{ch.type.toUpperCase()}</span>
          {ch.hasDrm && <span className="type-badge drm">DRM</span>}
        </div>
        <button
          className={`fav-btn ${isFav ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); onFav(); }}
          title={isFav ? 'Remove favorite' : 'Add favorite'}
        >★</button>
        <button className="play-list-btn">▶</button>
      </div>
    );
  }

  return (
    <div className="channel-card" onClick={onPlay}>
      <div className="card-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ch.logo || FALLBACK_LOGO}
          alt={ch.name}
          className="card-logo"
          onError={e => { e.currentTarget.src = FALLBACK_LOGO; }}
          loading="lazy"
        />
        <div className="card-overlay">
          <div className="play-icon">▶</div>
        </div>
        <button
          className={`fav-btn card-fav ${isFav ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); onFav(); }}
          title={isFav ? 'Remove' : 'Favorite'}
        >★</button>
      </div>
      <div className="card-body">
        <p className="card-name" title={ch.name}>{ch.name}</p>
        <div className="card-meta">
          <span className="card-group">{ch.group}</span>
          <span className={`type-badge ${ch.type}`}>{ch.type.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return viewMode === 'grid'
    ? <div className="skeleton-card"><div className="sk-logo"></div><div className="sk-text"></div><div className="sk-text sk-text-sm"></div></div>
    : <div className="skeleton-list"><div className="sk-circle"></div><div className="sk-lines"><div className="sk-text"></div><div className="sk-text sk-text-sm"></div></div></div>;
}

export default function ChannelGrid({
  channels, loading, total, page, pages, selectedGroup, searchQuery,
  viewMode, favorites, onChannelClick, onPageChange, onViewModeChange, onToggleFavorite
}: ChannelGridProps) {

  const title = searchQuery
    ? `Results for "${searchQuery}"`
    : selectedGroup === 'All' ? 'All Channels' : selectedGroup;

  const getPaginationPages = () => {
    const p: (number | '...')[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) p.push(i);
    } else {
      p.push(1);
      if (page > 3) p.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) p.push(i);
      if (page < pages - 2) p.push('...');
      p.push(pages);
    }
    return p;
  };

  return (
    <section className="channels-section">
      {/* Header */}
      <div className="section-header">
        <div className="section-title-wrap">
          <h1 className="section-title">{title}</h1>
          <span className="section-count">{total.toLocaleString()} channels</span>
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <rect x="1" y="1" width="7" height="7" rx="1" /><rect x="12" y="1" width="7" height="7" rx="1" />
              <rect x="1" y="12" width="7" height="7" rx="1" /><rect x="12" y="12" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List view"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <rect x="1" y="2" width="18" height="3" rx="1" /><rect x="1" y="8.5" width="18" height="3" rx="1" />
              <rect x="1" y="15" width="18" height="3" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid / List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'channels-grid' : 'channels-list'}>
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} viewMode={viewMode} />)}
        </div>
      ) : channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📺</div>
          <p>No channels found</p>
          <small>Try a different search or category</small>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'channels-grid' : 'channels-list'}>
          {channels.map(ch => (
            <ChannelCard
              key={ch.id}
              ch={ch}
              viewMode={viewMode}
              isFav={favorites.includes(ch.id)}
              onPlay={() => onChannelClick(ch)}
              onFav={() => onToggleFavorite(ch.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >‹ Prev</button>

          {getPaginationPages().map((p, i) =>
            p === '...'
              ? <span key={`d${i}`} className="page-dots">…</span>
              : <button
                  key={p}
                  className={`page-btn ${page === p ? 'active' : ''}`}
                  onClick={() => onPageChange(p as number)}
                >{p}</button>
          )}

          <button
            className="page-btn"
            disabled={page === pages}
            onClick={() => onPageChange(page + 1)}
          >Next ›</button>
        </div>
      )}
    </section>
  );
}
