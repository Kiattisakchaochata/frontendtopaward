// src/seo/fetchers.ts
import 'server-only';

/** -------- Base URL helpers -------- */
function getApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8877';
  const base = raw.replace(/\/$/, '');
  return /\/api$/.test(base) ? base : `${base}/api`;
}
const API_BASE = getApiBase();

/** public/admin roots */
const SEO_PUBLIC = `${API_BASE}/public/seo`;
const SEO_ADMIN  = `${API_BASE}/admin/seo`;

/** ใช้ได้เฉพาะฝั่ง server เพราะไฟล์นี้ import 'server-only' */
const ADMIN_TOKEN = process.env.SEO_ADMIN_TOKEN || '';

/** ---- utils ---- */
export function normalizePath(p?: string) {
  if (!p) return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s;
}

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(id) };
}

type FetchOpts = {
  timeoutMs?: number;
  headers?: Record<string,string>;
};

/** fetch JSON แบบปลอดภัย */
async function fetchJSON<T=any>(url: string, opts: FetchOpts = {}): Promise<{ok:boolean; status:number; data:T|null}> {
  const t = withTimeout(opts.timeoutMs ?? 2000);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      // @ts-ignore
      next: { revalidate: 0 },
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
      signal: t.signal,
    });
    if (!res.ok) {
      // อ่าน body ไว้ debug เวลา dev
      if (process.env.NODE_ENV !== 'production') {
        const body = await res.text().catch(()=>'');
        console.warn('[SEO] fetch fail', res.status, res.statusText, url, body?.slice(0,300));
      }
      return { ok:false, status: res.status, data: null };
    }
    const json = (await res.json()) as T;
    return { ok:true, status: res.status, data: json };
  } catch (e:any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SEO] fetch error', url, String(e));
    }
    return { ok:false, status: 0, data: null };
  } finally {
    t.clear();
  }
}

/** คืน object จากรูปแบบ `{site}`/`{page}` หรือ object ตรง ๆ */
function unwrap<T=any>(j:any, key:string): T|{} {
  if (!j) return {};
  if (j && typeof j === 'object' && key in j) return j[key] as T;
  return j as T;
}

/** ---------- Public-first, Admin-fallback ---------- */
async function getWithFallback<T=any>(publicUrl: string, adminUrl: string, unwrapKey: 'site'|'page'): Promise<T|{}> {
  // 1) ยิง public ก่อน
  const pub = await fetchJSON<any>(publicUrl);
  if (pub.ok && pub.data) return unwrap<T>(pub.data, unwrapKey);

  // 2) ถ้า public พัง และมี token → ยิง admin พร้อม Authorization
  if (ADMIN_TOKEN) {
    const adm = await fetchJSON<any>(adminUrl, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    });
    if (adm.ok && adm.data) return unwrap<T>(adm.data, unwrapKey);
  }

  // 3) ทั้งสองพัง → คืน {}
  return {};
}

/** ---------- APIs ที่ export ให้เพจใช้ ---------- */
export async function fetchSiteSeo() {
  return getWithFallback(
    `${SEO_PUBLIC}/site`,
    `${SEO_ADMIN}/site`,
    'site'
  );
}

export async function fetchPageSeoByPath(path: string) {
  const p = normalizePath(path);
  const q = encodeURIComponent(p);
  return getWithFallback(
    `${SEO_PUBLIC}/page?path=${q}`,
    `${SEO_ADMIN}/page?path=${q}`,
    'page'
  );
}

export async function buildSeoForPath(path: string) {
  const p = normalizePath(path);
  const [site, page] = await Promise.all([
    fetchSiteSeo(),
    fetchPageSeoByPath(p),
  ]);
  return { site: site ?? {}, page: page ?? {} };
}