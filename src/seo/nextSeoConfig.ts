// src/seo/nextSeoConfig.ts
import type { DefaultSeoProps } from 'next-seo'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
const SITE_NAME = 'TopAwards'
const DEFAULT_TITLE = 'TopAwards'
const DEFAULT_DESC =
  'รวมสิบคลีนิก สิบร้านดี ร้านเด่ด ไว้ที่นี่ให้แล้ว'

const SEO: DefaultSeoProps = {
  titleTemplate: `%s | ${SITE_NAME}`,
  defaultTitle: DEFAULT_TITLE,
  description: DEFAULT_DESC,
  canonical: SITE_URL,
  openGraph: {
    type: 'website',
    locale: 'th_TH',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    images: [
      {
        url: `${SITE_URL}/og-default.jpg`, // ใส่ไฟล์นี้ใน /public
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - OG Image`,
      },
    ],
  },
  twitter: {
    cardType: 'summary_large_image',
    handle: '@topawards',
    site: '@topawards',
  },
  additionalMetaTags: [
    { name: 'theme-color', content: '#ffffff' },
    { name: 'application-name', content: SITE_NAME },
    { httpEquiv: 'x-ua-compatible', content: 'IE=edge' },
  ],
  additionalLinkTags: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
    { rel: 'manifest', href: '/site.webmanifest' },
  ],
  robotsProps: {
    nosnippet: false,
    maxSnippet: -1,
    maxImagePreview: 'large',
    maxVideoPreview: -1,
    noarchive: false,
    notranslate: false,
    noimageindex: false,
  },
}

export default SEO