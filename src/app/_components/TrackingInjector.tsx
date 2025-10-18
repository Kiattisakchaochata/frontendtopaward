'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

type Placement  = 'HEAD' | 'BODY_START' | 'BODY_END';
type Strategy   = 'beforeInteractive' | 'afterInteractive' | 'lazyOnload' | string;

type Item = {
  id: string;
  provider: 'GA4' | 'GTM' | 'FacebookPixel' | 'TikTokPixel' | 'Custom' | string;
  trackingId: string | null;
  script: string | null;
  placement: Placement;
  strategy: Strategy;
  enabled: boolean;
};

function genDefaultSnippet(provider: string, trackingId: string) {
  const id = (trackingId || '').trim();
  if (!id) return '';

  switch (provider) {
    case 'GA4':
      return `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        (function(){var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${id}';document.head.appendChild(s);}());
        gtag('js', new Date());
        gtag('config', '${id}');
      `.trim();

    case 'GTM':
      return `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${id}');
      `.trim();

    case 'FacebookPixel':
      return `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${id}');
        fbq('track', 'PageView');
      `.trim();

    case 'TikTokPixel':
      return `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var tt=w[t]=w[t]||[];tt.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie'];
          tt.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<tt.methods.length;i++)tt.setAndDefer(tt,tt.methods[i]);
          tt.load=function(e){var n='https://analytics.tiktok.com/i18n/pixel/events.js';
          tt._i=tt._i||{};tt._i[e]=[];var a=d.createElement('script');a.type='text/javascript';a.async=!0;a.src=n+'?sdkid='+e+'&lib='+t;
          var s=d.getElementsByTagName('script')[0];s.parentNode.insertBefore(a,s)};
          tt.load('${id}');
          tt.page();
        }(window, document, 'ttq');
      `.trim();

    default:
      return '';
  }
}

function mapStrategy(s: Strategy): 'beforeInteractive' | 'afterInteractive' | 'lazyOnload' {
  return (s === 'beforeInteractive' || s === 'afterInteractive' || s === 'lazyOnload')
    ? s
    : 'afterInteractive';
}

function isGsiSnippet(code: string) {
  const c = code.toLowerCase();
  return (
    c.includes('accounts.google.com/gsi') ||
    c.includes('google.accounts.id') ||
    c.includes('g_id_onload')
  );
}

export default function TrackingInjector({ storeId }: { storeId?: string }) {
  const pathname = usePathname();
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ✅ hook ทั้งหมดถูกเรียกก่อนเงื่อนไข return แล้ว
  useEffect(() => {
    if (pathname === '/login') return; // ข้ามโหลดถ้าอยู่หน้า login

    (async () => {
      try {
        const url = storeId
          ? `/api/tracking-scripts?storeId=${encodeURIComponent(storeId)}`
          : '/api/tracking-scripts';
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        setItems(Array.isArray(data?.items) ? data.items.filter((i: Item) => i.enabled) : []);
      } catch {
        // swallow
      } finally {
        setLoaded(true);
      }
    })();
  }, [storeId, pathname]);

  const rendered = useMemo(() => {
    if (pathname === '/login') return null; // ป้องกันยิง script หน้า login
    if (!items.length) return null;

    return items.map((it) => {
      const key = `trk-${it.id}`;
      const strategy = it.placement === 'HEAD'
        ? 'beforeInteractive'
        : mapStrategy(it.strategy);

      const code = it.script?.trim() || (it.trackingId ? genDefaultSnippet(it.provider, it.trackingId) : '');

      if (!code || isGsiSnippet(code)) return null;

      return (
        <Script id={key} key={key} strategy={strategy as any}>
          {code}
        </Script>
      );
    });
  }, [items, pathname]);

  if (pathname === '/login' || !loaded || !rendered) return null;
  return <>{rendered}</>;
}