import { NextRequest, NextResponse } from 'next/server';
import { parseM3U } from '@/lib/parser';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channels = parseM3U();
  const channel = channels.find(c => c.id === parseInt(id));
  if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(channel);
}
