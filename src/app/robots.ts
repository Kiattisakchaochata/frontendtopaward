// src/app/robots.ts
import type { MetadataRoute } from "next";

const RAW = process.env.NEXT_PUBLIC_SITE_URL ?? "https://10topawards.com";
const SITE_URL = RAW.replace(/\/$/, "").replace(/^http:\/\//, "https://");
const PROD_HOST = "10topawards.com";
const isProd = SITE_URL.includes(PROD_HOST);

export default function robots(): MetadataRoute.Robots {
  // กันพลาด: ถ้าไม่ใช่โดเมนโปรดักชัน ให้บล็อกการเก็บดัชนีทั้งหมด
  if (!isProd) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: [`${SITE_URL}/sitemap.xml`],
    host: SITE_URL,
  };
}