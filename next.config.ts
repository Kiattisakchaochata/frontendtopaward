// next.config.ts
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },

      // ✅ รูปจาก TikTok/YouTube/Google ที่ใช้จริง
      { protocol: "https", hostname: "**.tiktokcdn.com" },
      { protocol: "https", hostname: "**.tiktokcdn-us.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.gstatic.com" },
      { protocol: "https", hostname: "www.gstatic.com" },
      // แผนที่มักโหลด tiles/รูปจาก ggpht และ googleapis ด้วย
      { protocol: "https", hostname: "**.ggpht.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
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
    /* ---------------------- DEV MODE ---------------------- */
        /* ---------------------- DEV MODE ---------------------- */
    if (isDev) {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "base-uri 'self'",
                "object-src 'none'",
                "worker-src 'self' blob:",

                // ✅ เพิ่ม GSI + reCAPTCHA สำหรับ DEV
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com",

                "script-src-elem 'self' 'unsafe-inline' https://accounts.google.com https://www.google.com https://www.gstatic.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com",

                // ✅ iframe ของ GSI + reCAPTCHA
                "frame-src 'self' https://accounts.google.com https://www.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com",

                // (เผื่อเบราว์เซอร์บางตัว)
                "child-src 'self' https://accounts.google.com https://www.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com",

                // ✅ network calls
                "connect-src * https://oauth2.googleapis.com",

                // ✅ รูปภาพ (คงเดิม)
                "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://i.ytimg.com https://*.googleusercontent.com https://maps.gstatic.com https://www.gstatic.com https://*.ggpht.com https://maps.googleapis.com",

                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com data:",
              ].join("; "),
            },
          ],
        },
      ];
    }

    /* ---------------------- PROD MODE ---------------------- */
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "worker-src 'self' blob:",

      // ✅ Scripts: Google (GSI/recaptcha/Maps), TikTok, YouTube
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com",
      "script-src-elem 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://accounts.google.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://maps.googleapis.com https://www.tiktok.com https://www.youtube.com",

      // ✅ Frames (embeds)
      "frame-src 'self' https://www.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com",
      // บราวเซอร์บางตัวใช้ child-src กับ iframe เก่า ๆ
      "child-src 'self' https://www.google.com https://accounts.google.com https://www.google.com/recaptcha/ https://*.tiktok.com https://*.youtube.com",

      // ✅ Network calls
      "connect-src 'self' https://10topawards.com https://www.google.com https://www.googleapis.com https://maps.googleapis.com https://*.tiktok.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://*.youtube.com",

      // ✅ Images/Icons (รวม Maps/ggpht)
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com https://i.ytimg.com https://*.googleusercontent.com https://lh3.googleusercontent.com https://maps.gstatic.com https://www.gstatic.com https://*.ggpht.com https://maps.googleapis.com",

      // ✅ Styles/Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
    ].join("; ");

    const coopUnsafeNone = { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" };
    const coopAllowPopups = { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" };

    return [
      { source: "/", headers: [coopUnsafeNone] },
      { source: "/auth/opener", headers: [coopUnsafeNone] },
      { source: "/login", headers: [coopUnsafeNone] },
      { source: "/auth/:path*", headers: [coopUnsafeNone] },
      { source: "/api/auth/google/callback", headers: [coopUnsafeNone] },

      {
        source: "/:path*",
        headers: [
          coopAllowPopups,
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;