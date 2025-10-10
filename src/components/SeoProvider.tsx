'use client';

import dynamic from 'next/dynamic';
import SEO from '@/seo/nextSeoConfig';

/**
 * ⚙️ SeoProvider
 * ใช้สำหรับกำหนดค่า SEO พื้นฐานทั่วทั้งเว็บ เช่น titleTemplate, og, twitter card
 * โดยใช้ library `next-seo` (โหลดแบบ client-only เพื่อกัน error จาก SSR)
 */

// โหลด DefaultSeo แบบ client-only เพื่อกัน hook error ใน SSR
const DefaultSeo = dynamic(
  () => import('next-seo').then((m) => m.DefaultSeo),
  { ssr: false }
);

export default function SeoProvider() {
  return <DefaultSeo {...SEO} />;
}