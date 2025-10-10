// src/app/category/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

type Category = { id: string; name: string; cover_image?: string | null };

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "หมวดหมู่ | TopAward",
  description:
    "สำรวจหมวดหมู่ทั้งหมดบน TopAward — รวมรีวิวร้าน/คลินิก/ที่เที่ยว ค้นหาได้ง่ายตามหมวดหมู่",
  alternates: { canonical: `${SITE_URL}/category` },
  openGraph: {
    title: "หมวดหมู่ | TopAward",
    url: `${SITE_URL}/category`,
  },
};

// ------- Data loader -------
async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate } });
    if (!res.ok) return [];
    const data = await res.json();
    const list: Category[] = Array.isArray(data) ? data : data?.categories || [];
    return list.filter((c) => c?.id);
  } catch {
    return [];
  }
}

export default async function CategoryListPage() {
  const categories = await getCategories();

  const ldItemList =
    categories.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "หมวดหมู่ทั้งหมด",
          itemListElement: categories.map((c, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            url: `${SITE_URL}/category/${c.id}`,
            item: {
              "@type": "CollectionPage",
              name: c.name,
              image: c.cover_image || undefined,
            },
          })),
        }
      : null;

  return (
    <>
      {ldItemList && (
        <Script
          id="ld-category-list"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldItemList) }}
        />
      )}

      <div className="min-h-screen bg-[#0F172A] text-white">
        <section className="mx-auto max-w-6xl px-4 py-10">
          {/* หัวเรื่อง + ปุ่มกลับบ้าน */}
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-white to-[#FFD700] bg-clip-text text-transparent">
                หมวดหมู่ทั้งหมด
              </span>
            </h1>
            <Link
              href="/"
              prefetch={false}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[#D4AF37]/40 px-4 text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/10 transition"
            >
              ← กลับหน้าหลัก
            </Link>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl bg-white/5 p-6 text-white/80 ring-1 ring-white/10">
              ยังไม่มีหมวดหมู่
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  prefetch={false}
                  className="
                    group overflow-hidden rounded-2xl bg-white/5
                    ring-1 ring-white/10 hover:ring-[#D4AF37]/40
                    shadow-[0_10px_30px_rgba(0,0,0,.35)]
                    transition hover:-translate-y-0.5
                  "
                >
                  <div className="relative mb-2 h-40 w-full overflow-hidden rounded-b-none">
                    {cat.cover_image ? (
                      <img
                        src={cat.cover_image}
                        alt={cat.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-white/5 text-white/50">
                        ไม่มีรูปภาพ
                      </div>
                    )}
                    {/* ฟิล์มให้อ่านง่าย + เส้นทองบน */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>

                  <div className="px-4 pb-4">
                    <h3 className="line-clamp-1 text-base font-bold text-white">{cat.name}</h3>
                    <p className="mt-1 text-xs text-white/60">แตะเพื่อดูร้านในหมวดนี้</p>
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