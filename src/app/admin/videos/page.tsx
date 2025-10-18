// src/app/admin/videos/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";

function useLockBodyScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body;
    const prevStyle = body.getAttribute("style") || "";

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.setAttribute("style", prevStyle);
      window.scrollTo(0, y);
    };
  }, [open]);
}

/** ---------- Premium Theme (UI เท่านั้น) ---------- **/
const THEME = {
  pageBg: "bg-slate-950",
  pageFx:
    "radial-gradient(1200px 600px at 10% -10%, rgba(212,175,55,.10), transparent 55%), " +
    "radial-gradient(1200px 600px at 90% 0%, rgba(184,134,11,.08), transparent 50%)",
  glass: "bg-white/5 backdrop-blur-xl ring-1 ring-white/10",
  textMain: "text-white",
  textMuted: "text-slate-400",
  accent:
    "bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent",
};
const cardGlass = `rounded-3xl ${THEME.glass} shadow-xl`;
const labelCls = "text-sm text-slate-300/80";
const inputCls =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#FFD700]/60";
const btnGold =
  "bg-gradient-to-r from-[#FFD700] to-[#B8860B] text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700] active:scale-[.98]";

/** ---------- Helpers ---------- **/
const API_FRONT = "/api/admin/videos"; // proxy ไป backend
const API_STORES = "/api/admin/stores"; // ใช้ดึงรายชื่อร้าน

type Video = {
  id: string;
  title: string;
  youtube_url: string;
  tiktok_url?: string | null;
  thumbnail_url?: string | null;
  order_number: number;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  store_id?: string | null;
};

