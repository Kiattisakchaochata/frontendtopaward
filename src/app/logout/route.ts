// src/app/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");

async function doBackendLogout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      // ถ้า backend ต้องการส่ง cookie เดิมไปด้วย อาจต้องใส่ header: Cookie เอง
      // แต่ส่วนใหญ่แค่ลบ cookie ฝั่ง FE ก็พอ
    });
  } catch {
    // เงียบไว้: ไม่ให้ logout ล้มเหลวเพราะ backend ไม่ตอบ
  }
}

async function handle() {
  // ล็อกเอาท์ฝั่ง backend แบบ best-effort (ไม่บังคับ)
  await doBackendLogout();

  // ลบคุกกี้ auth ฝั่ง Next
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);

  // กลับหน้าแรก
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}

export async function GET()  { return handle(); }
export async function POST() { return handle(); }