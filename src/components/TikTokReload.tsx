"use client";

import { useEffect } from "react";

export default function TikTokReload({ storeId }: { storeId: string }) {
  useEffect(() => {
    function doLoad() {
      try {
        if ((window as any).tiktokEmbedder?.load) {
          (window as any).tiktokEmbedder.load();
        }
      } catch {}
    }

    // ถ้า SDK ยังไม่มี ให้ inject ใหม่
    if (!(window as any).tiktokEmbedder) {
      const s = document.createElement("script");
      s.src = "https://www.tiktok.com/embed.js";
      s.async = true;
      s.onload = doLoad;
      document.body.appendChild(s);
    } else {
      doLoad();
    }

    // กันพลาด trigger อีกทีหลัง mount
    setTimeout(doLoad, 500);
  }, [storeId]);

  return null; // ไม่ render อะไร
}