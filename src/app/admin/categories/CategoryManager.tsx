"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

/* ------------ Overlay + Modal + AlertModal ------------ */
function BaseOverlay({ children, z = 10000 }: { children: React.ReactNode; z?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); return () => {}; }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" style={{ zIndex: z }}>
      {children}
    </div>,
    document.body
  );
}

function Modal({ open, children, z = 10000 }: { open: boolean; children: React.ReactNode; z?: number }) {
  if (!open) return null;
  return (
    <BaseOverlay z={z}>
      <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 shadow-xl p-6 animate-[fadeIn_.2s_ease-out]">
        {children}
      </div>
    </BaseOverlay>
  );
}

function AlertModal({
  open, title, message, onClose,
}: { open: boolean; title: string; message: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <Modal open={open}>
      <div className="text-lg font-bold mb-3">{title}</div>
      <div className="text-sm text-slate-700 mb-6 whitespace-pre-line">{message}</div>
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2">
          ตกลง
        </button>
      </div>
    </Modal>
  );
}


/** Normalize base URL */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8899/api").replace(/\/$/, "");

/** ปุ่มทองแบบ premium */
const btnGold =
  "bg-gradient-to-r from-[#FFD700] to-[#B8860B] text-black shadow-md hover:from-[#FFCC33] hover:to-[#FFD700] active:scale-[.98] transition";

type Category = {
  id: string;
  name: string;
  cover_image?: string | null;
  created_at?: string;
};

type Props = { initialCategories: Category[] };

