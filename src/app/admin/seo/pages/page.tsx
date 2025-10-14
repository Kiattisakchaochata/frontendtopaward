//src/app/admin/seo/pages/page.tsx

'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRef } from 'react';
import { apiFetch } from '@/lib/api';
import OgPicker4 from '@/components/admin/OgPicker4';
import { Swal } from '@/lib/swal';

// ✅ เพิ่มแค่คอนสแตนต์ขีดจำกัดให้ชัดเจน (ตาม Prisma)
const PATH_MAX = 255;
const TITLE_MAX = 255;
const DESC_MAX = 512;
const OG_MAX = 512;

type PageSeo = {
  id: string;
  path: string;
  title?: string;
  description?: string;
  og_image?: string;
  jsonld?: any;
  noindex: boolean;
  updated_at: string;
};
type SchemaType = string;
const KNOWN_TYPES = ['Restaurant','LocalBusiness','CafeOrCoffeeShop','HairSalon','CarWash','custom'] as const;
function normalizeUrl(u?: string) {
  if (!u) return '';
  return String(u).trim();
}

function buildLocalBusinessJsonLd(input: {
  type: SchemaType;
  name: string;
  url: string;
  telephone?: string;
  addressLine?: string;
  locality?: string;
  postalCode?: string;
  country?: string;
  servesCuisine?: string; // comma-separated
  priceRange?: string;
  images?: string[];
  sameAs?: string; // comma-separated
  description?: string;
}) {
  const cuisines = (input.servesCuisine || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const sameAs = (input.sameAs || '')
    .split(',')
    .map(s => normalizeUrl(s))
    .filter(Boolean);

  const addr: any =
    input.addressLine || input.locality || input.postalCode || input.country
      ? {
          '@type': 'PostalAddress',
          streetAddress: input.addressLine || undefined,
          addressLocality: input.locality || undefined,
          postalCode: input.postalCode || undefined,
          addressCountry: input.country || 'TH',
        }
      : undefined;

  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': input.type,
    name: input.name,
    url: normalizeUrl(input.url),
    description: input.description || undefined,
    image: (input.images || []).filter(Boolean),
    telephone: input.telephone || undefined,
    address: addr,
    priceRange: input.priceRange || undefined,
    servesCuisine: cuisines.length ? cuisines : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };

  return data;
}
function extractBuilderFromJsonLd(j: any) {
  if (!j || typeof j !== 'object') return null;

  // รองรับ @type เป็น array หรือ string
  const rawType = Array.isArray(j['@type']) ? j['@type'][0] : j['@type'];
  const type = (rawType as string) || 'LocalBusiness';

  const addr = j.address || {};
  const serves = Array.isArray(j.servesCuisine) ? j.servesCuisine.join(', ') : (j.servesCuisine || '');
  const sameAs = Array.isArray(j.sameAs) ? j.sameAs.join(', ') : (j.sameAs || '');

  return {
    type, // ✅ ต้องคืนค่าตัวนี้
    name: j.name || '',
    url: j.url || '',
    telephone: j.telephone || '',
    addressLine: addr.streetAddress || '',
    locality: addr.addressLocality || '',
    postalCode: addr.postalCode || '',
    country: addr.addressCountry || 'TH',
    servesCuisine: serves,
    priceRange: j.priceRange || '',
    sameAs: sameAs,
    description: j.description || '',
  };
}
export default function AdminSeoPagesPage() {
  const [rows, setRows] = useState<PageSeo[]>([]);
  const [editing, setEditing] = useState<Partial<PageSeo> | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string>('');
  const savingReqRef = useRef(false); // 🔒 กัน onSave ยิงซ้ำ

  const refresh = async () => {
  try {
    const res = await apiFetch<{ pages: PageSeo[] }>('/admin/seo/pages');
    setRows(res.pages ?? []);
    setLoadErr('');
  } catch (e: any) {
    setLoadErr(String(e?.message || 'โหลดข้อมูลไม่สำเร็จ')); // แค่เก็บ error ไว้โชว์
  }
}; // อย่า setLoading ใน refresh และอย่า throw// <= ต้องมีบรรทัดนี้เพื่อปิด onSave

  useEffect(() => { refresh(); }, []);

  const startNew = () => setEditing({ path: '' });

  // บันทึก (upsert)
  const onSave = async (payload: {
  id?: string;
  path: string;
  title: string;
  description: string;
  og_image: string;
  noindex: boolean;
  jsonld: any;
}): Promise<boolean> => {
  if (savingReqRef.current || loading) return false; // 🔒 กันซ้ำแบบ sync
  savingReqRef.current = true;
  setLoading(true);

  const normalizedPath = normPath(payload.path || '');
  const errs: string[] = [];

  const pathLen = normalizedPath.length;
  const titleLen = (payload.title || '').length;
  const descLen = (payload.description || '').length;
  const ogLen = (payload.og_image || '').length;

  if (!normalizedPath) errs.push('Path: ต้องไม่เว้นว่าง');
  if (pathLen > PATH_MAX) errs.push(`Path: ยาว ${pathLen} ตัวอักษร (เกิน ${PATH_MAX})`);
  if (titleLen > TITLE_MAX) errs.push(`Title: ยาว ${titleLen} ตัวอักษร (เกิน ${TITLE_MAX})`);
  if (descLen > DESC_MAX) errs.push(`Description: ยาว ${descLen} ตัวอักษร (เกิน ${DESC_MAX})`);
  if (ogLen > OG_MAX) errs.push(`OG Image: ยาว ${ogLen} ตัวอักษร (เกิน ${OG_MAX})`);

  if (payload.jsonld && typeof payload.jsonld === 'string') {
    try { JSON.parse(payload.jsonld); } catch { errs.push('JSON-LD: ต้องเป็น JSON ที่ถูกต้อง'); }
  }

  if (errs.length > 0) {
    await Swal.fire({
      icon: 'error',
      title: 'บันทึกไม่สำเร็จ',
      html: `<ul style="text-align:left;margin-top:6px;padding-left:18px">${errs.map(e => `<li>${e}</li>`).join('')}</ul>`,
      confirmButtonText: 'ตกลง',
    });
    setLoading(false);
    return false;
  }

  try {
    const body = {
      id: payload.id,
      path: normalizedPath,
      title: payload.title ?? '',
      description: payload.description ?? '',
      og_image: payload.og_image ?? '',
      noindex: !!payload.noindex,
      jsonld: safeJson(payload.jsonld) || {},
    };
    console.log('[page-seo] POST /admin/seo/page', body);

    // ⏱ ยิง API แต่ตัดใจใน 10 วินาที ถ้าไม่ตอบถือว่า fail
const postPromise = apiFetch('/admin/seo/page', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// รอผลสูงสุด 10 วิ
const ok = await Promise.race<boolean>([
  postPromise.then(() => true),
  new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10000)),
]);
console.log('[page-seo] onSave result:', ok);

if (!ok) {
  throw new Error('คำขอใช้เวลานานผิดปกติ หรือเซิร์ฟเวอร์ไม่ตอบกลับ (timeout)');
}

// ไม่ต้อง await เพื่อกันแขวนถ้า /admin/seo/pages ช้า
refresh().catch(() => {});
return true;
  } catch (e: any) {
    console.error('[page-seo] save error:', e);
    await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: e?.message || 'API ไม่ตอบกลับ' });
    return false;
    } finally {
    setLoading(false);
    savingReqRef.current = false; // ✅ ปลดล็อกเสมอ
  }
};

  const onDelete = async (id: string) => {
    const ok = await Swal.fire({
      icon: 'warning',
      title: 'ลบรายการนี้?',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(r => r.isConfirmed);
    if (!ok) return;

    try {
      await apiFetch(`/admin/seo/page/${id}`, { method: 'DELETE' });
      refresh().catch(e => setLoadErr(e?.message || 'โหลดรายการหลังบันทึกไม่สำเร็จ'));
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e?.message || '' });
    }
  };

  const sorted = useMemo(
  () => rows.slice().sort((a, b) => a.path.localeCompare(b.path)),
  [rows]
);

