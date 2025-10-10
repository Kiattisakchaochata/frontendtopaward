// src/app/store/[id]/_client/ReviewList.tsx
"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";

type Review = {
  id: string;
  user?: { name?: string };
  rating: number;
  comment?: string | null;
  created_at?: string;
};

export default function ReviewList({
  reviews,
  canEditIds = [],
}: {
  reviews: Review[];
  canEditIds?: string[];
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askDelete = (id: string) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deletingId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/${deletingId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        // แสดง Toast จริงค่อยมาใส่ภายหลังได้
        console.error("delete failed");
      }
      setConfirmOpen(false);
      setDeletingId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ul className="space-y-4">
        {reviews.map((rv) => {
          const name = rv.user?.name?.trim() || "ผู้ใช้งาน";
          const initials = useMemo(
            () =>
              name
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0])
                .join("")
                .toUpperCase(),
            [name]
          );

          const created =
            rv.created_at
              ? new Date(rv.created_at).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : null;

          return (
            <li
              key={rv.id}
              className="
                group overflow-hidden rounded-2xl bg-white/5 p-4
                ring-1 ring-white/10 transition
                hover:-translate-y-0.5 hover:ring-[#D4AF37]/40
                shadow-[0_10px_30px_rgba(0,0,0,.35)]
              "
            >
              {/* header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar ตัวอักษรย่อ */}
                  <div
                    className="
                      grid h-10 w-10 place-items-center rounded-full
                      bg-gradient-to-br from-[#3b3b3b] to-[#1e1e1e]
                      ring-1 ring-white/10 text-[13px] font-bold text-white
                    "
                    aria-hidden
                  >
                    {initials}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">
                      {name}
                    </div>
                    {created && (
                      <div className="text-xs text-white/60">{created}</div>
                    )}
                  </div>
                </div>

                {/* Stars */}
                <div
                  className="
                    inline-flex items-center gap-1 rounded-full px-2 py-1
                    text-xs font-semibold
                    ring-1 ring-white/10 bg-white/5
                  "
                  title={`${rv.rating}/5`}
                >
                  <StarRow value={rv.rating} />
                  <span className="ml-1 text-white/80">{rv.rating}</span>
                </div>
              </div>

              {/* comment */}
              {rv.comment && (
                <p className="mt-3 text-[15px] leading-6 text-white/85">
                  {rv.comment}
                </p>
              )}

              {/* actions */}
              {canEditIds.includes(rv.id) && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <button
                    className="
                      rounded-lg border border-[#D4AF37]/30 px-3 py-1.5
                      font-semibold text-[#FFD700]
                      hover:bg-[#FFD700]/10 transition
                    "
                    // TODO: เปิดฟอร์มแก้ไขในอนาคต
                    type="button"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => askDelete(rv.id)}
                    disabled={loading}
                    className="
                      rounded-lg border border-rose-400/30 px-3 py-1.5
                      font-semibold text-rose-300 hover:bg-rose-500/10
                      transition disabled:opacity-60
                    "
                    type="button"
                  >
                    ลบ
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        loading={loading}
        title="ลบคอมเมนต์นี้?"
        description="เมื่อยืนยันแล้วจะไม่สามารถกู้กลับได้"
        confirmText="ลบคอมเมนต์"
        cancelText="ยกเลิก"
        onClose={() => {
          if (!loading) {
            setConfirmOpen(false);
            setDeletingId(null);
          }
        }}
        onConfirm={doDelete}
      />
    </>
  );
}

/* ---------------- Helper components ---------------- */

function StarRow({ value = 0 }: { value?: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.round(v);

  return (
    <span
      className="
        bg-gradient-to-r from-[#FFD700] to-[#B8860B]
        bg-clip-text text-transparent select-none
      "
      aria-hidden
    >
      {"★".repeat(full)}
      <span className="text-white/20">{"★".repeat(5 - full)}</span>
    </span>
  );
}