// src/app/admin/seo/site/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Swal } from '@/lib/swal';
import OgPicker4 from '@/components/admin/OgPicker4';

const META_TITLE_MAX = 255;
const META_DESC_MAX = 512;
const KEYWORDS_MAX = 512;
const OG_IMAGE_MAX = 512;

type SchemaType = string;
const KNOWN_TYPES = [
  'Restaurant',
  'LocalBusiness',
  'CafeOrCoffeeShop',
  'HairSalon',
  'CarWash',
  'custom',
] as const;

type SiteSeo = {
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  og_image?: string;
  jsonld?: any;
};

function normalizeUrl(u?: string) {
  return u ? String(u).trim() : '';
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
  servesCuisine?: string;
  priceRange?: string;
  images?: string[];
  sameAs?: string;
  description?: string;
}) {
  const cuisines = (input.servesCuisine || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const sameAs = (input.sameAs || '')
    .split(',')
    .map((s) => normalizeUrl(s))
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

  return {
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
  } as Record<string, any>;
}

function extractBuilderFromJsonLd(j: any) {
  if (!j || typeof j !== 'object') return null;
  const addr = j.address || {};
  const serves = Array.isArray(j.servesCuisine)
    ? j.servesCuisine.join(', ')
    : j.servesCuisine || '';
  const sameAs = Array.isArray(j.sameAs) ? j.sameAs.join(', ') : j.sameAs || '';

  return {
    type: (j['@type'] as string) || 'LocalBusiness',
    name: j.name || '',
    url: j.url || '',
    telephone: j.telephone || '',
    addressLine: addr.streetAddress || '',
    locality: addr.addressLocality || '',
    postalCode: addr.postalCode || '',
    country: addr.addressCountry || 'TH',
    servesCuisine: serves,
    priceRange: j.priceRange || '',
    sameAs,
    description: j.description || '',
  };
}

function AdminSeoSitePageInner() {
  const [form, setForm] = useState<SiteSeo>({});
  const [loading, setLoading] = useState(false);
  const [ogList, setOgList] = useState<string[]>(['', '', '', '']);

  // Schema Builder
  const [builderEnabled, setBuilderEnabled] = useState(false);
  const [schemaType, setSchemaType] = useState<SchemaType>('Restaurant');
  const [customType, setCustomType] = useState('');
  const [builder, setBuilder] = useState({
    name: '',
    url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
      .replace(/\/$/, ''),
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
    (async () => {
      try {
        const data = await apiFetch<SiteSeo>('/admin/seo/site');
        setForm({
          ...data,
          keywords: data?.keywords || (data as any)?.jsonld?.keywords || '',
        });

        const imgs = [
          data?.og_image,
          ...(Array.isArray((data as any)?.jsonld?.image)
            ? (data as any).jsonld.image
            : []),
        ].filter(Boolean) as string[];
        setOgList(
          Array.from(new Set(imgs))
            .slice(0, 4)
            .concat(['', '', '', ''])
            .slice(0, 4),
        );

        const initial = extractBuilderFromJsonLd((data as any)?.jsonld);
        if (initial) {
          const t = initial.type || 'LocalBusiness';
          if ((KNOWN_TYPES as readonly string[]).includes(t as any)) {
            setSchemaType(t as SchemaType);
            setCustomType('');
          } else {
            setSchemaType('custom');
            setCustomType(t);
          }
          setBuilder((s) => ({
            ...s,
            name: initial.name || (data.meta_title ?? ''),
            url:
              initial.url ||
              (process.env.NEXT_PUBLIC_SITE_URL ||
                'http://localhost:3000'
              ).replace(/\/$/, ''),
            telephone: initial.telephone,
            addressLine: initial.addressLine,
            locality: initial.locality,
            postalCode: initial.postalCode,
            country: initial.country || 'TH',
            servesCuisine: initial.servesCuisine,
            priceRange: initial.priceRange,
            sameAs: initial.sameAs,
            description: initial.description || (data.meta_description ?? ''),
          }));
          setBuilderEnabled(true);
        }
      } catch {
        setOgList(['', '', '', '']);
      }
    })();
  }, []);

  async function onSave() {
    setLoading(true);
    try {
      const primary = ogList.find(Boolean) || form.og_image || '';
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
        .replace(/\/$/, '');

      const errs: string[] = [];
      const titleLen = (form.meta_title || '').length;
      if (titleLen > META_TITLE_MAX)
        errs.push(`Meta Title: ยาว ${titleLen} ตัวอักษร (เกิน ${META_TITLE_MAX})`);
      const descLen = (form.meta_description || '').length;
      if (descLen > META_DESC_MAX)
        errs.push(
          `Meta Description: ยาว ${descLen} ตัวอักษร (เกิน ${META_DESC_MAX})`,
        );
      const normalized = normalizeKeywords(form.keywords);
      const kwLen = (normalized || '').length;
      if (kwLen > KEYWORDS_MAX)
        errs.push(`Keywords: ยาว ${kwLen} ตัวอักษร (เกิน ${KEYWORDS_MAX})`);
      const primaryLen = (primary || '').length;
      if (primaryLen > OG_IMAGE_MAX)
        errs.push(
          `OG Image URL: ยาว ${primaryLen} ตัวอักษร (เกิน ${OG_IMAGE_MAX})`,
        );

      if (errs.length) {
        await Swal.fire({
          icon: 'error',
          title: 'บันทึกไม่สำเร็จ',
          html: `<div style="text-align:left"><ul style="padding-left:18px;margin:0">${errs
            .map((e) => `<li>${e}</li>`)
            .join('')}</ul></div>`,
        });
        return;
      }

      const mergedJson =
        typeof form.jsonld === 'object' && form.jsonld ? { ...form.jsonld } : {};
      mergedJson['@context'] = 'https://schema.org';
      mergedJson['@type'] = mergedJson['@type'] || 'WebSite';
      mergedJson.name = form.meta_title || 'Topaward';
      mergedJson.description = form.meta_description || '';
      mergedJson.url = siteUrl;
      mergedJson.image = ogList.filter(Boolean);
      const safeKeywords = normalizeKeywords(form.keywords);
      if (safeKeywords) mergedJson.keywords = safeKeywords;

      await apiFetch('/admin/seo/site', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta_title: form.meta_title ?? '',
          meta_description: form.meta_description ?? '',
          keywords: safeKeywords,
          og_image: primary,
          jsonld: mergedJson,
        }),
      });

      setForm((s) => ({
        ...s,
        og_image: primary,
        jsonld: mergedJson,
        keywords: safeKeywords,
      }));
      await Swal.fire({
        icon: 'success',
        title: 'บันทึก Global SEO สำเร็จ',
        confirmButtonText: 'ตกลง',
      });
    } catch (e: any) {
      await Swal.fire({
        icon: 'error',
        title: 'บันทึกไม่สำเร็จ',
        text: e?.message || 'เกิดข้อผิดพลาด',
      });
    } finally {
      setLoading(false);
    }
  }

  const siteUrlBase = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    .replace(/\/$/, '');

  return (
    <main className="container mx-auto max-w-7xl px-4 md:px-6 py-8">
      {/* Header card (เข้ม) */}
      <div className="mb-6 rounded-3xl bg-[radial-gradient(90%_120%_at_10%_0%,rgba(255,215,0,.08),transparent),_radial-gradient(90%_120%_at_90%_-10%,rgba(184,134,11,.07),transparent)] bg-slate-900/95 text-white ring-1 ring-white/10 shadow-2xl px-6 py-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Global SEO
        </h1>
        <p className="mt-1 text-sm text-white/70">
          ตั้งค่า Title / Description / Keywords / OG / JSON-LD ทั้งเว็บไซต์
        </p>
      </div>

      {/* Outer content card (เข้ม) */}
      <section className="rounded-3xl bg-slate-900/95 ring-1 ring-white/10 shadow-xl p-5 md:p-6 lg:p-8">
        {/* Inner form panel (ขาวเหมือนหน้า Stores) */}
        <div className="rounded-2xl bg-white shadow-sm border border-white/10 p-5 md:p-6 space-y-6">
          <Field label="Meta Title">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10"
              placeholder="ใส่ Meta Title"
              value={form.meta_title ?? ''}
              onChange={(e) =>
                setForm((s) => ({ ...s, meta_title: e.target.value }))
              }
            />
          </Field>

          <Field label="Meta Description">
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10"
              placeholder="คำอธิบายสั้น ๆ ของเว็บไซต์"
              value={form.meta_description ?? ''}
              onChange={(e) =>
                setForm((s) => ({ ...s, meta_description: e.target.value }))
              }
            />
          </Field>

          <Field label="Keywords (comma-separated)">
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10"
              placeholder="เช่น ร้านอาหาร, คาเฟ่, เสริมสวย"
              value={form.keywords ?? ''}
              onChange={(e) =>
                setForm((s) => ({ ...s, keywords: e.target.value }))
              }
            />
          </Field>

          <OgPicker4
            label="OG Images (สูงสุด 4) • ช่องที่ 1 คือรูปหลัก"
            value={ogList}
            onChange={setOgList}
          />

          {/* Schema Builder (light inside dark shell) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
            <div className="flex items-center gap-3">
              <input
                id="builderEnabled"
                type="checkbox"
                checked={builderEnabled}
                onChange={(e) => setBuilderEnabled(e.target.checked)}
              />
              <label
                htmlFor="builderEnabled"
                className="text-sm font-semibold text-slate-800"
              >
                เปิด Schema Builder (LocalBusiness / Restaurant)
              </label>
            </div>

            {builderEnabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                  <label className="text-sm font-medium text-slate-800">
                    ประเภทธุรกิจ
                  </label>
                  <select
                    value={schemaType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSchemaType(v);
                      if (v !== 'custom') setCustomType('');
                    }}
                    className="rounded-md bg-white text-slate-900 border border-slate-300 px-2 py-1"
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
                      className="rounded-md bg-white text-slate-900 border border-slate-300 px-2 py-1"
                    />
                  )}
                </div>

                {(
                  [
                    ['ชื่อธุรกิจ/ร้าน', 'name'],
                    ['URL', 'url'],
                    ['โทรศัพท์', 'telephone'],
                    ['Price Range (เช่น ฿฿)', 'priceRange'],
                    ['Serves Cuisine (คั่นด้วย ,)', 'servesCuisine'],
                    ['ที่อยู่ (บรรทัด)', 'addressLine'],
                    ['อำเภอ/เมือง', 'locality'],
                    ['รหัสไปรษณีย์', 'postalCode'],
                    ['ประเทศ (เช่น TH)', 'country'],
                  ] as const
                ).map(([label, key]) => (
                  <Field key={key} label={label}>
                    <input
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10"
                      value={(builder as any)[key]}
                      onChange={(e) =>
                        setBuilder((s) => ({
                          ...(s as any),
                          [key]: e.target.value,
                        }))
                      }
                    />
                  </Field>
                ))}

                <Field label="ลิงก์ social (คั่นด้วย ,)">
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10"
                    value={builder.sameAs}
                    onChange={(e) =>
                      setBuilder((s) => ({ ...s, sameAs: e.target.value }))
                    }
                  />
                </Field>

                <Field label="คำอธิบาย (ถ้าต้องการ)">
                  <textarea
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-900/10"
                    value={builder.description}
                    onChange={(e) =>
                      setBuilder((s) => ({ ...s, description: e.target.value }))
                    }
                  />
                </Field>

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
                    onClick={() => {
                      const finalType = (
                        schemaType === 'custom' ? customType : schemaType
                      ).trim();
                      if (!finalType) {
                        Swal.fire({
                          icon: 'warning',
                          title: 'กรุณาระบุประเภทธุรกิจ',
                        });
                        return;
                      }
                      const data = buildLocalBusinessJsonLd({
                        type: finalType,
                        name: builder.name || form.meta_title || 'Topaward',
                        url: builder.url || siteUrlBase,
                        telephone: builder.telephone,
                        addressLine: builder.addressLine,
                        locality: builder.locality,
                        postalCode: builder.postalCode,
                        country: builder.country || 'TH',
                        servesCuisine: builder.servesCuisine,
                        priceRange: builder.priceRange,
                        sameAs: builder.sameAs,
                        description:
                          builder.description || form.meta_description,
                        images: ogList.filter(Boolean),
                      });
                      const merged = {
                        ...(typeof form.jsonld === 'object' ? form.jsonld : {}),
                        ...data,
                      };
                      setForm((s) => ({ ...s, jsonld: merged }));
                      Swal.fire({
                        icon: 'success',
                        title: 'เติม JSON-LD สำเร็จ',
                        timer: 1200,
                        showConfirmButton: false,
                      });
                    }}
                  >
                    เติม JSON-LD จากฟอร์ม
                  </button>
                  <div className="text-xs text-slate-600 mt-2">
                    รูปภาพจะใช้จาก “OG Images” ที่เลือกด้านบนโดยอัตโนมัติ
                  </div>
                </div>
              </div>
            )}
          </div>

          <Field label="JSON-LD (object)">
            <textarea
              rows={10}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none font-mono text-sm text-slate-900 focus:ring-2 focus:ring-slate-900/10"
              value={toShow(form.jsonld)}
              onChange={(e) =>
                setForm((s) => ({ ...s, jsonld: parseOrRaw(e.target.value) }))
              }
            />
          </Field>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onSave}
              disabled={loading}
              className="rounded-full bg-amber-500 text-white px-6 py-2.5 font-semibold disabled:opacity-60"
            >
              {loading ? 'กำลังบันทึก…' : 'บันทึก'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminSeoSitePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-10 text-slate-900">
          กำลังโหลด...
        </div>
      }
    >
      <AdminSeoSitePageInner />
    </Suspense>
  );
}

/* ---------- helpers (label สีเข้ม อ่านง่ายบนพื้นขาว) ---------- */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  );
}
function parseOrRaw(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
function toShow(v: any) {
  return typeof v === 'string' ? v : v ? JSON.stringify(v, null, 2) : '';
}
function normalizeKeywords(v?: string) {
  if (!v) return '';
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}