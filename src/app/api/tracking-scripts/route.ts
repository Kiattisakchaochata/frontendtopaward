// src/app/api/tracking-scripts/route.ts
import { NextResponse } from 'next/server';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');

  const url = `${API_BASE}/api/tracking-scripts${storeId ? `?storeId=${encodeURIComponent(storeId)}` : ''}`;

  try {
    const res = await fetch(url, { cache: 'no-store', next: { revalidate: 0 } });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.statusText}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch tracking' }, { status: 502 });
  }
}