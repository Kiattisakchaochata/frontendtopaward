// src/app/admin/layout.tsx
import "../globals.css";
import type { Metadata } from "next";
import AdminNavbar from "@/app/_components/AdminNavbar";

export const metadata: Metadata = {
  title: "Admin | TopAward",
  description: "หน้าแอดมินจัดการข้อมูล",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* แถบเมนูฝั่งแอดมิน */}
      <AdminNavbar />
      {/* ดันเนื้อหาลงให้พ้น sticky header ~56px (h-14) */}
      <main className="min-h-screen bg-transparent text-white pt-14">
        <div className="mx-auto max-w-7xl px-4 py-6">
          {children}
        </div>
      </main>
    </>
  );
}