// src/app/admin/stores/components/ExpiryPanel.tsx
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8899/api";

const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

type Store = {
  id: string;
  name: string;
  expired_at?: string | null;
  category?: { id: string; name: string } | null;
};

async function fetchWithCookie(path: string) {
  // ✅ ต้อง await cookies()
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
    cache: "no-store",
  });
  return res;
}

function parseDate(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysDiff(from: Date, to: Date) {
  const f = new Date(from); f.setHours(0,0,0,0);
  const t = new Date(to);   t.setHours(0,0,0,0);
  return Math.floor((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function ExpiryPanel() {
  let stores: Store[] = [];
  let ok = false;

  // ถ้ามี endpoint เฉพาะก็ใช้ได้ เช่น /admin/stores/expiring-soon และ /admin/stores/expired
  try {
    const r1 = await fetchWithCookie("/admin/stores/expiring-soon");
    if (r1.ok) {
      const d = await r1.json();
      stores = Array.isArray(d) ? d : d?.stores || [];
      ok = true;
    }
  } catch {}

  if (!ok) {
    try {
      const r2 = await fetchWithCookie("/admin/stores");
      if (r2.ok) {
        const d = await r2.json();
        stores = Array.isArray(d) ? d : d?.stores || [];
      }
    } catch {}
  }

  const now = new Date();
  const withinDays = 30;
  const expired: Store[] = [];
  const expiring: Store[] = [];

  for (const s of stores) {
    const dt = parseDate(s.expired_at);
    if (!dt) continue;
    const diff = daysDiff(now, dt);
    if (diff < 0) expired.push(s);
    else if (diff <= withinDays) expiring.push(s);
  }

  return (
    <div className="bg-white text-black rounded-2xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">สถานะวันหมดอายุร้าน</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">ใกล้หมดอายุ (≤ {withinDays} วัน)</h3>
            <span className="text-sm text-gray-500">{expiring.length} ร้าน</span>
          </div>
          {expiring.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีร้านที่กำลังจะหมดอายุ</div>
          ) : (
            <ul className="divide-y">
              {expiring.map((s) => {
                const dateStr = s.expired_at
                  ? new Date(s.expired_at).toLocaleDateString()
                  : "-";
                return (
                  <li key={s.id} className="py-2">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-600">
                      {s.category?.name ? `หมวด: ${s.category.name} • ` : ""}
                      หมดอายุ: {dateStr}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">หมดอายุแล้ว</h3>
            <span className="text-sm text-gray-500">{expired.length} ร้าน</span>
          </div>
          {expired.length === 0 ? (
            <div className="text-sm text-gray-500">ไม่มีร้านที่หมดอายุ</div>
          ) : (
            <ul className="divide-y">
              {expired.map((s) => {
                const dateStr = s.expired_at
                  ? new Date(s.expired_at).toLocaleDateString()
                  : "-";
                return (
                  <li key={s.id} className="py-2">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-600">
                      {s.category?.name ? `หมวด: ${s.category.name} • ` : ""}
                      หมดอายุ: {dateStr}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}