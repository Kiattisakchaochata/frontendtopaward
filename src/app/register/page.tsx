// src/app/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "สมัครสมาชิกไม่สำเร็จ");
      // สมัครและล็อกอินสำเร็จ -> กลับหน้าหลัก
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center bg-[#0F172A] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-[#1A1A1A] p-8 shadow-xl ring-1 ring-[#D4AF37]/20"
      >
        <h1 className="mb-6 text-2xl font-bold text-[#FFD700]">สมัครสมาชิก</h1>

        {err ? (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {err}
          </p>
        ) : null}

        <label className="mb-1 block text-sm font-medium text-gray-200">
          ชื่อ
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อของคุณ"
          required
          autoComplete="name"
          className="mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />

        <label className="mb-1 block text-sm font-medium text-gray-200">
          อีเมล
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          type="email"
          required
          autoComplete="email"
          className="mb-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />

        <label className="mb-1 block text-sm font-medium text-gray-200">
          รหัสผ่าน
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="อย่างน้อย 6 ตัวอักษร"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          className="mb-6 w-full rounded-lg border border-[#D4AF37]/30 bg-[#111] px-4 py-2.5 text-sm text-white
                     placeholder:text-gray-400 shadow-sm focus:border-[#FFD700] focus:outline-none
                     focus:ring-2 focus:ring-[#FFD700]/40"
        />

        {/* ปุ่มสมัครสมาชิก (Gradient ทอง) */}
        <button
          disabled={loading}
          className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-black
                     bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                     hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition
                     disabled:opacity-60"
        >
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>

        {/* ปุ่มกลับหน้าหลัก (ขอบทองโปร่ง) */}
        <Link
          href="/"
          className="mt-3 block w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold
                     text-[#FFD700] border border-[#FFD700]/40 hover:bg-[#FFD700]/10 transition"
        >
          กลับหน้าหลัก
        </Link>

        <p className="mt-6 text-center text-sm text-gray-300">
          มีบัญชีแล้ว?{" "}
          <Link
            className="font-semibold text-[#FFD700] hover:underline"
            href="/login"
          >
            เข้าสู่ระบบ
          </Link>
        </p>
      </form>
    </div>
  );
}