import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('u');
    if (!url) return new Response('Missing u', { status: 400 });

    // ป้องกันเปิด http → บังคับ https
    const src = url.replace(/^http:\/\//, 'https://');

    // ดึงรูปจาก TikTok พร้อม header ที่จำเป็น
    const r = await fetch(src, {
      headers: {
        // บางรูปของ TikTok ต้องมี referer ถึงจะไม่ 403
        'Referer': 'https://www.tiktok.com/',
        // user-agent ปรกติพอแล้ว แต่ใส่ชัด ๆ ไว้ช่วยบาง CDN
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      },
      // อย่า cache ฝั่ง next; ให้ cache ที่ client/CDN แทน
      cache: 'no-store',
    });

    if (!r.ok) return new Response('Upstream error', { status: r.status });

    // ส่ง content-type ต่อให้เบราว์เซอร์
    const ct = r.headers.get('content-type') || 'image/jpeg';

    return new Response(r.body, {
      status: 200,
      headers: {
        'Content-Type': ct,
        // cache client 1 วัน (ปรับได้)
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    });
  } catch (e) {
    return new Response('Proxy error', { status: 500 });
  }
}