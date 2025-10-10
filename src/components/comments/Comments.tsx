"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";

type Review = {
  id: string;
  body: string;
  rating?: number | null;
  user_id: string;
  user?: { name?: string } | null;
  created_at?: string;
};

type Props = {
  storeId: string;
  loggedIn: boolean;
  currentUserId?: string | null;
  apiBase: string;
};

export default function Comments({ storeId, loggedIn, currentUserId, apiBase }: Props) {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const confirm = useConfirm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/reviews?store_id=${storeId}`, { cache: "no-store", credentials: "include" });
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data?.reviews) ? data.reviews : data || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "โหลดคอมเมนต์ไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storeId, apiBase]);

  async function submit() {
    if (!text.trim()) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: storeId, body: text.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.message || "ส่งคอมเมนต์ไม่สำเร็จ");
      setItems((prev) => [{ ...(payload.review ?? payload), user_id: currentUserId || "", user: payload?.user ?? undefined }, ...prev]);
      setText("");
    } catch (e: any) {
      setError(e?.message || "ส่งคอมเมนต์ไม่สำเร็จ");
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "ลบคอมเมนต์นี้?",
      description: "เมื่อยืนยันแล้วจะไม่สามารถกู้กลับได้",
      confirmText: "ลบคอมเมนต์",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    const old = items;
    setItems((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`${apiBase}/reviews/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        setItems(old);
        const t = await res.text();
        throw new Error(t || "ลบไม่สำเร็จ");
      }
    } catch (e: any) {
      setError(e?.message || "ลบไม่สำเร็จ");
    }
  }

  const youCanDelete = (r: Review) => currentUserId && r.user_id === currentUserId;

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-6">
        <h3 className="mb-3 text-lg font-bold text-white">คอมเมนต์</h3>

        {!loggedIn ? (
          <div className="mb-4 rounded-lg bg-amber-100/20 p-3 text-amber-200">
            ต้องเข้าสู่ระบบก่อนจึงจะคอมเมนต์ได้ — <a href="/login" className="underline">เข้าสู่ระบบ</a>
          </div>
        ) : (
          <div className="mb-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="พิมพ์คอมเมนต์ของคุณ..."
              className="w-full rounded-lg bg-white text-slate-900 p-3 outline-none ring-1 ring-black/5"
              rows={3}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={submit}
                disabled={posting || !text.trim()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {posting ? "กำลังส่ง..." : "ส่งคอมเมนต์"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
          </div>
        )}

        {loading ? (
          <p className="text-slate-300">กำลังโหลด...</p>
        ) : items.length === 0 ? (
          <p className="text-slate-300">ยังไม่มีคอมเมนต์</p>
        ) : (
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-3 text-slate-900 shadow">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {r.user?.name || "ผู้ใช้งาน"}{" "}
                    <span className="ml-2 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString("th-TH") : ""}
                    </span>
                  </div>
                  {youCanDelete(r) && (
                    <button onClick={() => remove(r.id)} className="text-xs text-rose-600 hover:underline">
                      ลบ
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-6">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}