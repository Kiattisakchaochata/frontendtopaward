// src/lib/swrFetcher.ts
'use client';

export const apiBase =
  (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8899/api')
    .replace(/\/$/, '');

/* ---------- Helpers ---------- */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { Accept: 'application/json', ...(extra || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function withTimeout(ms = 10000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

/* ---------- SWR fetcher ---------- */
export async function swrFetcher(input: string, init?: RequestInit) {
  const url = input.startsWith('http')
    ? input
    : `${apiBase}${input.startsWith('/') ? input : `/${input}`}`;

  const headers = buildHeaders(init?.headers);
  const t = withTimeout();

  const res = await fetch(url, {
    cache: 'no-store',
    credentials: 'include',
    ...init,
    headers,
    signal: t.signal,
  });

  t.clear();

  if (!res.ok) {
    if (res.status === 401) { try { localStorage.removeItem('token'); } catch {} }
    const text = await res.text().catch(() => '');
    throw new Error(`Fetch error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

export const fetcher = swrFetcher;

/* ---------- Helper สำหรับ POST/PATCH/PUT/DELETE ---------- */
export async function apiRequest(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: any
) {
  const url = path.startsWith('http')
    ? path
    : `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = buildHeaders({ 'Content-Type': 'application/json' });
  const t = withTimeout();

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    signal: t.signal,
  });

  t.clear();

  if (!res.ok) {
    if (res.status === 401) { try { localStorage.removeItem('token'); } catch {} }
    const text = await res.text().catch(() => '');
    throw new Error(`Request error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}