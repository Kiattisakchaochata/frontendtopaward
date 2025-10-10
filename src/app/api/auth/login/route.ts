// src/app/api/auth/login/route.ts
import { API_URL } from "@/lib/env";

export async function POST(req: Request) {
  const body = await req.text();
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // สำคัญ
    body,
  });

  const text = await upstream.text();
  const headers = new Headers();
  // ส่งต่อ Set-Cookie ทั้งหมดจาก backend
  upstream.headers.forEach((v, k) => {
    if (k.toLowerCase() === "set-cookie") headers.append("set-cookie", v);
  });
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/json");
  return new Response(text, { status: upstream.status, headers });
}