"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  storeId: string;
  apiBase: string;
  initialAvg?: number;
  initialCount?: number;
  className?: string;
};

/* ดาวเหมือนเดิม แต่เขียนฝั่ง client */
function Star({ fill = 1 }: { fill?: number }) {
  return (
    <span className="relative inline-block">
      <span className="text-white/15">★</span>
      {fill > 0 && (
        <span
          className="absolute left-0 top-0 bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent overflow-hidden"
          style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
        >
          ★
        </span>
      )}
    </span>
  );
}

function Stars({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(5, Number.isFinite(value) ? value : 0));
  const full = Math.floor(v);
  const remainder = v - full;
  const empties = 5 - Math.ceil(v);
  return (
    <span className="inline-flex select-none items-center">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f-${i}`} fill={1} />
      ))}
      {remainder > 0 && <Star fill={remainder} />}
      {Array.from({ length: empties }).map((_, i) => (
        <span key={`e-${i}`} className="text-white/15">★</span>
      ))}
    </span>
  );
}

export default function LiveRatingBadge({
  storeId,
  apiBase,
  initialAvg,
  initialCount,
  className = "",
}: Props) {
  const [avg, setAvg] = useState<number | undefined>(initialAvg);
  const [count, setCount] = useState<number>(initialCount ?? 0);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(
  `${apiBase}/reviews/stores/${encodeURIComponent(storeId)}/reviews`,
  {
    cache: "no-store",   // พอแล้วสำหรับ client
    mode: "cors",        // ชัดเจน (ปกติเป็นค่า default)
    // ไม่ต้องมี headers พิเศษ และไม่ต้อง include credentials ถ้าไม่ใช้คุกกี้
  }
);
      const j = await r.json().catch(() => ({}));
      const reviews: Array<{ rating?: number }> =
        (Array.isArray(j?.reviews) && j.reviews) ||
        (Array.isArray(j) && j) ||
        [];

      const nums = reviews
        .map((x) => Number(x?.rating || 0))
        .filter((n) => Number.isFinite(n) && n > 0);

      const c = nums.length;
      const a = c ? Number((nums.reduce((p, n) => p + n, 0) / c).toFixed(1)) : undefined;

      setAvg(a);
      setCount(c);
    } catch {
      /* no-op */
    }
  }, [apiBase, storeId]);

  useEffect(() => {
    // 1) ฟังอีเวนต์จาก StoreComments หลังส่งรีวิวเสร็จ
    const onUpdated = () => fetchStats();
    window.addEventListener("ta:reviews-updated", onUpdated);

    // 2) เผื่อไม่มีอีเวนต์/เปิดหน้านานๆ ให้ polling เบาๆ
    const id = setInterval(fetchStats, 15000);

    return () => {
      window.removeEventListener("ta:reviews-updated", onUpdated);
      clearInterval(id);
    };
  }, [fetchStats]);

  if (!avg && !count) return null;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white/5 px-3 py-1.5 shadow-sm ${className}`}
    >
      <Stars value={avg || 0} />
      <span className="text-sm text-white/85">
        {avg?.toFixed(1) ?? "0.0"} • {count} รีวิว
      </span>
    </div>
  );
}