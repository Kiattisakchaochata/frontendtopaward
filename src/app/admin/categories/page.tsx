import { cookies } from "next/headers";
import CategoryManager from "./CategoryManager";

export const dynamic = "force-dynamic";

/** Premium theme (reuse with Dashboard) */
const THEME = {
  pageBg: "bg-slate-950",
  pageFx:
    "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.10), transparent 55%), " +
    "radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.08), transparent 50%)",
  glass: "bg-white/5 backdrop-blur-xl ring-1 ring-white/10",
  textMain: "text-white",
  textMuted: "text-slate-400",
  accent: "bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent",
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE || "token";

// -------- Server loader (fresh + cookie) --------
async function getCategoriesServer() {
  try {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;
    const res = await fetch(`${API_URL}/admin/categories`, {
      headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : d?.categories || [];
  } catch {
    return [];
  }
}

export default async function AdminCategoriesPage() {
  const initialCategories = await getCategoriesServer();

  return (
    <div className={`relative min-h-screen ${THEME.pageBg} ${THEME.textMain}`}>
      {/* golden glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ backgroundImage: THEME.pageFx }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        {/* header card */}
        <div className={`mb-6 rounded-3xl ${THEME.glass} px-6 py-6 shadow-2xl`}>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            จัดการหมวดหมู่ <span className={THEME.accent}>Categories</span>
          </h1>
          <p className={`mt-1 text-sm ${THEME.textMuted}`}>เพิ่ม / แก้ไข / ลบ พร้อมอัปโหลดภาพปก</p>
        </div>

        {/* content card */}
        <div className={`rounded-3xl ${THEME.glass} p-5 md:p-6 lg:p-8 shadow-xl`}>
          <CategoryManager initialCategories={initialCategories} />
        </div>
      </div>
    </div>
  );
}