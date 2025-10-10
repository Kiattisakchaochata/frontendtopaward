// src/app/api/admin/stores/[id]/renew/route.ts
import { NextRequest, NextResponse } from "next/server";

/** ===== runtime / caching ===== */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RAW_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const API = RAW_API.replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

/** read auth from incoming request */
function upstreamCookie(req: NextRequest) {
  const v = req.cookies.get(AUTH_COOKIE)?.value;
  return v ? `${AUTH_COOKIE}=${v}` : "";
}
function upstreamAuthHeader(req: NextRequest) {
  const h = req.headers.get("authorization");
  return h ? { authorization: h } : {};
}

/** App Router: params must be awaited */
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ message: "Missing store id" }, { status: 400 });
  }

  // body from client: { months: number }
  let payload: any = {};
  try { payload = await req.json(); } catch { payload = {}; }

  // try multiple upstream endpoints (covers differing backends)
  const candidates: Array<{ method: "PATCH" | "POST"; url: string }> = [
    { method: "PATCH", url: `${API}/admin/stores/${encodeURIComponent(id)}/renew` },
    { method: "POST",  url: `${API}/admin/stores/${encodeURIComponent(id)}/renew` },
    { method: "POST",  url: `${API}/admin/store/${encodeURIComponent(id)}/renew` },
    { method: "POST",  url: `${API}/admin/stores/renew/${encodeURIComponent(id)}` },
  ];

  let lastStatus = 404;
  let lastBody = "Not Found";

  for (const c of candidates) {
    try {
      const r = await fetch(c.url, {
        method: c.method,
        headers: {
          "Content-Type": "application/json",
          ...(upstreamCookie(req) ? { cookie: upstreamCookie(req) } : {}),
          ...upstreamAuthHeader(req),
        },
        // server-to-server; credentials ไม่จำเป็น แต่ไม่เป็นไรถ้าใส่
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const text = await r.text();
      lastStatus = r.status;
      lastBody = text;

      // success → return immediately
      if (r.ok) {
        try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
        catch { return new NextResponse(text, { status: r.status }); }
      }

      // keep trying for 404/405; otherwise stop and return upstream error
      if (r.status === 404 || r.status === 405) continue;
      try { return NextResponse.json(JSON.parse(text), { status: r.status }); }
      catch { return new NextResponse(text, { status: r.status }); }
    } catch (e: any) {
      lastStatus = 502;
      lastBody = e?.message || "Bad Gateway";
      // continue to next candidate
    }
  }

  // all candidates failed → return last response
  try { return NextResponse.json(JSON.parse(lastBody), { status: lastStatus }); }
  catch { return new NextResponse(lastBody, { status: lastStatus }); }
}