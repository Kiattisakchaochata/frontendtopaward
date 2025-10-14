// src/app/admin/page.tsx
import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

/** ---------- Premium Theme (Admin) ---------- **/
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
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

type StoreRaw = any;
type Category = { id: string; name: string };
type User = { id: string };
type VisitorByStore = { store_id: string; store_name: string; count: number };
type VisitorSummary = { total_visitors?: number; by_store?: VisitorByStore[] };

type Store = {
  id: string;
  name: string;
  category?: { id?: string; name: string } | null;
  category_name?: string | null;
  created_at?: string | null;
  expired_at?: string | null;
  renew_count?: number | null;
};

// ---------- helpers ----------
function pickFirst(obj: any, paths: string[]): any {
  for (const p of paths) {
    const v = p.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), obj);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function normalizeStore(raw: StoreRaw): Store {
  const name = (pickFirst(raw, ["name", "store_name", "storeName", "title"]) as string) || "";

  const category =
    pickFirst(raw, ["category"]) && {
      id: String(pickFirst(raw, ["category.id"]) ?? ""),
      name: String(pickFirst(raw, ["category.name"]) ?? ""),
    };

  const category_name =
    (pickFirst(raw, ["category_name"]) as string) ??
    (pickFirst(raw, ["category.name"]) as string) ??
    null;

  const created_at =
    (pickFirst(raw, [
      "created_at",
      "createdAt",
      "registered_at",
      "registeredAt",
      "created",
      "created_date",
      "createdDate",
    ]) as string) ?? null;

  const expired_at =
    (pickFirst(raw, [
      "expired_at",
      "expiredAt",
      "expires_at",
      "expiresAt",
      "expiry_at",
      "expiryAt",
      "expire_at",
      "expireAt",
      "expiry_date",
      "expire_date",
      "end_at",
      "endAt",
      "end_date",
      "subscription.expired_at",
      "subscription.expires_at",
      "membership.expired_at",
      "plan.expires_at",
      "license.expires_at",
    ]) as string) ?? null;

  const renew_count =
    (typeof pickFirst(raw, ["renew_count"]) === "number"
      ? (pickFirst(raw, ["renew_count"]) as number)
      : (pickFirst(raw, ["renewCount"]) as number)) ?? 0;

  return {
    id: String(pickFirst(raw, ["id"]) ?? ""),
    name: String(name),
    category: (category as any) || null,
    category_name,
    created_at,
    expired_at,
    renew_count,
  };
}

async function fetchWithCookie(path: string) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
    cache: "no-store",
    credentials: "include",
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
async function getActiveStores(): Promise<StoreRaw[]> {
  try {
    const r = await fetchWithCookie("/admin/stores");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.stores || [];
  } catch { return []; }
}
async function getExpiredStores(): Promise<StoreRaw[]> {
  try {
    const r = await fetchWithCookie("/admin/stores/expired");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.stores || [];
  } catch { return []; }
}
async function getUsers(): Promise<User[]> {
  try {
    // เรียก /users (ไม่ใช่ /admin/users)
    const r = await fetchWithCookie("/users");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.users || d || [];
  } catch { 
    return []; 
  }
}
async function getVisitorSummary(): Promise<VisitorSummary> {
  try {
    const r = await fetchWithCookie("/visitor/stats");
    if (!r.ok) return {};
    const d = await r.json();
    return d || {};
  } catch { return {}; }
}

export default async function AdminDashboardPage() {
  const [categories, activeRaw, expiredRaw, users, visitorSummary] = await Promise.all([
    getCategories(),
    getActiveStores(),
    getExpiredStores(),
    getUsers(),
    getVisitorSummary(),
  ]);

  const active = (activeRaw || []).map(normalizeStore);
  const expired = (expiredRaw || []).map(normalizeStore);

  // 1) fallback ชื่อจาก visitor summary
  const nameFallback = new Map<string, string>();
  const byStoreRaw: VisitorByStore[] =
    (visitorSummary as any).by_store ??
    (visitorSummary as any).byStore ??
    (visitorSummary as any).stores ??
    [];
  for (const v of byStoreRaw) {
    if (v?.store_id && v?.store_name) {
      const nm = String(v.store_name).trim();
      if (nm) nameFallback.set(String(v.store_id), nm);
    }
  }

  // 2) fallback วันหมดอายุจาก /expired
  const expiredMap = new Map<string, string>();
  for (const e of expired) {
    if (e?.id && e.expired_at) expiredMap.set(String(e.id), e.expired_at);
  }

  // 3) รวมข้อมูลแบบ non-destructive
  const byId = new Map<string, Store>();
  for (const s of active) if (s?.id) byId.set(s.id, { ...s });
  for (const e of expired) {
    if (!e?.id) continue;
    const prev = byId.get(e.id) || ({} as Store);
    byId.set(e.id, {
      ...prev,
      ...e,
      name: (prev.name && prev.name.trim()) || (e.name && e.name.trim()) || "",
      category_name: prev.category_name || e.category_name || null,
      category: prev.category || e.category || null,
      expired_at: prev.expired_at || e.expired_at || null,
      renew_count: prev.renew_count ?? e.renew_count ?? 0,
      created_at: prev.created_at || e.created_at || null,
    });
  }
  // 4) เติมชื่อถ้ายังว่าง
  for (const [id, s] of byId.entries()) {
    if (!s.name || !s.name.trim()) {
      const fall = nameFallback.get(id);
      if (fall) byId.set(id, { ...s, name: fall });
    }
  }

  const stores = Array.from(byId.values());
  const validIds = new Set(stores.map(s => String(s.id)));
const visitorsFiltered = byStoreRaw.filter(v => validIds.has(String(v.store_id)));
  const totalVisitors =
    (visitorSummary as any).total_visitors ??
    (visitorSummary as any).totalVisitors ??
    (visitorSummary as any).total ??
    0;

  return (
    <div className={`relative min-h-screen ${THEME.pageBg} ${THEME.textMain}`}>
      {/* premium radial lights */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ backgroundImage: THEME.pageFx }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        {/* Header card */}
        <div className={`mb-6 rounded-3xl ${THEME.glass} px-6 py-6 shadow-2xl`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                แดชบอร์ดผู้ดูแลระบบ <span className={THEME.accent}>Admin Panel</span>
              </h1>
              <p className={`mt-1 text-sm ${THEME.textMuted}`}>
                ภาพรวมสถิติ • ร้านค้า • ผู้ใช้งาน • ผู้เข้าชม
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80">
                {new Date().toLocaleString("th-TH")}
              </span>
            </div>
          </div>
        </div>

        {/* Main card (contains DashboardClient) */}
        <div className={`rounded-3xl ${THEME.glass} p-5 md:p-6 lg:p-8 shadow-xl`}>
          <DashboardClient
            summary={{
              users: users.length,
              categories: categories.length,
              stores: stores.length,
              visitors: Number(totalVisitors) || 0,
            }}
            visitorsByStore={visitorsFiltered} 
            stores={stores}
            expiredFallback={Array.from(expiredMap.entries())}
          />
        </div>
      </div>
    </div>
  );
}