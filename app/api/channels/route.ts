import { NextRequest, NextResponse } from 'next/server';
import { getChannels } from '@/lib/parser';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get('group') || 'All';
  const q     = searchParams.get('q')     || '';
  const page  = parseInt(searchParams.get('page')  || '1');
  const limit = parseInt(searchParams.get('limit') || '48');

  const { channels: all, groups, lastUpdated } = await getChannels();

  let channels = all;

  if (group && group !== 'All') {
    channels = channels.filter(c => c.group === group);
  }

  if (q) {
    const query = q.toLowerCase();
    channels = channels.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.group.toLowerCase().includes(query)
    );
  }

  const total     = channels.length;
  const start     = (page - 1) * limit;
  const paginated = channels.slice(start, start + limit);

  return NextResponse.json({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    channels: paginated,
    groups,
    lastUpdated,
  });
}
