// src/app/api/proxy/image/route.ts
import { NextResponse } from "next/server";

export const runtime = "edge"; // หรือ "nodejs" ก็ได้

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const u = searchParams.get("u");
  if (!u) return new NextResponse("Missing u", { status: 400 });

  try {
    const target = new URL(u);
    if (!/^https?:$/.test(target.protocol)) {
      return new NextResponse("Bad URL", { status: 400 });
    }
  } catch {
    return new NextResponse("Bad URL", { status: 400 });
  }

  const upstream = await fetch(u, {
    headers: { Referer: "https://www.tiktok.com/" },
  });

  if (!upstream.ok) {
    return new NextResponse(`Upstream ${upstream.status}`, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  const ct = upstream.headers.get("content-type") || "image/jpeg";

  return new NextResponse(body, {
    headers: {
      "content-type": ct,
      "cache-control": "public, max-age=3600",
      "x-proxied-from": new URL(u).hostname,
    },
  });
}