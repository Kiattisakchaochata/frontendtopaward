// src/lib/safeUrl.ts
export function safeUrl(u?: string | null) {
  if (!u) return "";
  // ตัดอักขระที่ทำลาย HTML attribute
  return String(u).replace(/["<>]/g, "");
}