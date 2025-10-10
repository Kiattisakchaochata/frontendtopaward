import React, { useState } from "react";
import { setStoreStatus, Store } from "@/services/admin/store.api";

type Props = {
  store: Store;
  onUpdated?: (updated: Store) => void; // เรียกหลังอัปเดตสำเร็จ
};

const StoreCard: React.FC<Props> = ({ store, onUpdated }) => {
  const [local, setLocal] = useState(store);
  const [loading, setLoading] = useState(false);

  // ดึง token แบบง่าย ๆ (ถ้าคุณมี auth context ให้เปลี่ยนมาใช้ตรงนั้นแทน)
  const token = localStorage.getItem("token") || "";

  const handleToggle = async () => {
    if (!token) return alert("missing token");
    const nextActive = !local.is_active;

    try {
      setLoading(true);
      // optimistic UI
      setLocal((s) => ({ ...s, is_active: nextActive }));

      const res = await setStoreStatus(local.id, nextActive, token);
      setLocal(res.store);
      onUpdated?.(res.store);
    } catch (err) {
      // rollback ถ้าพลาด
      setLocal((s) => ({ ...s, is_active: !nextActive }));
      console.error(err);
      alert("เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/40 bg-white/70 p-4 shadow-sm backdrop-blur">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{local.name}</h3>

        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
            local.is_active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-200 text-zinc-700"
          }`}
        >
          {local.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Cover (ถ้ามี) */}
      {local.cover_image && (
        <img
          src={local.cover_image}
          alt={local.name}
          className="mb-3 aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      {/* Actions */}
      <div className="flex gap-8">
        <div className="text-sm text-zinc-600">
          ลำดับ: <span className="font-medium">{local.order_number}</span>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`ml-auto rounded-xl px-4 py-2 text-sm font-medium transition ${
            local.is_active
              ? "bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
              : "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
          }`}
          title={local.is_active ? "Disable" : "Enable"}
        >
          {loading ? "กำลังบันทึก..." : local.is_active ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
};

export default StoreCard;