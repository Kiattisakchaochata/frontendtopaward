"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/hooks/useConfirm";

type Review = {
  id: string;
  user?: { id?: string; name?: string | null };
  rating: number;
  comment: string;
  created_at?: string;
  mine?: boolean;
};

export default function CommentBox({ storeId, canPost }: { storeId: string; canPost: boolean }) {
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [err, setErr] = useState<string | null>(null);

  const confirm = useConfirm();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/reviews/store/${storeId}`, { cache: "no-store" });
        const json = await res.json();
        setList(Array.isArray(json?.reviews) ? json.reviews : json || []);
      } catch {
        setErr("โหลดคอมเมนต์ไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, [storeId]);

  async function submit() {
    if (!canPost) return setErr("กรุณาเข้าสู่ระบบก่อนคอมเมนต์");
    if (!comment.trim()) return;
    setErr(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ store_id: storeId, rating, comment }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "ส่งคอมเมนต์ไม่สำเร็จ");
      setList((prev) => [{ id: json?.id || Math.random().toString(36), rating, comment, user: { name: "คุณ" }, mine: true }, ...prev]);
      setComment(""); setRating(5);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({ title: "ลบคอมเมนต์นี้?", description: "ยืนยันแล้วจะไม่สามารถกู้คืนได้", confirmText: "ลบ", cancelText: "ยกเลิก" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("ลบไม่สำเร็จ");
      setList((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="rounded-2xl bg-white text-slate-900 p-4 md:p-5 shadow">
      <h3 className="text-lg font-bold mb-3">คอมเมนต์</h3>

      <div className="mb-4">
        {!canPost ? (
          <div className="text-sm text-slate-500">
            ต้อง <a href="/login" className="text-amber-600 underline">เข้าสู่ระบบ</a> ก่อนจึงจะคอมเมนต์ได้
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="text-sm">ให้คะแนน:</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded border px-2 py-1">
                {[5,4,3,2,1].map((n) => (<option key={n} value={n}>{n} ★</option>))}
              </select>
            </div>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="w-full rounded border px-3 py-2" placeholder="พิมพ์ความเห็นของคุณ..." />
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <button onClick={submit} className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 font-semibold">ส่งคอมเมนต์</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">กำลังโหลด...</div>
      ) : list.length === 0 ? (
        <div className="text-sm text-slate-500">ยังไม่มีคอมเมนต์</div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {r.user?.name || "ผู้ใช้งาน"} <span className="text-amber-500">• {r.rating} ★</span>
                </div>
                {r.mine && (
                  <button onClick={() => remove(r.id)} className="text-sm text-rose-600 hover:underline">ลบ</button>
                )}
              </div>
              <p className="mt-1 text-slate-700">{r.comment}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}