// src/lib/api.ts

// 🔧 คำนวณ BASE จากได้ทั้ง NEXT_PUBLIC_API_BASE และ NEXT_PUBLIC_API_URL
function computeBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:8877';

  let base = raw.replace(/\/$/, '');
  if (!/\/api$/.test(base)) base += '/api';
  return base;
}

export const API_BASE = computeBase();

function getToken(): string | null {
  if (typeof window === 'undefined') return null; // SSR จะได้ไม่พัง
  return localStorage.getItem('sg_token');
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const m = (data as { error?: unknown }).error;
    if (typeof m === 'string' && m.trim()) return m;
  }
  return fallback;
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalizeErrorText(raw: string): string {
  const s = stripHtml(raw);
  if (/unique constraint failed/i.test(s) && /(stores_slug_key|slug)/i.test(s)) {
    return 'Slug นี้ถูกใช้แล้ว โปรดเปลี่ยนเป็นค่าอื่น';
  }
  return s;
}

export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers = new Headers(opts.headers || {});
  const token = getToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  let body = opts.body as any;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isFormData && typeof body === 'object' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  // ✅ รองรับ absolute URL และไม่ต้องใส่ /api ตอนเรียก
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${API_BASE}/${String(path).replace(/^\/+/, '')}`;

  const res = await fetch(url, { ...opts, body, headers, credentials: 'include' });

  // 204/205 : ไม่มีเนื้อหา → คืน object เปล่า
  if (res.status === 204 || res.status === 205) {
    return {} as T;
  }

  if (res.ok) {
    const text = await res.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // กรณีตอบ text/plain
      return text as unknown as T;
    }
  }

  // error case
  let msg = `API ${res.status}`;
  try {
    const raw = await res.text();
    if (raw) {
      try {
        msg = getErrorMessage(JSON.parse(raw), msg);
      } catch {
        msg = normalizeErrorText(raw) || msg;
      }
    }
  } catch {}

  const err: any = new Error(msg);
  err.status = res.status;
  throw err;
}