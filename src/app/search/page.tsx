/* src/app/search/page.tsx */
import Link from "next/link";
import { Suggestions, RefocusSearchButton } from "./SearchClientBits";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");

type Category = { id: string; name: string };
type Store = {
  id: string;
  name: string;
  description?: string | null;
  cover_image?: string | null;
};

async function fetchSearch(q: string) {
  if (!q) return { categories: [] as Category[], stores: [] as Store[] };
  try {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (!res.ok) return { categories: [], stores: [] };
    const json = await res.json();
    return {
      categories: Array.isArray(json?.categories) ? json.categories : [],
      stores: Array.isArray(json?.stores) ? json.stores : [],
    };
  } catch {
    return { categories: [], stores: [] };
  }
}

/** ไฮไลต์ token ที่ค้นหา (case-insensitive) */
function highlight(text?: string, tokens: string[] = []) {
  const t = text ?? "";
  if (!t || tokens.length === 0) return t;
  const escaped = tokens.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${escaped})`, "gi");
  return t.split(re).map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="rounded bg-amber-400/30 px-0.5 text-white">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default async function SearchPage({
  /** Next 15+: searchParams เป็น Promise */
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = (q || "").trim();
  const tokens = query.split(/\s+/).filter(Boolean);

  const { categories, stores } = await fetchSearch(query);
  const notFound = Boolean(query) && categories.length === 0 && stores.length === 0;

  /** ค่า default ที่โชว์ใน “คำที่เกี่ยวข้อง” */
  const defaults = ["ทำเลทอง", "อาหารทะเล", "บิวตี้", "คลินิก", "สวยงาม", "คาเฟ่", "โรงแรม", "ซ่อมรถ", "จัดฟัน"];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 text-white">
      <h1 className="mb-4 text-xl font-semibold">
        ผลการค้นหา: <span className="text-amber-300">“{query || "ทั้งหมด"}”</span>
      </h1>

      {/* ---- แนะนำคำค้น ---- */}
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="text-sm text-slate-300">คำที่เกี่ยวข้อง</div>
        <Suggestions tokens={tokens} defaults={defaults} />
      </div>

      {notFound ? (
        // ---- เคสไม่พบอะไรเลย ----
        <div className="mt-6 rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
          <p className="mb-4">
            ไม่พบผลลัพธ์ที่ตรงกับคำว่า <span className="text-amber-300">“{query}”</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2 font-semibold text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700]"
            >
              ← กลับหน้าหลัก
            </Link>
            <RefocusSearchButton className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white hover:bg-white/5">
              ค้นหาใหม่
            </RefocusSearchButton>
          </div>
        </div>
      ) : (
        <>
          {/* ---- หมวดหมู่ ---- */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">หมวดหมู่</h2>
            {categories.length === 0 ? (
              <p className="text-sm text-slate-300">ไม่พบหมวดหมู่</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((c) => (
                  <li key={c.id} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                    <Link href={`/category/${c.id}`} className="font-medium hover:underline">
                      {highlight(c.name, tokens)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---- ร้าน / สถานที่ ---- */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">ร้าน / สถานที่</h2>
            {stores.length === 0 ? (
              <p className="text-sm text-slate-300">ไม่พบร้านในเงื่อนไขค้นหา</p>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stores.map((s) => (
                  <li key={s.id} className="overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                    <Link href={`/store/${s.id}`} className="block">
                      <div
                        className="aspect-[16/9] bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${
                            s.cover_image ||
                            "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop"
                          })`,
                        }}
                      />
                      <div className="p-4">
                        <div className="line-clamp-1 font-semibold">{highlight(s.name, tokens)}</div>
                        {s.description ? (
                          <p className="mt-1 line-clamp-2 text-sm text-slate-300">{highlight(s.description, tokens)}</p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ปุ่มทางลัดด้านล่างเสมอ */}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2 font-semibold text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700]"
            >
              ← กลับหน้าหลัก
            </Link>
            <RefocusSearchButton className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white hover:bg-white/5">
              ค้นหาใหม่
            </RefocusSearchButton>
          </div>
        </>
      )}
    </main>
  );
}