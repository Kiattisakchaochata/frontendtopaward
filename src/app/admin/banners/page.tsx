/* src/app/admin/banners/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api";
const FILE_FIELD = process.env.NEXT_PUBLIC_BANNER_FILE_FIELD || "image";
const LAST_FIT_KEY = "bannerPreviewFit"; // 'contain' | 'cover'
/* ===== Premium theme (match Categories page) ===== */
const THEME = {
  pageBg: "bg-slate-950",
  pageFx:
    "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.10), transparent 55%), " +
    "radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.08), transparent 50%)",
  glass: "bg-white/5 backdrop-blur-xl ring-1 ring-white/10",
  textMain: "text-white",
  textMuted: "text-slate-400",
};
const btnGold =
  "bg-gradient-to-r from-[#FFD700] to-[#B8860B] text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700]";

type Banner = {
  id: string;
  title: string | null;
  store_name?: string | null;
  alt_text?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  href?: string | null;
  order?: number | null;
  order_number?: number | null;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
};

/* ---------- Tiny UI helpers (UI เท่านั้น) ---------- */
const labelCls = "text-sm text-slate-300/80";
const inputCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#FFD700]/60";
const cardGlass = `rounded-3xl ${THEME.glass} shadow-xl`;
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

export default function AdminBannersPage() {
  const { confirm } = useConfirm();

  const [list, setList] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [containMode, setContainMode] = useState(false);

  // CREATE form states
  const [title, setTitle] = useState("");
  const [storeName, setStoreName] = useState("");
  const [altText, setAltText] = useState("");
  const [link, setLink] = useState("");
  const [order, setOrder] = useState<number | "">("");
  const [active, setActive] = useState(true);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // EDIT modal states
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState({
    title: "",
    store_name: "",
    alt_text: "",
    link_url: "",
    order_input: "" as number | "",
    is_active: true,
    start_date: "",
    end_date: "",
  });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editCurrentImage, setEditCurrentImage] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement | null>(null);
