"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ✅ เพิ่มเมนู Tracking เข้าใน NAV
const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/stores", label: "Stores" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/seo", label: "Admin SEO" },
  { href: "/admin/tracking", label: "Tracking" }, // ✅ เมนูใหม่
];

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // ปิดเมนูมือถือเวลาเปลี่ยนหน้า
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } catch (e) {
      console.error(e);
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-[900] w-full border-b bg-white/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-7xl px-4">
        <nav className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link href="/admin" className="font-extrabold text-lg text-black">
            Admin Panel
          </Link>

          {/* Desktop menu */}
          <div className="hidden items-center gap-3 md:flex">
            <ul className="flex gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                      isActive(n.href)
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={handleLogout}
              className="ml-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              ออกจากระบบ
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-md border md:hidden"
            aria-label="เปิดเมนู"
            aria-expanded={open}
          >
            ☰
          </button>
        </nav>

        {/* Mobile drawer */}
        {open && (
          <div className="border-t bg-white md:hidden">
            <ul className="space-y-1 py-2">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={`block rounded-lg px-3 py-2 text-base transition ${
                      isActive(n.href)
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
              <li className="px-1">
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg bg-red-600 px-3 py-2 text-base font-medium text-white hover:bg-red-700"
                >
                  ออกจากระบบ
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </header>
  );
}