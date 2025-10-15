// next.config.ts
import type { NextConfig } from "next";

const TIKTOK = "https://www.tiktok.com";
const YT = "https://www.youtube.com";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // { protocol: "https", hostname: "cdn.example.com" },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  },

  // ✅ เพิ่มส่วน headers เพิ่อผ่อนนโยบายให้ iframe จาก TikTok/YouTube
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            // เปิดเฉพาะฟีเจอร์ที่ TikTok/YouTube ใช้
            // ถ้าต้องการเพิ่มโดเมนอื่นให้เติมในวงเล็บตามรูปแบบเดียวกัน
            value: [
              `accelerometer=(self "${TIKTOK}" "${YT}")`,
              `autoplay=(self "${TIKTOK}" "${YT}")`,
              `gyroscope=(self "${TIKTOK}" "${YT}")`,
              // ตัวอย่างฟีเจอร์อื่น ๆ ถ้าจำเป็น:
              // `camera=()`, `microphone=()`, `clipboard-write=()`,
            ].join(", "),
          },
          // ❗️อย่าตั้ง Document-Policy: unload ที่นี่
          // ถ้า CDN/Proxy ของคุณเคยฉีด header นี้ ให้ไปลบ/ปิดที่ต้นทางนั้น
        ],
      },
    ];
  },
};

export default nextConfig;