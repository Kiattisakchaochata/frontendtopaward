"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Banner = {
  id: string;
  image_url: string;
  href?: string;
  title?: string | null;
  alt_text?: string | null;
  logo_url?: string;
  cta?: string;
  genre?: string;
  subtitle?: string;
};

type Props = {
  banners: Banner[];
  /** ความกว้างการ์ดสูงสุด (px) บนเดสก์ท็อป */
  cardWidth?: number;   // default 560
  /** เวลาเลื่อนครบ “ครึ่งเทป” (วิ) — ค่าน้อย = เร็ว */
  speedSec?: number;    // default 24
  /** ช่องว่างระหว่างการ์ด (px) เดสก์ท็อป */
  gap?: number;         // default 16
};

export default function BannerCarousel({
  banners = [],
  cardWidth = 560,
  speedSec = 24,
  gap = 16,
}: Props) {
  if (!banners || banners.length === 0) return null;

  // ทำซ้ำ 2 ชุดเพื่อให้เลื่อนแบบไร้รอยต่อ
  const loop = useMemo(() => [...banners, ...banners], [banners]);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // === Responsive sizing ===
  const [cardW, setCardW] = useState(cardWidth);
  const [gapW, setGapW] = useState(gap);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => {
      const wrapWidth = wrap.clientWidth;

      // มือถือ: ให้การ์ด ~88–92% ของคอนเทนเนอร์ เพื่อให้เห็นการ์ดถัดไปเล็กน้อย
      const isMobile = wrapWidth < 768;
      const nextGap = isMobile ? 12 : gap;
      const padding = isMobile ? 0 : 0;

      // พยายามจำกัดการ์ดไม่ให้ใหญ่เกิน cardWidth เดิมบนเดสก์ท็อป
      const mobileTarget = Math.max(240, Math.round(wrapWidth * 0.9) - padding);
      const nextCardW = isMobile ? Math.min(cardWidth, mobileTarget) : cardWidth;

      setCardW(nextCardW);
      setGapW(nextGap);
    });

    ro.observe(wrap);
    return () => ro.disconnect();
  }, [cardWidth, gap]);

  // raf states
  const xRef = useRef(0);
  const hoverRef = useRef(false);
  const velRef = useRef(0);

  // drag states
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragBaseXRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);
  const [half, setHalf] = useState(0);

  // แคชครึ่งความกว้างเทป
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setHalf(track.scrollWidth / 2));
    ro.observe(track);
    setHalf(track.scrollWidth / 2);
    return () => ro.disconnect();
  }, [loop.length, cardW, gapW]);

  // normalize ตำแหน่ง
  const normalize = (x: number) => {
    if (half === 0) return x;
    while (x <= -half) x += half;
    while (x > 0) x -= half;
    return x;
  };

  // animation
  useEffect(() => {
    const track = trackRef.current;
    if (!track || half === 0) return;

    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (t - last) / 1000;
      last = t;

      if (!hoverRef.current) {
        const vAuto = half / Math.max(0.01, speedSec);
        xRef.current -= vAuto * dt;
      }

      if (!draggingRef.current && Math.abs(velRef.current) > 1) {
        xRef.current += velRef.current * dt;
        const friction = 0.92;
        velRef.current *= friction ** (dt * 60);
      } else if (draggingRef.current) {
        velRef.current = 0;
      }

      xRef.current = normalize(xRef.current);
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [half, speedSec]);

  // ---- Drag handlers (pointer events) ----
  const threshold = 5;
  const movedRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    hoverRef.current = true;

    dragStartXRef.current = e.clientX;
    dragBaseXRef.current = xRef.current;
    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = performance.now();
    movedRef.current = 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    movedRef.current = Math.max(movedRef.current, Math.abs(dx));
    xRef.current = normalize(dragBaseXRef.current + dx);

    const now = performance.now();
    const dt = (now - lastMoveTRef.current) / 1000;
    if (dt > 0) {
      const vx = (e.clientX - lastMoveXRef.current) / dt;
      velRef.current = vx;
    }
    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = now;

    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${xRef.current}px,0,0)`;

    e.preventDefault();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (wrap) {
      try { wrap.releasePointerCapture?.(e.pointerId); } catch {}
    }
    draggingRef.current = false;

    if (movedRef.current > threshold) {
      let block = true;
      const stopOnce = (ev: any) => {
        if (!block) return;
        ev.stopPropagation();
        ev.preventDefault?.();
      };
      const wrapEl = wrapRef.current;
      if (wrapEl) {
        wrapEl.addEventListener("click", stopOnce, true);
        setTimeout(() => {
          block = false;
          wrapEl.removeEventListener("click", stopOnce, true);
        }, 0);
      }
    }
    setTimeout(() => (hoverRef.current = false), 80);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    draggingRef.current = false;
    hoverRef.current = false;
    try { wrapRef.current?.releasePointerCapture?.(e.pointerId); } catch {}
  };

  return (
    <div
      ref={wrapRef}
      className={`
        relative overflow-hidden rounded-3xl
        bg-[#0F172A] ring-1 ring-white/10
        ${draggingRef.current ? "cursor-grabbing" : "cursor-grab"}
        select-none
        /* มือถือเลื่อนแนวตั้งได้ แต่ให้เราจัดการแนวนอนเอง */
        touch-pan-y
        px-2 sm:px-0
      `}
      onPointerEnter={() => (hoverRef.current = true)}
      onPointerLeave={() => (hoverRef.current = false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* เส้นกรอบทองแบบนุ่ม */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-[#D4AF37]/20" />

      {/* เงาไล่จางซ้าย-ขวา */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 sm:w-24 bg-gradient-to-r from-[#0F172A] to-transparent opacity-70" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 sm:w-24 bg-gradient-to-l from-[#0F172A] to-transparent opacity-70" />

      {/* แทร็ก */}
      <div
        ref={trackRef}
        className="flex py-3 sm:py-4 will-change-transform"
        style={{ width: "max-content", contain: "content" }}
        onPointerEnter={() => (hoverRef.current = true)}
        onPointerLeave={() => (hoverRef.current = false)}
      >
        {loop.map((b, i) => {
          const content = (
            <div
              className="
                group relative aspect-[16/9] shrink-0 overflow-hidden rounded-2xl
                shadow-[0_8px_30px_rgba(0,0,0,.35)]
                ring-1 ring-white/10 hover:ring-[#D4AF37]/40
                transition-transform duration-300 group-hover:-translate-y-0.5
                focus:outline-none
                bg-slate-900/30
              "
              style={{
                width: `${cardW}px`,
                marginRight: `${gapW}px`,
                backgroundImage: `url(${b.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={b.title || b.alt_text || b.subtitle || b.genre || b.cta || ""}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

              {(b.genre || b.subtitle) && (
                <div className="absolute left-3 top-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md ring-1 ring-white/20">
                    {b.genre}
                    {b.genre && b.subtitle && <span className="px-1">·</span>}
                    {b.subtitle}
                  </span>
                </div>
              )}

              {(b.title || b.alt_text) && (
                <div className="absolute inset-x-3 bottom-3">
                  <div className="relative overflow-hidden rounded-xl bg-white/10 p-2.5 sm:p-3 backdrop-blur-md ring-1 ring-white/20 shadow">
                    <div className="text-[13px] sm:text-sm font-semibold text-white drop-shadow line-clamp-1">
                      {b.title || b.alt_text}
                    </div>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                </div>
              )}
            </div>
          );

          return b.href ? (
            <a key={`${b.id}-${i}`} href={b.href} className="focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-2xl">
              {content}
            </a>
          ) : (
            <div key={`${b.id}-${i}`}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}