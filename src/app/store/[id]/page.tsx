// src/app/store/[id]/page.tsx
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store"; // บังคับไม่ใช้แคชในเพจนี้
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { cookies } from "next/headers";
import StoreComments from "@/components/comments/StoreComments";
import VisitPing from "@/components/VisitPing";
import LiveRatingBadge from "@/components/LiveRatingBadge";
import TikTokReload from "@/components/TikTokReload";
import TrackingInjector from '@/app/_components/TrackingInjector';


/* ---------- types ---------- */
type PageProps = { params: Promise<{ id: string }> };
type MetadataProps = { params: Promise<{ id: string }> };

type ImageObj = { id?: string; image_url: string; alt_text?: string | null };
type Review = { id?: string; rating: number; comment?: string | null; user?: { name?: string } };
type Social = {
  line?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  instagram?: string | null;
  map?: string | null;
};

type Store = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  social_links?: string | null;
  cover_image?: string | null;
  images?: ImageObj[];
  reviews?: Review[];
  /** บางเคส backend อาจส่งเป็น string/number */
  is_active?: boolean | number | string | null;
  /** ถ้ามีวันหมดอายุ ให้บล็อกหน้า public ด้วย */
  expired_at?: string | null;
  created_at?: string;
  category?: { id: string | number; name: string };
};

type Video = {
  id: string;
  title?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  thumbnail_url?: string | null;
  tiktok_embed_url?: string | null; // ⬅️ เพิ่ม
};

/* ---------- consts ---------- */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8877/api").replace(/\/$/, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE || "token";



/* ---------- utils ---------- */
function parseSocial(s?: string | null): Social {
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    return {
      line: obj?.line || undefined,
      facebook: obj?.facebook || undefined,
      tiktok: obj?.tiktok || undefined,
      instagram: obj?.instagram || undefined,
      map: obj?.map || obj?.gmap || obj?.googlemap || obj?.google_maps || undefined,
    };
  } catch {
    return {};
  }
}

function ytId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function tkId(raw: string): string | null {
  try {
    const url = new URL(raw);

    // ✅ ลิงก์ embed v2 (ที่ถูกต้อง)
    const m1 = raw.match(/\/embed\/v\d\/video\/(\d+)/);
    if (m1?.[1]) return m1[1];

    // ✅ ลิงก์ embed รุ่นเก่า: https://www.tiktok.com/embed/<id>
    const m1b = raw.match(/\/embed\/(\d+)/);
    if (m1b?.[1]) return m1b[1];

    // ✅ ลิงก์มาตรฐาน: https://www.tiktok.com/@user/video/<id>
    const m2 = raw.match(/@[^/]+\/video\/(\d+)/);
    if (m2?.[1]) return m2[1];

    // ✅ /video/<id>
    const m3 = raw.match(/\/video\/(\d+)/);
    if (m3?.[1]) return m3[1];

    // ✅ ลิงก์ mobile เก่า: https://m.tiktok.com/v/<id>.html
    const m4 = raw.match(/\/v\/(\d+)\.html/);
    if (m4?.[1]) return m4[1];

    // ✅ query video_id=<id> หรือ videoId=<id>
    const m5 = raw.match(/[?&](?:video_id|videoId)=(\d+)/i);
    if (m5?.[1]) return m5[1];

    // ⛔ ลิงก์สั้น vt.tiktok.com ต้องคลี่ก่อน
    if (url.hostname.includes("vt.tiktok.com")) return null;

    return null;
  } catch {
    return null;
  }
}

