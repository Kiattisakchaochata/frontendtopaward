// src/seo/jsonld.ts
type StoreCategory =
  | 'restaurant'
  | 'cafe'
  | 'laundromat'
  | 'hair-salon'
  | 'car-wash'

export type StoreForSeo = {
  id: string
  name: string
  slug?: string
  description?: string
  address?: string
  phone?: string | null
  email?: string | null
  website?: string | null
  latitude?: number | null
  longitude?: number | null
  cover_image?: string | null
  category_slug: StoreCategory
  social_links?: Record<string, string> | null // { facebook, line, instagram, tiktok }
  avg_rating?: number
  review_count?: number
}

type JsonLdObject = Record<string, unknown>

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

function typeFromCategory(cat: StoreCategory):
  | 'Restaurant'
  | 'CafeOrCoffeeShop'
  | 'Laundromat'
  | 'HairSalon'
  | 'AutoWash'
  | 'LocalBusiness' {
  switch (cat) {
    case 'restaurant':
      return 'Restaurant'
    case 'cafe':
      return 'CafeOrCoffeeShop'
    case 'laundromat':
      return 'Laundromat'
    case 'hair-salon':
      return 'HairSalon'
    case 'car-wash':
      return 'AutoWash'
    default:
      return 'LocalBusiness'
  }
}

/** สร้าง JSON-LD สำหรับร้าน (LocalBusiness subtype) */
export function buildStoreJsonLd(store: StoreForSeo): JsonLdObject {
  const url = `${siteUrl}/stores/${store.slug || store.id}`

  const sameAs: string[] = []
  if (store.social_links) {
    for (const v of Object.values(store.social_links)) {
      if (v) sameAs.push(v)
    }
  }

  const hasGeo =
    store.latitude !== null &&
    store.latitude !== undefined &&
    store.longitude !== null &&
    store.longitude !== undefined

  const hasRatings =
    typeof store.review_count === 'number' &&
    store.review_count > 0 &&
    typeof store.avg_rating === 'number'

  const data: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': typeFromCategory(store.category_slug),
    '@id': `${url}#store`,
    url,
    name: store.name,
    description: store.description || undefined,
    image: store.cover_image || undefined,
    telephone: store.phone || undefined,
    email: store.email || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    aggregateRating: hasRatings
      ? {
          '@type': 'AggregateRating',
          ratingValue: store.avg_rating as number,
          reviewCount: store.review_count as number,
        }
      : undefined,
    address: store.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: store.address, // แบบง่าย; ถ้าต้องละเอียดค่อยแตกฟิลด์เพิ่ม
          addressCountry: 'TH',
        }
      : undefined,
    geo: hasGeo
      ? {
          '@type': 'GeoCoordinates',
          latitude: store.latitude as number,
          longitude: store.longitude as number,
        }
      : undefined,
  }

  return data
}