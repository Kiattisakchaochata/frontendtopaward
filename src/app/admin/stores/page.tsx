// src/app/admin/stores/page.tsx
import { cookies } from "next/headers";
import StoreManager from "./StoreManager";
import ExpiryPanel from "./components/ExpiryPanel";

export const dynamic = "force-dynamic";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE || "token";

type Category = { id: string; name: string };
type Image = { id?: string; image_url: string; order_number?: number | null };
type Store = {
  id: string; name: string; address?: string | null; description?: string | null;
  social_links?: string | null; category_id?: string | null;
  category?: { id: string; name: string } | null;
  cover_image?: string | null; images?: Image[]; order_number?: number | null;
  expired_at?: string | null;
};

async function fetchWithCookie(path: string) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
    cache: "no-store",
  });
  return res;
}

async function getCategories(): Promise<Category[]> {
  try {
    const r = await fetchWithCookie("/admin/categories");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.categories || [];
  } catch { return []; }
}

async function getStores(): Promise<Store[]> {
  try {
    const r = await fetchWithCookie("/admin/stores");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.stores || [];
  } catch { return []; }
}

const THEME = {
  pageBg: "bg-slate-950 text-white",
  fx:
    "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.10), transparent 55%)," +
    "radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.08), transparent 50%)",
  glass: "bg-white/5 backdrop-blur-xl ring-1 ring-white/10",
  accent: "bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent",
  muted: "text-slate-400",
};

export default async function AdminStoresPage() {
  const [categories, stores] = await Promise.all([getCategories(), getStores()]);

  return (
    <div className={`relative min-h-screen ${THEME.pageBg}`}>
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ backgroundImage: THEME.fx }} />
      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        {/* header */}
        <div className={`mb-6 rounded-3xl ${THEME.glass} px-6 py-6 shadow-2xl`}>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            เพิ่มร้านค้า <span className={THEME.accent}>Stores</span>
          </h1>
          <p className={`mt-1 text-sm ${THEME.muted}`}>
            อัปโหลดรูปภาพ • ตั้งลำดับรูป • จัดอันดับร้านในหมวด • ระบุวันหมดอายุ
          </p>
        </div>

        {/* content */}
        <div className="grid gap-8">
          <div className={`rounded-3xl ${THEME.glass} p-5 md:p-6 lg:p-8 shadow-xl`}>
            <StoreManager initialCategories={categories} initialStores={stores} />
          </div>

          <div className={`rounded-3xl ${THEME.glass} p-5 md:p-6 lg:p-8 shadow-xl`}>
            <ExpiryPanel />
          </div>
        </div>
      </div>
    </div>
  );
}