'use client';

import { useEffect, useState } from 'react';

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

export default function SeoInjector({ path }: { path: string }) {
  const [jsonld, setJsonld] = useState<any>(null);

  useEffect(() => {
    const p = normPath(path);
    (async () => {
      try {
        // ✅ ใช้ public endpoint
        const res = await fetch(`${API_BASE}/public/seo/page?path=${encodeURIComponent(p)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const page = data?.page ?? data; // รองรับทั้ง {page:{...}} หรือ object ตรง ๆ
        if (page?.jsonld) setJsonld(page.jsonld);
      } catch (err) {
        console.error('SEO load fail', err);
      }
    })();
  }, [path]);

  if (!jsonld) return null;

  // ป้องกัน </script> โดยแทน '<' ด้วย \u003c
  const safe = JSON.stringify(jsonld).replace(/</g, '\\u003c');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safe }} />;
}