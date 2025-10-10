"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton({
  className = "ml-4 rounded-lg bg-[#8b4c00] px-4 py-2 text-white text-[15px] font-semibold shadow hover:bg-[#733e00] transition",
  children = "ออกจากระบบ",
}: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onLogout = async () => {
    try {
      setLoading(true);
      // เรียก internal route (รองรับ GET หรือ POST ก็ได้)
      await fetch("/logout", { method: "POST", credentials: "include" });
      // ให้แน่ใจว่า state/route รีเฟรช
      router.replace("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={onLogout} className={className} disabled={loading}>
      {loading ? "กำลังออก..." : children}
    </button>
  );
}