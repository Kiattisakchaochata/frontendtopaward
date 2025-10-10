// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // อนุญาตโหลดรูปจาก Cloudinary
      { protocol: "https", hostname: "res.cloudinary.com", },
      { protocol: "https", hostname: "images.unsplash.com", },
      // (ถ้ามีรูปจากโดเมนอื่น เพิ่มได้ที่นี่)
      // { protocol: "https", hostname: "cdn.example.com" },
    ],
  },
  // ลด friction ตอน build ช่วงย้ายจาก React -> Next
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ให้ Next รู้ base URL (จะใช้จริงใน metadata ทีหลัง)
  // ไม่จำเป็นต้องอ่าน env ที่นี่ แต่เก็บไว้เผื่อใช้งาน
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  },
};

export default nextConfig;