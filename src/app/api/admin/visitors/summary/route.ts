// src/app/api/admin/visitors/summary/route.ts
import { NextRequest, NextResponse } from "next/server";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE || "token";

function upstreamCookie(req: NextRequest) {
  const v = req.cookies.get(AUTH_COOKIE)?.value;
  return v ? `${AUTH_COOKIE}=${v}` : "";
}

// ✅ helper แปลงสคีมาให้เป็นรูปแบบเดียว
function normalizePayload(raw: any) {
  // 1) รูปแบบที่ backend ของคุณส่งมา (totalVisitors + perStore[])
  if (raw && Array.isArray(raw.perStore)) {
    const rows = raw.perStore
      .filter((r: any) => r?.storeId) // ข้ามรายการที่ไม่มี storeId
      .map((r: any) => ({
        store_id: String(r.storeId),
        store_name: String(r?.store?.name ?? "").trim(),
        count: Number(r.total) || 0,
      }));
    const total =
      Number(raw.totalVisitors ?? raw.total ?? 0);
    return { total_visitors: total, by_store: rows };
  }

  // 2) รูปแบบที่ตรงอยู่แล้ว — ส่งกลับเลย
  if (Array.isArray(raw?.by_store) || Array.isArray(raw?.byStore) || Array.isArray(raw?.stores)) {
    return {
      total_visitors: Number(raw.total_visitors ?? raw.totalVisitors ?? raw.total ?? 0),
      by_store: (raw.by_store ?? raw.byStore ?? raw.stores) as any[],
    };
  }

  // 3) เผื่อ API ใช้ชื่ออื่น
  if (Array.isArray(raw?.data)) {
    return {
      total_visitors: Number(raw.total ?? 0),
      by_store: raw.data,
    };
  }

  // ไม่รู้จักรูปแบบ → ส่งกลับดิบๆ (หน้า client จะยังกัน null ไว้อยู่)
  return raw;
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || undefined;

    const tryPaths = [
      "/admin/visitors/summary",
      "/admin/visitor/summary",
      "/visitors/summary",
      "/visitor/summary",
      "/admin/visitors/stats",
      "/admin/visitor/stats",
      "/visitors/stats",
      "/visitor/stats",
    ];

    let lastText = "";
    let lastStatus = 404;

    for (const p of tryPaths) {
      const res = await fetch(`${API}${p}`, {
        method: "GET",
        headers: {
          ...(upstreamCookie(req) ? { Cookie: upstreamCookie(req) } : {}),
          ...(auth ? { Authorization: auth } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      const text = await res.text();
      lastText = text;
      lastStatus = res.status;

      if (!res.ok) continue;

      // ✅ แปลง payload ก่อนส่งให้ client
      try {
        const json = JSON.parse(text);
        const normalized = normalizePayload(json);
        return NextResponse.json(normalized, { status: res.status });
      } catch {
        // ไม่ใช่ JSON ก็ส่งดิบๆ
        return new NextResponse(text, {
          status: res.status,
          headers: { "content-type": res.headers.get("content-type") || "text/plain" },
        });
      }
    }

    return NextResponse.json(
      { message: "visitors summary endpoint not found", detail: lastText },
      { status: lastStatus || 404 }
    );
  } catch (e: any) {
    console.error("GET /api/admin/visitors/summary error:", e);
    return NextResponse.json({ message: e?.message || "internal error" }, { status: 500 });
  }
}