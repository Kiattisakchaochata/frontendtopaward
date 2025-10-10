import 'server-only';

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8899/api')
    .replace(/\/$/, '');

function normPath(p?: string) {
  if (!p) return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s;
}

export default async function SeoJsonLdFromApi({ path }: { path: string }) {
  const p = normPath(path);
  const res = await fetch(`${API_BASE}/public/seo/page?path=${encodeURIComponent(p)}`, {
    cache: 'no-store',
    // @ts-expect-error next option
    next: { revalidate: 0 },
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const data = await res.json().catch(() => null);
  const jsonld = data?.page?.jsonld ?? data?.jsonld;
  if (!jsonld) return null;

  const safe = JSON.stringify(jsonld).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safe }} />;
}