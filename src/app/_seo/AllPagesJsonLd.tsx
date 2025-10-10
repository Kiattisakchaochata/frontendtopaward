// src/app/_seo/AllPagesJsonLd.tsx
import React from "react";
export const dynamic = "force-dynamic";
export const revalidate = 0;
// ให้ TypeScript รู้หน้าตา object จาก API (ปรับได้ตามจริง)
type SeoPage = {
  id?: string;
  path?: string;
  title?: string | null;
  description?: string | null;
  og_image?: string | null;
  jsonld?: any;
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const jsonSafe = (o: any) =>
  JSON.stringify(o)
    .replace(/</g, "\\u003c")
    .replace(/<\/script/gi, "<\\/script>");

async function getAllSeoPages(): Promise<SeoPage[]> {
  const API_BASE =
    (process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8899")
      .replace(/\/$/, "");

  const res = await fetch(`${API_BASE}/api/public/seo/pages`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });
  const j = await res.json().catch(() => ({}));
  return (j?.pages || []) as SeoPage[];
}

export default async function AllPagesJsonLd() {
  const pages = await getAllSeoPages();

  // คืน <script type="application/ld+json"> หลายก้อน, เรนเดอร์ใน <head>
  return (
    <>
      {pages.map((p, idx) => {
        const data =
          p?.jsonld && typeof p.jsonld === "object"
            ? p.jsonld
            : {
                "@context": "https://schema.org",
                "@type": "WebPage",
                url: new URL(p.path || "/", SITE_URL).toString(),
                name: p.title || undefined,
                description: p.description || undefined,
                image: p.og_image ? [p.og_image] : undefined,
              };

        return (
          <script
            key={p.id || idx}
            id={`ld-seo-${idx}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonSafe(data) }}
          />
        );
      })}
    </>
  );
}