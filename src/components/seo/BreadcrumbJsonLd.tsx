// src/components/seo/BreadcrumbJsonLd.tsx
import 'server-only';

type Crumb = { name: string; url: string };

function escapeJsonLd(s: string) {
  // กัน < และ </script
  return s.replace(/</g, '\\u003c').replace(/<\/script/gi, '<\\/script');
}

export default function BreadcrumbJsonLd({
  id = 'ld-breadcrumb',
  items,
}: {
  id?: string;
  items: Crumb[]; // เรียงจากซ้ายไปขวา: Home -> ... -> Current
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };

  const json = escapeJsonLd(JSON.stringify(data, null, 2));
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}