function tkEmbedUrl(input: string): string | null {
  const id = tkId(input);
  return id ? `https://www.tiktok.com/embed/v2/video/${id}` : null; // ✅ ใช้ v2 เสมอ
}
/** แปลงค่า is_active จาก API ให้เป็น boolean แท้ ๆ */
function normalizeActive(v: Store["is_active"]): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(s)) return false;
    if (["true", "1", "yes", "on"].includes(s)) return true;
  }
  // ถ้า undefined/null ถือว่าเปิดใช้งาน (ตามพฤติกรรมเดิมของคุณฝั่งแอดมิน)
  return true;
}
function isExpired(expired_at?: string | null): boolean {
  if (!expired_at) return false;
  const t = new Date(expired_at).getTime();
  return Number.isFinite(t) && t <= Date.now();
}
/** ตัวเช็ครวมสำหรับหน้า public */
function isStoreEnabledPublic(s?: Store | null): boolean {
  if (!s) return false;
  return normalizeActive(s.is_active) && !isExpired(s.expired_at);
}
function isGoogleMapsLink(u?: string | null) {
  if (!u) return false;
  try {
    const url = new URL(u);
    return /(^|\.)google\.(com|co\.\w+)$/.test(url.hostname) ||
           url.hostname.includes("goo.gl") ||
           url.hostname.includes("maps.app.goo.gl");
  } catch { return false; }
}

/** คืน URL สำหรับ iframe <iframe src=...> */
function buildMapsEmbedUrl(
  raw: string | undefined | null,
  address?: string | null,
  name?: string | null
) {
  if (!raw && !address && !name) return null;

  try {
    if (raw) {
      const u = new URL(raw);
      const hostIsGoogle =
        /(^|\.)google\.(com|co\.\w+)$/i.test(u.hostname) || u.hostname === "maps.google.com";
      const path = u.pathname || "";

      // ✅ 1) ถ้าเป็น embed อยู่แล้ว ใช้เลย
      if (hostIsGoogle && (path.includes("/maps/embed") || path.includes("/embed"))) {
        return raw;
      }

      // ✅ 2) ถ้าเป็น Google My Maps viewer → แปลงเป็น embed อัตโนมัติ
      //    ตัวอย่าง: https://www.google.com/maps/d/viewer?mid=XXXXXXXX&ll=...&z=...
      if (hostIsGoogle && path.includes("/maps/d/")) {
        const mid = u.searchParams.get("mid");
        if (mid) {
          const params = new URLSearchParams({ mid });
          const ll = u.searchParams.get("ll");
          const z = u.searchParams.get("z");
          if (ll) params.set("ll", ll);
          if (z) params.set("z", z);
          // 👇 ใช้ /maps/d/embed เพื่อฝัง My Maps โดยตรง
          return `https://www.google.com/maps/d/embed?${params.toString()}`;
        }
      }

      // ✅ 3) ดึงพิกัดหรือชื่อสถานที่จากลิงก์ปกติ
      const qParam = u.searchParams.get("q");
      if (qParam) {
        return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(qParam)}&z=16`;
      }

      const mPlace = path.match(/\/maps\/place\/([^/]+)/);
      if (mPlace?.[1]) {
        const place = decodeURIComponent(mPlace[1].replace(/\+/g, " "));
        return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(place)}&z=16`;
      }

      const mCoord = raw.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+(?:\.\d+)?)z/);
      if (mCoord) {
        const lat = mCoord[1], lng = mCoord[2], z = Math.round(Number(mCoord[3]) || 15);
        return `https://www.google.com/maps?output=embed&ll=${lat},${lng}&z=${z}`;
      }

      // ✅ 4) ลิงก์สั้น goo.gl หรือ maps.app.goo.gl
      if (u.hostname.includes("goo.gl") || u.hostname.includes("maps.app")) {
        return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(raw)}&z=16`;
      }

      // ✅ 5) fallback เป็นชื่อร้านหรือที่อยู่
      if (hostIsGoogle) {
        const q = address?.trim() || name?.trim();
        if (q) return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}&z=16`;
      }
    }
  } catch {}

  // ✅ 6) fallback สุดท้าย
  const q = address?.trim() || name?.trim();
  return q ? `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}&z=16` : null;
}

