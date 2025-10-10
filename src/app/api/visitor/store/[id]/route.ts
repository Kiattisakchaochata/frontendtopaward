import { NextRequest, NextResponse } from "next/server";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    // ⬅️ ต้อง await ก่อน
    const { id } = await ctx.params;

    const upstream = await fetch(`${API}/visitor/visit/store/${encodeURIComponent(id)}`, {
      method: "POST",
      cache: "no-store",
    });

    const text = await upstream.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return new NextResponse(text, { status: upstream.status });
    }
  } catch (e: any) {
    console.error("POST /api/visitor/store/[id] error:", e);
    return NextResponse.json({ message: e?.message || "proxy error" }, { status: 500 });
  }
}