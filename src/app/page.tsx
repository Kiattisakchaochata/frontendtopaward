//src/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { safeUrl } from "@/lib/safeUrl";
import Navbar from "@/components/Navbar";
import BannerCarousel from "./_components/BannerCarousel";
import VideoStrip from "./_components/VideoStrip";
import VisitPing from "@/components/VisitPing";
/** ---------- THEME (premium) ---------- **/
const THEME = {
  pageBg: "bg-[#0F172A]",
  pageBgFx:
    "radial-[1200px_600px_at_10%_-10%] from-[#D4AF37]/10 to-transparent, " +
    "radial-[1200px_600px_at_90%_0%] from-[#B8860B]/10 to-transparent",
  glass: "bg-white/5 backdrop-blur ring-1 ring-white/10",
  textMain: "text-white",
  textMuted: "text-slate-300",
  accent:
    "bg-gradient-to-r from-[#FFD700] to-[#B8860B] text-transparent bg-clip-text",
  btnGold:
    "bg-gradient-to-r from-[#FFD700] to-[#B8860B] hover:from-[#FFCC33] hover:to-[#FFD700] text-black shadow-md",
  chip: "rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15 transition",
};

// ✅ ความสูง Navbar
const NAV_H = "h-16 md:h-20";

/** ---------- Types ---------- **/
type Category = { id: string; name: string; cover_image?: string | null };
type Store = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  images?: { id: string; image_url: string; alt_text?: string | null }[];
  is_active?: boolean;
  created_at?: string;
  avg_rating?: number;
  _reviewCount?: number;
};
type Banner = {
  id: string;
  image_url: string;
  alt_text?: string | null;
  order?: number | null;
  title?: string | null;
  href?: string | null;
};
type Video = {
  id: string;
  title: string;
  youtube_url: string;
  tiktok_url?: string | null;
  thumbnail_url?: string | null;
};

/** ---------- ENV ---------- **/
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api"
).replace(/\/$/, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";


/** ---------- Metadata (SEO สำหรับหน้า Home) ---------- **/
export async function generateMetadata(): Promise<Metadata> {
  const canonical = SITE_URL;
  return {
    metadataBase: new URL(SITE_URL),
    title: "TopAward | รวมรีวิวยอดนิยม",
    description:
      "รวมรีวิวร้าน/คลินิก/ที่เที่ยว พร้อมรูปภาพและเรตติ้ง จัดหมวดหมู่และค้นหาง่าย",
    alternates: { canonical },
    robots: { index: true, follow: true, maxImagePreview: "large" },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "TopAward",
      title: "TopAward | รวมรีวิวยอดนิยม",
      description:
        "รวมรีวิวร้าน/คลินิก/ที่เที่ยว พร้อมรูปภาพและเรตติ้ง จัดหมวดหมู่และค้นหาง่าย",
      images: [
        {
          url: new URL("/og-image.jpg", SITE_URL).toString(), // ทำให้เป็น absolute
          width: 1200,
          height: 630,
          alt: "TopAward",
        },
      ],
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title: "TopAward | รวมรีวิวยอดนิยม",
      description:
        "รวมรีวิวร้าน/คลินิก/ที่เที่ยว พร้อมรูปภาพและเรตติ้ง จัดหมวดหมู่และค้นหาง่าย",
      images: [new URL("/og-image.jpg", SITE_URL).toString()],
    },
  };
}

/** ---------- Fetch helpers ---------- **/
async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Category[] = Array.isArray(data) ? data : data?.categories || [];
    return list.filter((c) => c?.id);
  } catch {
    return [];
  }
}

