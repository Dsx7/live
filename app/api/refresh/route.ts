import { NextResponse } from 'next/server';
import { forceRefresh, getChannels, getCacheStatus } from '@/lib/parser';

// POST /api/refresh  — force re-fetch from GitHub right now
export async function POST() {
  await forceRefresh();
  const { channels, groups, lastUpdated } = await getChannels();
  return NextResponse.json({
    success: true,
    message: 'Playlist refreshed from GitHub',
    channels: channels.length,
    groups: groups.length,
    lastUpdated,
  });
}

// GET /api/refresh  — return cache status
export async function GET() {
  return NextResponse.json(getCacheStatus());
}
