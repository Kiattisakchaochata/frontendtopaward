// src/app/login/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

/* ====== ENV / CONST ====== */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const LOGIN_PATH = process.env.BACKEND_LOGIN_PATH || "/auth/login";
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";
function deepFind<T = any>(
  obj: any,
  pick: (k: string, v: any) => T | undefined
): T | undefined {
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

function deepFindToken(obj: any): string | undefined {
  return deepFind<string>(obj, (k, v) =>
    typeof v === "string" && /token|jwt|access[_-]?token/i.test(k) && v
      ? v
      : undefined
  );
}
/* ---------- error helpers (เพิ่มใหม่) ---------- */
const stripHtml = (s: string) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
function firstValidationError(data: any): string | undefined {
  if (!data) return;
  if (Array.isArray(data?.errors)) {
    const m = data.errors.find((e: any) => e?.msg || e?.message || e?.error);
    return m?.msg || m?.message || m?.error;
  }
  if (data?.errors && typeof data.errors === "object") {
    const first = (Object.values(data.errors) as any[]).flat?.() ?? Object.values(data.errors);
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
}
function friendlyError(status: number, data: any, rawText: string) {
  const backend =
    data?.message ||
    data?.error ||
    firstValidationError(data) ||
    (typeof data === "string" ? data : "") ||
    rawText ||
    "";
  const msg = stripHtml(backend);
  const lower = msg.toLowerCase();
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("wrong")) {
    return "อีเมล/ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง";
  }
  if (lower.includes("not found")) return "ไม่พบบัญชีผู้ใช้ หรือข้อมูลไม่ถูกต้อง";

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

/* ====== Server Action: login & redirect ====== */
async function login(formData: FormData) {
  "use server";

  const ident = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  if (!ident || !password) {
    redirect("/login?error=" + encodeURIComponent("กรุณากรอกข้อมูลให้ครบ"));
  }

  const payload =
    ident.includes("@")
      ? { email: ident, password }
      : { username: ident, password };

  // หมายเหตุ: ถ้าต้องการผ่าน proxy ให้เปลี่ยน URL เป็น `${process.env.NEXT_PUBLIC_SITE_URL}/api/login`
  const res = await fetch(`${API_URL}${LOGIN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  if (!res.ok) {
    const msg = friendlyError(res.status || 400, data, raw);
    redirect("/login?error=" + encodeURIComponent(msg));
  }

  // ----- ดึง token จาก response body หรือ Set-Cookie -----
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
  if (m && m[1]) token = m[1];
}

if (!token) {
  redirect("/login?error=" + encodeURIComponent("ไม่พบโทเค็นจากเซิร์ฟเวอร์"));
}

  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  // role (คง helper เดิมของคุณไว้)
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
  function deepFindRole(obj: any): string | undefined {
    return deepFind<string>(obj, (k, v) => (k.toLowerCase() === "role" && typeof v === "string" ? v : undefined));
  }
  function parseJwtRole(token?: string): string | undefined {
    if (!token) return;
    try {
      const [, payload] = token.split(".");
      if (!payload) return;
      const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
      return json?.role || json?.user?.role || json?.data?.user?.role;
    } catch { return; }
  }

  let role =
    parseJwtRole(token) ||
    data?.role ||
    data?.user?.role ||
    data?.data?.user?.role ||
    deepFindRole(data) ||
    "user";

  role = String(role).toLowerCase();
  redirect(role === "admin" ? "/admin" : "/");
}

/* ====== Page (Server Component) ====== */
type SearchParamsInput =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;
function pickFirst(v?: string | string[]) { return Array.isArray(v) ? v[0] : v ?? ""; }

export default async function LoginPage({ searchParams }: { searchParams: SearchParamsInput; }) {
  const sp =
    typeof (searchParams as any)?.then === "function"
      ? await (searchParams as Promise<Record<string, string | string[] | undefined>>)
      : (searchParams as Record<string, string | string[] | undefined>);

  const errorText = pickFirst(sp?.error);

  return (
    <div className="min-h-[70vh] grid place-items-center bg-[#0F172A] px-4">
      <form
        action={login}
        className="w-full max-w-md rounded-2xl bg-[#1A1A1A] p-8 shadow-xl ring-1 ring-[#D4AF37]/20"
      >
        <h1 className="mb-6 text-2xl font-bold text-[#FFD700]">เข้าสู่ระบบ</h1>

        {errorText ? (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {decodeURIComponent(errorText)}
          </p>
        ) : null}

        {/* … ฟอร์มเดิมทั้งหมดของคุณ … */}
        <label className="mb-1 block text-sm font-medium text-gray-200">อีเมลหรือชื่อผู้ใช้</label>
        <input
          name="identifier"
          type="text"
          required
          autoComplete="username"
          placeholder="you@email.com หรือ username"
          className="mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />
        <label className="mb-1 block text-sm font-medium text-gray-200">รหัสผ่าน</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mb-6 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />
        <button className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-black bg-gradient-to-r from-[#FFD700] to-[#B8860B] hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition">
          เข้าสู่ระบบ
        </button>
        <Link
          href="/"
          className="mt-3 block w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-center
                     text-[#FFD700] border border-[#FFD700]/40 hover:bg-[#FFD700]/10 transition"
        >
          กลับหน้าหลัก
        </Link>
        <p className="mt-6 text-center text-sm text-gray-300">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-semibold text-[#FFD700] hover:underline">สร้างบัญชี</Link>
        </p>
      </form>
    </div>
  );
}