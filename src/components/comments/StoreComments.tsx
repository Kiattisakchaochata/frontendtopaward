// src/components/comments/StoreComments.tsx
"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";

type Review = {
  id: string;
  user_id: string;
  store_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
  user?: { name?: string } | null;
};

type Props = {
  storeId: string;
  apiBase: string;
  loggedIn: boolean;
  currentUserId?: string | null;
};

export default function StoreComments({
  storeId,
  apiBase,
  loggedIn,
  currentUserId,
}: Props) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [stars, setStars] = useState<number>(5);
  const [posting, setPosting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editStars, setEditStars] = useState(5);
  const [saving, setSaving] = useState(false);

  const { confirm } = useConfirm();

  // ✅ สรุปรายการรีวิว (average + count)
  const [summary, setSummary] = useState<{ average: number; count: number }>({
    average: 0,
    count: 0,
  });

  // helper: คำนวณสรุปจากรายการรีวิว
  function recomputeSummary(list: Review[]) {
    const rated = list.filter((r) => Number.isFinite(r.rating) && r.rating > 0);
    const count = rated.length;
    const average =
      count > 0
        ? rated.reduce((a, b) => a + Number(b.rating || 0), 0) / count
        : 0;
    setSummary({
      average: Number(average.toFixed(2)),
      count,
    });
  }

  // โหลดรีวิว + สรุปเริ่มต้น
  useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `${apiBase}/reviews/stores/${storeId}/reviews`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );
        const data = await res.json();

        const list: Review[] = Array.isArray(data?.reviews)
          ? data.reviews
          : data || [];

        if (!canceled) {
          setItems(list);

          // ถ้า backend ส่ง stats มาก็ใช้เลย ไม่งั้นคำนวณฝั่ง client
          if (data?.stats) {
            setSummary({
              average: Number(data.stats.average ?? 0),
              count: Number(data.stats.count ?? 0),
            });
          } else {
            recomputeSummary(list);
          }
        }
      } catch (e: any) {
        if (!canceled) setErr(e?.message || "โหลดคอมเมนต์ไม่สำเร็จ");
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [storeId, apiBase]);

  async function submit() {
    // อนุญาตไม่มีข้อความ: ส่งเฉพาะ rating ได้
    setPosting(true);
    setErr(null);
    try {
      const payload: any = { rating: stars };
      const trimmed = text.trim();
      if (trimmed) payload.comment = trimmed;

      const res = await fetch(`${apiBase}/reviews/${storeId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "ส่งรีวิวไม่สำเร็จ");

      const newReview: Review =
        data?.review ??
        ({
          id: data?.id ?? Math.random().toString(36),
          user_id: currentUserId || "",
          store_id: storeId,
          rating: stars,
          comment: trimmed || "", // อาจว่างได้
          created_at: new Date().toISOString(),
          user: data?.user ?? undefined,
        } as Review);

      setItems((prev) => {
        const next = [newReview, ...prev];
        // ถ้า backend ส่ง stats มาก็ใช้เลย ไม่งั้นคำนวณเอง
        if (data?.stats) {
          setSummary({
            average: Number(data.stats.average || 0),
            count: Number(data.stats.count || 0),
          });
        } else {
          recomputeSummary(next);
        }
        return next;
      });
      // ✅ แจ้ง badge ว่ามีการเปลี่ยนแปลง
window.dispatchEvent(new CustomEvent("ta:reviews-updated", { detail: { storeId } }));

      setText("");
      setStars(5);
    } catch (e: any) {
      setErr(e?.message || "ส่งรีวิวไม่สำเร็จ");
    } finally {
      setPosting(false);
    }
  }

  function beginEdit(r: Review) {
    setEditingId(r.id);
    setEditText(r.comment || "");
    setEditStars(r.rating || 5);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditText("");
    setEditStars(5);
  }

  async function saveEdit(id: string) {
    // อนุญาตให้เว้นว่าง comment ได้
    setSaving(true);
    setErr(null);

    const old = items;
    const next = items.map((r) =>
      r.id === id ? { ...r, comment: editText, rating: editStars } : r
    );
    setItems(next); // optimistic update
    recomputeSummary(next);

    try {
      const res = await fetch(`${apiBase}/reviews/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editText, rating: editStars }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItems(old); // rollback
        recomputeSummary(old);
        const t = data?.message || (await res.text());
        throw new Error(t || "แก้ไขไม่สำเร็จ");
      }
      // ถ้า backend ส่ง stats มาก็ใช้เลย
      if (data?.stats) {
        setSummary({
          average: Number(data.stats.average || 0),
          count: Number(data.stats.count || 0),
        });
      }
      // ✅ แจ้ง badge ว่ามีการแก้ไข
window.dispatchEvent(new CustomEvent("ta:reviews-updated", { detail: { storeId } }));

      cancelEdit();
    } catch (e: any) {
      setErr(e?.message || "แก้ไขไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "ลบรีวิวนี้?",
      description: "ยืนยันแล้วจะไม่สามารถกู้คืนได้",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    const old = items;
    const next = items.filter((r) => r.id !== id);
    setItems(next);
    recomputeSummary(next);

    try {
      const res = await fetch(`${apiBase}/reviews/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setItems(old);
        recomputeSummary(old);
        const t = data?.message || (await res.text());
        throw new Error(t || "ลบไม่สำเร็จ");
      }
      // ถ้า backend ส่ง stats มาก็ใช้เลย
      if (data?.stats) {
        setSummary({
          average: Number(data.stats.average || 0),
          count: Number(data.stats.count || 0),
        });
      }
      // ✅ แจ้ง badge ว่ามีการลบ
window.dispatchEvent(new CustomEvent("ta:reviews-updated", { detail: { storeId } }));
    } catch (e: any) {
      setErr(e?.message || "ลบไม่สำเร็จ");
    }
  }

  const canManage = (r: Review) => currentUserId && r.user_id === currentUserId;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
      <h3 className="mb-3 text-lg font-bold text-white">รีวิว</h3>

      {/* ✅ แสดงสรุปเฉพาะเมื่อมีรีวิวอย่างน้อย 1 */}
      {summary.count > 0 && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
          <AvgStars value={summary.average} />
          <span className="text-sm text-white/85">
            {summary.average.toFixed(1)} • {summary.count} รีวิว
          </span>
        </div>
      )}

      {!loggedIn ? (
        <div className="mb-4 rounded-lg bg-amber-100/20 p-3 text-amber-200">
          ต้องเข้าสู่ระบบก่อนจึงจะรีวิวได้ —{" "}
          <a href="/login" className="underline">
            เข้าสู่ระบบ
          </a>
        </div>
      ) : (
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-white">
            <span className="text-sm opacity-80">ให้คะแนน:</span>
            <StarInput value={stars} onChange={setStars} />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="(ใส่ข้อความเพิ่มเติมได้ แต่ไม่บังคับ)"
            rows={3}
            className="w-full rounded-lg bg-white p-3 text-slate-900 outline-none ring-1 ring-black/5"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              onClick={submit}
              disabled={posting || stars < 1}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {posting ? "กำลังบันทึก..." : "ส่งรีวิว"}
            </button>
          </div>
        </div>
      )}

      {err && <p className="mb-3 text-sm text-rose-300">{err}</p>}

      {loading ? (
        <p className="text-slate-300">กำลังโหลด...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-300">ยังไม่มีรีวิว</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="rounded-xl bg-white p-3 text-slate-900 shadow"
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <strong>{r.user?.name || "ผู้ใช้งาน"}</strong>
                  <span className="text-xs text-slate-500">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString("th-TH")
                      : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* แสดงดาวเฉพาะเมื่อ rating > 0 */}
                  {Number.isFinite(r.rating) && r.rating > 0 && (
                    <StarView value={r.rating} />
                  )}
                  {canManage(r) && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => beginEdit(r)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => remove(r.id)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        ลบ
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingId === r.id ? (
                <div className="mt-2">
                  <div className="mb-2 flex items-center gap-2">
                    <StarInput value={editStars} onChange={setEditStars} />
                  </div>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border p-2"
                    placeholder="(จะปล่อยว่างก็ได้)"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => saveEdit(r.id)}
                      disabled={saving}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-sm text-slate-600 hover:underline"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : r.comment && r.comment.trim() ? (
                <p className="whitespace-pre-wrap text-[15px] leading-6">
                  {r.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- ดาว (input) ---------- */
function StarInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={n <= value ? "text-amber-400" : "text-slate-400"}
          aria-label={`ให้ ${n} ดาว`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ---------- ดาว (view) ---------- */
function StarView({ value }: { value?: number | null }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="text-amber-400" title={`${v}/5`}>
      {"★".repeat(v)}
      <span className="text-slate-300">{"★".repeat(5 - v)}</span>
    </div>
  );
}

/* ---------- ดาวเฉลี่ย (Average) ---------- */
function AvgStars({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(v);
  const remainder = v - full;
  const empty = 5 - Math.ceil(v);

  return (
    <span className="inline-flex select-none items-center">
      {"★"
        .repeat(full)
        .split("")
        .map((_, i) => (
          <span
            key={`f-${i}`}
            className="bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent"
          >
            ★
          </span>
        ))}
      {remainder > 0 && (
        <span className="relative inline-block">
          <span className="text-white/20">★</span>
          <span
            className="absolute left-0 top-0 overflow-hidden bg-gradient-to-r from-[#FFD700] to-[#B8860B] bg-clip-text text-transparent"
            style={{ width: `${remainder * 100}%` }}
          >
            ★
          </span>
        </span>
      )}
      {empty > 0 && (
        <span className="text-white/20">{"★".repeat(empty)}</span>
      )}
    </span>
  );
}