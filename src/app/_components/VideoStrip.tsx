"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type VideoItem = {
  id: string;
  title: string;
  youtube_url: string;
  tiktok_url?: string | null;
  thumbnail_url?: string | null;
};

type Props = {
  videos: VideoItem[];
  cardWidth?: number;   // default 360
  speedSec?: number;    // default 28 (ครึ่งเทป/รอบ)
  gap?: number;         // default 16
};

function extractYouTubeId(url = ""): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
  } catch {}
  return null;
}

function extractTikTokVideoId(url = ""): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("tiktok.com")) return null;
    const m = u.pathname.match(/\/video\/(\d+)/);
    return m?.[1] || null;
  } catch {}
  return null;
}

function toTikTokEmbed(url = ""): string | null {
  const id = extractTikTokVideoId(url);
  return id ? `https://www.tiktok.com/embed/v2/${id}` : null;  // ✅ ใช้ v2
}

function displayThumb(youtubeUrl?: string | null, explicit?: string | null) {
  if (explicit) return explicit;
  const id = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** ดึง YouTube ID: รองรับ v=, youtu.be, /shorts/:id */
function getYoutubeId(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
    return u.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function withParams(u: string, params: Record<string, string | number | boolean>) {
  try {
    const url = new URL(u);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return url.toString();
  } catch {
    // กรณีเป็น path ที่ไม่ได้รูปแบบ URL เต็ม
    const join = u.includes("?") ? "&" : "?";
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    return `${u}${join}${qs}`;
  }
}

export default function VideoStrip({
  videos = [],
  cardWidth = 360,
  speedSec = 100,
  gap = 16,
}: Props) {
  if (!videos || videos.length === 0) return null;

  const base = useMemo(
  () =>
    videos.map((v) => {
      const id  = getYoutubeId(v.youtube_url || "");
      const tik = toTikTokEmbed(v.tiktok_url || "");   // ✅ แปลงเป็น /embed/{id}
      const fallback = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : undefined;
      return { ...v, _thumb: v.thumbnail_url || fallback, _ytid: id || null, _tiktok: tik || null };
    }),
  [videos]
);

  const loop = useMemo(() => [...base, ...base], [base]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const xRef = useRef(0);
  const hoverRef = useRef(false);
  const dragActiveRef = useRef(false);
  const downOnCardRef = useRef(false);
  const justDraggedRef = useRef(false);

  const [active, setActive] = useState(0);
  const [playerNonce, setPlayerNonce] = useState(0);
  const [openVideo, setOpenVideo] = useState<any | null>(null);

  // แคชครึ่งความกว้างเทป
  const [half, setHalf] = useState(0);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setHalf(track.scrollWidth / 2));
    ro.observe(track);
    setHalf(track.scrollWidth / 2);
    return () => ro.disconnect();
  }, [loop.length]);

  /** ===== Auto-scroll ด้วย RAF ===== */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || half === 0) return;

    let raf = 0;
    let last = performance.now();
    const cardSpan = cardWidth + gap;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);

      if (hoverRef.current || dragActiveRef.current) {
        last = t; // freeze
      } else {
        const dt = (t - last) / 1000;
        last = t;

        const v = half / Math.max(0.01, speedSec); // px/s
        xRef.current -= v * dt;

        if (xRef.current <= -half) xRef.current += half;
        track.style.transform = `translate3d(${xRef.current}px,0,0)`;
      }

      // update dots
      const pos = ((-xRef.current % half) + half) % half;
      const idx = Math.round(pos / cardSpan) % base.length;
      if (idx !== active) setActive(idx);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base.length, cardWidth, gap, speedSec, active, half]);

  /** ===== Drag ===== */
  /** ===== Drag ===== */
useEffect(() => {
  if (openVideo) return; // ⬅️ เปิด modal แล้ว ไม่ต้องผูก handler

  const track = trackRef.current;
  const wrap = wrapRef.current;
  if (!track || !wrap) return;
  const CLICK_DRAG_THRESHOLD = 8;

    let startX = 0;
    let startPos = 0;
    let moved = 0;

    const normalize = (x: number) => {
      let nx = x;
      while (nx <= -half) nx += half;
      while (nx > 0) nx -= half;
      return nx;
    };

    const onPointerDown = (e: PointerEvent) => {
      dragActiveRef.current = true;
      hoverRef.current = true;
      justDraggedRef.current = false;
      moved = 0;
      startX = e.clientX;
      startPos = xRef.current;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragActiveRef.current) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      xRef.current = normalize(startPos + dx);
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
    };

    const endDrag = (e?: PointerEvent) => {
  if (!dragActiveRef.current) return;
  dragActiveRef.current = false;
  hoverRef.current = false;
  if (moved > CLICK_DRAG_THRESHOLD) {
    justDraggedRef.current = true;
    setTimeout(() => (justDraggedRef.current = false), 120);
  }
  if (e) (e.target as Element).releasePointerCapture?.(e.pointerId);
};

    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [half, openVideo]);
  useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") closePlayer();
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);

  /** ===== Wheel (throttle ด้วย rAF) ===== */
