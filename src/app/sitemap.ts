// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const RAW_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://10topawards.com";
const SITE_URL = RAW_SITE.replace(/\/$/, "").replace(/^http:\/\//, "https://");

const RAW_API = process.env.NEXT_PUBLIC_API_URL ?? `${SITE_URL}/api`;
const API_URL  = RAW_API.replace(/\/$/, "");

const CHANGEFREQ = {
  root: "daily",
  lists: "daily",
  detail: "weekly",
} as const;

const safeDate = (v?: string | number | Date) => {
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

async function safeFetchJson<T>(url: string, { nextRevalidateSec = 3600 } = {}): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000); // 8s timeout
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: nextRevalidateSec } });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  const now = new Date();

  // --- หน้า root & ลิสต์หลัก ---
  urls.push(
    { url: `${SITE_URL}/`,         changeFrequency: CHANGEFREQ.root,  priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/category`, changeFrequency: CHANGEFREQ.lists, priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/store`,    changeFrequency: CHANGEFREQ.lists, priority: 0.8, lastModified: now },
    // Static สำคัญ
    { url: `${SITE_URL}/login`,    changeFrequency: CHANGEFREQ.lists, priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/register`, changeFrequency: CHANGEFREQ.lists, priority: 0.6, lastModified: now },
  );

  // --- หมวดหมู่ ---
  type Category = { id?: string; updated_at?: string; created_at?: string };
  const catJson = await safeFetchJson<{ categories?: Category[] } | Category[]>(
    `${API_URL}/categories`,
    { nextRevalidateSec: 3600 },
  );
  const categories: Category[] = Array.isArray(catJson) ? catJson : (catJson?.categories ?? []);

  for (const c of categories) {
    if (!c?.id) continue;
    urls.push({
      url: `${SITE_URL}/category/${encodeURIComponent(c.id)}`,
      changeFrequency: CHANGEFREQ.detail,
      priority: 0.7,
      lastModified: safeDate(c.updated_at || c.created_at),
    });
  }

  // --- ร้านค้า (เฉพาะ active) ---
  type Store = { id?: string; is_active?: boolean; updated_at?: string; created_at?: string };
  const storeJson = await safeFetchJson<{ stores?: Store[] } | Store[]>(
    `${API_URL}/stores`,
    { nextRevalidateSec: 3600 },
  );
  const stores: Store[] = Array.isArray(storeJson) ? storeJson : (storeJson?.stores ?? []);

  const seen = new Set<string>();
  for (const s of stores) {
    if (!s?.id || s.is_active === false) continue;
    if (seen.has(s.id)) continue;
    seen.add(s.id);

    urls.push({
      url: `${SITE_URL}/store/${encodeURIComponent(s.id)}`,
      changeFrequency: CHANGEFREQ.detail,
      priority: 0.6,
      lastModified: safeDate(s.updated_at || s.created_at),
    });
  }

  return urls;
}