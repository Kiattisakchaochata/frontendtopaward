// src/app/search/SearchClientBits.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function Suggestions({
  tokens = [],
  defaults = [],
}: { tokens?: string[]; defaults?: string[] }) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("recent_searches");
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  // รวม recent + defaults + จากคำค้นย่อย
  const items = useMemo(() => {
    const pool = [...recent, ...defaults, ...tokens].map((s) => s.trim()).filter(Boolean);
    // unique โดยไม่แคร์ตัวพิมพ์ใหญ่/เล็ก
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of pool) {
      const k = w.toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(w); }
      if (out.length >= 16) break;
    }
    return out;
  }, [recent, defaults, tokens]);

  if (items.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((w) => (
        <Link
          key={w}
          href={`/search?q=${encodeURIComponent(w)}`}
          className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/90 hover:bg-white/10"
        >
          {w}
        </Link>
      ))}
    </div>
  );
}

// ปุ่ม "ค้นหาใหม่" → ไป /search แล้วโฟกัสช่องค้นหาทันที
export function RefocusSearchButton({
  children,
  className = "",
}: { children: React.ReactNode; className?: string }) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    // ไปหน้า /search
    window.location.href = "/search";
    // หลังเปลี่ยนหน้า ยิง event ให้ Navbar โฟกัส
    setTimeout(() => {
      window.dispatchEvent(new Event("focus-global-search"));
      const el = document.getElementById("global-search-input") as HTMLInputElement | null;
      el?.focus();
    }, 60);
  }
  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
}