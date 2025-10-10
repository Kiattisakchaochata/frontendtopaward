// src/seo/seoSchemas.tsx
import React from 'react';

type OpeningHour = {
  dayOfWeek: string; // e.g. "Monday"
  opens: string;     // "08:00"
  closes: string;    // "19:30"
};

type VideoLite = {
  title: string;
  url: string;
  thumbnailUrl?: string;
};

export type StoreJsonLdProps = {
  id: string;
  name: string;
  url: string;
  description?: string;
  telephone?: string;
  images?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  categoryName?: string;
  rating?: number;
  reviewCount?: number;
  openingHours?: OpeningHour[];
  videos?: VideoLite[];
};

export default function StoreJsonLd(props: StoreJsonLdProps) {
  const {
    url,
    name,
    description,
    telephone,
    images,
    address,
    latitude,
    longitude,
    rating,
    reviewCount,
    openingHours,
    videos,
  } = props;

  // สร้าง JSON-LD แบบ type-safe (ไม่มี any)
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#store`,
    url,
    name,
    description: description || undefined,
    image: images && images.length > 0 ? images : undefined,
    telephone: telephone || undefined,
    address: address
      ? {
          '@type': 'PostalAddress',
          streetAddress: address,
          addressCountry: 'TH',
        }
      : undefined,
    geo:
      typeof latitude === 'number' && typeof longitude === 'number'
        ? {
            '@type': 'GeoCoordinates',
            latitude,
            longitude,
          }
        : undefined,
    aggregateRating:
      typeof reviewCount === 'number' && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: typeof rating === 'number' ? rating : 0,
            reviewCount,
          }
        : undefined,
    openingHoursSpecification: openingHours?.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dayOfWeek,
      opens: h.opens,
      closes: h.closes,
    })),
    hasPart:
      videos && videos.length > 0
        ? videos.map((v) => ({
            '@type': 'VideoObject',
            name: v.title,
            contentUrl: v.url,
            thumbnailUrl: v.thumbnailUrl,
          }))
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      // ไม่ใช้ any: stringify จาก object ที่พิมพ์ชัดเจนด้านบน
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}