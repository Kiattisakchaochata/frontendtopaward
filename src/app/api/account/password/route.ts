import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

// map body ให้รองรับหลายชื่อฟิลด์
function normalizeBody(raw: any) {
  const oldPw =
    raw?.old_password ??
    raw?.current_password ??
    raw?.oldPassword ??
    raw?.currentPassword ??
    raw?.password_old ??
    raw?.passwordCurrent ??
    raw?.current ??
    null;

  const newPw =
    raw?.new_password ??
    raw?.password ??
    raw?.newPassword ??
    raw?.password_new ??
    raw?.passwordNew ??
    raw?.next ??
    null;

  return {
    old_password: oldPw,
    new_password: newPw,
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/account/password" });
}

export async function POST(req: NextRequest) {
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const body = normalizeBody(payload);

  // ยิง “เป้าเดียว” -> /auth/change-password (POST)
  try {
    const r = await fetch(`${API}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(upstreamCookie(req) ? { Cookie: upstreamCookie(req) } : {}),
        ...upstreamAuthHeader(req),
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const text = await r.text();
    if (r.ok) {
      try {
        return NextResponse.json(JSON.parse(text), { status: r.status });
      } catch {
        return new NextResponse(text, { status: r.status });
      }
    }

    try {
      return NextResponse.json(JSON.parse(text), { status: r.status });
    } catch {
      return new NextResponse(text, { status: r.status });
    }
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Bad Gateway" },
      { status: 502 }
    );
  }
}