type Store = { id: string; name: string };

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/** ---------- TikTok helpers ---------- **/
function extractTikTokVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("tiktok.com")) return null;
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m?.[1] || null;
  } catch {
    return null;
  }
}
function toTikTokEmbedUrl(url: string): string | null {
  if (/tiktok\.com\/embed/i.test(url)) return url;
  const id = extractTikTokVideoId(url);
  return id ? `https://www.tiktok.com/embed/${id}` : null;
}
function buildDefaultThumb(youtube_url: string): string | null {
  const id = extractYouTubeId(youtube_url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
function isValidHttpUrl(s?: string | null): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function displayThumb(youtubeUrl?: string | null, explicit?: string | null) {
  // ใช้ explicit เฉพาะเมื่อเป็น URL ที่ valid จริงๆ
  if (explicit && isValidHttpUrl(explicit)) return explicit;

  // ไม่งั้น fallback เป็นรูปจาก YouTube ถ้าแกะ id ได้
  if (youtubeUrl) return buildDefaultThumb(youtubeUrl);
  return null;
}

function cleanPayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const isEmptyString = typeof v === "string" && v.trim() === "";
    if (v === undefined || v === null || isEmptyString) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

/** ---------- Date range → Full-day with local TZ (+/-HH:MM) ---------- **/
function localTzOffset(): string {
  const mins = -new Date().getTimezoneOffset();
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}
function toFullDayRange(start?: string, end?: string) {
  const tz = localTzOffset();
  const s = start ? `${start}T00:00:00${tz}` : undefined;
  const e = end ? `${end}T23:59:59${tz}` : undefined;
  return { startIso: s, endIso: e };
}

export default function AdminVideosPage() {
  const { confirm } = useConfirm();

  const [rows, setRows] = useState<Video[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const [savingId, setSavingId] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [thumb, setThumb] = useState("");
  const [order, setOrder] = useState<number | "">("");
  const [active, setActive] = useState(true);
  const [start, setStart] = useState<string>("");
  const [end, setEnd] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("");

  // Edit modal
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editThumbFile, setEditThumbFile] = useState<File | null>(null);
  const [editThumbPreview, setEditThumbPreview] = useState<string | null>(null); // 👈 preview
  const [vals, setVals] = useState({
    title: "",
    youtube_url: "",
    tiktok_url: "",
    thumbnail_url: "",
    order_number: "" as number | "",
    is_active: true,
    start_date: "",
    end_date: "",
    store_id: "" as string,
  });

  const contentRef = useRef<HTMLDivElement | null>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    fetchList();
    fetchStores();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch(`${API_FRONT}?_=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      const list: Video[] = Array.isArray(data?.videos)
        ? data.videos
        : Array.isArray(data)
        ? data
        : data?.data || [];
      setRows(list);
    } catch (e) {
      console.error(e);
      await confirm({
        title: "โหลดรายการไม่สำเร็จ",
        description: "ตรวจสอบเซิร์ฟเวอร์หรือการเชื่อมต่อ",
        confirmText: "ปิด",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchStores() {
    try {
      const r = await fetch(`${API_STORES}?_=${Date.now()}`, { cache: "no-store" });
      const j = await r.json();
      const list: Store[] = Array.isArray(j?.stores) ? j.stores : Array.isArray(j) ? j : j?.data || [];
      setStores(list);
    } catch (e) {
      console.warn("fetch stores failed", e);
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.title?.toLowerCase().includes(s) ||
      r.youtube_url?.toLowerCase().includes(s) ||
      r.tiktok_url?.toLowerCase().includes(s)
    );
  }, [q, rows]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (!title.trim()) {
      await confirm({
        title: "กรอกข้อมูลไม่ครบ",
        description: "กรุณากรอกชื่อวิดีโอ",
        confirmText: "ปิด",
      });
      setLoading(false);
      return;
    }

    if (!youtube.trim() && !tiktok.trim()) {
      await confirm({
        title: "กรอกลิงก์ไม่ครบ",
        description: "กรุณาใส่อย่างน้อยหนึ่งช่อง: YouTube หรือ TikTok",
        confirmText: "ปิด",
      });
      setLoading(false);
      return;
    }
    try {
      const { startIso, endIso } = toFullDayRange(start, end);

      let res: Response;
      if (thumbFile) {
        const fd = new FormData();
        fd.append("title", title.trim());
        if (youtube.trim()) fd.append("youtube_url", youtube.trim());
        if (tiktok.trim()) fd.append("tiktok_url", tiktok.trim());
        if (order !== "") fd.append("order_number", String(Number(order)));
fd.append("is_active", String(!!active));
if (start) fd.append("start_date", start);
if (end) fd.append("end_date", end);
if (storeId) fd.append("store_id", storeId);
fd.append("thumbnail", thumbFile);

        res = await fetch(API_FRONT, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
      } else {
  const base: any = {
    title: title.trim(),
    youtube_url: youtube.trim(),
    tiktok_url: tiktok.trim(),
    // ส่งเฉพาะเมื่อเป็น URL จริง ๆ เท่านั้น
    thumbnail_url: isValidHttpUrl(thumb.trim()) ? thumb.trim() : undefined,
    order_number: order === "" ? undefined : Number(order),
    is_active: !!active,
    // ส่งเฉพาะถ้ามีกรอก
    start_date: start || undefined,
    end_date: end || undefined,
    store_id: storeId || undefined,
  };

  const payload = cleanPayload(base);

  res = await fetch(API_FRONT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
}

      if (!res.ok) {
        const msg = await res.text();
        await confirm({
          title: "เพิ่มไม่สำเร็จ",
          description: msg || "เกิดข้อผิดพลาด",
          confirmText: "ปิด",
        });
        return;
      }

      setTitle("");
      setYoutube("");
      setTiktok("");
      setThumb("");
      setThumbFile(null);
      setOrder("");
      setActive(true);
      setStart("");
      setEnd("");
      setStoreId("");

      await fetchList();
    } catch (e: any) {
      await confirm({
        title: "เพิ่มไม่สำเร็จ",
        description: e?.message || "เกิดข้อผิดพลาด",
        confirmText: "ปิด",
      });
    } finally {
      setLoading(false);
    }
  }

  function openEdit(v: Video) {
    setEditId(v.id);
    setVals({
      title: v.title || "",
      youtube_url: v.youtube_url || "",
      tiktok_url: v.tiktok_url || "",
      thumbnail_url: v.thumbnail_url || "",
      order_number: v.order_number ?? 0,
      is_active: !!v.is_active,
      start_date: v.start_date ? v.start_date.slice(0, 10) : "",
      end_date: v.end_date ? v.end_date.slice(0, 10) : "",
      store_id: v.store_id || "",
    });
    // reset file + preview
    if (editThumbPreview) URL.revokeObjectURL(editThumbPreview);
    setEditThumbFile(null);
    setEditThumbPreview(null);
    setOpen(true);
  }

  function closeEdit() {
    setOpen(false);
    setEditId(null);
    if (editThumbPreview) URL.revokeObjectURL(editThumbPreview);
    setEditThumbFile(null);
    setEditThumbPreview(null);
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setLoading(true);

    if (!vals.youtube_url.trim() && !(vals.tiktok_url || "").trim()) {
      await confirm({
        title: "กรอกลิงก์ไม่ครบ",
        description: "กรุณาใส่อย่างน้อยหนึ่งช่อง: YouTube หรือ TikTok",
        confirmText: "ปิด",
      });
      setLoading(false);
      return;
    }

    try {
      const base: any = {
  title: vals.title.trim(),
  youtube_url: vals.youtube_url.trim(),
  tiktok_url: (vals.tiktok_url || "").trim(),
  thumbnail_url: isValidHttpUrl((vals.thumbnail_url || "").trim())
    ? (vals.thumbnail_url || "").trim()
    : undefined,
  is_active: !!vals.is_active,
  start_date: vals.start_date || undefined,
  end_date: vals.end_date || undefined,
  store_id: vals.store_id || undefined,
  order_number: vals.order_number === "" ? undefined : Number(vals.order_number),
};

const payload = cleanPayload(base);

      let res: Response;
      if (editThumbFile) {
        const fd = new FormData();
fd.append("title", String(payload.title));
if (payload.youtube_url) fd.append("youtube_url", String(payload.youtube_url));
if (payload.tiktok_url) fd.append("tiktok_url", String(payload.tiktok_url));
if (payload.order_number !== undefined) fd.append("order_number", String(payload.order_number));
fd.append("is_active", String(!!payload.is_active));
if (vals.start_date) fd.append("start_date", vals.start_date);
if (vals.end_date) fd.append("end_date", vals.end_date);
if (payload.store_id) fd.append("store_id", String(payload.store_id));
fd.append("thumbnail", editThumbFile);

        res = await fetch(`${API_FRONT}/${encodeURIComponent(editId)}`, {
          method: "PATCH",
          body: fd,
          credentials: "include",
        });
      } else {
        res = await fetch(`${API_FRONT}/${encodeURIComponent(editId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });
      }

      if (!res.ok) {
        const msg = await res.text();
        await confirm({
          title: "อัปเดตไม่สำเร็จ",
          description: msg || "เกิดข้อผิดพลาด",
          confirmText: "ปิด",
        });
        return;
      }

      closeEdit();
      await fetchList();
    } catch (e: any) {
      await confirm({
        title: "อัปเดตไม่สำเร็จ",
        description: e?.message || "เกิดข้อผิดพลาด",
        confirmText: "ปิด",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    const ok = await confirm({
      title: "ลบวิดีโอนี้?",
      description: "ยืนยันแล้วจะไม่สามารถกู้คืนได้",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_FRONT}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const msg = await res.text();
        await confirm({
          title: "ลบไม่สำเร็จ",
          description: msg || "เกิดข้อผิดพลาด",
          confirmText: "ปิด",
        });
        return;
      }
      await fetchList();
    } finally {
      setLoading(false);
    }
  }

  /** ✅ Toggle Active (Enable/Disable) */
  async function toggleActive(v: Video) {
    setSavingId(v.id);
    setRows((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: !x.is_active } : x)));

    try {
      const res = await fetch(`${API_FRONT}/${encodeURIComponent(v.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !v.is_active }),
      });

      if (!res.ok) {
        setRows((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: v.is_active } : x)));
        const msg = await res.text();
        await confirm({
          title: "อัปเดตสถานะไม่สำเร็จ",
          description: msg || "เกิดข้อผิดพลาด",
          confirmText: "ปิด",
        });
      }
    } catch (e: any) {
      setRows((prev) => prev.map((x) => (x.id === v.id ? { ...x, is_active: v.is_active } : x)));
      await confirm({
        title: "อัปเดตสถานะไม่สำเร็จ",
        description: e?.message || "เกิดข้อผิดพลาด",
        confirmText: "ปิด",
      });
    } finally {
      setSavingId(null);
    }
  }

  const previewId = extractYouTubeId(youtube);
  const editPreviewId = extractYouTubeId(vals.youtube_url);
  const previewTikTok = toTikTokEmbedUrl(tiktok);
  const editPreviewTikTok = toTikTokEmbedUrl(vals.tiktok_url || "");

  return (
    <div className={`relative min-h-screen ${THEME.pageBg} ${THEME.textMain}`}>
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ backgroundImage: THEME.pageFx }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        {/* Header */}
        <div className={`mb-6 ${cardGlass} px-6 py-6`}>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            จัดการวิดีโอ <span className={THEME.accent}>YouTube / TikTok</span>
          </h1>
          <p className={`mt-1 text-sm ${THEME.textMuted}`}>
            เพิ่ม / แก้ไข / ลบ พร้อมจัดลำดับและกำหนดช่วงเวลาแสดงผล
          </p>
        </div>

        {/* Create */}
        <form onSubmit={onCreate} className={`${cardGlass} p-6 md:p-7`}>
          <h2 className="mb-4 text-lg font-semibold">เพิ่มวิดีโอ</h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <label className="block md:col-span-2">
              <span className={labelCls}>ชื่อวิดีโอ</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
                placeholder="เช่น รีวิวร้านดังย่านสยาม"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className={labelCls}>ลิงก์ YouTube</span>
              <input
                value={youtube}
                onChange={(e) => setYoutube(e.target.value)}
                className={inputCls}
                placeholder="https://youtu.be/xxxx หรือ https://www.youtube.com/watch?v=xxxx"
                type="url"
              />
              {previewId ? (
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${previewId}`}
                    title="preview"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </label>

            <label className="block md:col-span-2">
              <span className={labelCls}>ลิงก์ TikTok (ไม่บังคับ)</span>
              <input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className={inputCls}
                placeholder="https://www.tiktok.com/@user/video/1234567890123456"
                type="url"
              />
              {previewTikTok ? (
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                  <iframe
  src={previewTikTok}
  title="tiktok-preview"
  className="h-full w-full"
  /* เพิ่ม accelerometer; และตัด referrerPolicy ออก */
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
  loading="lazy"
/>
                </div>
              ) : null}
            </label>

            {stores.length > 0 && (
              <label className="block">
                <span className={labelCls}>แสดงในหน้าร้าน</span>
                <select
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- ไม่ผูกกับร้าน --</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id} className="text-black">
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className={labelCls}>รูปตัวอย่าง (ถ้าเป็น TikTok ควรใส่รูปเอง)</span>
              <input
                value={thumb}
                onChange={(e) => setThumb(e.target.value)}
                className={inputCls}
                placeholder="https://...jpg"
                type="url"
              />
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setThumbFile(f);
                    if (f) setThumb("");
                  }}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0
                 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
                />
              </div>
            </label>

            <label className="block">
              <span className={labelCls}>ลำดับ (เลข)</span>
              <input
                value={order}
                onChange={(e) =>
                  setOrder(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inputCls}
                inputMode="numeric"
                placeholder="เช่น 1"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#FFD700]"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span className="text-sm text-white/90">แสดงผล</span>
            </label>

            <label className="block">
              <span className={labelCls}>เริ่มแสดง</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>สิ้นสุด</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <div className="mt-5">
            <button
              disabled={loading}
              className={`rounded-lg px-4 py-2 ${btnGold} disabled:opacity-60`}
            >
              {loading ? "กำลังเพิ่ม…" : "เพิ่มวิดีโอ"}
            </button>
          </div>
        </form>

        {/* List */}
        <div className={`${cardGlass} p-6 md:p-7 mt-8`}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">รายการวิดีโอ</h2>
            <div className="flex items-center gap-2">
              <input
                placeholder="ค้นหาชื่อ/ลิงก์…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`${inputCls} md:w-72`}
              />
              <button
                onClick={fetchList}
                disabled={loading}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
              >
                รีเฟรช
              </button>
            </div>
          </div>

          {loading ? (
            <p className={`text-sm ${THEME.textMuted}`}>กำลังโหลด…</p>
          ) : filtered.length === 0 ? (
            <p className={`text-sm ${THEME.textMuted}`}>ยังไม่มีวิดีโอ</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {filtered.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.07]"
                >
                  {(() => {
                    const listThumb = displayThumb(v.youtube_url, v.thumbnail_url || null);
                    return (
                      <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-black/30 ring-1 ring-white/10">
                        {listThumb ? (
                          <img
                            src={listThumb}
                            alt={v.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-slate-400">
                            ไม่มีรูป
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="line-clamp-1 font-medium">{v.title || "—"}</span>
                      {v.is_active ? (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300 ring-1 ring-white/15">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400 space-y-0.5">
                      <div>ลำดับ: {v.order_number ?? "-"}</div>
                      <div>YouTube: {v.youtube_url || "-"}</div>
                      <div>TikTok: {v.tiktok_url || "-"}</div>
                    </div>
                    {(v.start_date || v.end_date) && (
                      <div className="text-xs text-slate-400">
                        ช่วง: {v.start_date ? v.start_date.slice(0, 10) : "-"} –{" "}
                        {v.end_date ? v.end_date.slice(0, 10) : "-"}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => toggleActive(v)}
                      disabled={savingId === v.id}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium shadow active:scale-[.98] ${
                        v.is_active
                          ? "bg-slate-600 text-white hover:bg-slate-700"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      } disabled:opacity-60`}
                      title={v.is_active ? "Disable" : "Enable"}
                    >
                      {savingId === v.id ? "กำลังอัปเดต…" : v.is_active ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => openEdit(v)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => onDelete(v.id)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                    >
                      ลบ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative mx-auto my-auto flex w-full max-w-3xl max-h-[90vh] flex-col 
                overflow-hidden rounded-2xl bg-slate-900/95 text-white 
                ring-1 ring-white/10 shadow-2xl animate-[modalIn_.18s_ease-out]"
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4
                bg-slate-900/95 border-b border-white/10 backdrop-blur"
            >
              <h3 className="text-lg font-semibold">แก้ไขวิดีโอ</h3>
              <button
                onClick={closeEdit}
                className="rounded-md px-2 py-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
              >
                ปิด
              </button>
            </div>

            <div ref={contentRef} className="flex-1 overflow-y-auto px-5 pb-6">
              <form id="edit-video-form" onSubmit={onUpdate} className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <label className="block md:col-span-2">
                  <span className={labelCls}>ชื่อวิดีโอ</span>
                  <input
                    value={vals.title}
                    onChange={(e) => setVals((s) => ({ ...s, title: e.target.value }))}
                    className={inputCls}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className={labelCls}>ลิงก์ YouTube</span>
                  <input
                    value={vals.youtube_url}
                    onChange={(e) => setVals((s) => ({ ...s, youtube_url: e.target.value }))}
                    className={inputCls}
                  />
                  {editPreviewId ? (
                    <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <iframe
                        className="h-full w-full"
                        src={`https://www.youtube.com/embed/${editPreviewId}`}
                        title="preview"
                        allowFullScreen
                      />
                    </div>
                  ) : null}
                </label>

                <label className="block md:col-span-2">
                  <span className={labelCls}>ลิงก์ TikTok (ไม่บังคับ)</span>
                  <input
                    value={vals.tiktok_url || ""}
                    onChange={(e) => setVals((s) => ({ ...s, tiktok_url: e.target.value }))}
                    className={inputCls}
                    placeholder="https://www.tiktok.com/@user/video/1234567890123456"
                    type="url"
                  />
                  {editPreviewTikTok ? (
                    <div className="mt-2 aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <iframe
  src={editPreviewTikTok}
  title="tiktok-preview"
  className="h-full w-full"
  /* เพิ่ม accelerometer; และตัด referrerPolicy ออก */
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
/>
                    </div>
                  ) : null}
                </label>

                {stores.length > 0 && (
                  <label className="block">
                    <span className={labelCls}>แสดงในหน้าร้าน</span>
                    <select
                      value={vals.store_id}
                      onChange={(e) => setVals((s) => ({ ...s, store_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="" className="text-black">
                        -- ไม่ผูกกับร้าน --
                      </option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id} className="text-black">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block md:col-span-2">
                  <span className={labelCls}>รูปตัวอย่าง (ปล่อยว่างเพื่อใช้ของ YouTube)</span>

                  {/* URL ตรง */}
                  <input
                    value={vals.thumbnail_url || ""}
                    onChange={(e) => setVals((s) => ({ ...s, thumbnail_url: e.target.value }))}
                    className={inputCls}
                    placeholder="https://...jpg"
                    type="url"
                  />

                  {/* อัปโหลดไฟล์ใหม่ */}
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (editThumbPreview) URL.revokeObjectURL(editThumbPreview);
                        setEditThumbFile(f);
                        setEditThumbPreview(f ? URL.createObjectURL(f) : null);
                        if (f) setVals((s) => ({ ...s, thumbnail_url: "" }));
                      }}
                      className="block w-full text-sm file:mr-3 file:rounded-md file:border-0
                 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
                    />
                  </div>

                  {/* พรีวิว: ไฟล์ใหม่ > URL เดิม > Fallback (YouTube) */}
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                    {(() => {
                      const fallback = displayThumb(vals.youtube_url, vals.thumbnail_url || null);
                      const src = editThumbPreview || fallback;
                      return src ? (
                        <img src={src} alt="preview" className="h-40 w-full object-cover" />
                      ) : (
                        <div className="h-40 grid place-items-center text-xs text-slate-400">
                          ไม่มีรูปตัวอย่าง
                        </div>
                      );
                    })()}
                  </div>

                  {(editThumbPreview || vals.thumbnail_url) && (
                    <button
                      type="button"
                      className="mt-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
                      onClick={() => {
                        if (editThumbPreview) URL.revokeObjectURL(editThumbPreview);
                        setEditThumbFile(null);
                        setEditThumbPreview(null);
                        setVals((s) => ({ ...s, thumbnail_url: "" }));
                      }}
                    >
                      ล้างรูป
                    </button>
                  )}
                </label>

                <label className="block">
                  <span className={labelCls}>ลำดับ</span>
                  <input
                    value={vals.order_number}
                    onChange={(e) =>
                      setVals((s) => ({
                        ...s,
                        order_number: e.target.value === "" ? "" : Number(e.target.value),
                      }))
                    }
                    className={inputCls}
                    inputMode="numeric"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#FFD700]"
                    checked={vals.is_active}
                    onChange={(e) => setVals((s) => ({ ...s, is_active: e.target.checked }))}
                  />
                  <span className="text-sm text-white/90">แสดงผล</span>
                </label>

                <label className="block">
                  <span className={labelCls}>เริ่มแสดง</span>
                  <input
                    type="date"
                    value={vals.start_date}
                    onChange={(e) => setVals((s) => ({ ...s, start_date: e.target.value }))}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>สิ้นสุด</span>
                  <input
                    type="date"
                    value={vals.end_date}
                    onChange={(e) => setVals((s) => ({ ...s, end_date: e.target.value }))}
                    className={inputCls}
                  />
                </label>
              </form>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-white/10 bg-slate-900/95 px-5 py-3 backdrop-blur">
              <button
                form="edit-video-form"
                disabled={loading}
                className={`rounded-lg px-4 py-2 ${btnGold} disabled:opacity-60`}
              >
                {loading ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
              </button>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white hover:bg-white/10"
              >
                ยกเลิก
              </button>
            </div>
          </div>

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