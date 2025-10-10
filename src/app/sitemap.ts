// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const API_URL  = process.env.NEXT_PUBLIC_API_URL  || "http://localhost:8899/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ปรับความถี่ตามความเหมาะสม
const CHANGEFREQ = {
  root: "daily",
  lists: "daily",
  detail: "weekly",
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];

  // --- หน้าหลัก & ลิสต์หลัก ---
  urls.push(
    { url: `${SITE_URL}/`,         changeFrequency: CHANGEFREQ.root,  priority: 1.0, lastModified: new Date() },
    { url: `${SITE_URL}/category`, changeFrequency: CHANGEFREQ.lists, priority: 0.8, lastModified: new Date() },
  );

  // --- ดึงหมวดหมู่ ---
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const categories = Array.isArray(data) ? data : data?.categories || [];
      for (const c of categories) {
        if (!c?.id) continue;
        urls.push({
          url: `${SITE_URL}/category/${c.id}`,
          changeFrequency: CHANGEFREQ.detail,
          priority: 0.7,
          lastModified: new Date(),
        });
      }
    }
  } catch {
    // เงียบไว้ ถ้า backend ยังไม่พร้อม sitemap ส่วนนี้จะข้ามไป
  }

  // --- ดึงร้านทั้งหมด (เอาเฉพาะที่ active) ---
  try {
    const res = await fetch(`${API_URL}/stores`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const stores = data?.stores || [];
      for (const s of stores) {
        if (!s?.id || s?.is_active === false) continue;
        urls.push({
          url: `${SITE_URL}/store/${s.id}`,
          changeFrequency: CHANGEFREQ.detail,
          priority: 0.6,
          lastModified: s?.updated_at ? new Date(s.updated_at) : new Date(),
        });
      }
    }
  } catch {
    // เงียบไว้เหมือนกัน
  }

  return urls;
}