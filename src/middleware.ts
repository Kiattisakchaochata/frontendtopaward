// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** ---------- ENV ---------- **/
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

/** ---------- helpers ---------- **/
// base64url -> JSON (Edge runtime ไม่มี Buffer)
function parseJwtPayload(token?: string): any | undefined {
  if (!token) return;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return;
    const payload = parts[1];
    const pad = "=".repeat((4 - (payload.length % 4)) % 4);
    const b64 = (payload + pad).replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    return JSON.parse(json);
  } catch {
    return;
  }
}

function extractRole(obj: any): string | undefined {
  return (
    obj?.role ||
    obj?.user?.role ||
    obj?.data?.user?.role ||
    obj?.claims?.role
  );
}

// เรียก /auth/me แบบ timeouts สั้น และไม่ throw
async function safeFetchRoleViaMe(token: string, timeoutMs = 1500): Promise<string | undefined> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `${AUTH_COOKIE}=${token}`,
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return;
    const text = await r.text();
    if (!text) return;
    const data = JSON.parse(text);
    const role = extractRole(data);
    return role ? String(role).toLowerCase() : undefined;
  } catch {
    return;
  }
}

async function getRole(token?: string): Promise<string | undefined> {
  if (!token) return;

  // 1) ลองอ่านจาก JWT ก่อน (เร็ว ไม่ต้องออกเน็ต)
  const payload = parseJwtPayload(token);
  const fromJwt = payload ? extractRole(payload) : undefined;
  if (fromJwt) return String(fromJwt).toLowerCase();

  // 2) ไม่มี role ใน JWT ค่อย fallback ไป /auth/me (ตั้ง timeout สั้น)
  const fromMe = await safeFetchRoleViaMe(token);
  return fromMe ? String(fromMe).toLowerCase() : undefined;
}

/** ---------- middleware ---------- **/
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/login";

  // ----- ป้องกันโซน /admin -----
  if (isAdminRoute) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname + (req.nextUrl.search || ""));
      // กัน index หน้า login ที่เป็นผลจาก redirect ด้วยก็ได้ (เสริม)
      const res = NextResponse.redirect(url);
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    const role = (await getRole(token)) || "user";
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      const res = NextResponse.redirect(url);
      // หน้าโดนบังคับกลับบ้าน ไม่ต้องให้ index
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
    // อนุญาตเข้า /admin และกันไม่ให้ถูก index
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // ----- ถ้า /login แต่มี token แล้ว -----
  if (isLoginPage && token) {
    const role = (await getRole(token)) || "user";
    const url = req.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : "/";
    url.search = searchParams.get("redirect") || "";
    const res = NextResponse.redirect(url);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // ✅ แนบ x-pathname เพื่อให้ฝั่ง server อ่าน path ได้ (ใช้ใน layout.tsx)
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", pathname || "/");

  const res = NextResponse.next({ request: { headers: reqHeaders } });

  // (ถ้าต้องการ) กัน index หน้าบางประเภทนอกเหนือจาก /admin
  // ตัวอย่าง: ปิด index ให้ทุกอย่างใต้ /api ถ้าใส่ matcher ให้จับ /api ด้วย
  if (pathname.startsWith("/api")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return res;
}

/** ---------- matcher ---------- **/
// ไม่ intercept _next, static, favicon, และ api (ถ้าอยากใส่ X-Robots-Tag ให้ /api ให้เพิ่ม '/api/:path*' เข้าไปด้วย)
export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/((?!_next|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
    // ถ้าต้องการตั้ง X-Robots-Tag กับ /api ด้วย ให้ปลดคอมเมนต์บรรทัดถัดไป:
    // "/api/:path*",
  ],
};