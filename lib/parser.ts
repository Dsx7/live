import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Remote M3U parser — truly automatic daily refresh.
 *
 * How it works:
 *  1. On first import (server startup), tries to load from disk cache.
 *  2. If disk cache is missing/stale, fetches the playlist from GitHub.
 *  3. A background setInterval fires every 24 hours to re-fetch.
 *  4. getChannels() always returns from the in-memory cache instantly if available.
 *  5. File-based cache in /tmp ensures persistence across serverless cold starts.
 *
 * Source: https://github.com/sm-monirulislam/SM-Live-TV
 */

const PLAYLIST_URL =
  'https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/refs/heads/main/Combined_Live_TV.m3u';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = path.join(os.tmpdir(), 'streamvault_cache.json');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Channel {
  id: number;
  name: string;
  logo: string;
  group: string;
  tvgId: string;
  url: string;
  type: 'hls' | 'dash' | 'other';
  hasDrm: boolean;
}

export interface GroupInfo {
  name: string;
  count: number;
  emoji: string;
}

interface Cache {
  channels: Channel[];
  groups: GroupInfo[];
  fetchedAt: number;       // epoch ms
  lastUpdated: string;     // ISO string shown in UI
  nextRefresh: string;     // ISO string — when next auto-refresh fires
}

// ─── Module state ─────────────────────────────────────────────────────────────

let _cache: Cache | null = null;
let _fetchingPromise: Promise<void> | null = null;
let _timer: ReturnType<typeof setInterval> | null = null;

// ─── Disk Cache ───────────────────────────────────────────────────────────────

function saveCacheToFile(cache: Cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf-8');
  } catch (err) {
    console.error('[StreamVault] ❌ Failed to save cache to file:', err);
  }
}

function loadCacheFromFile(): Cache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const cache = JSON.parse(data);
      console.log(`[StreamVault] 💾 Loaded ${cache.channels.length} channels from disk cache.`);
      return cache;
    }
  } catch (err) {
    console.error('[StreamVault] ❌ Failed to load cache from file:', err);
  }
  return null;
}

// Try to load immediately on module load
_cache = loadCacheFromFile();

// ─── Emoji map ────────────────────────────────────────────────────────────────

const GROUP_EMOJI: Record<string, string> = {
  'SM All TV':  '📺',
  'BDIX_ISP':   '🌐',
  'AynaOTT':    '🎬',
  'RoarZone':   '⚡',
  'Toffee':     '☕',
  'All Cartoon':'🧸',
  'Tapmad':     '🇵🇰',
};
function emojiFor(group: string): string {
  return GROUP_EMOJI[group] ?? '📡';
}

// ─── M3U Parser ───────────────────────────────────────────────────────────────

function parseM3UContent(content: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF')) {
      const channel: Channel = {
        id: channels.length,
        name: '',
        logo: '',
        group: 'SM All TV',
        tvgId: '',
        url: '',
        type: 'hls',
        hasDrm: false,
      };

      const idMatch    = line.match(/tvg-id="([^"]*)"/);
      if (idMatch)    channel.tvgId = idMatch[1];

      const logoMatch  = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch)  channel.logo  = logoMatch[1];

      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch && groupMatch[1]) channel.group = groupMatch[1].trim();

      const nameMatch  = line.match(/,(.+)$/);
      if (nameMatch)  channel.name  = nameMatch[1].trim();

      // Look ahead for URL
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].trim();
        if (!next || next.startsWith('#')) { j++; continue; }
        if (next.startsWith('http') || next.startsWith('rtmp')) {
          channel.url = next.split('|')[0].trim();
          if      (channel.url.includes('.mpd'))                   channel.type = 'dash';
          else if (/\.(m3u8?|ts|mp3|mp4|aac)/.test(channel.url)) channel.type = 'hls';
          else                                                      channel.type = 'other';
          i = j;
        }
        break;
      }

      if (channel.url && channel.name) channels.push(channel);
    }
    i++;
  }

  return channels;
}

function buildGroups(channels: Channel[]): GroupInfo[] {
  const map = new Map<string, number>();
  for (const ch of channels) map.set(ch.group, (map.get(ch.group) ?? 0) + 1);
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, emoji: emojiFor(name) }))
    .sort((a, b) => b.count - a.count);
}

