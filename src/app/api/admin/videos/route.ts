// src/app/api/admin/videos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

// (ถ้าต้องการกันแคชระดับ route)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET /api/admin/videos → proxy ไป {API}/admin/videos */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(`${API}/admin/videos`);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const token = req.cookies.get(AUTH_COOKIE)?.value;

    const upstream = await fetch(url.toString(), {
      headers: { ...(token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {}) },
      credentials: "include",
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
    });
  } catch (e: any) {
    console.error("videos GET proxy error:", e);
    return NextResponse.json({ message: e?.message || "internal error" }, { status: 500 });
  }
}

/** POST /api/admin/videos → proxy ไป POST {API}/admin/videos */
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const ct = req.headers.get("content-type") || "";

    // ถ้าเป็น multipart/form-data ให้ "ส่งต่อทั้ง stream" ไป backend ตามเดิม
    if (ct.startsWith("multipart/form-data")) {
      const upstream = await fetch(`${API}/admin/videos`, {
  method: "POST",
  headers: {
    "content-type": ct,
    ...(token ? { cookie: `${AUTH_COOKIE}=${token}` } : {}),
  },
  credentials: "include",
  body: req.body,          // stream
  cache: "no-store",
  duplex: "half" as any,          
});

      const text = await upstream.text();
      const res = new NextResponse(text, {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") || "application/json",
        },
      });

      if (upstream.ok) {
        revalidateTag("videos");
        revalidatePath("/");
      }
      return res;
    }

    // ไม่ใช่ multipart → จัดเป็น JSON ปกติ
    const jsonBody = await req.json();
    const upstream = await fetch(`${API}/admin/videos`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { cookie: `${AUTH_COOKIE}=${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(jsonBody),
      cache: "no-store",
    });

    const text = await upstream.text();
    const res = new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });

    if (upstream.ok) {
      revalidateTag("videos");
      revalidatePath("/");
    }
    return res;
  } catch (e: any) {
    console.error("videos POST proxy error:", e);
    return NextResponse.json(
      { message: e?.message || "internal error" },
      { status: 500 }
    );
  }
}