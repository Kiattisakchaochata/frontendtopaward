// src/components/VisitPing.tsx
"use client";

import { useEffect, useRef } from "react";

// ✅ ถ้ามี NEXT_PUBLIC_API_URL จะใช้เป็น absolute URL
// ถ้าไม่มี จะ fallback เป็น relative path (/api/visitor/...)
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export default function VisitPing({
  kind,
  storeId,
}: {
  kind: "website" | "store";
  storeId?: string;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (kind === "store" && !storeId) return;

    const key =
      kind === "website" ? "visit_once_website" : `visit_once_store_${storeId}`;

    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
    if (sentRef.current) return;
    sentRef.current = true;

    const ping = async () => {
      try {
        // ✅ กำหนด URL
        const url = API_BASE
          ? kind === "website"
            ? `${API_BASE}/visitor/visit/website`
            : `${API_BASE}/visitor/visit/store/${encodeURIComponent(
                String(storeId)
              )}`
          : kind === "website"
          ? `/api/visitor/visit/website`
          : `/api/visitor/visit/store/${encodeURIComponent(String(storeId))}`;

        let ok = false;

        // ✅ ใช้ sendBeacon ถ้ามี
        if (navigator.sendBeacon) {
          const blob = new Blob([], { type: "application/json" });
          ok = navigator.sendBeacon(url, blob);
        } else {
          const r = await fetch(url, {
            method: "POST",
            keepalive: true,
            cache: "no-store",
          });
          ok = r.ok;
        }

        if (ok) {
          sessionStorage.setItem(key, "1");
          console.log(`[VisitPing] ✅ success: ${url}`);
        } else {
          console.warn(`[VisitPing] ❌ failed: ${url}`);
        }
      } catch (err) {
        console.error("[VisitPing] error:", err);
      }
    };

    ping();
  }, [kind, storeId]);

  return null;
}