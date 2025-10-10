import 'server-only';

function getApiBase() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8877';
  const trimmed = raw.replace(/\/$/, '');
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
}
const API_BASE = getApiBase();

export function normPath(p?: string) {
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

// ✅ ใช้ revalidate (แคชได้) + timeout กันค้าง
async function safeFetchJSON<T = any>(url: string, timeoutMs = 1500): Promise<Partial<T>> {
  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, {
      // ❌ cache: 'no-store',
      next: { revalidate: 300 }, // ✅ แคช 5 นาที (ปรับได้)
      signal: t.signal,
    });
    if (!res.ok) return {};
    return (await res.json()) as T;
  } catch (e) {
    console.error('[SEO] fetch failed:', url, String(e));
    return {};
  } finally {
    t.clear();
  }
}

export async function fetchSiteSeo() {
  // ✅ เปลี่ยนเป็น public route
  return safeFetchJSON(`${API_BASE}/seo/site`);
}

export async function fetchPageSeo(path: string) {
  const p = normPath(path);
  // ✅ เปลี่ยนเป็น public route
  return safeFetchJSON(`${API_BASE}/seo/page?path=${encodeURIComponent(p)}`);
}

function collectImages(page: any, site: any): string[] {
  const a = Array.isArray(page?.jsonld?.image) ? page.jsonld.image : [];
  const b = Array.isArray(site?.jsonld?.image) ? site.jsonld.image : [];
  const c = Array.isArray(page?.og_images) ? page.og_images : [];
  const d = Array.isArray(site?.og_images) ? site.og_images : [];
  const e = page?.og_image ? [page.og_image] : [];
  const f = site?.og_image ? [site.og_image] : [];
  const all = [...a, ...b, ...c, ...d, ...e, ...f].filter(Boolean) as string[];
  return Array.from(new Set(all)).slice(0, 4);
}

function mergeJsonLd(site: any, page: any, images: string[]) {
  const siteObj = site?.jsonld && typeof site.jsonld === 'object' ? site.jsonld : undefined;
  const pageObj = page?.jsonld && typeof page.jsonld === 'object' ? page.jsonld : undefined;

  if (pageObj && Array.isArray((pageObj as any)['@graph'])) {
    const out: any = { '@context': 'https://schema.org', '@graph': (pageObj as any)['@graph'] };
    if (images.length) {
      out['@graph'] = out['@graph'].map((n: any) => {
        const node = { ...n };
        if (
          node &&
          (node['@type'] === 'WebPage' ||
            node['@type'] === 'Article' ||
            node['@type'] === 'Product' ||
            node['@type'] === 'Organization')
        ) {
          node.image = node.image ?? images;
        }
        return node;
      });
    }
    return out;
  }

  const out = { ...(siteObj || {}), ...(pageObj || {}) } as Record<string, any>;
  if (images.length) out.image = images;
  return out;
}

export async function buildSeoForPath(pathname: string) {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'Topaward';
  const p = normPath(pathname);
  const [site, page] = await Promise.all([fetchSiteSeo(), fetchPageSeo(p)]);

  const title = (page?.title || site?.meta_title || brand) as string;
  const description = (page?.description || site?.meta_description || '') as string;
  const images = collectImages(page, site);
  const keywords = (site?.keywords ?? '') as string;
  const robots = page?.noindex ? ({ index: false, follow: false } as const) : undefined;
  const jsonld = mergeJsonLd(site, page, images);

  return { title, description, keywords, robots, images, jsonld };
}