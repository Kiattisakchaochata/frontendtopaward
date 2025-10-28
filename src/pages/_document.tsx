// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || 'Topaward';

export default function Document() {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND,
    url: SITE_URL,
  };
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND,
    url: SITE_URL,
  };

  return (
    <Html lang="th">
      <Head>
        <meta charSet="utf-8" />
        {/* ❌ ลบ meta viewport ออก */}
        {/* ✅ JSON-LD แบบ SSR เห็นใน view-source แน่นอน */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(website).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(org).replace(/</g, '\\u003c'),
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}