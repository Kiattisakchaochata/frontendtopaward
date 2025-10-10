// src/app/admin/seo/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';
import { Globe, FileText } from 'lucide-react';

export default function AdminSeoIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-10 text-slate-900">
          กำลังโหลด…
        </div>
      }
    >
      {/* โครงหน้า: พื้นหลังหลักยังเป็น bg-slate-100 จาก layout,
          เราใส่กล่องธีมเข้มให้กลืนกับหน้าร้าน/วิดีโอ/แดชบอร์ด */}
      <main className="container mx-auto max-w-7xl px-4 md:px-6 py-8">
        {/* Header card (เข้ม) */}
        <div className="mb-6 rounded-3xl bg-[radial-gradient(90%_120%_at_10%_0%,rgba(255,215,0,.08),transparent),_radial-gradient(90%_120%_at_90%_-10%,rgba(184,134,11,.07),transparent)] from-slate-900 to-slate-900 bg-slate-900/95 text-white ring-1 ring-white/10 shadow-2xl px-6 py-6">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            จัดการ SEO <span className="bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="mt-1 text-sm text-white/70">
            ตั้งค่า Global และ Page SEO ของเว็บไซต์
          </p>
        </div>

        {/* Content card (เข้ม) */}
        <section className="rounded-3xl bg-slate-900/95 text-white ring-1 ring-white/10 shadow-xl p-5 md:p-6 lg:p-8">
          <div className="grid gap-4">
            {/* Global SEO */}
            <Link
              href="/admin/seo/site"
              className="group block rounded-2xl border border-white/10 bg-[#0f131a]/90 hover:bg-[#121824] transition-all p-5 md:p-6 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow">
                  <Globe className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-lg md:text-xl font-semibold">
                    Global SEO
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    ตั้งค่า Title / Description / OG / JSON-LD ทั้งเว็บไซต์
                  </div>
                </div>
              </div>
            </Link>

            {/* Page SEO */}
            <Link
              href="/admin/seo/pages"
              className="group block rounded-2xl border border-white/10 bg-[#0f131a]/90 hover:bg-[#121824] transition-all p-5 md:p-6 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-lg md:text-xl font-semibold">
                    Page SEO
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    ตั้งค่า SEO รายหน้า (path) และอัปโหลด OG ได้สูงสุด 4 รูป
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </Suspense>
  );
}