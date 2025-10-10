/* src/components/Navbar.tsx */
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

type Props = {
  loggedIn?: boolean;
  fullBleed?: boolean;
};

const DESKTOP_H = "h-16 lg:h-20";

// เก็บคำค้นล่าสุดใน localStorage (ใช้เป็น suggestions)
function saveRecent(q: string) {
  try {
    const key = "recent_searches";
    const list: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [q, ...list.filter((x) => x !== q)].slice(0, 8);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

export default function Navbar({ loggedIn, fullBleed = true }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [kw, setKw] = useState(""); // desktop
  const [kwMobile, setKwMobile] = useState(""); // mobile

  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);

  // เติมค่าจาก query ปัจจุบัน (ถ้าอยู่หน้า /search)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const q = (url.searchParams.get("q") || "").trim();
      if (q) {
        setKw(q);
        setKwMobile(q);
      }
    } catch {}
  }, []);

  // ให้หน้า /search เรียกโฟกัสช่องค้นหาได้
  useEffect(() => {
    const handler = () => {
      (desktopInputRef.current ?? mobileInputRef.current)?.focus();
    };
    window.addEventListener("focus-global-search", handler);
    return () => window.removeEventListener("focus-global-search", handler);
  }, []);

  function goSearch(query: string) {
    const q = (query || "").trim();
    if (!q) {
      router.push("/search");
    } else {
      saveRecent(q);
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
    setOpen(false);
  }

  function onSubmitDesktop(e: React.FormEvent) {
    e.preventDefault();
    goSearch(kw);
  }
  function onSubmitMobile(e: React.FormEvent) {
    e.preventDefault();
    goSearch(kwMobile);
  }

  /** ---------------- FULL-BLEED ---------------- */
  if (fullBleed) {
    return (
      <>
        <div className={`relative ${DESKTOP_H} w-full px-3 sm:px-4 lg:px-6`}>
          <div className="flex h-full items-center gap-3 lg:gap-6">
            {/* Logo + brand */}
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/LogoTopAward.png"
                alt="TopAward"
                width={40}
                height={40}
                className="h-10 w-10 lg:h-12 lg:w-12"
                priority
              />
              <span className="text-xl lg:text-2xl font-extrabold tracking-tight text-[#FFD700]">
                TopAward
              </span>
            </Link>

            {/* Search (Desktop) */}
            <form onSubmit={onSubmitDesktop} className="ms-auto hidden md:flex flex-1 justify-center">
              <div className="relative w-full max-w-[820px]">
                <input
                  ref={desktopInputRef}
                  id="global-search-input"
                  name="q"
                  value={kw}
                  onChange={(e) => setKw(e.target.value)}
                  placeholder="ค้นหาร้าน / คลินิก / ที่เที่ยว"
                  className="w-full rounded-full bg-white/95 py-2.5 pl-5 pr-12 text-[15px] text-slate-800 shadow
                             ring-1 ring-[#D4AF37]/20 placeholder:text-slate-400
                             focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                />
                <button
                  type="submit"
                  aria-label="ค้นหา"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FFD700] hover:text-[#FFCC33]"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 21l-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </form>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6 ms-6">
              <Link href="/" className="text-[15px] font-medium text-gray-200 hover:text-[#FFD700]">
                หน้าหลัก
              </Link>
              <Link href="/category" className="text-[15px] font-medium text-gray-200 hover:text-[#FFD700]">
                หมวดหมู่
              </Link>

              {!loggedIn ? (
                <Link
                  href="/login"
                  className="ml-4 rounded-lg px-4 py-2 text-[15px] font-semibold text-black
                             bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                             hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md"
                >
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              ) : (
                <div className="ml-4 flex items-center gap-2">
                  <Link
                    href="/account"
                    className="rounded-lg border border-[#D4AF37]/30 px-4 py-2 text-[15px] font-semibold text-gray-100 hover:bg-white/5"
                  >
                    บัญชีของฉัน
                  </Link>
                  <LogoutButton
                    className="rounded-lg px-4 py-2 text-[15px] font-semibold text-black
                               bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                               hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md"
                  />
                </div>
              )}
            </nav>

            {/* Mobile toggle */}
            <button
              className="md:hidden ms-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-[#FFD700] hover:bg-white/5"
              aria-label="เมนู"
              onClick={() => setOpen((s) => !s)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-x-0 top-16 lg:top-20 z-40 bg-[#1C1C1C]/95 backdrop-blur p-3 md:hidden">
            <form onSubmit={onSubmitMobile} className="pb-3">
              <div className="relative">
                <input
                  ref={mobileInputRef}
                  name="q"
                  value={kwMobile}
                  onChange={(e) => setKwMobile(e.target.value)}
                  placeholder="ค้นหาร้าน / คลินิก / ที่เที่ยว"
                  className="w-full rounded-xl bg-white/95 py-2.5 pl-4 pr-10 text-[15px] text-slate-800 shadow
                             ring-1 ring-[#D4AF37]/20 placeholder:text-slate-400
                             focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                />
                <button
                  type="submit"
                  aria-label="ค้นหา"
                  className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-[#D4AF37] hover:bg-white/5"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21l-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-2">
              <Link href="/" className="rounded-lg px-3 py-2 font-semibold text-gray-100 hover:bg-white/5" onClick={() => setOpen(false)}>
                หน้าหลัก
              </Link>
              <Link href="/category" className="rounded-lg px-3 py-2 font-semibold text-gray-100 hover:bg-white/5" onClick={() => setOpen(false)}>
                หมวดหมู่
              </Link>
              {!loggedIn ? (
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-center font-semibold text-black
                             bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                             hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md"
                  onClick={() => setOpen(false)}
                >
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/account"
                    className="rounded-lg border border-[#D4AF37]/30 px-3 py-2 text-center font-semibold text-gray-100 hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    บัญชีของฉัน
                  </Link>
                  <LogoutButton
                    className="rounded-lg px-3 py-2 text-center font-semibold text-black
                               bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                               hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  /** ---------------- STANDALONE (sticky + max-width + พื้นหลังในตัว) ---------------- */
  return (
    <header className={`sticky top-0 z-50 ${DESKTOP_H} border-b border-[#D4AF37]/25 bg-[#1C1C1C]/95 text-white backdrop-blur`}>
      <div className="mx-auto max-w-7xl lg:max-w-8xl h-full px-4 lg:px-6">
        <div className="flex h-full items-center gap-3 lg:gap-6">
          {/* Logo + brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image src="/LogoTopAward.png" alt="TopAward" width={40} height={40} className="h-10 w-10 lg:h-12 lg:w-12" priority />
            <span className="text-xl lg:text-2xl font-extrabold tracking-tight text-[#FFD700] drop-shadow-[0_1px_0_rgba(0,0,0,.3)]">
              TopAward
            </span>
          </Link>

          {/* Search (Desktop) */}
          <form onSubmit={onSubmitDesktop} className="ms-auto hidden md:flex flex-1 justify-center">
            <div className="relative w-full max-w-[680px]">
              <input
                ref={desktopInputRef}
                id="global-search-input"
                name="q"
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder="ค้นหาร้าน / คลินิก / ที่เที่ยว"
                className="w-full rounded-full bg-white/95 py-2.5 pl-5 pr-12 text-[15px] text-slate-800 shadow
                           ring-1 ring-[#D4AF37]/20 placeholder:text-slate-400
                           focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
              />
              <button type="submit" aria-label="ค้นหา" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:text-[#FFD700]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M21 21l-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </form>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 ms-6">
            <Link href="/" className="text-[15px] font-medium text-gray-200 hover:text-[#FFD700] transition">หน้าหลัก</Link>
            <Link href="/category" className="text-[15px] font-medium text-gray-200 hover:text-[#FFD700] transition">หมวดหมู่</Link>

            {!loggedIn ? (
              <Link
                href="/login"
                className="ml-4 rounded-lg px-4 py-2 text-[15px] font-semibold text-black
                           bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                           hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition"
              >
                เข้าสู่ระบบ / สมัครสมาชิก
              </Link>
            ) : (
              <div className="ml-4 flex items-center gap-2">
                <Link href="/account" className="rounded-lg border border-[#D4AF37]/30 px-4 py-2 text-[15px] font-semibold text-gray-100 hover:bg:white/5">
                  บัญชีของฉัน
                </Link>
                <LogoutButton
                  className="rounded-lg px-4 py-2 text-[15px] font-semibold text-black
                             bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                             hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition"
                />
              </div>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden ms-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-[#FFD700] hover:bg-white/5"
            aria-label="เมนู"
            onClick={() => setOpen((s) => !s)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Mobile area (inside container) */}
        {open && (
          <div className="md:hidden pb-4">
            <form onSubmit={onSubmitMobile} className="pb-3">
              <div className="relative">
                <input
                  ref={mobileInputRef}
                  name="q"
                  value={kwMobile}
                  onChange={(e) => setKwMobile(e.target.value)}
                  placeholder="ค้นหาร้าน / คลินิก / ที่เที่ยว"
                  className="w-full rounded-xl bg-white/95 py-2.5 pl-4 pr-10 text-[15px] text-slate-800 shadow
                             ring-1 ring-[#D4AF37]/20 placeholder:text-slate-400
                             focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
                />
                <button type="submit" aria-label="ค้นหา" className="absolute right-2 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-[#D4AF37] hover:bg-white/5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 21l-4.3-4.3M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-2 rounded-xl bg-[#111]/70 p-3 ring-1 ring-[#D4AF37]/20">
              <Link href="/" className="rounded-lg px-3 py-2 font-semibold text-gray-100 hover:bg-white/5" onClick={() => setOpen(false)}>หน้าหลัก</Link>
              <Link href="/category" className="rounded-lg px-3 py-2 font-semibold text-gray-100 hover:bg-white/5" onClick={() => setOpen(false)}>หมวดหมู่</Link>

              {!loggedIn ? (
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-center font-semibold text-black
                             bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                             hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md"
                  onClick={() => setOpen(false)}
                >
                  เข้าสู่ระบบ / สมัครสมาชิก
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/account" className="rounded-lg border border-[#D4AF37]/30 px-3 py-2 text-center font-semibold text-gray-100 hover:bg-white/5" onClick={() => setOpen(false)}>
                    บัญชีของฉัน
                  </Link>
                  <LogoutButton
                    className="rounded-lg px-3 py-2 text-center font-semibold text-black
                               bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                               hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}