return (
  <Suspense
    fallback={
      <div className="min-h-[60vh] grid place-items-center text-slate-200">
        กำลังโหลด…
      </div>
    }
  >
    <main className="relative min-h-screen text-slate-100">
  {/* พื้นหลังธีมเดียวกับ Banners */}
  <div
    className="absolute inset-0 -z-10"
    style={{
      background: `
        radial-gradient(1200px 700px at 20% -10%, rgba(255,255,255,.06), transparent),
        radial-gradient(1200px 700px at 80% 0%, rgba(255,255,255,.06), transparent),
        linear-gradient(180deg, #0B1220 0%, #111827 100%)
      `,
    }}
  />

      <div className="container mx-auto max-w-5xl px-4 md:px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Page SEO</h1>
          <button
            onClick={startNew}
            className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#B8860B] hover:from-[#FFCC33] hover:to-[#FFD700] text-black shadow px-5 py-2.5 font-semibold"
          >
            + สร้าง
          </button>
        </div>

        {loadErr && (
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 text-red-200 p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">โหลดข้อมูลไม่สำเร็จ</div>
              <div className="text-sm opacity-90 break-all">{loadErr}</div>
              <div className="text-xs mt-1 opacity-70">
                ตรวจสอบว่า backend มี route <code>/api/admin/seo/pages</code> แล้ว
                frontend เรียกผ่าน <code>apiFetch('/admin/seo/pages')</code>
              </div>
            </div>
            <button
              onClick={refresh}
              className="shrink-0 rounded-full bg-red-500/20 hover:bg-red-500/30 px-3 py-1 text-sm"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-[#0f172a]/60 backdrop-blur ring-1 ring-white/10 shadow-xl">
  <div className="overflow-x-auto">
    <table className="w-full text-sm text-slate-200">
      <thead>
        <tr className="text-left text-slate-300/90">
                  <th className="p-3">Path</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Noindex</th>
                  <th className="p-3 w-36"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
  key={r.id}
  className="border-t border-white/10 hover:bg-white/5/50 transition"
>
                    <td className="p-3 font-mono">{r.path}</td>
                    <td className="p-3">{r.title || '-'}</td>
                    <td className="p-3">{r.noindex ? '✅' : '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditing({ ...r, jsonld: safeJson(r.jsonld) })
                          }
                          className="px-3 py-1 rounded-full bg-slate-700/70 hover:bg-slate-700 text-slate-200"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => onDelete(r.id)}
                          className="px-3 py-1 rounded-full bg-red-600/90 hover:bg-red-600 text-white"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && !loadErr && (
                  <tr>
                    <td className="p-4 text-gray-400" colSpan={4}>
                      ยังไม่มีข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editing && (
          <EditModal
            editing={editing}
            setEditing={setEditing}
            onSave={onSave}
            loading={loading}
          />
        )}
      </div> {/* ปิด container */}
      <style jsx global>{`
        .swal2-container { z-index: 12050 !important; }
      `}</style>
    </main>
  </Suspense>
);
}

// ทำ path ให้มาตรฐาน: มี / นำหน้า และไม่มี / ท้าย (ยกเว้นหน้า /)
function normPath(p: string) {
  if (!p) return '/';
  let s = String(p).trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s;
}

/* ---------- Modal ---------- */
function EditModal({
  editing,
  setEditing,
  onSave,
  loading,                     // ⬅ เพิ่ม
}: {
  editing: Partial<PageSeo>;
  setEditing: (v: any) => void;
  onSave: (payload: {
    id?: string;
    path: string;
    title: string;
    description: string;
    og_image: string;
    noindex: boolean;
    jsonld: any;
  }) => Promise<boolean>;
  loading?: boolean;           // ⬅ เพิ่ม
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [form, setForm] = useState({
    path: editing.path ?? '',
    title: editing.title ?? '',
    description: editing.description ?? '',
    noindex: !!editing.noindex,
    jsonld: editing.jsonld ?? {},
  });

  const [ogList, setOgList] = useState<string[]>(['', '', '', '']);
  const [btnLoading, setBtnLoading] = useState(false);
  const [jsonldTouched, setJsonldTouched] = useState(false);
  // ★ Schema Builder state
const [builderEnabled, setBuilderEnabled] = useState(false);
const [schemaType, setSchemaType] = useState<SchemaType>('Restaurant');
const [customType, setCustomType] = useState('');
const [builder, setBuilder] = useState({
  name: '',
  url:
    (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '') +
    normPath(editing.path || form.path || '/'),
  telephone: '',
  addressLine: '',
  locality: '',
  postalCode: '',
  country: 'TH',
  servesCuisine: '',
  priceRange: '',
  sameAs: '',
  description: '',
});
useEffect(() => {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  setBuilder(s => ({
    ...s,
    url: site + normPath(form.path || '/'),
  }));
  
}, [form.path]);
const [didPrefillBuilder, setDidPrefillBuilder] = useState(false);
// รูปที่จะใช้เป็น image[] ของ schema = จาก OG picker
const builderImages = ogList.filter(Boolean).slice(0, 4);
  useEffect(() => {
  const fromJson = Array.isArray((editing as any)?.jsonld?.image)
    ? ((editing as any).jsonld.image as string[])
    : [];
  const base = [editing.og_image, ...fromJson].filter(Boolean) as string[];
  const uniq = Array.from(new Set(base)).slice(0, 4);

  setOgList([...uniq, '', '', '', ''].slice(0, 4));
    setForm({
    path: editing.path ?? '',
    title: editing.title ?? '',
    description: editing.description ?? '',
    noindex: !!editing.noindex,
    jsonld: editing.jsonld ?? {},
  });

  // ⬇️ Prefill Builder จาก JSON-LD ที่มีอยู่ (ครั้งเดียวตอนเปิด)
const initial = extractBuilderFromJsonLd(editing.jsonld);
if (initial) {
  const t = initial.type || 'LocalBusiness';
  if ((KNOWN_TYPES as readonly string[]).includes(t as any)) {
    setSchemaType(t as SchemaType);
    setCustomType('');        // เคลียร์ค่า custom ถ้าเป็นชนิดที่รู้จัก
  } else {
    setSchemaType('custom');
    setCustomType(t);         // ให้กล่อง custom แสดงค่าที่เคยบันทึกไว้
  }

  setBuilder((s) => ({
    ...s,
    name: initial.name,
    url: initial.url || s.url,
    telephone: initial.telephone,
    addressLine: initial.addressLine,
    locality: initial.locality,
    postalCode: initial.postalCode,
    country: initial.country || 'TH',
    servesCuisine: initial.servesCuisine,
    priceRange: initial.priceRange,
    sameAs: initial.sameAs,
    description: initial.description,
  }));

  setBuilderEnabled(true);    // ถ้าต้องการโชว์ว่ามีข้อมูลอยู่แล้ว ให้เปิดไว้
  setDidPrefillBuilder(true); // กันรันซ้ำ
}

  // reset touch flag ทุกครั้งที่เปิด modal รายการใหม่
  setJsonldTouched(false);
}, [editing]);
// ⬇️ INSERT: Prefill อีกครั้งเมื่อผู้ใช้เพิ่งเปิดสวิตช์ Builder ทีหลัง
useEffect(() => {
  if (!builderEnabled || didPrefillBuilder) return;

  const fromForm = extractBuilderFromJsonLd(form.jsonld);
  if (!fromForm) return;

  const t = fromForm.type || 'LocalBusiness';
  if ((KNOWN_TYPES as readonly string[]).includes(t as any)) {
    setSchemaType(t as SchemaType);
    setCustomType('');
  } else {
    setSchemaType('custom');
    setCustomType(t);
  }

  setBuilder((s) => ({
    ...s,
    name: fromForm.name,
    url: fromForm.url || s.url,
    telephone: fromForm.telephone,
    addressLine: fromForm.addressLine,
    locality: fromForm.locality,
    postalCode: fromForm.postalCode,
    country: fromForm.country || 'TH',
    servesCuisine: fromForm.servesCuisine,
    priceRange: fromForm.priceRange,
    sameAs: fromForm.sameAs,
    description: fromForm.description,
  }));

  setDidPrefillBuilder(true);
}, [builderEnabled, didPrefillBuilder, form.jsonld]);
useEffect(() => {
  if (jsonldTouched) return; // ผู้ใช้แก้ JSON-LD เองแล้ว ไม่ซิงก์ทับ

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const p = normPath(form.path);

  const base: any = (typeof form.jsonld === 'object' && form.jsonld) ? { ...form.jsonld } : {};
  base['@context'] = 'https://schema.org';
  base['@type'] = base['@type'] || 'WebPage';
  base.url = `${siteUrl}${p}`;
  base.name = form.title || 'Topaward';
  base.description = form.description || '';
  base.image = ogList.filter(Boolean).slice(0, 4);

  // ✅ อัปเดตก็ต่อเมื่อค่าเปลี่ยนจริง ๆ
  if (!deepEqual(base, form.jsonld)) {
    setForm((s) => ({ ...s, jsonld: base }));
  }
}, [form.title, form.description, form.path, ogList, jsonldTouched]);
    const savingRef = useRef(false);
const saveWithImages = async () => {
  if (savingRef.current) return;    // 🔒 กันดับเบิลคลิกทันที
  savingRef.current = true;
  if (btnLoading) { savingRef.current = false; return; }
    if (!String(form.path || '').trim()) {
    await Swal.fire({ icon: 'warning', title: 'กรุณากรอก Path' });
    savingRef.current = false;
    return;
  }

  const primary = ogList.find(Boolean) || editing.og_image || '';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const p = normPath(form.path);

  const merged: any = (typeof form.jsonld === 'object' && form.jsonld) ? { ...form.jsonld } : {};
  merged['@context'] = 'https://schema.org';
  merged['@type'] = merged['@type'] || 'WebPage';
  merged.url = `${siteUrl}${p}`;
  merged.name = form.title || 'Topaward';
  const images = Array.from(new Set(ogList.filter(Boolean))).slice(0, 4);
merged.description = form.description || '';
merged.image = images;

if (builderEnabled) {
  const finalType = (schemaType === 'custom' ? customType : schemaType).trim();
  if (finalType) merged['@type'] = finalType;  // บังคับใช้ชนิดที่ผู้ใช้เลือก
}
  setBtnLoading(true);
  try {
    const onSavePromise = onSave({
      id: editing.id,
      path: form.path,
      title: form.title,
      description: form.description,
      og_image: primary,
      noindex: !!form.noindex,
      jsonld: merged,
    });

    // ⏱ ตัดใจใน 12 วิ เพื่อไม่ให้ปุ่มค้างถ้า API ไม่ตอบ
    const ok = await Promise.race<boolean>([
      onSavePromise,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 12000)),
    ]);
    console.log('[page-seo] saveWithImages -> ok:', ok);

    if (!ok) {
      await Swal.fire({
        icon: 'error',
        title: 'บันทึกไม่สำเร็จ',
        text: 'คำขอใช้เวลานานผิดปกติหรือ API ไม่ตอบกลับ',
      });
      return;
    }

    // ✅ ไม่รอ Swal — ปิด modal ทันที
Swal.fire({
  icon: 'success',
  title: 'บันทึก Page SEO สำเร็จ',
  timer: 1200,
  showConfirmButton: false,
  heightAuto: false,      // กัน layout jump
});
setEditing(null);         // ปิดเลย ไม่ต้อง await Swal
  } catch (e: any) {
    await Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: e?.message || 'ลองใหม่อีกครั้ง' });
  } finally {
  setBtnLoading(false);
  savingRef.current = false; // ✅ ปลดล็อกเสมอ
}
};

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
  <div className="w-full max-w-2xl rounded-2xl bg-white/5 backdrop-blur ring-1 ring-white/10 shadow-2xl">
        <div className="px-6 pt-6">
          <h2 className="text-xl font-semibold">{editing?.id ? 'แก้ไข' : 'สร้าง'} Page SEO</h2>
        </div>

        <div className="px-6 pb-6 mt-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Input label="Path (เช่น /about, /stores/abc)" value={form.path} onChange={(v) => setForm((s) => ({ ...s, path: v }))} />
          <Input label="Title" value={form.title} onChange={(v) => setForm((s) => ({ ...s, title: v }))} />
          <TextArea rows={4} label="Description" value={form.description} onChange={(v) => setForm((s) => ({ ...s, description: v }))} />

          <OgPicker4 label="OG Images (สูงสุด 4)" value={ogList} onChange={setOgList} />

          <div className="flex items-center gap-2">
            <input id="noindex" type="checkbox" checked={!!form.noindex}
              onChange={(e) => setForm((s) => ({ ...s, noindex: e.target.checked }))} />
            <label htmlFor="noindex" className="text-sm">noindex</label>
          </div>

          {/* ---- Schema Builder (optional) ---- */}
          <div className="rounded-xl border border-white/10 p-3 space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="builderEnabled"
                type="checkbox"
                checked={builderEnabled}
                onChange={(e) => setBuilderEnabled(e.target.checked)}
              />
              <label htmlFor="builderEnabled" className="text-sm font-semibold">
                เปิด Schema Builder (LocalBusiness / Restaurant)
              </label>
            </div>

            {builderEnabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
  <label className="text-sm">ประเภทธุรกิจ</label>
  <select
  value={schemaType}
  onChange={(e) => {
    const v = e.target.value;
    setSchemaType(v);
    if (v !== 'custom') setCustomType('');
  }}
  className="rounded-md bg-[#1a1f27] border border-white/10 px-3 py-2 text-white
             focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
>
  <option value="Restaurant">Restaurant</option>
  <option value="LocalBusiness">LocalBusiness</option>
  <option value="CafeOrCoffeeShop">CafeOrCoffeeShop</option>
  <option value="HairSalon">HairSalon</option>
  <option value="CarWash">CarWash</option>
  <option value="custom">Custom…</option>
</select>

  {schemaType === 'custom' && (
  <input
    type="text"
    placeholder="ใส่ type เอง เช่น MyBusinessType"
    value={customType}
    onChange={(e) => setCustomType(e.target.value)}
    className="rounded-md bg-[#1a1f27] border border-white/10 px-2 py-1"
  />
)}
</div>

                <Input label="ชื่อธุรกิจ/ร้าน" value={builder.name} onChange={(v) => setBuilder(s => ({ ...s, name: v }))} />
                <Input label="URL" value={builder.url} onChange={(v) => setBuilder(s => ({ ...s, url: v }))} />
                <Input label="โทรศัพท์" value={builder.telephone} onChange={(v) => setBuilder(s => ({ ...s, telephone: v }))} />
                <Input label="Price Range (เช่น ฿฿)" value={builder.priceRange} onChange={(v) => setBuilder(s => ({ ...s, priceRange: v }))} />
                <Input label="Serves Cuisine (คั่นด้วย ,)" value={builder.servesCuisine} onChange={(v) => setBuilder(s => ({ ...s, servesCuisine: v }))} />
                <Input label="ที่อยู่ (บรรทัด)" value={builder.addressLine} onChange={(v) => setBuilder(s => ({ ...s, addressLine: v }))} />
                <Input label="อำเภอ/เมือง" value={builder.locality} onChange={(v) => setBuilder(s => ({ ...s, locality: v }))} />
                <Input label="รหัสไปรษณีย์" value={builder.postalCode} onChange={(v) => setBuilder(s => ({ ...s, postalCode: v }))} />
                <Input label="ประเทศ (เช่น TH)" value={builder.country} onChange={(v) => setBuilder(s => ({ ...s, country: v }))} />
                <TextArea rows={3} label="ลิงก์ social (คั่นด้วย ,)" value={builder.sameAs} onChange={(v) => setBuilder(s => ({ ...s, sameAs: v }))} />
                <TextArea rows={3} label="คำอธิบาย (ถ้าต้องการ)" value={builder.description} onChange={(v) => setBuilder(s => ({ ...s, description: v }))} />

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
                    onClick={() => {
  const finalType = (schemaType === 'custom' ? customType : schemaType).trim();
  if (!finalType) {
    Swal.fire({
      icon: 'warning',
      title: 'กรุณาระบุประเภทธุรกิจ',
      text: 'ใส่ค่าในช่อง Custom ด้วยครับ',
    });
    return;
  }

  const data = buildLocalBusinessJsonLd({
    type: finalType,
    name: builder.name || form.title || 'Topaward',
    url: builder.url,
    telephone: builder.telephone,
    addressLine: builder.addressLine,
    locality: builder.locality,
    postalCode: builder.postalCode,
    country: builder.country || 'TH',
    servesCuisine: builder.servesCuisine,
    priceRange: builder.priceRange,
    sameAs: builder.sameAs,
    description: builder.description || form.description,
    images: builderImages,
  });

  const merged = { ...(typeof form.jsonld === 'object' ? form.jsonld : {}), ...data };
  setJsonldTouched(true);
  setForm(s => ({ ...s, jsonld: merged }));
  Swal.fire({ icon: 'success', title: 'เติม JSON-LD สำเร็จ', timer: 1200, showConfirmButton: false, heightAuto: false, });
}}
                  >
                    เติม JSON-LD จากฟอร์ม
                  </button>
                  <div className="text-xs opacity-70 mt-2">
                    รูปภาพจะใช้จาก “OG Images” ที่เลือกด้านบนโดยอัตโนมัติ
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* JSON-LD editor เดิม - อยู่ถัดมา */}
          <JsonArea
            label="JSON-LD (object)"
            placeholder={`ตัวอย่าง: {
"@context": "https://schema.org",
"@type": "WebPage",
"name": "ชื่อหน้า",
"url": "${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/your-path"
}`}
            value={form.jsonld}
            onChange={(v) => {
              setJsonldTouched(true);
              setForm((s) => ({ ...s, jsonld: v }));
            }}
          />

        </div>

        <div className="sticky bottom-0 bg-white/5 backdrop-blur px-6 pb-6 pt-3 rounded-b-2xl flex justify-end gap-2">
  <button
    onClick={() => setEditing(null)}
    className="rounded-full px-4 py-2 bg-white/10 hover:bg-white/15"
  >
    ยกเลิก
  </button>
  <button
    onClick={saveWithImages}
    disabled={btnLoading || loading}
    className="rounded-full px-5 py-2 font-semibold
               bg-gradient-to-r from-[#FFD700] to-[#B8860B]
               hover:from-[#FFCC33] hover:to-[#FFD700]
               text-black shadow disabled:opacity-60"
  >
    {btnLoading || loading ? 'กำลังบันทึก…' : 'บันทึก'}
  </button>
</div>
      </div>
    </div>
  );
}

