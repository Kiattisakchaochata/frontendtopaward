// src/app/api/auth/google/callback/route.ts
import { NextResponse } from 'next/server';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8899').replace(/\/$/, '');
const OAUTH_BACKEND_ENDPOINT = `${API_BASE}/api/auth/oauth/google`;
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "token";

// ใช้ค่าเดียว ตามที่ @react-oauth/google แนะนำ
const REDIRECT_URI = 'postmessage';

async function exchangeCodeForTokens(code: string) {
  const params = new URLSearchParams();
  params.set('code', code);
  params.set('client_id', CLIENT_ID);
  params.set('client_secret', CLIENT_SECRET);
  params.set('redirect_uri', REDIRECT_URI);
  params.set('grant_type', 'authorization_code');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });

  const text = await res.text();

  if (!res.ok) {
    // รวมข้อความ error ของ Google ให้ครบ เพื่อไล่เคส redirect_uri_mismatch / invalid_grant
    let errJson: any = {};
    try { errJson = JSON.parse(text); } catch {}
    console.error('❌ Google token exchange failed', {
      status: res.status,
      error: errJson?.error,
      error_description: errJson?.error_description,
      hint: 'ตรวจ Client type = Web application, origins = http://localhost:3000, ใช้ ClientID/Secret คู่เดียวกัน, และใช้ redirect_uri=postmessage'
    });
    return NextResponse.json(
      { ok:false, stage:'token', error: errJson?.error, error_description: errJson?.error_description || text },
      { status: 400 }
    );
  }

  try { return JSON.parse(text); } catch { return {}; }
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ ok:false, message:'Missing authorization code' }, { status: 400 });

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return NextResponse.json({ ok:false, message:'Missing CLIENT_ID/CLIENT_SECRET on server' }, { status: 500 });
    }

    const tokenRes: any = await exchangeCodeForTokens(code);
    if (tokenRes instanceof Response) return tokenRes; // กรณี error จากฟังก์ชันด้านบน

    // NOTE: บาง backend ต้องการ access_token แทน id_token ⇒ ปรับเฉพาะตรงนี้ให้รองรับ 2 แบบ
    const payload =
      tokenRes?.id_token
        ? { id_token: tokenRes.id_token }
        : tokenRes?.access_token
          ? { access_token: tokenRes.access_token }
          : {};

    if (!Object.keys(payload).length) {
      return NextResponse.json(
        { ok:false, stage:'token', message:'No id_token/access_token from Google' },
        { status: 400 }
      );
    }

    const r = await fetch(OAUTH_BACKEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const txt = await r.text();
    let data:any = {}; try { data = txt ? JSON.parse(txt) : {}; } catch {}

    if (!r.ok) {
      return NextResponse.json(
        { ok:false, stage:'backend', message:data?.message || txt || 'Backend auth failed' },
        { status: r.status || 400 }
      );
    }

    const resp = NextResponse.json({ ok: true, ...data });
    const getSetCookie = (r.headers as any).getSetCookie?.() as string[] | undefined;
    const rawSetCookie = r.headers.get("set-cookie");

    if (getSetCookie?.length) {
      getSetCookie.forEach((c) => resp.headers.append("Set-Cookie", c));
    } else if (rawSetCookie) {
      resp.headers.set("Set-Cookie", rawSetCookie);
    } else if (data?.token) {
      resp.cookies.set(AUTH_COOKIE_NAME, data.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      });
    }

    return resp;
  } catch (e:any) {
    console.error('❌ /api/auth/google/callback error:', e);
    return NextResponse.json({ ok:false, message:e?.message || 'Auth failed' }, { status: 500 });
  }
}