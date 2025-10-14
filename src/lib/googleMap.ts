// src/lib/googleMap.ts

/** ดึงค่า src ออกจากโค้ด <iframe ...> */
export function extractIframeSrc(html: string): string | null {
  if (!html) return null;
  const m = html.match(/src=["']([^"']+)["']/i);
  return m?.[1] || null;
}

/** แปลงลิงก์ Google Maps ให้เหมาะกับการฝัง (หรือคืนค่าเดิมถ้าเป็นลิงก์สั้น) */
export function normalizeGoogleEmbed(raw: string): string | null {
  if (!raw) return null;

  // ถ้าเป็นโค้ด <iframe> ให้ดึงเฉพาะ src
  if (/<iframe/i.test(raw)) {
    return extractIframeSrc(raw);
  }

  try {
    const u = new URL(raw);

    // ลิงก์สั้นของ Google Maps => เก็บไว้ใช้ตรง ๆ
    if (u.hostname.includes("maps.app") || u.hostname.includes("goo.gl")) {
      return raw;
    }

    // ถ้าเป็นลิงก์ embed อยู่แล้ว
    if (u.pathname.includes("/maps/embed") || u.pathname.includes("/embed")) {
      return raw;
    }

    // จากพารามิเตอร์ q=
    const q = u.searchParams.get("q");
    if (q) return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(q)}&z=16`;

    // จาก /maps/place/<name>
    const mPlace = u.pathname.match(/\/maps\/place\/([^/]+)/);
    if (mPlace?.[1]) {
      const place = decodeURIComponent(mPlace[1].replace(/\+/g, " "));
      return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(place)}&z=16`;
    }

    // จากพิกัด @lat,lng,zoom
    const mCoord = raw.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+(?:\.\d+)?)z/);
    if (mCoord) {
      const lat = mCoord[1], lng = mCoord[2], z = Math.round(Number(mCoord[3]) || 15);
      return `https://www.google.com/maps?output=embed&ll=${lat},${lng}&z=${z}`;
    }
  } catch {
    // noop
  }

  // หาอะไรไม่ได้ก็คืนค่าเดิม (อย่างน้อยเก็บ URL ได้)
  return raw;
}

// ❌ อย่า export default {} ในไฟล์นี้ เพื่อไม่ให้สับสนการ import