useEffect(() => {
  if (openVideo) return; // ⬅️ เปิด modal แล้ว ไม่ต้องผูก handler

  const wrap = wrapRef.current;
  const track = trackRef.current;
  if (!wrap || !track) return;

    let wheelRaf = 0;
    let lastDelta = 0;

    const apply = () => {
      if (!track || half === 0) return;
      let nx = xRef.current - lastDelta;
      while (nx <= -half) nx += half;
      while (nx > 0) nx -= half;
      xRef.current = nx;
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
      wheelRaf = 0;
    };

    const onWheel = (e: WheelEvent) => {
      lastDelta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.9;
      hoverRef.current = true;
      if (!wheelRaf) wheelRaf = requestAnimationFrame(apply);
      clearTimeout((onWheel as any)._t);
      (onWheel as any)._t = setTimeout(() => (hoverRef.current = false), 250);
    };

    wrap.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      if (wheelRaf) cancelAnimationFrame(wheelRaf);
    };
  }, [half, openVideo]);

  /** เปิด/ปิด Player */
  const openPlayer = (v: any) => {
  if (justDraggedRef.current) return;
  if (!v?._ytid && !v?._tiktok) return;
  hoverRef.current = true;
  setPlayerNonce(n => n + 1);   // ← เพิ่มบรรทัดนี้
  setOpenVideo(v);
};
  const closePlayer = () => {
    setOpenVideo(null);
    hoverRef.current = false;
  };

  return (
    <div
      ref={wrapRef}
      className="relative mt-12 overflow-hidden rounded-2xl select-none"
      style={{ touchAction: "none" }}
      onPointerEnter={() => (hoverRef.current = true)}
      onPointerLeave={() => (hoverRef.current = false)}
    >
      {/* Heading */}
      <h2 className="mb-6 text-2xl font-extrabold lg:text-3xl">วิดีโอ</h2>

      {/* fade edges */}
<div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0F172A] to-transparent opacity-40 z-0" />
<div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0F172A] to-transparent opacity-40 z-0" />

{/* track */}
<div
  ref={trackRef}
  className="relative z-10 flex py-3 will-change-transform cursor-grab active:cursor-grabbing"
  style={{ width: "max-content", contain: "content" }}
>
        {loop.map((v, i) => (
          <button
  type="button"
  data-card="1"
  key={`${v.id}-${i}`}
  onClick={() => openPlayer(v)}
  className="relative aspect-[16/9] shrink-0 overflow-hidden rounded-2xl
             bg-white text-black shadow-[0_8px_30px_rgba(0,0,0,.25)]
             ring-1 ring-white/10 hover:ring-amber-400/40
             transition hover:-translate-y-0.5 focus:outline-none cursor-pointer"
  style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
>
            {v._thumb ? (
              <img
                src={v._thumb}
                alt={v.title}
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gray-200 text-sm text-gray-500">
                ไม่มีภาพตัวอย่าง
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* ป้ายชื่อ */}
            <div className="absolute inset-x-3 bottom-3">
              <div className="group/title relative overflow-hidden rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-sm transition">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-400/90 text-black shadow hover:scale-105 transition">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-semibold text-white drop-shadow-sm">
                      {v.title}
                    </div>
                    <div className="text-[11px] leading-4 text-white/80">คลิกเพื่อเล่น</div>
                  </div>
                </div>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400 to-amber-400/0 opacity-0 transition-opacity group-hover/title:opacity-100" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Dots */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {base.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-amber-400" : "w-2.5 bg-white/40"}`}
          />
        ))}
      </div>

      {/* Modal */}
{openVideo && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
    onPointerDown={(e) => e.stopPropagation()}
    onWheel={(e) => e.stopPropagation()}
  >
    <div
  className="relative z-10 w-full max-w-4xl"
  onPointerDown={(e) => e.stopPropagation()}
  onPointerMove={(e) => e.stopPropagation()}
  onPointerUp={(e) => e.stopPropagation()}
>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black transition-opacity duration-300 opacity-100">
        {openVideo._ytid ? (
          <iframe
            key={`yt-${openVideo._ytid}`}
            src={`https://www.youtube.com/embed/${openVideo._ytid}?autoplay=1&rel=0`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <iframe
  key={`tk-${openVideo._tiktok}-${playerNonce}`}  // ← ดูข้อ 2 ด้านล่าง
  src={withParams(openVideo._tiktok!, { autoplay: 1, muted: 1 })} // ← ใส่ muted=1 ด้วย
  className="h-full w-full"
  allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
  playsInline
  referrerPolicy="origin-when-cross-origin"
/>
        )}
      </div>

      <div className="mt-4 flex justify-center">
        <button
  onClick={closePlayer}
  className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 
             text-sm font-semibold text-white transition 
             hover:bg-red-700 hover:scale-105 active:scale-95 
             focus:outline-none cursor-pointer shadow-lg"
>
  {/* ไอคอนกากบาท */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="h-4 w-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
  ปิดวิดีโอ
</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
