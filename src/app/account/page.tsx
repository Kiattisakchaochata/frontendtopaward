import { cookies } from "next/headers";
import AccountClient from "./AccountClient";

export const dynamic = "force-dynamic";

/** ---------- THEME (match premium) ---------- **/
const THEME = {
  pageBg: "bg-[#0F172A]",
  pageFx:
    "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.10), transparent 55%), " +
    "radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.08), transparent 50%)",
  glass: "bg-white/5 backdrop-blur ring-1 ring-white/10",
  textMain: "text-white",
  textMuted: "text-slate-300",
  accent: "bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent",
};

const RAW_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const API = RAW_API.replace(/\/$/, "");
const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME ||
  process.env.NEXT_PUBLIC_AUTH_COOKIE ||
  "token";

// ---- fetch helpers (ใช้ cookie เดิม) ----
async function fetchWithCookie(path: string) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  return fetch(`${API}${path}`, {
    headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
    cache: "no-store",
    credentials: "include",
  });
}

async function getMe(): Promise<any | null> {
  // รองรับหลาย backend (/auth/me | /users/me | /me)
  for (const p of ["/auth/me", "/users/me", "/me"]) {
    try {
      const r = await fetchWithCookie(p);
      if (!r.ok) continue;
      const j = await r.json();
      if (j && typeof j === "object") return j.user ?? j.data ?? j;
    } catch {}
  }
  return null;
}

export default async function AccountPage() {
  const me = await getMe();

  // ถ้าไม่ล็อกอิน แสดงให้ไปล็อกอิน
  if (!me) {
    return (
      <div className={`min-h-screen ${THEME.pageBg} ${THEME.textMain} relative`}>
        <div className="absolute inset-0 opacity-80" style={{ backgroundImage: THEME.pageFx }} />
        <div className="relative mx-auto max-w-3xl px-4 py-16">
          <div className={`rounded-2xl ${THEME.glass} p-8`}>
            <h1 className="text-2xl font-extrabold">บัญชีผู้ใช้</h1>
            <p className={`${THEME.textMuted} mt-2`}>กรุณาเข้าสู่ระบบเพื่อจัดการบัญชีของคุณ</p>
            <div className="mt-6 flex gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white/90"
              >
                ไปหน้าเข้าสู่ระบบ
              </a>
              {/* ปุ่มกลับหน้าหลัก */}
              <a
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2 text-sm font-medium text-slate-900 shadow hover:opacity-95 active:scale-[.98]"
              >
                กลับหน้าหลัก
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ถ้าล็อกอินแล้ว
  return (
    <div className={`min-h-screen ${THEME.pageBg} ${THEME.textMain} relative`}>
      <div className="absolute inset-0 opacity-80" style={{ backgroundImage: THEME.pageFx }} />
      <div className="relative mx-auto max-w-5xl px-4 py-10 lg:py-12">
        <div className={`mb-6 rounded-3xl ${THEME.glass} px-6 py-6 shadow-2xl`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                บัญชีผู้ใช้ <span className={THEME.accent}>Account</span>
              </h1>
              <p className={`${THEME.textMuted} mt-1 text-sm`}>จัดการโปรไฟล์ • รหัสผ่าน • การตั้งค่า</p>
            </div>
            {/* ปุ่มกลับหน้าหลัก */}
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#B8860B] px-4 py-2 text-sm font-medium text-slate-900 shadow hover:opacity-95 active:scale-[.98]"
            >
              กลับหน้าหลัก
            </a>
          </div>
        </div>

        <div className={`rounded-3xl ${THEME.glass} p-5 md:p-6 lg:p-8 shadow-xl`}>
          <AccountClient me={me} />
        </div>
      </div>
    </div>
  );
}