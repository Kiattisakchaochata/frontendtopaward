import { NextRequest, NextResponse } from "next/server";

const RAW_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const API = RAW_API.replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

function upstreamCookie(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  return token ? `${AUTH_COOKIE}=${token}` : "";
}
function upstreamAuthHeader(req: NextRequest) {
  const h = req.headers.get("authorization");
  return h ? { Authorization: h } : {};
}

export async function PATCH(req: NextRequest) {
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  // ชื่อเอ็นด์พอยต์เผื่อหลายแบบ
  const candidates = [
    { method: "PATCH", url: `${API}/auth/profile` },
    { method: "PATCH", url: `${API}/users/me` },
    { method: "POST",  url: `${API}/users/profile` },
  ] as const;

  let lastStatus = 404, lastBody = "Not Found";
  for (const c of candidates) {
    try {
      const r = await fetch(c.url, {
        method: c.method,
        headers: {
          "Content-Type": "application/json",
          ...(upstreamCookie(req) ? { Cookie: upstreamCookie(req) } : {}),
          ...upstreamAuthHeader(req),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      lastStatus = r.status; lastBody = text;
      if (r.ok) {
        try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
        catch { return new NextResponse(text, { status: r.status }); }
      }
      if (r.status === 404 || r.status === 405) continue;
      try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
      catch { return new NextResponse(text, { status: r.status }); }
    } catch (e: any) {
      lastStatus = 502; lastBody = e?.message || "Bad Gateway";
    }
  }
  try { return NextResponse.json(JSON.parse(lastBody), { status: lastStatus }); }
  catch { return new NextResponse(lastBody, { status: lastStatus }); }
}