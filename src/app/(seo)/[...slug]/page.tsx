// src/app/(seo)/[...slug]/page.tsx
import { notFound } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { fetchSiteSeo, fetchPageSeoByPath } from '@/seo/fetchers';
import SeoJsonLdFromApi from '@/components/SeoJsonLdFromApi'; // ✅ แนะนำให้ใช้

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** ---------- helpers ---------- */
function toAbsolute(u: string) {
  try { return new URL(u, SITE_URL + '/').toString(); } catch { return SITE_URL; }
}
function toKeywordArray(kw?: string | null): string[] | undefined {
  if (!kw || !kw.trim()) return undefined;
  return kw.split(',').map(s => s.trim()).filter(Boolean);
}

/** ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;        // ✅ await params
  const path = '/' + slug.join('/');

  const [site, page] = await Promise.all([
    fetchSiteSeo(),
    fetchPageSeoByPath(path),
  ]);

  // ถ้าไม่มีเพจ → metadata ว่าง ให้ตัวเพจไป notFound() เองในตัว render
  if (!page || Object.keys(page).length === 0) return {};

  const title = page.title || site?.meta_title || 'Topaward';
  const description = page.description || site?.meta_description || '';

  const ogImages: string[] = Array.from(new Set([
    ...(Array.isArray(page?.og_images) ? page.og_images : []),
    ...(page?.og_image ? [page.og_image] : []),
    ...(site?.og_image ? [site.og_image] : []),
  ].filter(Boolean) as string[])).slice(0, 4);  // ✅ จำกัดไม่เกิน 4

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: toAbsolute(path),
      type: 'website',
      images: ogImages.map((url) => ({ url: toAbsolute(url) })),
      siteName: 'Topaward',
    },
    robots: page.noindex ? { index: false, follow: false } : undefined,
    keywords: toKeywordArray(site?.keywords),
  };
}

/** ---------- Page ---------- */
export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;        // ✅ await params
  const path = '/' + slug.join('/');

  const [site, page] = await Promise.all([
    fetchSiteSeo(),
    fetchPageSeoByPath(path),
  ]);

  // ถ้าไม่มีเพจ → 404
  if (!page || Object.keys(page).length === 0) return notFound();

  const title = page.title || site?.meta_title || 'Topaward';

  return (
    <>
      <Navbar />

      {/* ✅ ฉีด JSON-LD จากหลังบ้านแบบ SSR */}
      {/* @ts-expect-error Server Component */}
      <SeoJsonLdFromApi path={path} />

      <main className="container mx-auto max-w-5xl px-4 md:px-6 py-10 text-white">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        {page.description && <p className="opacity-80">{page.description}</p>}
        {/* TODO: แสดงเนื้อหาอื่น ๆ ตามที่ page.jsonld หรือตามดีไซน์ต้องการ */}
      </main>

      <Footer />
    </>
  );
}