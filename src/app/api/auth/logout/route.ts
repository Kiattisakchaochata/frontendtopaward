import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serialize } from "cookie";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

export async function POST() {
  // ✅ อ่านคุกกี้จากฝั่งเซิร์ฟเวอร์ (ต้อง await)
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value ?? "";

  // ยิงไป backend โดยส่ง Cookie ติดไปให้ด้วย
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      // ไม่ต้องส่ง credentials จากเบราว์เซอร์ -> เราส่ง cookie เองผ่าน header
      headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
    });
  } catch (e) {
    // เงียบ ๆ พอ — ไม่ให้ logout ล่มเพราะ backend down
    console.error("Logout proxy error:", e);
  }

  // สั่งลบคุกกี้ที่โดเมน Next (ถ้าตั้งไว้) ด้วย Set-Cookie header
  const clear = serialize(AUTH_COOKIE, "", {
    path: "/",
    expires: new Date(0),
    httpOnly: true,
  });

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": clear,
    },
  });
}