/* ---------- data loaders ---------- */
async function getStore(id: string): Promise<Store | null> {
  try {
    const res = await fetch(`${API_URL}/stores/${id}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.store || data) as Store;
  } catch {
    return null;
  }
}

async function getMe() {
  try {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `${AUTH_COOKIE}=${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** วิดีโอที่ถูกเลือกให้แสดงในร้านนี้ (active เท่านั้น) */
async function getStoreVideos(storeId: string): Promise<Video[]> {
  const tryUrls = [
    `${API_URL}/videos?store_id=${encodeURIComponent(storeId)}&active=1`,
    `${API_URL}/videos?store=${encodeURIComponent(storeId)}&active=1`,
    `${API_URL}/stores/${encodeURIComponent(storeId)}/videos`,
  ];

  for (const url of tryUrls) {
    try {
      const r = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        next: { revalidate: 0 },
      });
      if (!r.ok) continue;

      const j = await r.json();
      const list =
        (Array.isArray(j) && j) ||
        (Array.isArray(j?.videos) && j.videos) ||
        (Array.isArray(j?.data) && j.data) ||
        (Array.isArray(j?.rows) && j.rows) ||
        null;

      if (Array.isArray(list)) {
        const raw = list as Video[];
        const enriched = raw.map((v) => ({
          ...v,
          tiktok_embed_url: v.tiktok_url ? tkEmbedUrl(v.tiktok_url) : null, // ✅ v2
        }));
        return enriched.filter((v) => v.youtube_url || v.tiktok_embed_url);
      }
    } catch {}
  }
  return [];
}

/** ✅ ดึงสถิติรีวิวสดๆ (ไม่แคช) เพื่อใช้แสดง AVG บนหน้า */
async function getReviewStats(storeId: string): Promise<{ avg?: number; count: number }> {
  try {
    const r = await fetch(`${API_URL}/reviews/stores/${encodeURIComponent(storeId)}/reviews`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      next: { revalidate: 0 },
    });
    const j = await r.json().catch(() => ({}));

    // รองรับ response ได้หลายรูปแบบ
    const reviews: Array<{ rating?: number }> =
      (Array.isArray(j?.reviews) && j.reviews) ||
      (Array.isArray(j) && j) ||
      [];

    const nums = reviews
      .map((x) => Number(x?.rating || 0))
      .filter((n) => Number.isFinite(n) && n > 0);

    const count = nums.length;
    const avg = count ? Number((nums.reduce((a, b) => a + b, 0) / count).toFixed(1)) : undefined;
    return { avg, count };
  } catch {
    return { avg: undefined, count: 0 };
  }
}

/* ---------- SEO ---------- */
export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { id } = await params;
  const store = await getStore(id);

  // ใช้ตัวเช็คแบบ normalize + วันหมดอายุ
  if (!isStoreEnabledPublic(store)) {
    return {
      title: "ไม่พบร้าน | TopAward",
      description: "ไม่พบหน้าร้านที่ร้องขอ หรือร้านถูกปิดใช้งาน",
      robots: { index: false, follow: false },
    };
  }

  const title = `${store.name} | TopAward`;
  const description = store.description?.slice(0, 155) || `รายละเอียดร้าน ${store.name} บน TopAward`;
  const url = `${SITE_URL}/store/${store.id}`;
  const ogImage = store.cover_image || store.images?.[0]?.image_url || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", url, title, description, images: ogImage ? [{ url: ogImage }] : undefined },
  };
}

/* ---------- small UI ---------- */
function StarGradient({ className = "" }: { className?: string }) {
  return (
    <span
      className={`bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent ${className}`}
      aria-hidden
    >
      ★
    </span>
  );
}
function Stars({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(5, Number.isFinite(value) ? value : 0));
  const full = Math.floor(v);
  const remainder = v - full;
  const empty = 5 - Math.ceil(v);
  return (
    <span className="inline-flex select-none items-center">
      {"★".repeat(full)
        .split("")
        .map((_, i) => (
          <StarGradient key={`f-${i}`} />
        ))}
      {remainder > 0 && (
        <span className="relative inline-block">
          <span className="text-white/15">★</span>
          <span
            className="absolute left-0 top-0 overflow-hidden"
            style={{ width: `${remainder * 100}%` }}
          >
            <StarGradient />
          </span>
        </span>
      )}
      {empty > 0 && <span className="text-white/15">{"★".repeat(empty)}</span>}
    </span>
  );
}

