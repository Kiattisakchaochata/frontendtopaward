// src/app/api/admin/stores/route.ts
import { NextRequest, NextResponse } from "next/server";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

// แปลงสถานะจาก backend หลายรูปแบบ -> boolean
function normalizeActive(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["0", "false", "no", "off"].includes(s)) return false;
    if (["1", "true", "yes", "on"].includes(s)) return true;
  }
  return true;
}
function isExpired(expired_at?: string | null) {
  if (!expired_at) return false;
  const t = new Date(expired_at).getTime();
  return Number.isFinite(t) && t <= Date.now();
}

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const popular = sp.get("popular");
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  // ลอง public ก่อน → ไม่ต้องคุกกี้, แล้วค่อย fallback เป็น admin → ต้องคุกกี้
  const candidates: Array<{ url: string; withAuth: boolean }> = [
    { url: `${API}/stores?${sp.toString()}`, withAuth: false },
    { url: `${API}/public/stores?${sp.toString()}`, withAuth: false },
    { url: `${API}/admin/stores?${sp.toString()}`, withAuth: true },
  ];

  let ok: Response | null = null;
  for (const c of candidates) {
    try {
      const r = await fetch(c.url, {
        cache: "no-store",
        credentials: "include",
        headers: c.withAuth && token ? { cookie: `${AUTH_COOKIE}=${token}` } : undefined,
        next: { revalidate: 0 },
      });
      if (r.ok) { ok = r; break; }
      // ถ้า admin แล้วได้ 401 ให้ลองตัวถัดไป (หรือจบ)
    } catch {
      // ข้ามไปตัวถัดไป
    }
  }
  if (!ok) return NextResponse.json({ stores: [] }, { status: 200 });

  const raw = await ok.json();
  const list: any[] = Array.isArray(raw) ? raw : raw?.stores || raw?.data || [];

  const stores = list
    .map((s) => ({
      id: String(s.id),
      name: s.name ?? "",
      description: s.description ?? null,
      address: s.address ?? null,
      cover_image: s.cover_image ?? null,
      images: s.images ?? [],
      is_active: normalizeActive(s.is_active ?? s.active ?? s.status),
      expired_at: s.expired_at ?? null,
      created_at: s.created_at ?? null,
      avg_rating: typeof s.avg_rating === "number" ? s.avg_rating : Number(s.avg_rating ?? 0),
      popular: normalizeActive(s.popular ?? s.is_popular ?? 0),
    }))
    .filter((s) => s.is_active && !isExpired(s.expired_at))
    .filter((s) => (popular === "1" ? s.popular : true));

  return NextResponse.json({ stores }, { status: 200 });
}