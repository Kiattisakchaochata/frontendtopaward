// src/app/category/[id]/page.tsx
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import Script from "next/script";

type Params = { params: Promise<{ id: string }> };

type Category = { id: string; name: string; cover_image?: string | null };

type ImageObj = { id?: string; image_url: string; alt_text?: string | null };
type Review = { rating: number };
type Store = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  images?: ImageObj[];
  category_id?: string | number;
  category?: { id?: string | number };
  categoryId?: string | number;
  order_number?: number | null;
  is_active?: boolean;
  reviews?: Review[];
  created_at?: string;
  expired_at?: string | null;
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 300;

/* ------------ helpers ------------- */
const firstImage = (s: Store) =>
  s.cover_image ||
  s.images?.[0]?.image_url ||
  "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop";

const fmtTH = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("th-TH") : "-");

function belongsToCategory(s: Store, id: string): boolean {
  const want = String(id);
  const a = s.category_id != null ? String(s.category_id) : "";
  const b = s.category?.id != null ? String(s.category?.id) : "";
  const c = s.categoryId != null ? String(s.categoryId) : "";
  return a === want || b === want || c === want;
}

function isActivePublic(s: Store): boolean {
  const activeFlag = s?.is_active !== false;
  const notExpired = !s?.expired_at || new Date(s.expired_at).getTime() > Date.now();
  return activeFlag && notExpired;
}

async function getCategory(id: string): Promise<Category | null> {
  try {
    const res = await fetch(`${API_URL}/categories/${id}`, { next: { revalidate } });
    if (res.ok) {
      const data = await res.json();
      return (data?.category || data) as Category;
    }
  } catch {}
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate } });
    if (!res.ok) return null;
    const data = await res.json();
    const list: Category[] = Array.isArray(data) ? data : data?.categories || [];
    return list.find((c) => String(c.id) === String(id)) || null;
  } catch {
    return null;
  }
}

/** ดึงร้านในหมวด (ลองหลาย endpoint) + ผูก cache tags */
async function getStoresOfCategory(id: string): Promise<Store[]> {
  const tags = { next: { tags: ["stores", `category:${id}`] as string[] } };

  try {
    const res = await fetch(`${API_URL}/stores?categoryId=${encodeURIComponent(id)}`, tags);
    if (res.ok) {
      const data = await res.json();
      const list: Store[] = data?.stores || data || [];
      return list.filter(isActivePublic).filter((s) => belongsToCategory(s, id));
    }
  } catch {}

  try {
    const res = await fetch(`${API_URL}/stores?category_id=${encodeURIComponent(id)}`, tags);
    if (res.ok) {
      const data = await res.json();
      const list: Store[] = data?.stores || data || [];
      return list.filter(isActivePublic).filter((s) => belongsToCategory(s, id));
    }
  } catch {}

  try {
    const res = await fetch(`${API_URL}/stores`, tags);
    if (!res.ok) return [];
    const data = await res.json();
    const list: Store[] = data?.stores || data || [];
    return list.filter(isActivePublic).filter((s) => belongsToCategory(s, id));
  } catch {
    return [];
  }
}

/* ------------ SEO ------------- */
export async function generateMetadata(
  { params }: Params,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const cat = await getCategory(id);

  if (!cat) {
    return {
      title: "ไม่พบหมวดหมู่ | TopAward",
      description: "ไม่พบหมวดหมู่ที่ร้องขอ",
      robots: { index: false, follow: false },
    };
  }

  const title = `${cat.name} | TopAward`;
  const description = `สำรวจร้าน/คลินิก/ที่เที่ยวในหมวดหมู่ ${cat.name} บน TopAward`;
  const url = `${SITE_URL}/category/${cat.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: cat.cover_image ? [{ url: cat.cover_image }] : undefined,
    },
  };
}

/* ------------ Page ------------- */
export default async function CategoryDetailPage({ params }: Params) {
  const { id } = await params;
  const cat = await getCategory(id);

  if (!cat) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="mb-4 text-2xl font-bold">ไม่พบหมวดหมู่</h1>
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 px-4 py-2 text-[#FFD700] hover:bg-[#FFD700]/10 transition">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // ดึงร้านและเรียง
  const stores = (await getStoresOfCategory(id)).sort((a, b) => {
    const ao = a.order_number ?? 999999;
    const bo = b.order_number ?? 999999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "th");
  });

  // JSON-LD
  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "หมวดหมู่", item: `${SITE_URL}/category` },
      { "@type": "ListItem", position: 3, name: cat.name, item: `${SITE_URL}/category/${cat.id}` },
    ],
  };

  const ldCollection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `หมวดหมู่: ${cat.name} - TopAward`,
    url: `${SITE_URL}/category/${cat.id}`,
    hasPart: {
      "@type": "ItemList",
      itemListElement: stores.map((s, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "LocalBusiness",
          name: s.name,
          url: `${SITE_URL}/store/${s.id}`,
          image: firstImage(s),
          description: s.description || undefined,
        },
      })),
    },
  };

  return (
    <>
      <Script id="ld-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }} />
      <Script id="ld-category-collection" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldCollection) }} />

      <div className="min-h-screen bg-[#0F172A] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          {/* breadcrumb */}
          <nav aria-label="breadcrumb" className="mb-5 text-sm">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10 backdrop-blur">
              <Link href="/" className="text-white/80 hover:text-[#FFD700] transition">หน้าหลัก</Link>
              <span className="text-white/40">/</span>
              <Link href="/category" className="text-white/80 hover:text-[#FFD700] transition">หมวดหมู่</Link>
              <span className="text-white/40">/</span>
              <span className="text-[#FFD700]">{cat.name}</span>
            </div>
          </nav>

          {/* header */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-white to-[#FFD700] bg-clip-text text-transparent">
                {cat.name}
              </span>
            </h1>
            <Link
              href="/category"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#D4AF37]/40 px-4 text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/10 transition"
            >
              ดูหมวดอื่น ๆ
            </Link>
          </div>

          {stores.length === 0 ? (
            <div className="rounded-xl bg:white/5 p-6 text-white/80 ring-1 ring-white/10 bg-white/5">
              ยังไม่มีร้านในหมวดนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {stores.map((store) => {
                const ratings = store.reviews?.map((r) => r.rating).filter((n) => typeof n === "number") || [];
                const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

                return (
                  <Link
                    key={store.id}
                    href={`/store/${encodeURIComponent(String(store.id))}`}
                    prefetch={false}
                    className="
                      group overflow-hidden rounded-2xl bg-white/5
                      ring-1 ring-white/10 hover:ring-[#D4AF37]/40
                      shadow-[0_10px_30px_rgba(0,0,0,.35)]
                      transition hover:-translate-y-0.5
                    "
                  >
                    <div className="relative aspect-[4/5] w-full overflow-hidden">
                      <img
                        src={firstImage(store)}
                        alt={store.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      {avg && (
                        <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-[#FFD700] ring-1 ring-white/10 backdrop-blur">
                          ★ {avg}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-base font-bold text-white">{store.name}</h3>
                      {store.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-white/70">{store.description}</p>
                      ) : null}
                      <p className="mt-3 text-xs text-white/50">อัปเดต: {fmtTH(store.created_at)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}