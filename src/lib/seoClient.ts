// src/lib/seoClient.ts
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

type SeoSite = { title?: string; description?: string; ogImage?: string; /* ... */ };
type SeoPage = { title?: string; description?: string; ogImage?: string; noindex?: boolean; /* ... */ };

export async function fetchSeoSite(): Promise<SeoSite | null> {
  try {
    const r = await fetch(`${API_BASE}/api/public/seo/site`, { cache: 'force-cache', next: { revalidate: 60 }});
    if (!r.ok) return null;
    const j = await r.json();
    return j?.site ?? null;
  } catch { return null; }
}

export async function fetchSeoPage(path: string): Promise<SeoPage | null> {
  try {
    const url = new URL(`${API_BASE}/api/public/seo/page`);
    url.searchParams.set('path', path);
    const r = await fetch(url.toString(), { cache: 'force-cache', next: { revalidate: 60 }});
    if (!r.ok) return null;
    const j = await r.json();
    return j?.page ?? null;
  } catch { return null; }
}