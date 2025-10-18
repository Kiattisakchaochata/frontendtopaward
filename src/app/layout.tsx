// src/app/layout.tsx
import AllPagesJsonLd from "./_seo/AllPagesJsonLd";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Noto_Sans_Thai } from "next/font/google";
import Script from "next/script";
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
// import TrackingInjector from "./_components/TrackingInjector"; // STEP 3: ปิดชั่วคราว กันสคริปต์อื่นฉีด GSI เข้ามา
import TikTokReload from "@/components/TikTokReload";
import { GoogleOAuthProvider } from "@react-oauth/google";
import './globals.css';

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

/* STEP 1: บังคับใช้ CLIENT_ID ที่ถูกต้องแบบชัดเจน (กันหลงไปใช้ตัวอื่น) */
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

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
    verification: { google: "AmCgvxN8Swf-ZHjQp_bUq9Q8xKoUdnHSRL2WMQ1FKQA" },
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${APP_NAME}` },
    description: desc,
    applicationName: APP_NAME,
    keywords: kw,
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
    twitter: { card: "summary_large_image", title, description: desc, images: [og] },
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
  // const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!; // STEP 1: ไม่ใช้ตัวนี้ชั่วคราว

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
  {preconnectHosts.map((h, i) => (
    <link key={`pc-${i}`} rel="preconnect" href={h} crossOrigin="" />
  ))}
  {preconnectHosts.map((h, i) => (
    <link key={`dns-${i}`} rel="dns-prefetch" href={h} />
  ))}

    {/* JSON-LD site (มีอยู่แล้ว) */}
  <JsonLd id="ld-site" data={jsonld} />

  {/* ✅ Organization JSON-LD (site logo) — ก้อนเดียวพอ */}
  <script
    id="ld-org"
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "TopAward",
        url: SITE_URL, // dev = http://localhost:3000, prod ค่อยเป็น https://10topawards.com
        logo: `${SITE_URL}/favicon/android-chrome-512x512.png`, // ใช้ absolute URL
        sameAs: [
          "https://www.facebook.com/10topawards",
          "https://www.instagram.com/10topawards"
        ]
      }),
    }}
  />

  {/* JSON-LD อื่น ๆ ของทุกหน้า */}
  <AllPagesJsonLd />
</head>

      <body
        className={`${notoThai.variable} min-h-screen bg-[#0f172a] text-white antialiased`}
        style={{
          fontFamily:
            "var(--font-th), system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans Thai', 'Noto Sans', sans-serif",
        }}
      >
        {/* STEP 2: ปิด GTM ชั่วคราว กันโหลด GSI ผ่านแท็กใน GTM */}
        {/*
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
        */}

        {/* STEP 3: ปิดตัวฉีดสคริปต์ชั่วคราว */}
        {/* <TrackingInjector /> */}

        {/* STEP 4: ใช้ GoogleOAuthProvider ด้วย CLIENT_ID ที่ถูกต้อง + ใส่ key เพื่อบังคับ remount */}
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} key={GOOGLE_CLIENT_ID}>
          <LayoutClientWrapper>{children}</LayoutClientWrapper>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}