// src/app/api/admin/videos/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

/** GET one (optional helper) */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = (await params).id;
  const upstream = await fetch(`${API_BASE}/admin/videos/${encodeURIComponent(id)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  });
}

/** PATCH update video — รองรับทั้ง JSON และ multipart/form-data */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = (await params).id;
    if (!id) return NextResponse.json({ message: "missing id" }, { status: 400 });

    const token = req.cookies.get(AUTH_COOKIE)?.value;
    const ct = req.headers.get("content-type") || "";

    // ✅ multipart: stream-through + ต้องมี duplex: 'half'
    if (ct.startsWith("multipart/form-data")) {
      const upstream = await fetch(`${API_BASE}/admin/videos/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "content-type": ct, // ต้องคง boundary เดิมไว้
          ...(token ? { cookie: `${AUTH_COOKIE}=${token}` } : {}),
        },
        credentials: "include",
        body: req.body,            // stream ผ่านไป backend
        cache: "no-store",
        duplex: "half" as any,     // 👈 สำคัญใน Node.js (TS ใช้ as any)
      });

      const text = await upstream.text();
      const res = new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
      });

      if (upstream.ok) {
        revalidateTag("videos");
        revalidatePath("/");
      }
      return res;
    }

    // ✅ JSON ปกติ
    const body = await req.json();
    const forward: Record<string, any> = { ...body };

    // normalize store_id / storeId
    if (forward.store_id === undefined && forward.storeId !== undefined) forward.store_id = forward.storeId;
    if (forward.store_id === "") forward.store_id = null; // unbind
    if (forward.store_id !== undefined) forward.storeId = forward.store_id;

    const upstream = await fetch(`${API_BASE}/admin/videos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...(token ? { cookie: `${AUTH_COOKIE}=${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(forward),
      cache: "no-store",
    });

    const text = await upstream.text();
    const res = new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    });

    if (upstream.ok) {
      revalidateTag("videos");
      revalidatePath("/");
    }
    return res;
  } catch (e: any) {
    console.error("PATCH /api/admin/videos/[id] error:", e);
    return NextResponse.json({ message: e?.message || "internal error" }, { status: 500 });
  }
}

/** DELETE */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = (await params).id;
  const token = req.cookies.get(AUTH_COOKIE)?.value;

  const upstream = await fetch(`${API_BASE}/admin/videos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...(token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {}) },
    credentials: "include",
    cache: "no-store",
  });

  const text = await upstream.text();
  const res = new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
  });

  if (upstream.ok) {
    revalidateTag("videos");
    revalidatePath("/");
  }

  return res;
}