// src/app/_components/BannerCarousel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Banner = {
  id: string;
  image_url: string;
  href?: string;
  title?: string | null;
  alt_text?: string | null;
  // ฟิลด์เสริม
  logo_url?: string;
  cta?: string;
  genre?: string;
  subtitle?: string;
};

type Props = {
  banners: Banner[];
  /** ความกว้างการ์ด (px) */
  cardWidth?: number;  // default 560
  /** เวลาเลื่อนครบ “ครึ่งเทป” (วิ) — ค่าน้อย = เร็ว */
  speedSec?: number;   // default 24
  /** ช่องว่างระหว่างการ์ด (px) */
  gap?: number;        // default 16
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

  // raf states
  const xRef = useRef(0);            // ตำแหน่งปัจจุบัน (px)
  const hoverRef = useRef(false);    // หยุด auto เมื่อ hover/drag
  const velRef = useRef(0);          // ความเร็วจากโมเมนตัมตอนปล่อยลาก (px/s)

  // drag states
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);   // ตำแหน่ง pointer ตอนเริ่มลาก
  const dragBaseXRef = useRef(0);    // xRef ตอนเริ่มลาก
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);
  const [half, setHalf] = useState(0); // ครึ่งความกว้างเทป

  // แคชครึ่งความกว้างเทปด้วย ResizeObserver (ลดการอ่าน layout ทุกเฟรม)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => setHalf(track.scrollWidth / 2));
    ro.observe(track);
    setHalf(track.scrollWidth / 2);
    return () => ro.disconnect();
  }, [loop.length]);

  // ตัดตำแหน่งให้อยู่ในช่วง [-half, 0) เสมอ เพื่อ seamless loop
  const normalize = (x: number) => {
    if (half === 0) return x;
    while (x <= -half) x += half;
    while (x > 0) x -= half;
    return x;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || half === 0) return;

    let raf = 0;
    let last = performance.now();

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (t - last) / 1000;
      last = t;

      // เมื่อ hover/drag: ไม่ใช้ auto เดินหน้า แต่ยังคงปล่อยโมเมนตัมค่อยๆ ดับลงได้ถ้าไม่ได้ลากอยู่
      if (!hoverRef.current) {
        // auto-scroll พื้นฐาน
        const vAuto = half / Math.max(0.01, speedSec); // px/s
        xRef.current -= vAuto * dt;
      }

      // เพิ่มโมเมนตัม (จากการปล่อยลาก) แล้วหน่วงด้วยแรงเสียดทาน
      if (!draggingRef.current && Math.abs(velRef.current) > 1) {
        xRef.current += velRef.current * dt;
        // หน่วง (friction)
        const friction = 0.92; // 0..1 (ยิ่งน้อยยิ่งหน่วงแรง)
        velRef.current *= friction ** (dt * 60);
      } else if (draggingRef.current) {
        // ถ้าลากอยู่ ไม่หน่วงความเร็ว ณ ตอนนี้ ปล่อยคำนวณจาก pointermove
        velRef.current = 0;
      }

      xRef.current = normalize(xRef.current);
      track.style.transform = `translate3d(${xRef.current}px,0,0)`;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [half, speedSec]);

  // ---- Drag handlers (pointer events) ----
  const threshold = 5; // px: เกินนี้จะถือว่า "ลาก" เพื่อป้องกันคลิกผิดพลาด
  const movedRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    // รองรับเมาส์/ทัชในตัวเดียว ใช้ pointer events
    const wrap = wrapRef.current;
    if (!wrap) return;

    wrap.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    hoverRef.current = true; // หยุด auto ระหว่างลาก

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

    // ความเร็วทันที (สำหรับโมเมนตัม)
    const now = performance.now();
    const dt = (now - lastMoveTRef.current) / 1000;
    if (dt > 0) {
      const vx = (e.clientX - lastMoveXRef.current) / dt; // px/s
      velRef.current = vx;
    }
    lastMoveXRef.current = e.clientX;
    lastMoveTRef.current = now;

    // อัปเดตตำแหน่งทันที
    const track = trackRef.current;
    if (track) track.style.transform = `translate3d(${xRef.current}px,0,0)`;

    // ป้องกันหน้าเลื่อนในมือถือขณะลาก
    e.preventDefault();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (wrap) {
      try { wrap.releasePointerCapture?.(e.pointerId); } catch {}
    }
    draggingRef.current = false;

    // ถ้าขยับเยอะ พิจารณาว่าเป็น drag จริง → บล็อคลิงก์คลิกครั้งนี้
    if (movedRef.current > threshold) {
      // ใช้เคล็ดลับ: ปล่อย event คลิกชุดนี้ทิ้งโดยหยุด propagation ใน wrapper ครั้งเดียว
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

    // ปล่อย hover = false หลังจากปล่อยลากเล็กน้อย เพื่อให้โมเมนตัมทำงานก่อน auto-scroll
    setTimeout(() => {
      hoverRef.current = false;
    }, 80);
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
        bg-gradient-to-b from-[#0F172A] to-[#0F172A]
        ring-1 ring-white/10
        cursor-${draggingRef.current ? "grabbing" : "grab"}
        select-none
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

      {/* เงาไล่จางซ้าย-ขวา (เข้ากับพื้นหลัง) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0F172A] to-transparent opacity-70" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0F172A] to-transparent opacity-70" />

      {/* แทร็ก */}
      <div
        ref={trackRef}
        className="flex py-4 will-change-transform touch-pan-y"
        style={{ width: "max-content", contain: "content" }}
        // hover แทร็กก็หยุด auto เช่นกัน
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
              "
              style={{
                width: `${cardWidth}px`,
                marginRight: `${gap}px`,
                backgroundImage: `url(${b.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={b.title || b.alt_text || b.subtitle || b.genre || b.cta || ""}
            >
              {/* ฟิล์มกราเดียนต์เพื่อให้อ่านตัวอักษรง่าย */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

              {/* มุมบนซ้าย: (ถ้ามี) หมวด/ซับไตเติล */}
              {(b.genre || b.subtitle) && (
                <div className="absolute left-3 top-3">
                  <span className="
                    rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90
                    backdrop-blur-md ring-1 ring-white/20
                  ">
                    {b.genre}
                    {b.genre && b.subtitle && <span className="px-1">·</span>}
                    {b.subtitle}
                  </span>
                </div>
              )}

              {/* มุมล่างซ้าย: ชื่อแบนเนอร์ (fallback alt_text) */}
              {(b.title || b.alt_text) && (
                <div className="absolute inset-x-3 bottom-3">
                  <div className="
                    relative overflow-hidden rounded-xl bg-white/10 p-3
                    backdrop-blur-md ring-1 ring-white/20 shadow
                  ">
                    <div className="text-sm font-semibold text-white drop-shadow line-clamp-1">
                      {b.title || b.alt_text}
                    </div>

                    {/* เส้นทองวิ่งตาม hover */}
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