async function getStores(): Promise<Store[]> {
  try {
    const res = await fetch(`${API_URL}/stores`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Store[] = data?.stores || data || [];
    return (list || []).filter((s) => s?.id);
  } catch {
    return [];
  }
}

/** ✅ ดึงรีวิวของร้านแล้วคำนวณ avg,count แบบสด */
async function getReviewStats(storeId: string): Promise<{ avg?: number; count: number }> {
  try {
    const r = await fetch(
      `${API_URL}/reviews/stores/${encodeURIComponent(storeId)}/reviews`,
      { cache: "no-store", next: { revalidate: 0 }, headers: { "Cache-Control": "no-store" } }
    );
    const j = await r.json().catch(() => ({}));
    const reviews: Array<{ rating?: number }> =
      (Array.isArray(j?.reviews) && j.reviews) || (Array.isArray(j) && j) || [];
    const nums = reviews.map((x) => Number(x?.rating || 0)).filter((n) => Number.isFinite(n) && n > 0);
    const count = nums.length;
    const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(1)) : undefined;
    return { avg, count };
  } catch {
    return { avg: undefined, count: 0 };
  }
}

// แทนที่ฟังก์ชัน getPopularStores ทั้งก้อนด้วยเวอร์ชัน "เข้มงวด"
async function getPopularStores(limit = 12): Promise<Store[]> {
  const reqLimit = Math.max(limit * 3, limit);

  const tryFetch = async (path: string) => {
    try {
      const r = await fetch(`${API_URL}${path}`, {
        cache: "no-store",
        next: { revalidate: 0 },
        headers: { "Cache-Control": "no-store" },
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

  const seen = new Set<string>();
  const pickList = (raw: any): Store[] =>
    (Array.isArray(raw) ? raw : raw?.stores || []) as Store[];

  let base: Store[] = [];
  for (const path of [
    `/stores/popular?limit=${reqLimit}`,
    `/stores?popular=1&limit=${reqLimit}`,
  ]) {
    const j = await tryFetch(path);
    for (const s of pickList(j)) {
      if (s?.id && !seen.has(s.id)) {
        seen.add(s.id);
        base.push(s);
      }
    }
  }

  if (base.length < limit) {
    const jAll = await tryFetch(`/stores?limit=${limit * 10}`);
    for (const s of pickList(jAll)) {
      if (s?.id && !seen.has(s.id)) {
        seen.add(s.id);
        base.push(s);
      }
    }
  }

  const enriched = await Promise.all(
    base.map(async (s) => {
      const stats = await getReviewStats(s.id);
      const liveAvg = typeof stats.avg === "number" ? stats.avg : Number(s.avg_rating ?? 0);
      return { ...s, avg_rating: liveAvg, _reviewCount: stats.count || 0 } as Store & {
        _reviewCount: number;
      };
    })
  );

  return enriched
    .filter(
      (s) =>
        s.is_active !== false &&
        Number(s.avg_rating ?? 0) >= 4.0 &&
        Number((s as any)._reviewCount ?? 0) > 0
    )
    .sort((a, b) => Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0))
    .slice(0, limit);
}

/** ⬇️ เปลี่ยนไปใช้ public endpoint เพื่อดึงเฉพาะ active (สดทันที) */
async function getBanners(): Promise<Banner[]> {
  try {
    const res = await fetch(`${API_URL}/banners`, {
      cache: "no-store",
      next: { revalidate: 0, tags: ["banners"] },
      headers: { "Cache-Control": "no-store" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Banner[] = data?.banners || [];
    return (list || [])
      .filter((b) => b?.image_url)
      .sort((x, y) => (x.order ?? 999) - (y.order ?? 999));
  } catch {
    return [];
  }
}

// ===== ปรับฟังก์ชัน getVideos
async function getVideos(take = 12): Promise<Video[]> {
  try {
    const res = await fetch(`${SITE_URL}/api/videos?active=1&take=${take}`, {
      cache: "no-store",
      next: { revalidate: 0, tags: ["videos"] },
      headers: { "Cache-Control": "no-store" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : data?.videos || [];

    // ✅ ต้องมีอย่างน้อย YouTube หรือ TikTok อย่างใดอย่างหนึ่ง
    return (list || []).filter((v) => v?.id && (v.youtube_url || v.tiktok_url));
  } catch {
    return [];
  }
}

/** ---------- Utils ---------- **/
// เปลี่ยนฟังก์ชัน 2 ตัวนี้ให้ sanitize ภายในเลย

const firstImage = (s: Store) =>
  safeUrl(
    s.cover_image ||
      s.images?.[0]?.image_url ||
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop"
  );

const catImage = (c: Category) =>
  safeUrl(
    c.cover_image ||
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop"
  );

const fmtTH = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("th-TH") : "-";

// ✅ กัน XSS + จัดฟอร์แมตให้อ่านง่ายใน view-source
const jsonSafe = (o: any, space: number = 2) =>
  JSON.stringify(o, null, space)
    .replace(/</g, "\\u003c")
    .replace(/<\/script/gi, "<\\/script>");

/** ---------- Page ---------- **/
export default async function HomePage() {
  const [categories, storesAll, banners, popular, videos] = await Promise.all([
  getCategories(),
  getStores(),
  getBanners(),
  getPopularStores(12),
  getVideos(12),
]);
  console.log('[home] videos:', videos.map(v => ({ id: v.id, yt: !!v.youtube_url, tk: !!v.tiktok_url })));

  // ✅ เพิ่ม log ตรงนี้
  console.log(
    "videos:",
    videos.map((v) => ({
      id: v.id,
      yt: !!v.youtube_url,
      tk: !!v.tiktok_url,
    }))
  );

  const jar = await cookies();
  const loggedIn = Boolean(jar.get(AUTH_COOKIE)?.value);

  const activeStores = (storesAll || []).filter((s) => s.is_active !== false && s.id);
  const latestStores = [...activeStores]
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    )
    .slice(0, 4);

  /** ---------- JSON-LD ---------- **/
  const ldWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TopAward",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const ldLatestStores =
  latestStores.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "ร้านล่าสุด",
        itemListElement: latestStores.map((s, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          url: `${SITE_URL}/store/${s.id}`,
          item: {
            "@type": "LocalBusiness",
            name: s.name,
            description: s.description || undefined,
            image: firstImage(s), // <- sanitized แล้ว
          },
        })),
      }
    : null;

    return (
    <>
<script
  id="ld-website"
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: jsonSafe(ldWebSite, 2) }}
/>

{ldLatestStores && (
  <script
    id="ld-latest-stores"
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: jsonSafe(ldLatestStores, 2) }}
  />
)}
      <div className={`${THEME.pageBg} min-h-screen ${THEME.textMain} relative`}>
        {/* ✅ นับยอดเข้าหน้าเว็บรวม */}
        <VisitPing kind="website" />

        {/* premium bg light blobs */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: `radial-gradient(${THEME.pageBgFx})` }}
          aria-hidden
        />
        {/* ===== NAVBAR ===== */}
        <header className={`fixed inset-x-0 top-0 z-50 ${NAV_H} border-b border-[#2A2A2A]`}>
          <div className="absolute inset-0 bg-[#1C1C1C]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1C1C1C]/95" />
          <div className="relative h-full w-full px-3 sm:px-4 lg:px-6">
            <Navbar loggedIn={loggedIn} />
          </div>
        </header>
        <div className={NAV_H} />

        {/* ===== HERO BANNERS ===== */}
        <section className="relative mx-auto max-w-7xl px-4 pt-6 lg:max-w-8xl lg:px-6 lg:pt-8">
          <div className="mb-4 flex items-end justify-between">
            <h1 className="text-2xl font-extrabold lg:text-3xl">
              <span className={THEME.accent}>แนะนำสำหรับคุณ</span>
            </h1>
          </div>
          <BannerCarousel banners={banners} cardWidth={560} speedSec={50} />
        </section>

        {/* ===== VIDEOS ===== */}
        {videos.length > 0 && (
          <section className="relative mx-auto max-w-7xl px-4 pt-3 lg:max-w-8xl lg:px-6">
            <VideoStrip videos={videos} />
          </section>
        )}

        {/* ===== CATEGORIES ===== */}
        <section className="relative mx-auto max-w-7xl px-4 py-10 lg:max-w-8xl lg:px-6 lg:py-14">
          <div className="mb-6 flex items-center justify-between lg:mb-8">
            <h2 className="text-2xl font-extrabold lg:text-3xl">
              หมวดหมู่ <span className={THEME.accent}>ยอดนิยม</span>
            </h2>
            <Link href="/category" className="text-sm lg:text-base hover:underline">
              <span className={THEME.accent}>ดูทั้งหมด</span>
            </Link>
          </div>

          {categories.length === 0 ? (
            <div className={`${THEME.textMuted} text-sm lg:text-base`}>ยังไม่มีหมวดหมู่</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  className={`group overflow-hidden rounded-2xl ${THEME.glass} shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <div className="mb-0 h-28 w-full overflow-hidden md:h-32 lg:h-36">
                    <img
                      src={catImage(cat)}
                      alt={cat.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="line-clamp-1 font-bold text-white">{cat.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ===== POPULAR (HORIZONTAL) ===== */}
        <section className="relative mx-auto max-w-7xl px-4 lg:max-w-8xl lg:px-6">
          <div className="mb-4 flex items-center justify-between lg:mb-6">
            <h2 className="text-2xl font-extrabold lg:text-3xl">
              รีวิว <span className={THEME.accent}>ยอดนิยม</span>
            </h2>
            <Link href="/store?popular=1" className="text-sm lg:text-base hover:underline">
              <span className={THEME.accent}>ดูทั้งหมด</span>
            </Link>
          </div>

          {popular.length === 0 ? (
            <div className={`${THEME.textMuted} text-sm lg:text-base`}>ยังไม่มีข้อมูล</div>
          ) : (
            <div className="no-scrollbar -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-2 lg:gap-6 lg:pb-4">
              {popular.map((s) => (
                <Link
                  key={s.id}
                  href={`/store/${encodeURIComponent(String(s.id))}`}
                  className={`snap-start w-[280px] shrink-0 overflow-hidden rounded-2xl ${THEME.glass} shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg md:w-[320px]`}
                >
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={firstImage(s)}
                      alt={s.name}
                      className="h-full w-full object-cover transition duration-300 hover:scale-[1.04]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <div className="mb-1 line-clamp-1 font-bold text-white">{s.name}</div>
                    <div className="flex items-center gap-2 text-sm text-white/90">
                      <span className="bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-lg font-bold text-transparent">
                        ★
                      </span>
                      <span className="font-semibold text-white/90">
                        {(s.avg_rating ?? 0).toFixed(1)}
                      </span>
                      <span className="opacity-70">•</span>
                      <span>{(s._reviewCount ?? 0).toLocaleString("th-TH")} รีวิว</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ===== LATEST STORES ===== */}
        <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 lg:max-w-8xl lg:px-6 lg:pt-14">
          <div className="mb-4 flex items-center justify-between lg:mb-6">
            <h2 className="text-2xl font-extrabold lg:text-3xl">
              ร้าน <span className={THEME.accent}>ล่าสุด</span>
            </h2>
          </div>

          {latestStores.length === 0 ? (
            <div className={`${THEME.textMuted} text-sm lg:text-base`}>ยังไม่มีร้าน</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
              {latestStores.map((store) => (
                <Link
                  key={store.id}
                  href={`/store/${encodeURIComponent(String(store.id))}`}
                  className={`group overflow-hidden rounded-2xl ${THEME.glass} shadow-sm transition hover:shadow-lg md:h-[260px]`}
                >
                  <div className="flex h-full flex-col md:flex-row">
                    <div className="w-full shrink-0 md:w-[360px] xl:w-[400px]">
                      <div className="h-[200px] md:h-full overflow-hidden">
                        <img
                          src={firstImage(store)}
                          alt={store.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4 lg:p-6">
                      <div>
                        <h3 className="line-clamp-1 text-lg font-extrabold text-white lg:text-xl">
                          {store.name}
                        </h3>
                        {store.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-white/80 lg:text-base">
                            {store.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 whitespace-nowrap text-xs text-white/60 lg:mt-4 lg:text-sm">
                        อัปเดต: {fmtTH(store.created_at)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}