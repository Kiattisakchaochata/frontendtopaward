// src/app/admin/analytics/page.tsx
import { cookies } from "next/headers";
import DashboardClient from "../DashboardClient";

export const dynamic = "force-dynamic";

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
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
  const name =
    (pickFirst(raw, ["name", "store_name", "storeName", "title"]) as string) || "";
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
      "created_at","createdAt","registered_at","registeredAt","created","created_date","createdDate",
    ]) as string) ?? null;
  const expired_at =
    (pickFirst(raw, [
      "expired_at","expiredAt","expires_at","expiresAt","expiry_at","expiryAt","expire_at","expireAt",
      "expiry_date","expire_date","end_at","endAt","end_date",
      "subscription.expired_at","membership.expired_at","plan.expires_at","license.expires_at",
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
    const r = await fetchWithCookie("/admin/users");
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.users || [];
  } catch { return []; }
}
// src/app/admin/analytics/page.tsx

async function getVisitorSummary(): Promise<VisitorSummary> {
  try {
    // เดิม: fetch("/api/admin/visitors/summary", { cache: "no-store" } as any)
    // ใหม่: เรียก backend โดยส่งคุกกี้ด้วยเหมือนอันอื่นๆ
    const r = await fetchWithCookie("/visitor/stats");
    if (!r.ok) return {};
    const d = await r.json();
    return d || {};
  } catch {
    return {};
  }
}

export default async function AdminDashboardPage() {
  const [categories, activeRaw, expiredRaw, users, visitorSummary] =
    await Promise.all([
      getCategories(),
      getActiveStores(),
      getExpiredStores(),
      getUsers(),
      getVisitorSummary(),
    ]);

  const active = (activeRaw || []).map(normalizeStore);
  const expired = (expiredRaw || []).map(normalizeStore);

  // 1) Fallback ชื่อจาก visitor summary
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

  // 2) Fallback วันหมดอายุจาก /expired
  const expiredMap = new Map<string, string>();
  for (const e of expired) {
    if (e?.id && e.expired_at) expiredMap.set(String(e.id), e.expired_at);
  }

  // 3) รวมข้อมูล
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
  for (const [id, s] of byId.entries()) {
    if (!s.name || !s.name.trim()) {
      const fall = nameFallback.get(id);
      if (fall) byId.set(id, { ...s, name: fall });
    }
  }

  const stores = Array.from(byId.values());
  const totalVisitors =
    (visitorSummary as any).total_visitors ??
    (visitorSummary as any).totalVisitors ??
    (visitorSummary as any).total ??
    0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-white">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Admin Panel</h1>
      <p className="text-gray-500 mb-6">แดชบอร์ดผู้ดูแลระบบ</p>

      <DashboardClient
        summary={{
          users: users.length,
          categories: categories.length,
          stores: stores.length,
          visitors: Number(totalVisitors) || 0,
        }}
        visitorsByStore={byStoreRaw}
        stores={stores}
        expiredFallback={Array.from(expiredMap.entries())}
      />
    </div>
  );
}