/* ---------- Page ---------- */
export default async function StoreDetailPage({ params }: PageProps) {
  const { id } = await params;

  // ดึง stats แบบสดมาพร้อมกัน เพื่อให้ badge บนขวาอัปเดตทันที
  const [store, me, videos, stats] = await Promise.all([
  getStore(id),
  getMe(),
  getStoreVideos(id),
  getReviewStats(id),
]);

  // fallback สำหรับร้านเก่าที่ยังเก็บ video เดี่ยวๆ
const fallbackSingle: Video[] = [];
if (!videos.length) {
  const yt = (store as any)?.youtube_url || "";
  const tk = (store as any)?.tiktok_url || "";
  if (yt || tk) {
    fallbackSingle.push({
      id: `store-single-${store.id}`,
      title: store.name || "Video",
      youtube_url: yt || null,
      tiktok_url: tk || null,
      tiktok_embed_url: tk ? tkEmbedUrl(tk) : null, // ⬅️ เพิ่มบรรทัดนี้
      thumbnail_url: (store as any)?.thumbnail_url || null,
    });
  }
}
const videosToShow = videos.length ? videos : fallbackSingle;

  // บล็อกหน้าเมื่อร้านถูกปิด/หมดอายุ (รองรับค่าหลายรูปแบบ)
  if (!isStoreEnabledPublic(store)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-white">
        <h1 className="mb-4 text-2xl font-bold">ไม่พบร้านนี้</h1>
        <Link
          href="/"
          className="rounded-lg bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2 font-semibold text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700]"
        >
          ← กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  // ใช้ค่า stats สดเป็นหลัก
  const ratingCount = stats.count;
  const ratingAvg = stats.avg;

  const images = [store.cover_image, ...(store.images?.map((i) => i.image_url) || [])]
    .filter(Boolean) as string[];

  const social = parseSocial(store.social_links);
  const loggedIn = Boolean(me?.id);
  const currentUserId = me?.id ?? null;

  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "หมวดหมู่", item: `${SITE_URL}/category` },
      ...(store.category?.id
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: store.category.name,
              item: `${SITE_URL}/category/${store.category.id}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: store.category?.id ? 4 : 3,
        name: store.name,
        item: `${SITE_URL}/store/${store.id}`,
      },
    ],
  };
  const ldLocalBusiness: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: store.name,
    url: `${SITE_URL}/store/${store.id}`,
    description: store.description || undefined,
    image: images.length ? images : undefined,
    address: store.address || undefined,
  };
  if (ratingAvg && ratingCount) {
    ldLocalBusiness.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ratingAvg,
      reviewCount: ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return (
    <>
    {/* ✅ Tracking เฉพาะร้านนี้ โหลดก่อนทุกอย่าง */}
    <TrackingInjector storeId={id} />
    <Script src="https://www.tiktok.com/embed.js" strategy="afterInteractive" />
      <Script
        id="ld-breadcrumb-store"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }}
      />
      <Script
        id="ld-localbusiness-store"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldLocalBusiness) }}
      />
      

      {/* BG + content */}
      <div className="relative">
        {/* ⬅️ นับยอดเข้าหน้าร้านตามร้าน */}
        <VisitPing kind="store" storeId={store.id} />

        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.08), transparent 55%), radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.07), transparent 50%)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-6 lg:py-8">

          {/* breadcrumb */}
          <nav className="text-sm text-slate-300/90">
            <Link href="/" className="hover:underline">
              หน้าหลัก
            </Link>
            <span className="mx-2 opacity-60">/</span>
            <Link href="/category" className="hover:underline">
              หมวดหมู่
            </Link>
            {store.category?.id && (
              <>
                <span className="mx-2 opacity-60">/</span>
                <Link href={`/category/${store.category.id}`} className="hover:underline">
                  {store.category.name}
                </Link>
              </>
            )}
            <span className="mx-2 opacity-60">/</span>
            <span className="text-white">{store.name}</span>
          </nav>

          {/* Title + rating (ใช้ stats สด) */}
          <header className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{store.name}</h1>
            <div className="flex items-center gap-3">
              <LiveRatingBadge
                key={store.id}              // ✅ บังคับ remount เมื่อเปลี่ยนร้าน
                storeId={store.id}
                apiBase={API_URL}
                initialAvg={ratingAvg}
                initialCount={ratingCount}
              />
            </div>
          </header>

          {/* ▼▼ เมนูย่อย (ไม่ sticky) ▼▼ */}
          <div className="mt-5 border-y border-white/10 bg-transparent">
            <div className="flex gap-2 overflow-auto px-1 py-2">
              <a
                href="#overview"
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15"
              >
                ภาพรวม
              </a>
              <a
                href="#videos"
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15"
              >
                วิดีโอ
              </a>
              <a
                href="#reviews"
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/15"
              >
                รีวิว
              </a>
            </div>
          </div>
          {/* ▲▲ จบเมนูย่อย ▲▲ */}

          {/* Layout */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Gallery */}
              <section id="overview" className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[3fr_1fr]">
                  <button
                    type="button"
                    className="group overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20"
                    data-lb-open
                    data-index="0"
                  >
                    <img
                      src={images[0] || "/no-image.jpg"}
                      alt={store.name}
                      className="h-[220px] w-full object-cover transition duration-500 md:h-[750px] group-hover:scale-[1.02]"
                    />
                  </button>

                  <div className="grid grid-cols-4 gap-2 md:grid-cols-1">
                    {images.slice(1, 6).map((src, i) => (
                      <button
                        type="button"
                        key={src + i}
                        className="relative overflow-hidden rounded-lg ring-1 ring-white/10 bg-black/20"
                        data-lb-open
                        data-index={i + 1}
                        aria-label={`เปิดภาพที่ ${i + 2}`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </button>
                    ))}
                    {images.length <= 1 && (
                      <div className="grid aspect-[4/3] place-items-center rounded-lg ring-1 ring-white/10 text-slate-300">
                        ไม่มีรูปเพิ่มเติม
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Description & reviews */}
              <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
                <h2 className="mb-2 text-xl font-bold text-white">รายละเอียด</h2>
                <p className="text-slate-200/85">{store.description || "ไม่มีรายละเอียด"}</p>
              </section>

              <section id="reviews" className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
                <StoreComments
                  storeId={store.id}
                  apiBase={API_URL}
                  loggedIn={loggedIn}
                  currentUserId={currentUserId}
                />
              </section>
            </div>

            {/* Right column */}
            <aside className="h-max space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-[#D4AF37]/25 bg-white/5 p-4 text-white shadow backdrop-blur">
                <h3 className="text-lg font-bold">ข้อมูลร้าน</h3>
                <dl className="mt-3 space-y-2 text-[15px]">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-white/60">ที่อยู่</dt>
                    <dd className="flex-1">
  {store.address ? (
    store.address
  ) : (
    <span key="addr-dash">-</span>
  )}
</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-white/60">โซเชียล</dt>
                    <dd className="flex-1">
  {(() => {
    const chips: Array<JSX.Element> = [];

    if (social.line) {
      chips.push(
        <a
          key="line"
          href={social.line}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#06C755]/90 px-3 py-1.5 text-sm font-semibold text-black hover:brightness-110"
        >
          <span>LINE</span>
        </a>
      );
    }

    if (social.facebook) {
      chips.push(
        <a
          key="facebook"
          href={social.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2]/90 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
        >
          <span>Facebook</span>
        </a>
      );
    }

    if (social.tiktok) {
      chips.push(
        <a
          key="tiktok"
          href={social.tiktok}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          <span>🎵 TikTok</span>
        </a>
      );
    }

    if (social.instagram) {
      chips.push(
        <a
          key="instagram"
          href={social.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
        >
          <span>📸 Instagram</span>
        </a>
      );
    }

    // ✅ คืนค่าผลลัพธ์: ถ้าไม่มีเลยให้มี "-" ตัวเดียวพร้อม key ยูนีคแน่นอน
    if (chips.length === 0) {
      return (
        <div className="flex flex-wrap gap-2">
          <span key="no-social" className="text-white/50">-</span>
        </div>
      );
    }

    // ✅ ถ้ามี social ให้คืน chips ปกติ
    return <div className="flex flex-wrap gap-2">{chips}</div>;
  })()}
</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-white/60">อัปเดต</dt>
                    <dd className="flex-1">
  {store.created_at ? (
    new Date(store.created_at).toLocaleDateString("th-TH")
  ) : (
    <span key="date-dash">-</span>
  )}
</dd>
                  </div>
                </dl>

                {/* Map */}
{(() => {
  const mapHref = social.map || undefined;
  const mapEmbed = buildMapsEmbedUrl(mapHref, store.address, store.name);
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white/90">แผนที่</h4>
        {mapHref && (
          <a
            href={mapHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15 ring-1 ring-white/15"
          >
            เปิดใน Google Maps
          </a>
        )}
      </div>

      {mapEmbed ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20">
          <div className="aspect-[16/9] w-full">
            <iframe
              src={mapEmbed}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              title="Google Maps"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-300/80">ยังไม่มีแผนที่</p>
      )}
    </div>
  );
})()}

                <div className="mt-4">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 font-semibold text-black bg-gradient-to-r from-[#FFD700] to-[#B8860B] hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition"
                  >
                    ← กลับหน้าหลัก
                  </Link>
                </div>
              </div>

              {/* Vertical videos */}
              <section
  id="videos"
  key={`videos-${store.id}-${videosToShow.length}`}
  className="rounded-2xl border border-white/10 bg-white/5 p-3"
>
  <h4 className="px-1 pb-3 text-white/90">วิดีโอของร้าน</h4>
  {videosToShow.length === 0 ? (
    <p className="px-1 pb-2 text-slate-300">ยังไม่มีวิดีโอ</p>
  ) : (
    <ul className="grid grid-cols-1 gap-4">
      {videosToShow.map((v) => {
        console.log("RAW TK:", v.tiktok_url, "EMBED:", v.tiktok_embed_url);
        if (v.youtube_url) {
          const id = ytId(v.youtube_url);
          if (!id) return null;
          if (v.tiktok_url && !v.tiktok_embed_url) {
  return (
    <li key={`tk-${v.id}`} className="rounded-xl ring-1 ring-white/10 bg-black/20 p-3 text-sm text-slate-300">
      ไม่สามารถฝังวิดีโอ TikTok ได้: ลิงก์นี้ไม่ใช่วิดีโอ หรือเป็นลิงก์สั้น vt.tiktok.com
    </li>
  );
}
          return (
            <li key={`yt-${v.id}`} className="overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20">
              <div className="aspect-[16/9] w-full">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${id}?autoplay=0`}
                  title={v.title || "YouTube video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              {v.title && <div className="p-3 text-xs text-white/85 line-clamp-2">{v.title}</div>}
            </li>
          );
        }
        if (v.tiktok_url) {
  const id = tkId(v.tiktok_url); // ใช้ util ที่คุณมีอยู่แล้วด้านบนไฟล์
  return (
    <li key={`tk-${v.id}`} className="overflow-hidden rounded-xl ring-1 ring-white/10 bg-black/20">
      <div className="aspect-[9/16] w-full">
        <blockquote
          className="tiktok-embed h-full w-full"
          cite={v.tiktok_url}
          data-video-id={id || undefined}
          // ไม่ต้องใส่ style อะไรเพิ่ม ให้ container คุมสัดส่วนแทน
        >
          <section>
            <a href={v.tiktok_url}>Watch on TikTok</a>
          </section>
        </blockquote>
      </div>
      {v.title && <div className="p-3 text-xs text-white/85 line-clamp-2">{v.title}</div>}
    </li>
  );
}
        return null;
      })}
    </ul>
  )}
