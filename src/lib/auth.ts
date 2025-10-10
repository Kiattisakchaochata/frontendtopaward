// src/lib/auth.ts
import { cookies } from "next/headers";

export const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

export async function setAuthCookie(token: string) {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 วัน
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthCookie() {
  const jar = await cookies();
  return jar.get(AUTH_COOKIE)?.value;
}