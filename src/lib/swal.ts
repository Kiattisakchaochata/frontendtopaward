'use client';

import SwalCore from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export const Swal = SwalCore;

// debug ใน console ได้
if (typeof window !== 'undefined') (window as any).Swal = Swal;

let injected = false;
function ensureSwalStyle() {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `.swal2-container{z-index:99999!important}`;
  document.head.appendChild(style);
  injected = true;
}

function withFallback(opts: Parameters<typeof Swal.fire>[0]) {
  ensureSwalStyle();
  const base = {
    target: document.body,
    heightAuto: false,
    backdrop: true,
    returnFocus: false,
  } as const;

  const p = Swal.fire({ ...base, ...opts });

  // ถ้า modal ไม่ขึ้น ให้ยิง toast (ไม่ใช้ window.alert แล้ว)
  setTimeout(() => {
    if (!Swal.isVisible()) {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2600,
        timerProgressBar: true,
      });
      // @ts-expect-error: best-effort map
      Toast.fire({
        icon: (opts as any)?.icon ?? 'info',
        title:
          (opts as any)?.title ||
          (opts as any)?.text ||
          'แจ้งเตือน',
      });
      console.warn('[swal] modal ไม่แสดง → ใช้ toast fallback');
    }
  }, 80);

  // ❌ ไม่มี stage ที่เรียก window.alert อีกแล้ว
  return p;
}

export function swalLoading(title: string) {
  return withFallback({
    title,
    html: 'กรุณารอสักครู่...',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
  });
}

export function swalSuccess(title: string) {
  return withFallback({
    icon: 'success',
    title,
    timer: 1500,
    showConfirmButton: false,
  });
}

export function swalError(title: string, text = 'ลองใหม่อีกครั้ง') {
  return withFallback({
    icon: 'error',
    title,
    text,
    confirmButtonText: 'ปิด',
  });
}

export function swalConfirmDelete(text: string) {
  return withFallback({
    title: 'ยืนยันการลบ',
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ลบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#dc2626',
  });
}