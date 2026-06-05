'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ChannelGrid from '@/components/ChannelGrid';
import Player from '@/components/Player';
import BottomNav from '@/components/BottomNav';
import type { Channel } from '@/lib/parser';

export interface GroupInfo {
  name: string;
  count: number;
  emoji: string;
}

export interface ApiResponse {
  total: number;
  page: number;
  pages: number;
  channels: Channel[];
  groups: GroupInfo[];
}

export default function HomePage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavs, setShowFavs] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sv_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  const saveFavorites = (favs: number[]) => {
    setFavorites(favs);
    localStorage.setItem('sv_favorites', JSON.stringify(favs));
  };

  const toggleFavorite = (id: number) => {
    const updated = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    saveFavorites(updated);
  };

  const fetchChannels = useCallback(async (p = 1, group = selectedGroup, q = searchQuery, favs = showFavs) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: '48',
        group: favs ? 'All' : group,
        q: q,
      });
      const res = await fetch(`/api/channels?${params}`, { signal: ctrl.signal });
      const data: ApiResponse = await res.json();

      let finalChannels = data.channels;
      if (favs) {
        finalChannels = data.channels.filter(c => favorites.includes(c.id));
      }

      setChannels(finalChannels);
      setTotal(favs ? favorites.length : data.total);
      setPages(data.pages);
      setPage(p);
      if (data.groups.length > 0) setGroups(data.groups);
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, searchQuery, showFavs, favorites]);

  // Initial load
  useEffect(() => {
    fetchChannels(1, 'All', '');
  }, []);

  const handleGroupSelect = (group: string) => {
    setShowFavs(false);
    setSelectedGroup(group);
    setPage(1);
    setSearchQuery('');
    setSidebarOpen(false);
    fetchChannels(1, group, '');
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setShowFavs(false);
    setPage(1);
    fetchChannels(1, selectedGroup, q);
  }, [selectedGroup, fetchChannels]);

  const handlePageChange = (p: number) => {
    fetchChannels(p, selectedGroup, searchQuery, showFavs);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShowFavs = () => {
    setShowFavs(true);
    setSelectedGroup('All');
    setSearchQuery('');
    fetchChannels(1, 'All', '', true);
  };

  return (
    <div className="app-root">
      <Navbar
        onSearch={handleSearch}
        total={total}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        searchQuery={searchQuery}
      />

      <div className="app-body">
        <Sidebar
          groups={groups}
          selected={selectedGroup}
          open={sidebarOpen}
          onSelect={handleGroupSelect}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="main-content">
          {activeChannel && (
            <Player
              channel={activeChannel}
              onClose={() => setActiveChannel(null)}
            />
          )}

          <ChannelGrid
            channels={channels}
            loading={loading}
            total={showFavs ? favorites.length : total}
            page={page}
            pages={pages}
            selectedGroup={selectedGroup}
            searchQuery={searchQuery}
            viewMode={viewMode}
            favorites={favorites}
            onChannelClick={setActiveChannel}
            onPageChange={handlePageChange}
            onViewModeChange={setViewMode}
            onToggleFavorite={toggleFavorite}
          />
        </main>
      </div>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <BottomNav
        onHome={() => handleGroupSelect('All')}
        onSearch={() => {
          document.getElementById('search-input')?.focus();
        }}
        onCategories={() => setSidebarOpen(v => !v)}
        onFavorites={handleShowFavs}
        showFavs={showFavs}
      />
    </div>
  );
}
