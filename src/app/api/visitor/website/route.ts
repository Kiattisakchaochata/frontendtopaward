import { NextResponse } from "next/server";

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");

// ไม่ต้อง cache, ไม่ต้อง credentials
export async function POST() {
  try {
    const upstream = await fetch(`${API}/visitor/visit/website`, {
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
    console.error("POST /api/visitor/website error:", e);
    return NextResponse.json({ message: e?.message || "internal error" }, { status: 500 });
  }
}