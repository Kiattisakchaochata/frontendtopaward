// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  },

  async headers() {
    if (isDev) {
      // DEV: ปิด COOP ทั้งไซต์เพื่อตัด noise
      return [
        {
          source: "/:path*",
          headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
        },
      ];
    }

    // PROD: เปิดเฉพาะที่จำเป็น
    return [
      // ✅ หน้า root (เริ่มกด login จากหน้า Home)
      {
        source: "/",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },

      // ✅ page สำหรับ popup ลงมาแล้วปิดตัวเอง
      {
        source: "/auth/opener",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },

      // ✅ หน้า login และเส้นทาง OAuth
      {
        source: "/login",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },
      {
        source: "/auth/:path*",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },

      // ✅ callback ของ Google (ระบุชัดให้แน่ใจ)
      {
        source: "/api/auth/google/callback",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },
      {
        source: "/api/auth/:path*",
        headers: [{ key: "Cross-Origin-Opener-Policy", value: "unsafe-none" }],
      },

      // ✅ ที่เหลือคง "same-origin-allow-popups"
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },

          // 🔒 เพิ่ม Content-Security-Policy สำหรับ reCAPTCHA / Google resources
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
              "frame-src https://www.google.com",
              "img-src 'self' data: https://www.google.com https://www.gstatic.com",
              "connect-src 'self' https://www.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;