export default function CategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const [list, setList] = useState<Category[]>(initialCategories || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // ====== สร้างหมวดหมู่ ======
  const [createName, setCreateName] = useState("");
  const [createFile, setCreateFile] = useState<File | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const [createPreview, setCreatePreview] = useState<string | null>(null);

  // ====== แก้ไขผ่าน Modal ======
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editCurrentCover, setEditCurrentCover] = useState<string | null>(null);

  // modal confirm
  const { confirm } = useConfirm();

  // โหลดซ้ำ (อัปเดต state) + utility ดึงลิสต์ล่าสุดแบบ return ค่า
  async function refetch() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_URL}/admin/categories`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("โหลดหมวดหมู่ไม่สำเร็จ");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data?.categories || [];
      setList(rows);
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLatestList(): Promise<Category[]> {
    const res = await fetch(`${API_URL}/admin/categories`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.categories || [];
  }

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return list;
    return list.filter((c) => c.name.toLowerCase().includes(ql));
  }, [q, list]);

  // ✅ helper สำหรับสร้าง slug
function slugify(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .normalize("NFD") // ลบวรรณยุกต์
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ก-๙\s-]/g, "") // อนุญาตเฉพาะ a-z 0-9 ภาษาไทย เว้นวรรค ขีดกลาง
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
  // ============ Create ============
  function onCreateFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0] || null;

  // ✅ limit ขนาด ≤ 1MB
  if (file && file.size > 1024 * 1024) {
  setErr("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
  if (createFileInputRef.current) createFileInputRef.current.value = "";
  setCreateFile(null);
  setCreatePreview(null);
  return;
}

  setCreateFile(file);
  setCreatePreview(file ? URL.createObjectURL(file) : null);
}

  // ยิง POST (เลือก JSON ถ้าไม่มีไฟล์ / FormData ถ้ามีไฟล์)
  async function createRequest(name: string, slug: string, orderNumber: number) {
  if (createFile) {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("slug", slug);
    fd.append("order_number", String(orderNumber));
    fd.append("cover", createFile);       // เผื่อ backend ใช้ key cover
    fd.append("cover_image", createFile); // เผื่อ backend ใช้ key cover_image
    return fetch(`${API_URL}/admin/categories`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
  }
  return fetch(`${API_URL}/admin/categories`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, slug, order_number: orderNumber }),
  });
}

  function cleanName(s: string) {
    return s.replace(/\s+/g, " ").trim();
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const base = cleanName(createName);
      if (!base) throw new Error("กรุณากรอกชื่อหมวดหมู่");

      // กลยุทธ์: ลองยิงจริงแล้วเช็ค 409 → เพิ่มเลขต่อท้ายอัตโนมัติและยิงซ้ำ
      const MAX_TRY = 10;
      let ok = false;
      let lastError = "สร้างไม่สำเร็จ";
      // หา order_number ล่าสุดจาก list
const latest = await fetchLatestList();
const nextOrder =
  latest.length > 0
    ? Math.max(
        ...latest
          .map((c: any) => Number(c?.order_number ?? 0))
          .filter((n: number) => Number.isFinite(n))
      ) + 1
    : 1;

for (let i = 0; i < MAX_TRY; i++) {
  const name = i === 0 ? base : `${base} (${i + 1})`;
  const slug = slugify(name);

  const res = await createRequest(name, slug, nextOrder);
  if (res.ok) {
    ok = true;
    break;
  }
        if (res.status === 409) {
          // ชื่อชน — ลองรอบถัดไป
          try {
            const d = await res.json();
            lastError = d?.message || d?.error || "มีหมวดหมู่ชื่อนี้อยู่แล้ว";
          } catch {
            lastError = "มีหมวดหมู่ชื่อนี้อยู่แล้ว";
          }
          continue;
        } else {
          try {
            const d = await res.json();
            lastError = d?.message || d?.error || lastError;
          } catch {}
          throw new Error(lastError);
        }
      }

      if (!ok) throw new Error(lastError);

      // reset
      setCreateName("");
      setCreateFile(null);
      setCreatePreview(null);
      if (createFileInputRef.current) createFileInputRef.current.value = "";

      await refetch();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  // ============ Edit (Modal) ============
  function openEdit(cat: Category) {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditFile(null);
    setEditPreview(null);
    setEditCurrentCover(cat.cover_image || null);
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
    setEditName("");
    setEditFile(null);
    setEditPreview(null);
    setEditCurrentCover(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  }

  function onEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0] || null;

  // ✅ limit ขนาด ≤ 1MB
  if (file && file.size > 1024 * 1024) {
  setErr("ไฟล์เกิน 1MB กรุณาเลือกไฟล์ที่เล็กกว่า 1MB");
  if (editFileInputRef.current) editFileInputRef.current.value = "";
  setEditFile(null);
  setEditPreview(null);
  return;
}

  setEditFile(file);
  setEditPreview(file ? URL.createObjectURL(file) : null);
}

  async function onUpdate(e: React.FormEvent) {
  e.preventDefault();
  if (!editId) return;

  setLoading(true);
  setErr(null);
  try {
    const name = cleanName(editName);
    if (!name) throw new Error("กรุณากรอกชื่อหมวดหมู่");

    const slug = slugify(name);   // ✅ เพิ่มตรงนี้

    // ถ้าไม่มีไฟล์ → ส่ง JSON, ถ้ามี → FormData
    let res: Response;
    if (editFile) {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("slug", slug);           // ✅ เพิ่ม slug ตรงนี้
      fd.append("cover", editFile);
      fd.append("cover_image", editFile);
      res = await fetch(`${API_URL}/admin/categories/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        credentials: "include",
        body: fd,
      });
    } else {
      res = await fetch(`${API_URL}/admin/categories/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),   // ✅ เพิ่ม slug ตรงนี้
      });
    }

      if (!res.ok) {
        let msg = "บันทึกไม่สำเร็จ";
        try {
          const d = await res.json();
          msg = d?.message || d?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      closeEdit();
      await refetch();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  // ============ Delete ============
  async function onDelete(id: string) {
    const ok = await confirm({
      title: "ยืนยันการลบหมวดหมู่นี้?",
      description: "เมื่อยืนยันแล้วจะไม่สามารถกู้คืนได้",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`${API_URL}/admin/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        // 👉 ดัก 409 แล้วแสดงข้อความชัดเจน
        if (res.status === 409) {
          let detail: any = {};
          try { detail = await res.json(); } catch {}
          const count =
            typeof detail?.usingCount === "number" ? detail.usingCount :
            typeof detail?.count === "number" ? detail.count : undefined;

          const msg =
            count !== undefined
              ? `ไม่สามารถลบหมวดหมู่ได้ เพราะยังมีร้านอยู่ภายในหมวดหมู่นี้จำนวน ${count} รายการ`
              : "ไม่สามารถลบหมวดหมู่ได้ เพราะยังมีร้านอยู่ภายในหมวดหมู่นี้";

          setErr(msg);

          const go = await confirm({
            title: msg,
            description: "ต้องการไปดูรายการร้านที่เกี่ยวข้องหรือไม่?",
            confirmText: "ไปหน้าร้าน",
            cancelText: "ปิด",
          });
          if (go) router.push("/admin/stores");
          return;
        }

        let msg = "ลบไม่สำเร็จ";
        try { const d = await res.json(); msg = d?.message || d?.error || msg; } catch {}
        throw new Error(msg);
      }

      await refetch();
    } catch (e: any) {
      setErr(e?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
  <>
      {/* modal แจ้ง error */}
      <AlertModal
        open={!!err}
        title="เกิดข้อผิดพลาด"
        message={err || ""}
        onClose={() => setErr(null)}
      />

      {/* Create */}
      <form
        onSubmit={onCreate}
        className="mb-8 rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 md:p-6 text-white"
      >
        <h2 className="text-lg font-semibold">เพิ่มหมวดหมู่</h2>
        <p className="mt-1 text-sm text-slate-300/80">ตั้งชื่อและอัปโหลดรูปปก</p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block md:col-span-2">
            <span className="text-sm text-slate-300/80">ชื่อหมวดหมู่</span>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/60"
              placeholder="เช่น คลินิกความงาม"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300/80">รูปปก (อัปโหลดไฟล์)</span>
            <input
              ref={createFileInputRef}
              type="file"
              accept="image/*"
              onChange={onCreateFileChange}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
            />
          </label>
        </div>

        {createPreview && (
          <div className="mt-3 h-24 w-40 overflow-hidden rounded border border-white/10 bg-black/30">
            <img src={createPreview} alt="preview" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mt-4">
          <button type="submit" disabled={loading} className={`rounded-lg px-4 py-2 ${btnGold} disabled:opacity-60`}>
            {loading ? "กำลังเพิ่ม…" : "เพิ่มหมวดหมู่"}
          </button>
        </div>
      </form>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="ค้นหาชื่อหมวดหมู่…"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/50"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white/5 p-5 md:p-6 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">รายการหมวดหมู่</h2>
          <button
            onClick={refetch}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10 disabled:opacity-60"
          >
            รีเฟรช
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-slate-300/80">ยังไม่มีหมวดหมู่</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/[0.07]"
              >
                <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-black/30 ring-1 ring-white/10">
                  {c.cover_image ? (
                    <img src={c.cover_image} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-slate-400">ไม่มีรูป</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 font-medium text-white">{c.name}</div>
                  {c.created_at && (
                    <div className="text-xs text-slate-400">
                      อัปเดต: {new Date(c.created_at).toLocaleDateString("th-TH")}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-white hover:bg-white/10"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-sm text-white hover:bg-rose-700"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900/95 p-5 text-white ring-1 ring-white/10">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">แก้ไขหมวดหมู่</h3>
              <button onClick={closeEdit} className="text-slate-300 hover:text-white text-sm">
                ปิด
              </button>
            </div>

            <form onSubmit={onUpdate}>
              <label className="mb-3 block">
                <span className="text-sm text-slate-300/80">ชื่อหมวดหมู่</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FFD700]/60"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm text-slate-300/80">รูปปกปัจจุบัน</div>
                  <div className="aspect-[4/3] w-full overflow-hidden rounded bg-black/30 ring-1 ring-white/10">
                    {editPreview ? (
                      <img src={editPreview} alt="preview" className="h-full w-full object-cover" />
                    ) : editCurrentCover ? (
                      <img src={editCurrentCover} alt="current" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-slate-400">ไม่มีรูป</div>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm text-slate-300/80">อัปโหลดรูปใหม่ (ไม่บังคับ)</span>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onEditFileChange}
                    className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/20"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button type="submit" disabled={loading} className={`rounded-lg px-4 py-2 ${btnGold} disabled:opacity-60`}>
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
            </form>
          </div>
        </div>
      )}
    </>
  );
}