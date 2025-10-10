// src/components/GoldModal.tsx
"use client";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  confirmText?: string;
};

export default function GoldModal({
  open,
  title = "เกิดข้อผิดพลาด",
  message = "โปรดลองอีกครั้ง",
  onClose,
  confirmText = "ปิด",
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-[#1A1A1A] p-6 shadow-2xl ring-1 ring-[#D4AF37]/20"
      >
        <h3 className="text-lg font-bold text-[#FFD700]">{title}</h3>
        <p className="mt-2 text-sm text-gray-200 whitespace-pre-line">{message}</p>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-black
                       bg-gradient-to-r from-[#FFD700] to-[#B8860B]
                       hover:from-[#FFCC33] hover:to-[#FFD700] shadow-md transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}