const [editContainMode, setEditContainMode] = useState(false);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refetch() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/banners`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      const rows: Banner[] =
        Array.isArray(data?.banners)
          ? data.banners
          : Array.isArray(data)
          ? data
          : data?.data || [];
      setList(rows);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (b) =>
        (b.title || "").toLowerCase().includes(s) ||
        (b.link_url || b.href || "").toLowerCase().includes(s) ||
        (b.store_name || "").toLowerCase().includes(s)
    );
  }, [q, list]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0] || null;

  // ✅ บังคับไม่เกิน 1MB + เด้ง Alert
  if (f && f.size > MAX_IMAGE_SIZE) {
    await confirm({
      title: "เกิดข้อผิดพลาด",
      description: "ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB",
      confirmText: "ตกลง",
    });
    if (fileRef.current) fileRef.current.value = "";
    setFile(null);
    setPreview(null);
    return;
  }

  setFile(f);
  setPreview(f ? URL.createObjectURL(f) : null);
}

  // helpers
  function appendIf(fd: FormData, key: string, val?: any) {
    if (val === undefined || val === null || val === "") return;
    fd.append(key, typeof val === "boolean" ? String(val) : String(val));
  }
  async function extractErrorMessage(res: Response) {
    try {
      const j = await res.clone().json();
      return j?.message || j?.error || JSON.stringify(j);
    } catch {}
    try {
      const t = await res.clone().text();
      return t || `HTTP ${res.status}`;
    } catch {}
    return `HTTP ${res.status}`;
  }

  // ===== logic เดิมทั้งชุด (CREATE/EDIT/DELETE/TOGGLE) — ไม่แก้ =====
  async function onCreate(e: React.FormEvent) { /* ...เดิมทุกบรรทัด... */ 
    e.preventDefault(); setLoading(true);
    if (file && file.size > MAX_IMAGE_SIZE) {
  await confirm({
    title: "เกิดข้อผิดพลาด",
    description: "ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB",
    confirmText: "ตกลง",
  });
  setLoading(false);
  return;
}
    try {
      const fd = new FormData();
      appendIf(fd,"title",title.trim());
      appendIf(fd,"store_name",storeName.trim());
      appendIf(fd,"alt_text",(altText||title||"banner").trim());
      appendIf(fd,"link_url",link.trim());
      appendIf(fd,"href",link.trim());
      if (order!=="" && !Number.isNaN(Number(order))) {
        appendIf(fd,"order",Number(order)); appendIf(fd,"order_number",Number(order));
      }
      appendIf(fd,"is_active",!!active);
      appendIf(fd,"start_date",start||undefined);
      appendIf(fd,"end_date",end||undefined);
      if (file) fd.append(FILE_FIELD,file);
      const res = await fetch(`${API_URL}/admin/banners`,{method:"POST",credentials:"include",body:fd});
      if (!res.ok) { const msg = await extractErrorMessage(res); await confirm({title:"เพิ่มไม่สำเร็จ",description:msg,confirmText:"ปิด"}); return; }
      setTitle(""); setStoreName(""); setAltText(""); setLink(""); setOrder(""); setActive(true); setStart(""); setEnd("");
      setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value="";
      await refetch();
    } catch (err:any) {
      await confirm({title:"เพิ่มไม่สำเร็จ",description:err?.message||"เกิดข้อผิดพลาด",confirmText:"ปิด"});
    } finally { setLoading(false); }
  }

  function openEdit(b: Banner) {
  setEditId(b.id); setEditCurrentImage(b.image_url||null); setEditPreview(null);
  setEditVals({
    title:b.title||"", store_name:b.store_name||"", alt_text:b.alt_text||b.title||"banner",
    link_url:b.link_url||b.href||"", order_input:(b.order??b.order_number)??"", is_active:!!b.is_active,
    start_date:b.start_date?b.start_date.slice(0,10):"", end_date:b.end_date?b.end_date.slice(0,10):"",
  });
  setEditOpen(true);
}
  function closeEdit(){ setEditOpen(false); setEditId(null); setEditFile(null); setEditPreview(null); setEditCurrentImage(null); if(editFileRef.current) editFileRef.current.value=""; }
  async function onEditFile(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0] || null;

  // ✅ บังคับไม่เกิน 1MB + เด้ง Alert
  if (f && f.size > MAX_IMAGE_SIZE) {
    await confirm({
      title: "เกิดข้อผิดพลาด",
      description: "ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB",
      confirmText: "ตกลง",
    });
    if (editFileRef.current) editFileRef.current.value = "";
    setEditFile(null);
    setEditPreview(null);
    return;
  }

  setEditFile(f);
  setEditPreview(f ? URL.createObjectURL(f) : null);
}

  async function onUpdate(e: React.FormEvent){ /* เดิม */ 
    e.preventDefault(); if(!editId) return; setLoading(true);
    // กันพลาด: ถ้าไฟล์เกิน 1MB ให้หยุดและเด้ง Alert
if (editFile && editFile.size > MAX_IMAGE_SIZE) {
  await confirm({
    title: "เกิดข้อผิดพลาด",
    description: "ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB",
    confirmText: "ตกลง",
  });
  setLoading(false);
  return;
}
    try{
      const fd=new FormData();
      appendIf(fd,"title",editVals.title.trim());
      appendIf(fd,"store_name",editVals.store_name.trim());
      appendIf(fd,"alt_text",(editVals.alt_text||editVals.title||"banner").trim());
      appendIf(fd,"link_url",editVals.link_url.trim()); appendIf(fd,"href",editVals.link_url.trim());
      if(editVals.order_input!=="" && !Number.isNaN(Number(editVals.order_input))){ appendIf(fd,"order",Number(editVals.order_input)); appendIf(fd,"order_number",Number(editVals.order_input)); }
      appendIf(fd,"is_active",!!editVals.is_active);
      appendIf(fd,"start_date",editVals.start_date||undefined);
      appendIf(fd,"end_date",editVals.end_date||undefined);
      if(editFile) fd.append(FILE_FIELD,editFile);
      const res=await fetch(`${API_URL}/admin/banners/${encodeURIComponent(editId)}`,{method:"PATCH",credentials:"include",body:fd});
      if(!res.ok){ const msg=await extractErrorMessage(res); await confirm({title:"อัปเดตไม่สำเร็จ",description:msg,confirmText:"ปิด"}); return; }
      closeEdit(); await refetch();
    } catch(err:any){ await confirm({title:"อัปเดตไม่สำเร็จ",description:err?.message||"เกิดข้อผิดพลาด",confirmText:"ปิด"}); }
    finally{ setLoading(false); }
  }

  async function onDelete(id: string){ /* เดิม */ 
    const ok=await confirm({title:"ลบแบนเนอร์นี้?",description:"ยืนยันแล้วจะไม่สามารถกู้คืนได้",confirmText:"ลบ",cancelText:"ยกเลิก"}); if(!ok) return;
    setLoading(true); try{
      const res=await fetch(`${API_URL}/admin/banners/${encodeURIComponent(id)}`,{method:"DELETE",credentials:"include"});
      if(!res.ok){ const msg=await extractErrorMessage(res); await confirm({title:"ลบไม่สำเร็จ",description:msg,confirmText:"ปิด"}); return; }
      await refetch();
    } finally{ setLoading(false); }
  }

  async function onToggleActive(b: Banner){ /* เดิม */ 
    setLoading(true);
    try{
      const fd=new FormData(); appendIf(fd,"is_active",!b.is_active);
      const res=await fetch(`${API_URL}/admin/banners/${encodeURIComponent(b.id)}`,{method:"PATCH",credentials:"include",body:fd});
      if(!res.ok){ const msg=await extractErrorMessage(res); await confirm({title:"อัปเดตไม่สำเร็จ",description:msg,confirmText:"ปิด"}); return; }
      await fetch("/api/revalidate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tag:"banners"})});
      await refetch();
    } finally{ setLoading(false); }
  }

  return (
    <div className={`relative min-h-screen ${THEME.pageBg} ${THEME.textMain}`}>
      {/* golden glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ backgroundImage: THEME.pageFx }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        {/* header */}
        <div className={`mb-6 ${cardGlass} px-6 py-6`}>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            จัดการแบนเนอร์ <span className="bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent">Banners</span>
          </h1>
          <p className={`mt-1 text-sm ${THEME.textMuted}`}>เพิ่ม / แก้ไข / ลบ พร้อมกำหนดช่วงเวลาแสดงผล</p>
        </div>

        {/* ---------- CREATE ---------- */}
        <form onSubmit={onCreate} className={`${cardGlass} p-6 md:p-7`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">เพิ่มแบนเนอร์</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/90">
              สร้างใหม่
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <label className="block md:col-span-2">
              <span className={labelCls}>ชื่อแบนเนอร์ (ไม่บังคับ)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="เช่น โปรฯ รับซัมเมอร์" />
            </label>

            <label className="block md:col-span-2">
              <span className={labelCls}>ชื่อร้าน</span>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputCls} placeholder="ชื่อร้านที่จะผูกกับแบนเนอร์" />
            </label>

            <label className="block">
              <span className={labelCls}>ALT Text (จำเป็น)</span>
              <input value={altText} onChange={(e) => setAltText(e.target.value)} className={inputCls} placeholder="คำอธิบายรูปสำหรับ SEO/ผู้อ่านหน้าจอ" />
            </label>

            <label className="block">
              <span className={labelCls}>ลิงก์ (ไม่บังคับ)</span>
              <input value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} placeholder="https://..." type="url" />
            </label>

            <label className="block">
              <span className={labelCls}>ลำดับ (ตัวเลข)</span>
              <input value={order} onChange={(e) => setOrder(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} inputMode="numeric" placeholder="เช่น 1" />
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4 accent-[#FFD700]" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span className="text-sm text-white/90">แสดงผล</span>
            </label>

            <label className="block">
              <span className={labelCls}>เริ่มแสดง</span>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>สิ้นสุด</span>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
            </label>

            <label className="block md:col-span-3">
              <span className={labelCls}>รูปภาพ</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onFile}
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
              />
              {preview && (
  <div className="mt-3 h-32 w-56 overflow-hidden rounded-xl border border-white/10 bg-black/30">
    <img
      src={preview}
      className={`h-full w-full ${containMode ? "object-contain" : "object-cover"}`}
      alt="preview"
    />
  </div>
)}
<label className="mt-2 flex items-center gap-2 text-sm text-white/80">
  <input
    type="checkbox"
    checked={containMode}
    onChange={(e) => setContainMode(e.target.checked)}
    className="h-4 w-4 accent-[#FFD700]"
  />
  แสดงแบบ object-contain
</label>
            </label>
          </div>

          <div className="mt-5">
            <button disabled={loading} className={`rounded-lg px-4 py-2 ${btnGold} active:scale-[.98] disabled:opacity-60`}>
              {loading ? "กำลังเพิ่ม…" : "เพิ่มแบนเนอร์"}
            </button>
          </div>
        </form>

        {/* ---------- LIST ---------- */}
        <div className={`${cardGlass} p-6 md:p-7 mt-8`}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">รายการแบนเนอร์</h2>
            <div className="flex items-center gap-2">
              <input
                placeholder="ค้นหาชื่อ/ลิงก์/ชื่อร้าน…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`${inputCls} md:w-72`}
              />
              <button onClick={refetch} disabled={loading} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 active:scale-[.98] disabled:opacity-60">
                รีเฟรช
              </button>
            </div>
          </div>

          {loading ? (
            <p className={`text-sm ${THEME.textMuted}`}>กำลังโหลด…</p>
          ) : filtered.length === 0 ? (
            <p className={`text-sm ${THEME.textMuted}`}>ยังไม่มีแบนเนอร์</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {filtered.map((b) => (
                <li key={b.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.07]">
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-black/30 ring-1 ring-white/10">
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.alt_text || b.title || ""} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-slate-400">ไม่มีรูป</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="line-clamp-1 font-medium">{b.title || "—"}</span>
                      {b.is_active ? (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-white/15">
                          Hidden
                        </span>
                      )}
                    </div>
                    {b.store_name ? (
                      <div className="mt-0.5 text-xs text-slate-300/80">ร้าน: {b.store_name}</div>
                    ) : null}
                    <div className="mt-1 text-xs text-slate-400">
                      ลำดับ: {(b.order ?? b.order_number) ?? "-"} • ลิงก์: {b.link_url || b.href || "-"}
                    </div>
                    {(b.start_date || b.end_date) && (
                      <div className="text-xs text-slate-400">
                        ช่วง: {b.start_date ? b.start_date.slice(0, 10) : "-"} – {b.end_date ? b.end_date.slice(0, 10) : "-"}
                      </div>
                    )}
                    {b.alt_text ? <div className="text-xs text-slate-400">ALT: {b.alt_text}</div> : null}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10 active:scale-[.98]">
                      แก้ไข
                    </button>
                    <button
                      onClick={() => onToggleActive(b)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white shadow active:scale-[.98] ${
                        b.is_active ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {b.is_active ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => onDelete(b.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 active:scale-[.98]">
                      ลบ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- EDIT MODAL ---------- */}
      {editOpen && (
        <div className="fixed inset-0 z-[9999] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative mx-auto flex w-full max-w-3xl max-h-[90svh] flex-col overflow-hidden rounded-2xl bg-slate-900/95 text-white ring-1 ring-white/10 shadow-2xl animate-[modalIn_.18s_ease-out]">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-lg font-semibold">แก้ไขแบนเนอร์</h3>
              <button onClick={closeEdit} className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
                ปิด
              </button>
            </div>

            {/* content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              <form id="edit-banner-form" onSubmit={onUpdate} className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <label className="block md:col-span-2">
                  <span className={labelCls}>ชื่อแบนเนอร์</span>
                  <input value={editVals.title} onChange={(e) => setEditVals((s) => ({ ...s, title: e.target.value }))} className={inputCls} />
                </label>

                <label className="block md:col-span-2">
                  <span className={labelCls}>ชื่อร้าน</span>
                  <input value={editVals.store_name} onChange={(e) => setEditVals((s) => ({ ...s, store_name: e.target.value }))} className={inputCls} />
                </label>

                <label className="block">
                  <span className={labelCls}>ALT Text</span>
                  <input value={editVals.alt_text} onChange={(e) => setEditVals((s) => ({ ...s, alt_text: e.target.value }))} className={inputCls} />
                </label>

                <label className="block">
                  <span className={labelCls}>ลิงก์</span>
                  <input value={editVals.link_url} onChange={(e) => setEditVals((s) => ({ ...s, link_url: e.target.value }))} className={inputCls} />
                </label>

                <label className="block">
                  <span className={labelCls}>ลำดับ</span>
                  <input
                    value={editVals.order_input}
                    onChange={(e) => setEditVals((s) => ({ ...s, order_input: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className={inputCls}
                    inputMode="numeric"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#FFD700]" checked={editVals.is_active} onChange={(e) => setEditVals((s) => ({ ...s, is_active: e.target.checked }))} />
                  <span className="text-sm text-white/90">แสดงผล</span>
                </label>

                <label className="block">
                  <span className={labelCls}>เริ่ม</span>
                  <input type="date" value={editVals.start_date} onChange={(e) => setEditVals((s) => ({ ...s, start_date: e.target.value }))} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>สิ้นสุด</span>
                  <input type="date" value={editVals.end_date} onChange={(e) => setEditVals((s) => ({ ...s, end_date: e.target.value }))} className={inputCls} />
                </label>

                

                                  <label className="block">
                  <span className={labelCls}>สิ้นสุด</span>
                  <input type="date" value={editVals.end_date} onChange={(e) => setEditVals((s) => ({ ...s, end_date: e.target.value }))} className={inputCls} />
                </label>

                {/* ✅ ใส่ wrapper กลับมาให้รูป+อัปโหลดอยู่ในกริด 2 คอลัมน์ */}
                <div className="md:col-span-3 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-sm text-slate-300/80">รูปปัจจุบัน / ตัวอย่าง</div>
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-black/30 ring-1 ring-white/10">
                      {editPreview ? (
                        <img
                          src={editPreview}
                          className={`h-full w-full ${editContainMode ? "object-contain" : "object-cover"}`}
                          alt="preview"
                        />
                      ) : editCurrentImage ? (
                        <img
                          src={editCurrentImage}
                          className={`h-full w-full ${editContainMode ? "object-contain" : "object-cover"}`}
                          alt="current"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-slate-400">ไม่มีรูป</div>
                      )}
                    </div>

                    {/* สวิตช์โหมดพรีวิว */}
                    <label className="mt-2 flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={editContainMode}
                        onChange={(e) => setEditContainMode(e.target.checked)}
                        className="h-4 w-4 accent-[#FFD700]"
                      />
                      แสดงแบบ object-contain
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelCls}>อัปโหลดรูปใหม่ (ไม่บังคับ)</span>
                    <input
                      ref={editFileRef}
                      type="file"
                      accept="image/*"
                      onChange={onEditFile}
                      className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
                    />
                  </label>
                </div> {/* ✅ ปิด wrapper ตรงนี้พอดี */}
              </form>
            </div>

            {/* action bar */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-white/10 bg-slate-900/95 px-5 py-3 backdrop-blur">
              <button form="edit-banner-form" disabled={loading} className={`rounded-lg px-4 py-2 ${btnGold} disabled:opacity-60 active:scale-[.98]`}>
                {loading ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
              </button>
              <button type="button" onClick={closeEdit} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10">
                ยกเลิก
              </button>
            </div>
          </div>

          {/* keyframes */}
          <style>{`
            @keyframes modalIn {
              from { opacity: .0; transform: translateY(6px) scale(.97); }
              to   { opacity: 1;  transform: translateY(0)    scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}