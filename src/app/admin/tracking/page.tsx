// src/app/admin/tracking/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Swal } from '@/lib/swal';

type Provider = 'GA4' | 'GTM' | 'FacebookPixel' | 'TikTokPixel' | 'Custom';
type Placement = 'HEAD' | 'BODY_START' | 'BODY_END';
type Strategy  = 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';

type TrackingItem = {
  id: string;
  provider: Provider;
  trackingId: string | null;
  script: string | null;
  placement: Placement;
  strategy: Strategy;
  enabled: boolean;
  storeId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  store?: { id: string; name: string } | null;
};

type StoreBasic = { id: string | number; name: string };

const PROVIDERS: Provider[] = ['GA4', 'GTM', 'FacebookPixel', 'TikTokPixel', 'Custom'];
const PLACEMENTS: Placement[] = ['HEAD', 'BODY_START', 'BODY_END'];
const STRATEGIES: Strategy[] = ['beforeInteractive', 'afterInteractive', 'lazyOnload'];

export default function AdminTrackingPage() {
  const [items, setItems] = useState<TrackingItem[]>([]);
  const [stores, setStores] = useState<StoreBasic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string>('');
  const [editing, setEditing] = useState<Partial<TrackingItem> | null>(null);

  async function refresh() {
    try {
      const res = await apiFetch<{ items: TrackingItem[] }>('/admin/tracking');
      setItems(res.items ?? []);
      setLoadErr('');
    } catch (e: any) {
      setLoadErr(e?.message || 'โหลดรายการไม่สำเร็จ');
    }
  }

  async function loadStores() {
  try {
    // ลองเรียกหลายแบบ เผื่อแบ็กเอนด์ยังไม่ได้ทำ select=basic
    const endpoints = [
      '/admin/stores?select=basic&limit=1000',
      '/admin/stores?limit=1000',     // fallback 1
      '/admin/stores',                // fallback 2
    ];

    let raw: any[] = [];
    for (const ep of endpoints) {
      try {
        const res: any = await apiFetch(ep);
        // รองรับหลายรูปทรง response
        raw =
          (Array.isArray(res?.items) && res.items) ||
          (Array.isArray(res?.data)  && res.data)  ||
          (Array.isArray(res?.rows)  && res.rows)  ||
          (Array.isArray(res)        && res)       ||
          [];
        if (raw.length) break;
      } catch {}
    }

    const list = raw.map((s: any) => ({
      id: String(s.id ?? s.store_id ?? s._id),
      name: s.name ?? s.store_name ?? 'Unnamed Store',
    }));

    setStores(list);
    console.log('stores:', stores);
    setLoadErr(list.length ? '' : 'ไม่พบร้านสำหรับเลือก Scope (ตรวจ endpoint /admin/stores)')
  } catch (e: any) {
    setStores([]);
    setLoadErr(e?.message || 'โหลดร้านไม่สำเร็จ');
    console.error('loadStores error:', e);
  }
}

  useEffect(() => { refresh(); loadStores(); }, []);

  const sorted = useMemo(
    () => items.slice().sort((a, b) => a.provider.localeCompare(b.provider)),
    [items]
  );

  async function onDelete(id: string) {
    const ok = await Swal.fire({
      icon: 'warning',
      title: 'ลบสคริปต์นี้?',
      text: 'ยืนยันการลบ Tracking Script',
      showCancelButton: true,
      confirmButtonText: 'ลบ',
      cancelButtonText: 'ยกเลิก',
    }).then(r => r.isConfirmed);
    if (!ok) return;

    try {
      await apiFetch(`/admin/tracking/${id}`, { method: 'DELETE' });
      await refresh();
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1100, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: e?.message || '' });
    }
  }

  return (
    <Suspense fallback={<div className="min-h-[60vh] grid place-items-center text-slate-200">กำลังโหลด…</div>}>
      <main className="relative min-h-screen text-slate-100">
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

        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Tracking Scripts</h1>
            <button
  onClick={async () => {
    await loadStores(); // โหลด/รีเฟรชรายชื่อร้านก่อนเปิดโมดัล
    setEditing({
      provider: 'GA4',
      trackingId: '',
      script: '',
      placement: 'HEAD',
      strategy: 'afterInteractive',
      enabled: true,
      storeId: null, // ค่าเริ่มต้น = เว็บไซต์หลัก
    });
  }}
  className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#B8860B] hover:from-[#FFCC33] hover:to-[#FFD700] text-black shadow px-5 py-2.5 font-semibold"
  type="button"
>
  + สร้าง
</button>
          </div>

          {loadErr && (
            <div className="rounded-xl border border-red-500/30 bg-red-900/20 text-red-200 p-4 flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">โหลดข้อมูลไม่สำเร็จ</div>
                <div className="text-sm opacity-90 break-all">{loadErr}</div>
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
                    <th className="p-3">Provider</th>
                    <th className="p-3">Tracking ID / Script</th>
                    <th className="p-3">Placement</th>
                    <th className="p-3">Strategy</th>
                    <th className="p-3">Scope</th>
                    <th className="p-3">Enabled</th>
                    <th className="p-3 w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/5/50 transition">
                      <td className="p-3">{r.provider}</td>
                      <td className="p-3">
                        {r.trackingId ? <span className="font-mono">{r.trackingId}</span> : (r.script ? '(custom snippet)' : '—')}
                      </td>
                      <td className="p-3">{r.placement}</td>
                      <td className="p-3">{r.strategy}</td>
                      <td className="p-3">{r.store?.name || (r.storeId ? String(r.storeId) : 'เว็บไซต์หลัก')}</td>
                      <td className="p-3">{r.enabled ? '✅' : '—'}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditing({ ...r })}
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
                      <td className="p-4 text-gray-400" colSpan={7}>ยังไม่มีข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!!editing && (
            <EditModal
              editing={editing}
              onClose={() => setEditing(null)}
              onSaved={async () => { setEditing(null); await refresh(); }}
              loading={loading}
              setLoading={setLoading}
              stores={stores}
            />
          )}
        </div>
      </main>
    </Suspense>
  );
}

