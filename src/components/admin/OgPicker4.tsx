// src/components/admin/OgPicker4.tsx
'use client';
import React, { useState } from 'react';
import { API_BASE } from '@/lib/api'; // ✅ ใช้ BASE เดียวกับทั้งโปรเจกต์

/** ดึง URL จาก response หลายรูปแบบ */
function extractUploadUrl(d: any): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d;

  if (typeof d.url === 'string') return d.url;
  if (typeof d.image_url === 'string') return d.image_url;
  if (typeof d.secure_url === 'string') return d.secure_url;
  if (typeof d.path === 'string') return d.path;
  if (typeof d.location === 'string') return d.location;

  if (d.image) return extractUploadUrl(d.image);
  if (d.data) return extractUploadUrl(d.data);
  if (d.result) return extractUploadUrl(d.result);
  if (d.file) return extractUploadUrl(d.file);

  if (Array.isArray(d.files) && d.files[0]) return extractUploadUrl(d.files[0]);
  if (Array.isArray(d.images) && d.images[0]) return extractUploadUrl(d.images[0]);
  if (Array.isArray(d.result?.files) && d.result.files[0]) return extractUploadUrl(d.result.files[0]);

  if (d.public_id && d.format && typeof d.secure_url === 'string') return d.secure_url;
  if (d.image?.image_url) return d.image.image_url;

  return null;
}

type Props = {
  value: string[];                    // รายการ URL (สูงสุด 4)
  onChange: (urls: string[]) => void; // ส่งค่ากลับทุกครั้งที่เปลี่ยน
  label?: string;                     // ข้อความหัวข้อ
};

export default function OgPicker4({ value, onChange, label = 'OG Images (สูงสุด 4)' }: Props) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  // ให้มี 4 ช่องเสมอเพื่อคง index
  const slots: string[] = [0, 1, 2, 3].map((i) => value?.[i] ?? '');

  async function uploadToSlot(idx: number, file: File) {
    // ✅ endpoint สำหรับ SEO (อัปโหลดเดี่ยว)
    let apiUpload = '';
    try {
      // ปกติ API_BASE = https://host/api → ต่อ /admin/images ได้เลย
      apiUpload = `${API_BASE.replace(/\/$/, '')}/admin/images/seo`;
    } catch {
      // fallback เผื่อ import ล้มเหลวในบางสภาพแวดล้อม
      apiUpload = new URL('/api/admin/images/seo', window.location.origin).toString();
    }

    const fd = new FormData();
    fd.append('file', file);

    setUploadingIdx(idx);
    try {
      const res = await fetch(apiUpload, {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      const headerUrl = res.headers.get('x-file-url') || res.headers.get('location') || '';
      const ctype = res.headers.get('content-type') || '';
      const payload = ctype.includes('application/json') ? await res.json() : await res.text();

      if (!res.ok) {
        const msg = typeof payload === 'string'
          ? payload.slice(0, 300)
          : JSON.stringify(payload).slice(0, 300);
        throw new Error(`Upload failed (${res.status}): ${msg}`);
      }

      const bodyUrl = extractUploadUrl(payload);
      const url = bodyUrl || headerUrl;
      if (!url) {
        console.error('Unexpected upload response:', payload, {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
        });
        throw new Error('Invalid upload response (no url)');
      }

      const next = [...slots];
      next[idx] = url;
      onChange(next);
    } finally {
      setUploadingIdx(null);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-800">
        {label} • ช่องที่ 1 คือรูปหลัก
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => {
          const url = slots[i];
          return (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm"
            >
              <div className="text-xs text-slate-600">
                สล็อตที่ {i + 1}{i === 0 ? ' (หลัก)' : ''}
              </div>

              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`og-${i + 1}`}
                    className="h-28 w-full object-cover rounded-md border border-slate-200"
                  />

                  <input
                    type="text"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={url}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = e.target.value ?? '';
                      onChange(next);
                    }}
                    placeholder="แก้ไข URL ที่นี่"
                  />

                  <div className="flex flex-wrap gap-2">
                    <label className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 text-xs cursor-pointer">
                      {uploadingIdx === i ? 'กำลังอัปโหลด…' : 'อัปโหลดใหม่'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingIdx !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadToSlot(i, f);
                        }}
                      />
                    </label>

                    <button
                      className="rounded-full bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 text-xs"
                      onClick={() => {
                        const next = [...slots];
                        next[i] = '';
                        onChange(next);
                      }}
                    >
                      ลบรูปนี้
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 text-xs inline-block cursor-pointer">
                    {uploadingIdx === i ? 'กำลังอัปโหลด…' : 'อัปโหลดภาพ'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIdx !== null}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadToSlot(i, f);
                      }}
                    />
                  </label>

                  <input
                    placeholder="หรือวาง URL เอง"
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={url}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = e.target.value ?? '';
                      onChange(next);
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-600">
        แนะนำ 1200×630 px และ URL สาธารณะ
      </p>
    </div>
  );
}