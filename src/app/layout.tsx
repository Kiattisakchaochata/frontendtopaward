// src/app/layout.tsx
import AllPagesJsonLd from "./_seo/AllPagesJsonLd";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
import TrackingInjector from "./_components/TrackingInjector";
import TikTokReload from "@/components/TikTokReload";


/* ------------------------------ Font ------------------------------ */
const notoThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-th",
  display: "swap",
});

/* ----------------------------- Constants ----------------------------- */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const APP_NAME = "TopAward";
const APP_DESC = "รวมรีวิวร้าน/คลินิก/ที่เที่ยว พร้อมรูปภาพและเรตติ้ง จัดหมวดหมู่และค้นหาง่าย";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/* --------------------------- Fetch SEO Data --------------------------- */
type PublicSiteSeo = {
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  og_image?: string;
  jsonld?: any;
};

async function fetchSeo(): Promise<PublicSiteSeo | null> {
  if (!API_BASE) {
    console.warn("⚠️ Missing API_BASE, cannot fetch SEO");
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/api/public/seo/site`, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      console.error("❌ SEO API error:", res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    return data?.site || null;
  } catch (err) {
    console.error("❌ Fetch SEO failed:", err);
    return null;
  }
}

/* --------------------------- Next Metadata --------------------------- */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await fetchSeo();

  const title = seo?.meta_title || APP_NAME;
  const desc = seo?.meta_description || APP_DESC;
  const og = seo?.og_image || "/og-image.jpg";
  const kw =
    seo?.keywords?.split(",").map((s) => s.trim()).filter(Boolean) ??
    ["รีวิว", "ร้านค้า", "คลินิก", "ที่เที่ยว", "TopAward"];

  return {
    verification: {
      google: "AmCgvxN8Swf-ZHjQp_bUq9Q8xKoUdnHSRL2WMQ1FKQA",
    },
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${APP_NAME}` },
    description: desc,
    applicationName: APP_NAME,
    keywords: kw,
    // ✅ กลับไปใช้ของเดิม
    alternates: { canonical: "/" },
    manifest: "/favicon/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon/favicon.ico" },
        { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
      shortcut: "/favicon/favicon.ico",
    },
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: APP_NAME,
      title,
      description: desc,
      images: [{ url: og, width: 1200, height: 630, alt: title }],
      locale: "th_TH",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [og],
    },
    robots: { index: true, follow: true },
  };
}

/* ------------------------------ Viewport ------------------------------ */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
  colorScheme: "dark light",
};

/* ------------------------------ JSON-LD ------------------------------ */
function JsonLd({ id, data }: { id: string; data: any }) {
  const json = JSON.stringify(data, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/<\/script/gi, "<\\/script>");
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

/* ------------------------------- Layout ------------------------------- */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;
  const seo = await fetchSeo();

  const jsonld =
    seo?.jsonld && typeof seo.jsonld === "object"
      ? seo.jsonld
      : {
          "@context": "https://schema.org",
          "@type": "WebSite",
          url: SITE_URL,
          name: seo?.meta_title || APP_NAME,
          description: seo?.meta_description || APP_DESC,
          image: seo?.og_image ? [seo.og_image] : ["/og-image.jpg"],
          keywords: seo?.keywords || "TopAward รีวิว ร้าน คลินิก ที่เที่ยว",
        };

  const preconnectHosts = [
    "https://res.cloudinary.com",
    "https://i.ytimg.com",
    "https://img.youtube.com",
    API_BASE || "",
  ].filter(Boolean);

  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="referrer" content="origin-when-cross-origin" />

        {/* ✅ Preconnect / DNS Prefetch (แบบของเดิม) */}
        {preconnectHosts.map((h, i) => (
          <link key={`pc-${i}`} rel="preconnect" href={h} crossOrigin="" />
        ))}
        {preconnectHosts.map((h, i) => (
          <link key={`dns-${i}`} rel="dns-prefetch" href={h} />
        ))}

        <JsonLd id="ld-site" data={jsonld} />
        <AllPagesJsonLd />
      </head>

      <body
        className={`${notoThai.variable} min-h-screen bg-[#0f172a] text-white antialiased`}
        style={{
          fontFamily:
            "var(--font-th), system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans Thai', 'Noto Sans', sans-serif",
        }}
      >
        {/* ✅ Google Tag Manager */}
        {GTM_ID && (
          <>
            <Script
              id="gtm-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
              }}
            />
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        )}

        {/* ✅ Tracking Scripts จาก Admin */}
        <TrackingInjector />

        {/* ✅ ติด TikTok global (กันปัญหาในหน้าโฮม) */}
        

        {/* ✅ Client Side Layout */}
        <LayoutClientWrapper>{children}</LayoutClientWrapper>
      </body>
    </html>
  );
}