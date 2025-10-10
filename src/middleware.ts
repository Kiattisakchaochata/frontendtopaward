// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** ---------- ENV ---------- **/
const API_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

/** ---------- helpers ---------- **/
function parseJwtRole(token?: string): string | undefined {
  if (!token) return;
  try {
    const [, payload] = token.split(".");
    if (!payload) return;
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return (json?.role || json?.user?.role || json?.data?.user?.role || json?.claims?.role);
  } catch {
    return;
  }
}
async function fetchRoleViaMe(token: string): Promise<string | undefined> {
  try {
    const r = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Cookie: `${AUTH_COOKIE}=${token}` },
      cache: "no-store",
    });
    const text = await r.text();
    const data = text ? JSON.parse(text) : {};
    return (data?.role || data?.user?.role || data?.data?.user?.role || data?.claims?.role);
  } catch {
    return;
  }
}
async function getRole(token?: string): Promise<string | undefined> {
  if (!token) return;
  const fromMe = await fetchRoleViaMe(token);
  if (fromMe) return String(fromMe).toLowerCase();
  const fromJwt = parseJwtRole(token);
  return fromJwt ? String(fromJwt).toLowerCase() : undefined;
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
      return NextResponse.redirect(url);
    }
    const role = (await getRole(token)) || "user";
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ----- ถ้า /login แต่มี token แล้ว -----
  if (isLoginPage && token) {
    const role = (await getRole(token)) || "user";
    const url = req.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin" : "/";
    url.search = searchParams.get("redirect") || "";
    return NextResponse.redirect(url);
  }

  // ✅ แนบ x-pathname เพื่อให้ฝั่ง server อ่าน path ได้ (ใช้ใน layout.tsx)
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-pathname", pathname || "/");
  return NextResponse.next({
    request: { headers: reqHeaders },
  });
}

/** ---------- matcher ---------- **/
export const config = {
  matcher: ["/admin/:path*", "/login", "/((?!_next|favicon|api).*)"], // ครอบทุกเพจ public
};