// src/app/admin/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/** Wrapper: ครอบด้วย Suspense เพื่อให้ใช้ useSearchParams ได้อย่างถูกต้อง */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] grid place-items-center text-white/70">กำลังโหลด...</div>}>
      <LoginContent />
    </Suspense>
  );
}

/** เนื้อหาเดิมทั้งหมด ถูกย้ายมาไว้ในคอมโพเนนต์ย่อยนี้ */
function LoginContent() {
  const router = useRouter();
  const q = useSearchParams();
  const redirect = q.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.message || "เข้าสู่ระบบไม่สำเร็จ");
      }

      router.replace(redirect);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] grid place-items-center bg-slate-50">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border bg-white p-6 shadow">
        <h1 className="text-2xl font-extrabold mb-1">Admin Login</h1>
        <p className="text-slate-500 mb-6">เข้าสู่ระบบผู้ดูแล</p>

        {err && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-200">
            {err}
          </div>
        )}

        <label className="block text-sm font-medium mb-1">อีเมล</label>
        <input
          className="mb-4 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 text-slate-900 placeholder-slate-400"
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />

        <label className="block text-sm font-medium mb-1">รหัสผ่าน</label>
        <div className="mb-5 relative">
          <input
            type={showPw ? "text" : "password"}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-slate-900 pr-10 text-slate-900 placeholder-slate-400"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            {showPw ? "ซ่อน" : "แสดง"}
          </button>
        </div>

        <button
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 font-semibold hover:bg-black disabled:opacity-60"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}