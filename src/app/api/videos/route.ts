// src/app/api/videos/route.ts
import { NextRequest, NextResponse } from "next/server";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    // forward query (?active=1&take=12 ...)
    const url = new URL(`${API}/videos`);
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const upstream = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
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