// ─── Core fetch (runs in background) ─────────────────────────────────────────

async function fetchAndCache(): Promise<void> {
  // If already fetching, return the existing promise
  if (_fetchingPromise) return _fetchingPromise;

  _fetchingPromise = (async () => {
    const label = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
    console.log(`[StreamVault] 🔄 Fetching playlist… (${label} BD time)`);

    try {
      const res = await fetch(PLAYLIST_URL, {
        headers: { 'User-Agent': 'StreamVault/1.0' },
        cache: 'no-store',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const text      = await res.text();
      const channels  = parseM3UContent(text);
      const groups    = buildGroups(channels);
      const now       = Date.now();

      const newCache = {
        channels,
        groups,
        fetchedAt:   now,
        lastUpdated: new Date(now).toISOString(),
        nextRefresh: new Date(now + REFRESH_INTERVAL_MS).toISOString(),
      };

      _cache = newCache;
      saveCacheToFile(newCache);

      console.log(
        `[StreamVault] ✅ Loaded ${channels.length} channels in ${groups.length} groups.` +
        ` Next auto-refresh: ${new Date(now + REFRESH_INTERVAL_MS).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} BD time`
      );
    } catch (err) {
      console.error('[StreamVault] ❌ Fetch failed:', err);
      if (_cache) {
        console.warn('[StreamVault] ⚠️  Keeping previous cache as fallback');
      }
    } finally {
      _fetchingPromise = null;
    }
  })();

  return _fetchingPromise;
}

// ─── Background scheduler ─────────────────────────────────────────────────────
// Only start the timer once (guard against Next.js hot-reload double-init)

function startBackgroundScheduler(): void {
  if (_timer) return; // already running

  // 1️⃣  Fetch immediately on startup if cache is missing
  if (!_cache) {
    fetchAndCache();
  }

  // 2️⃣  Then repeat every 24 hours — truly automatic, no user request needed
  _timer = setInterval(() => {
    fetchAndCache();
  }, REFRESH_INTERVAL_MS);

  // Allow Node.js to exit even if the interval is still pending
  if (typeof _timer === 'object' && _timer !== null && 'unref' in _timer) {
    (_timer as NodeJS.Timeout).unref();
  }

  console.log(
    `[StreamVault] ⏰ Auto-refresh scheduled every 24 h` +
    ` (next: ${new Date(Date.now() + REFRESH_INTERVAL_MS).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })} BD)`
  );
}

// Start immediately when this module is first imported by Next.js server
startBackgroundScheduler();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns cached channels immediately.
 * If cache is still empty (very first request before startup fetch completes),
 * awaits the ongoing fetch before returning.
 */
export async function getChannels(): Promise<{
  channels: Channel[];
  groups: GroupInfo[];
  lastUpdated: string;
}> {
  // Wait for the initial fetch if cache isn't ready yet (neither in memory nor on disk)
  if (!_cache) {
    console.log('[StreamVault] Cache cold — waiting for initial fetch…');
    await fetchAndCache();
  }

  // At this point _cache is set if fetch succeeded, or was loaded from disk
  if (!_cache) throw new Error('Playlist unavailable — fetch failed on startup');

  return {
    channels:    _cache.channels,
    groups:      _cache.groups,
    lastUpdated: _cache.lastUpdated,
  };
}

/**
 * Force an immediate re-fetch right now (called by POST /api/refresh).
 */
export async function forceRefresh(): Promise<void> {
  await fetchAndCache();
}

/**
 * Returns cache & scheduler status (for GET /api/refresh).
 */
export function getCacheStatus() {
  if (!_cache) {
    return {
      cached: false,
      message: 'Initial fetch in progress…',
      autoRefreshIntervalHours: 24,
    };
  }
  return {
    cached: true,
    channels: _cache.channels.length,
    lastUpdated: _cache.lastUpdated,
    nextAutoRefresh: _cache.nextRefresh,
    autoRefreshIntervalHours: 24,
    fetchedAt: new Date(_cache.fetchedAt).toISOString(),
  };
}