</section>
{/* ✅ ให้ TikTok รีโหลด embed ทุกครั้งที่เปลี่ยนร้าน */}
<TikTokReload storeId={store.id} />
{/* ⬇️ วางสคริปต์รีโหลดตรงนี้: หลัง </section id="videos"> แต่ก่อน </aside> */}

            </aside>
          </div>
        </div>
      </div>

      {/* -------- Lightbox -------- */}
      {images.length > 0 && (
        <>
          <div
            id="lb"
            key={`lb-${store.id}`} /* บังคับ remount เมื่อเปลี่ยนร้าน */
            className="fixed inset-0 z-[9999] hidden items-center justify-center bg-black/80 p-4 backdrop-blur"
            aria-modal="true"
            role="dialog"
          >
            {/* ปุ่มปิด: fixed อิง viewport เสมอ */}
            <button
              id="lb-close"
              className="fixed right-4 top-4 z-[10000] rounded-lg bg-white/10 px-3 py-2 text-sm text-white ring-1 ring-white/20 hover:bg-white/15"
            >
              ปิด
            </button>

            <div className="relative mx-auto flex max-w-[min(1100px,95vw)] flex-col">
              <div className="flex items-center justify-center">
                <button id="lb-prev" className="mr-3 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 md:flex">
                  ‹
                </button>

                <div className="h-[min(85vh,720px)] w-[min(95vw,1100px)] overflow-hidden rounded-2xl ring-1 ring-white/15 bg-black/40">
                  {/* อย่าใส่ src="" ให้เว้นไว้ก่อน แล้วค่อยให้สคริปต์ตั้งค่า */}
                  <img id="lb-img" alt="" className="h-full w-full object-contain" />
                </div>

                <button id="lb-next" className="ml-3 hidden h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15 md:flex">
                  ›
                </button>
              </div>
            </div>
          </div>

          {/* 1) Bootstrap controller – ผูก event ครั้งเดียว */}
          <Script
            id="lb-controller"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
(function () {
  var W = window, D = document;
  if (W.__LB) return; // ติดตั้งแล้ว ข้าม

  W.__LB = {
    images: [],
    idx: 0,
    q: function () {
      this.lb  = D.getElementById('lb');
      this.img = D.getElementById('lb-img');
    },
    show: function (i) {
      if (!this.images.length) return;
      this.idx = (i + this.images.length) % this.images.length;
      this.q();
      if (this.img) {
        // เคลียร์ก่อนกันรูปค้าง
        this.img.removeAttribute('src');
        this.img.setAttribute('src', this.images[this.idx] || "");
      }
    },
    open: function (i) {
      this.q();
      if (this.lb) this.lb.classList.remove('hidden');
      this.show(typeof i === 'number' ? i : 0);
    },
    close: function () {
      this.q();
      if (this.lb) this.lb.classList.add('hidden');
    },
    bind: function () {
      if (this.bound) return;
      this.bound = true;

      // เปิดภาพด้วย data-lb-open (event delegation)
      D.addEventListener('click', (e) => {
        var t = e.target && e.target.closest && e.target.closest('[data-lb-open]');
        if (!t) return;
        var i = Number(t.getAttribute('data-index') || '0');
        this.open(isFinite(i) ? i : 0);
      });

      // ปุ่ม prev/next/close (event delegation)
      D.addEventListener('click', (e) => {
        var id = (e.target && e.target.id) || '';
        if (id === 'lb-prev') this.show(this.idx - 1);
        if (id === 'lb-next') this.show(this.idx + 1);
        if (id === 'lb-close') this.close();
      });

      // คีย์บอร์ด
      D.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.show(this.idx - 1);
        if (e.key === 'ArrowRight') this.show(this.idx + 1);
      });

      // คลิกฉากหลังเพื่อปิด
      D.addEventListener('click', (e) => {
        var lb = D.getElementById('lb');
        if (lb && e.target === lb) this.close();
      });
    }
  };

  W.__LB.bind();
})();
              `,
            }}
          />

          {/* 2) Set images ทุกครั้งที่เปลี่ยนร้าน */}
          <Script
            id={`lb-set-${store.id}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
(function(){
  if (window.__LB) {
    // ใช้ array ใหม่ทุกครั้ง ป้องกัน reference เก่า
    window.__LB.images = [].concat(${JSON.stringify(images)});
    window.__LB.idx = 0;

    // รีเซ็ต DOM ให้ชัดเจน
    var imgEl = document.getElementById('lb-img');
    if (imgEl) {
      imgEl.removeAttribute('src');
      imgEl.setAttribute('src', ${JSON.stringify(images[0] || "")});
    }
  }
})();
              `,
            }}
          />
        </>
      )}
    </>
  );
}