/* ---------------- Modal & Inputs ---------------- */
function EditModal({
  editing, onClose, onSaved, loading, setLoading, stores,
}: {
  editing: Partial<TrackingItem>;
  onClose: () => void;
  onSaved: () => Promise<void>;
  loading: boolean;
  setLoading: (v: boolean) => void;
  stores: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<Partial<TrackingItem>>({
    id: editing.id,
    provider: (editing.provider as Provider) ?? 'GA4',
    trackingId: editing.trackingId ?? '',
    script: editing.script ?? '',
    placement: (editing.placement as Placement) ?? 'HEAD',
    strategy: (editing.strategy as Strategy) ?? 'afterInteractive',
    enabled: editing.enabled ?? true,
    storeId: editing.storeId != null ? String(editing.storeId) : null, // null = เว็บไซต์หลัก
  });

  const savingRef = useRef(false);

  async function onSubmit() {
    if (savingRef.current || loading) return;
    const errs: string[] = [];
    if (!String(form.provider || '').trim()) errs.push('เลือก Provider');
    if (!String(form.trackingId || '').trim() && !String(form.script || '').trim()) {
      errs.push('กรอกอย่างน้อย 1 อย่าง ระหว่าง Tracking ID หรือ Script');
    }
    if (!form.placement) errs.push('เลือก Placement');
    if (!form.strategy) errs.push('เลือก Strategy');

    if (errs.length) {
      await Swal.fire({ icon: 'error', title: 'กรอกข้อมูลไม่ครบ', html: `<ul class="text-left">${errs.map(e=>`<li>${e}</li>`).join('')}</ul>` });
      return;
    }

    try {
      savingRef.current = true;
      setLoading(true);
      await apiFetch('/admin/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          provider: form.provider,
          trackingId: form.trackingId || null,
          script: form.script || null,
          placement: form.placement,
          strategy: form.strategy,
          enabled: !!form.enabled,
          storeId: form.storeId ? String(form.storeId) : null, // null = global
        }),
      });
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1100, showConfirmButton: false });
      await onSaved();
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'บันทึกไม่สำเร็จ', text: e?.message || '' });
    } finally {
      setLoading(false);
      savingRef.current = false;
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white/5 backdrop-blur ring-1 ring-white/10 shadow-2xl">
        <div className="px-6 pt-6">
          <h2 className="text-xl font-semibold">{form.id ? 'แก้ไข' : 'สร้าง'} Tracking Script</h2>
        </div>

        <div className="px-6 pb-6 mt-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <Select
            label="Provider *"
            value={form.provider as string}
            onChange={(v) => setForm(s => ({ ...s, provider: v as Provider }))}
            options={PROVIDERS.map(p => ({ value: p, label: p }))}
          />

          <Select
  label="Scope (ถ้าไม่เลือก = เว็บไซต์หลัก)"
  value={form.storeId ? String(form.storeId) : ''}
  onChange={(v) => setForm(s => ({ ...s, storeId: v || null }))}
  options={[
    { value: '', label: '— เว็บไซต์หลัก —' },
    ...(stores.length
      ? stores.map(s => ({ value: String(s.id), label: s.name }))
      : [{ value: '__NO_STORE__', label: '(ไม่มีร้านให้เลือก)' }]
    ),
  ]}
/>

          <Input label="Tracking ID" value={(form.trackingId as string) || ''} onChange={(v) => setForm(s => ({ ...s, trackingId: v }))} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Placement *"
              value={form.placement as string}
              onChange={(v) => setForm(s => ({ ...s, placement: v as Placement }))}
              options={PLACEMENTS.map(p => ({ value: p, label: p }))}
            />
            <Select
              label="Strategy *"
              value={form.strategy as string}
              onChange={(v) => setForm(s => ({ ...s, strategy: v as Strategy }))}
              options={STRATEGIES.map(p => ({ value: p, label: p }))}
            />
          </div>

          <TextArea
            label="Custom Script (ถ้ามี จะใช้แทน/เสริม Tracking ID)"
            rows={8}
            value={(form.script as string) || ''}
            onChange={(v) => setForm(s => ({ ...s, script: v }))}
            placeholder={`<script>/* your tracking code */</script>`}
          />

          <div className="flex items-center gap-2">
            <input
              id="enabled"
              type="checkbox"
              checked={!!form.enabled}
              onChange={(e) => setForm(s => ({ ...s, enabled: e.target.checked }))}
            />
            <label htmlFor="enabled" className="text-sm">Enabled</label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/5 backdrop-blur px-6 pb-6 pt-3 rounded-b-2xl flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 bg-white/10 hover:bg-white/15">ยกเลิก</button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-full bg-gradient-to-r from-[#FFD700] to-[#B8860B] hover:from-[#FFCC33] hover:to-[#FFD700] text-black shadow px-5 py-2.5 font-semibold"
          >
            {loading ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Small UI ---------------- */
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-[#1a1f27] border border-white/10 px-3 py-2 outline-none placeholder-slate-400 text-white focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, rows = 4, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-[#1a1f27] border border-white/10 px-3 py-2 outline-none placeholder-slate-400 text-white focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-slate-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-[#1a1f27] border border-white/10 px-3 py-2 outline-none text-white focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}