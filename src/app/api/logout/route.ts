import { NextResponse } from "next/server";
import { clearAuthCookie, getAuthCookie } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const LOGOUT_PATH = process.env.BACKEND_LOGOUT_PATH || "/auth/logout";

export async function POST() {
  try {
    // ถ้ามี endpoint logout ฝั่ง backend ให้แจ้งด้วย (optional)
    const token = await getAuthCookie();
    if (token) {
      await fetch(`${API_URL}${LOGOUT_PATH}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {});
    }

    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}