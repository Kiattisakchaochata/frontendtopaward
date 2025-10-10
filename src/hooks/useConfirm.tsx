"use client";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
};

type ConfirmContextType = {
  confirm: (opts?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const resolverRef = useRef<(v: boolean) => void>();
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({
    title: "ยืนยันการทำรายการ",
    confirmText: "ตกลง",
    cancelText: "ยกเลิก",
  });

  const confirm = useCallback((options?: ConfirmOptions) => {
    setOpts((prev) => ({ ...prev, ...(options || {}) }));
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    setOpen(false);
    resolverRef.current?.(v);
    resolverRef.current = undefined;
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[9999] grid place-items-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => close(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/10">
            <h3 className="text-lg font-bold text-slate-900">{opts.title}</h3>
            {opts.description && <p className="mt-2 text-sm text-slate-600">{opts.description}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => close(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-slate-800 hover:bg-slate-300">
                {opts.cancelText}
              </button>
              <button type="button" onClick={() => close(true)} className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700">
                {opts.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm ต้องอยู่ภายใน <ConfirmProvider>");
  return ctx; // <-- { confirm }
}