// src/app/api/login/route.ts
import { NextResponse } from "next/server";
import { setAuthCookie, AUTH_COOKIE } from "@/lib/auth";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const LOGIN_PATH = process.env.BACKEND_LOGIN_PATH || "/auth/login";

/* ----------------------------- helpers ----------------------------- */
function deepFind<T = any>(obj: any, pick: (k: string, v: any) => T | undefined): T | undefined {
  if (!obj || typeof obj !== "object") return;
  for (const [k, v] of Object.entries(obj)) {
    const got = pick(k, v);
    if (got !== undefined) return got;
    if (v && typeof v === "object") {
      const child = deepFind(v, pick);
      if (child !== undefined) return child;
    }
  }
}
const deepFindToken = (o: any) =>
  deepFind<string>(o, (k, v) => (typeof v === "string" && /token|jwt|access[_-]?token/i.test(k) ? v : undefined));
const deepFindRole = (o: any) =>
  deepFind<string>(o, (k, v) => (k.toLowerCase() === "role" && typeof v === "string" ? v : undefined));

function parseJwtRole(token?: string): string | undefined {
  if (!token) return;
  try {
    const [, payload] = token.split(".");
    if (!payload) return;
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return json?.role || json?.user?.role || json?.data?.user?.role;
  } catch { return; }
}

async function fetchRoleViaMe(token: string): Promise<string | undefined> {
  try {
    const r = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `${AUTH_COOKIE}=${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const t = await r.text();
    let data: any = {};
    try { data = t ? JSON.parse(t) : {}; } catch {}
    return data?.role || data?.user?.role || data?.data?.user?.role || deepFindRole(data);
  } catch { return; }
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function firstValidationError(data: any): string | undefined {
  // รองรับรูปแบบ errors ต่าง ๆ
  if (!data) return;
  if (Array.isArray(data?.errors)) {
    const m = data.errors.find((e: any) => e?.msg || e?.message || e?.error);
    return m?.msg || m?.message || m?.error;
  }
  if (data?.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors).flat?.() ?? Object.values(data.errors);
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  return;
}

function friendlyError(status: number, data: any, rawText: string): string {
  // ถ้ามีข้อความจาก backend ใช้ก่อน (ทำความสะอาด)
  const backend =
    data?.message ||
    data?.error ||
    firstValidationError(data) ||
    (typeof data === "string" ? data : "") ||
    rawText ||
    "";

  const msg = stripHtml(String(backend || ""));

  // ถ้า backend บอกชัดเจนว่า invalid/incorrect → แปลเป็นไทย
  const lower = msg.toLowerCase();
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("wrong")) {
    return "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
  }
  if (lower.includes("not found") || lower.includes("user") && lower.includes("not")) {
    return "ไม่พบบัญชีผู้ใช้ หรือข้อมูลไม่ถูกต้อง";
  }

  // map ตามสถานะ
  switch (status) {
    case 400:
    case 401:
      return "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
    case 403:
      return "ไม่มีสิทธิ์เข้าถึงระบบ";
    case 422:
      return msg || "ข้อมูลไม่ครบถ้วนหรือรูปแบบไม่ถูกต้อง";
    case 429:
      return "พยายามหลายครั้งเกินไป โปรดลองใหม่ภายหลัง";
    case 500:
      return "เซิร์ฟเวอร์ขัดข้อง โปรดลองใหม่อีกครั้ง";
    default:
      return msg || "เข้าสู่ระบบไม่สำเร็จ";
  }
}

/* ------------------------------ handler ------------------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const payload: Record<string, string> = { password: body?.password || "" };
    if (body?.email) payload.email = body.email;
    if (body?.username) payload.username = body.username;

    const res = await fetch(`${API_URL}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    let data: any = {};
    try { data = rawText ? JSON.parse(rawText) : {}; } catch {}

    if (!res.ok) {
      const message = friendlyError(res.status || 400, data, rawText);
      return NextResponse.json({ ok: false, message }, { status: res.status || 400 });
    }

    // token
    let token: string | undefined =
      data?.token ||
      data?.access_token ||
      data?.accessToken ||
      data?.jwt ||
      data?.data?.token ||
      data?.data?.access_token ||
      data?.user?.token ||
      data?.user?.access_token ||
      deepFindToken(data);

    if (!token) {
      const setCookie = res.headers.get("set-cookie") || "";
      const m = setCookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
      if (m?.[1]) token = m[1];
    }
    if (!token) {
      return NextResponse.json({ ok: false, message: "ไม่พบ token จากเซิร์ฟเวอร์" }, { status: 500 });
    }

    await setAuthCookie(token);

    let role =
      (await fetchRoleViaMe(token)) ||
      parseJwtRole(token) ||
      deepFindRole(data) ||
      "user";

    role = String(role).toLowerCase();
    const redirectTo = role === "admin" ? "/admin" : "/";

    return NextResponse.json({ ok: true, role, redirectTo });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}