import fs from 'fs';
import path from 'path';

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

let _channels: Channel[] | null = null;

export function parseM3U(): Channel[] {
  if (_channels) return _channels;

  const filePath = path.join(process.cwd(), '..', 'dataaa.txt');
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    console.error('Could not read dataaa.txt - trying local path');
    try {
      content = fs.readFileSync(path.join(process.cwd(), 'dataaa.txt'), 'utf8');
    } catch {
      return [];
    }
  }

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
        group: 'General',
        tvgId: '',
        url: '',
        type: 'hls',
        hasDrm: false,
      };

      const idMatch = line.match(/tvg-id="([^"]*)"/);
      if (idMatch) channel.tvgId = idMatch[1];

      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) channel.logo = logoMatch[1];

      const groupMatch = line.match(/group-title="([^"]*)"/);
      if (groupMatch && groupMatch[1]) channel.group = groupMatch[1];

      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) channel.name = nameMatch[1].trim();

      // Look ahead for URL
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j].trim();
        if (next.startsWith('#KODIPROP')) {
          if (next.includes('license_key')) channel.hasDrm = true;
          j++;
        } else if (next.startsWith('#EXT') || next.startsWith('#name') || next.startsWith('#owner') || next.startsWith('#last') || next.startsWith('#DATE') || next.startsWith('#telegram') || next.startsWith('# ')) {
          j++;
        } else if (next.startsWith('http')) {
          channel.url = next.split('|')[0].trim();
          if (channel.url.includes('.mpd')) channel.type = 'dash';
          else if (channel.url.includes('.m3u8')) channel.type = 'hls';
          else channel.type = 'other';
          i = j;
          break;
        } else {
          break;
        }
      }

      if (channel.url && channel.name) {
        channels.push(channel);
      }
    }
    i++;
  }

  _channels = channels;
  return channels;
}

export function getGroups(): { name: string; count: number; emoji: string }[] {
  const channels = parseM3U();
  const map = new Map<string, number>();
  for (const ch of channels) {
    map.set(ch.group, (map.get(ch.group) ?? 0) + 1);
  }

  const emojiMap: Record<string, string> = {
    '@opensourceflix': '🎬',
    'OSFlix EVENTS': '🏆',
    'FC BD': '🏏',
    'FC IN': '🏏',
    'FIT😁': '📡',
    'CRICHD': '🏏',
    'BYNA FREE': '📺',
    'SUN NXT': '🌞',
    'TapMad Live': '📲',
    'BingLive': '🎯',
    'myCo LIVE': '🔴',
    'DistroTV': '🌍',
    'AKKAS GO': '⚡',
    'ROAR ISP': '🦁',
    'SHOQ PK': '🎪',
    'MOVIES': '🎥',
    'EKTV': '📻',
    'JIO TV': '📱',
    'ZEE5 LITE': '🎭',
    'SONY IN': '🎬',
    'CDN by Siam': '🌐',
    'JIO PLUS+ (IND IP)': '📱',
    'Jio+3 (IND IP)': '📱',
    'JIO+4 (IND IP)': '📱',
    'TPlay 1 (IND IP)': '🎮',
    'TPlay 3 (IND IP)': '🎮',
    'ZEE5 IN': '🎭',
    'TAPMAD PK': '🇵🇰',
    'Goldmins TV': '✨',
    'AxesSports': '⚽',
    'ZONG PK': '🇵🇰',
    'ICC+': '🏏',
    'IZZiO PK': '🇵🇰',
    'Movies & Series': '🎬',
  };

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count, emoji: emojiMap[name] ?? '📺' }))
    .sort((a, b) => b.count - a.count);
}