/* ---------- Inputs & utils ---------- */
function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-[#1a1f27] border border-white/10 px-3 py-2 outline-none
                   placeholder-slate-400 text-white
                   focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
      />
    </div>
  );
}
function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-[#1a1f27] border border-white/10 px-3 py-2 outline-none
                   placeholder-slate-400 text-white
                   focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
      />
    </div>
  );
}

/* ⬇⬇⬇ เพิ่มบล็อกนี้เข้าไป ⬇⬇⬇ */
function JsonArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 10,
}: {
  label: string;
  value: any;                 // รับ object/null
  onChange: (v: any) => void; // ส่ง object กลับเมื่อ JSON valid
  placeholder?: string;
  rows?: number;
}) {
  const [raw, setRaw] = useState<string>(() =>
    value ? JSON.stringify(value, null, 2) : ''
  );

  useEffect(() => {
    setRaw(value ? JSON.stringify(value, null, 2) : '');
  }, [value]);

  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>
      <textarea
        rows={rows}
        value={raw}
        placeholder={placeholder}
        onChange={(e) => {
          const text = e.target.value;
          setRaw(text);
          try {
            const obj = JSON.parse(text);
            onChange(obj); // อัปเดตเฉพาะตอน JSON ถูกต้อง
          } catch {
            // ถ้า parse ไม่ผ่าน ยังไม่เรียก onChange
          }
        }}
        className="w-full rounded-lg bg-[#0f1117] border border-white/10 px-3 py-2 outline-none
                   font-mono text-sm text-white placeholder-slate-400
                   focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
      />
    </div>
  );
}
function safeJson(j: any) {
  if (!j) return null;
  if (typeof j === 'object') return j;
  try { return JSON.parse(String(j)); } catch { return null; }
}

function deepEqual(a: any, b: any) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}