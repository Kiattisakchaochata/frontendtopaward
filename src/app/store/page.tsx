/* src/app/store/page.tsx */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import Link from "next/link";
import { getReviewStats } from "@/lib/review";

/** ---------- Types ---------- **/
type Store = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
  avg_rating?: number | null;
  created_at?: string | null;

  // ใช้กรองการแสดงผล
  is_active?: boolean | number | string | null;
  expired_at?: string | null;
};

/** ---------- Consts ---------- **/
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api"
).replace(/\/$/, "");

const NO_IMAGE =
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1200&auto=format&fit=crop";

/** ---------- Helpers ---------- **/
function normalizeActive(v: Store["is_active"]) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["0", "false", "no", "off"].includes(s)) return false;
    if (["1", "true", "yes", "on"].includes(s)) return true;
  }
  return true; // ไม่มีฟิลด์ -> ถือว่าเปิด
}
function isExpired(exp?: string | null) {
  if (!exp) return false;
  const t = new Date(exp).getTime();
  return Number.isFinite(t) && t <= Date.now();
}
const isPublicStore = (s: Store) =>
  normalizeActive(s.is_active) && !isExpired(s.expired_at);

/** ---------- Data Loaders ---------- **/
// “รีวิวยอดนิยม” — มี fallback หลาย URL
async function fetchPopular(limit = 36): Promise<Store[]> {
  const urls = [
    `${SITE_URL}/api/stores?popular=1&limit=${limit}`,
    `${API_URL}/stores/popular?limit=${limit}`,
    `${API_URL}/stores?popular=1&limit=${limit}`,
  ];

  for (const u of urls) {
    try {
      const r = await fetch(u, {
        cache: "no-store",
        next: { revalidate: 0, tags: ["stores"] },
        headers: { "Cache-Control": "no-store" },
      });
      if (!r.ok) continue;

      const j = await r.json().catch(() => ({}));
      let arr: Store[] =
        (Array.isArray(j) && j) ||
        (Array.isArray(j?.stores) && j.stores) ||
        (Array.isArray(j?.data) && j.data) ||
        [];
      arr = arr.filter(isPublicStore).slice(0, limit);
      if (arr.length) return arr;
    } catch {
      /* ลอง URL ถัดไป */
    }
  }
  return [];
}

// “ร้านทั้งหมด” — proxy ก่อน, ตรง backend เป็นสำรอง
async function fetchStores(limit = 36): Promise<Store[]> {
  const urls = [
    `${SITE_URL}/api/stores?limit=${limit}`,
    `${API_URL}/stores?limit=${limit}`,
  ];

  for (const u of urls) {
    try {
      const r = await fetch(u, {
        cache: "no-store",
        next: { revalidate: 0, tags: ["stores"] },
        headers: { "Cache-Control": "no-store" },
      });
      if (!r.ok) continue;

      const j = await r.json().catch(() => ({}));
      let arr: Store[] =
        (Array.isArray(j) && j) ||
        (Array.isArray(j?.stores) && j.stores) ||
        (Array.isArray(j?.data) && j.data) ||
        [];
      arr = arr.filter(isPublicStore).slice(0, limit);
      if (arr.length) return arr;
    } catch {
      /* ลอง URL ถัดไป */
    }
  }
  return [];
}

/** ---------- Page ---------- **/
export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ popular?: string }>;
}) {
  const { popular } = await searchParams;
  const isPopular = String(popular) === "1";

  const stores = isPopular ? await fetchPopular(36) : await fetchStores(36);

  // ดึงสถิติจริงของแต่ละร้าน (avg,count) แบบสด
  const storesWithStats = await Promise.all(
    stores.map(async (s) => {
      const stats = await getReviewStats(API_URL, s.id);
      return { ...s, stats }; // { avg?: number, count: number }
    })
  );

  return (
    <main className="relative mx-auto max-w-7xl px-4 py-8 text-white">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold lg:text-3xl">
          {isPopular ? "รีวิวยอดนิยม" : "ร้านทั้งหมด"}
        </h1>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-3 py-1.5 text-sm font-semibold text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700]"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>

      {storesWithStats.length === 0 ? (
        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          ยังไม่มีรายการที่แสดง
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storesWithStats.map((s) => {
            const cover = s.cover_image || NO_IMAGE;
            const hasReviews = s.stats?.count > 0;
            return (
              <li
                key={s.id}
                className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
              >
                <Link href={`/store/${encodeURIComponent(String(s.id))}`}>
                  <div
                    className="aspect-[16/9] bg-cover bg-center"
                    style={{ backgroundImage: `url(${cover})` }}
                  />
                  <div className="p-4">
                    <div className="line-clamp-1 text-lg font-semibold">
                      {s.name}
                    </div>
                    {s.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                        {s.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between text-sm text-white/80">
                      <div>
                        ⭐ {hasReviews ? s.stats!.avg!.toFixed(1) : "—"}
                        {hasReviews ? ` • ${s.stats!.count} รีวิว` : ""}
                      </div>
                      <div className="text-white/60">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString("th-TH")
                          : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}