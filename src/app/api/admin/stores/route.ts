// src/app/api/admin/stores/route.ts
import { NextRequest, NextResponse } from "next/server";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

/**
 * Proxy รายการร้านไปยัง backend: GET /admin/stores
 * รองรับ query ทั้งหมด (ยกเว้นตัวช่วยอย่าง "_" ที่เอาไว้ bust cache)
 */
export async function GET(req: NextRequest) {
  try {
    // เก็บ query ทั้งหมด แล้วตัด _ ออก (เป็น cache buster)
    const sp = new URLSearchParams(req.nextUrl.searchParams);
    sp.delete("_");

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const upstreamUrl =
      `${API}/admin/stores` + (sp.toString() ? `?${sp.toString()}` : "");

    const res = await fetch(upstreamUrl, {
      method: "GET",
      // ส่ง cookie ไปที่ backend ด้วย (บาง backend ใช้ cookie แทน header Authorization)
      headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : undefined,
      credentials: "include",
      cache: "no-store",
    });

    // ส่งสถานะเดียวกับ backend กลับไป
    const text = await res.text();
    try {
      // ถ้าเป็น JSON ก็ส่งเป็น JSON
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: res.status });
    } catch {
      // ถ้าไม่ใช่ JSON ส่งเป็น text
      return new NextResponse(text, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") || "text/plain" },
      });
    }
  } catch (e: any) {
    console.error("GET /api/admin/stores error:", e);
    return NextResponse.json(
      { message: e?.message || "internal error" },
      { status: 500 }
    );
  }
}