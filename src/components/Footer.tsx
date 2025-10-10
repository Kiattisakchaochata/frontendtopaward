import Image from "next/image";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[#D4AF37]/25 bg-[#1A1A1A] text-gray-300">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row lg:max-w-8xl">
        <p className="text-center text-xs sm:text-sm sm:text-left">
          © {year} <span className="font-semibold text-[#FFD700]">TopAward</span>. สงวนลิขสิทธิ์
        </p>

        {/* Socials */}
        <div className="flex items-center gap-3">
          {[
            {
              alt: "Facebook",
              src: "/facebook.png",
              href: "https://www.facebook.com/share/17RrP7Xrpu/",
            },
            {
              alt: "Instagram",
              src: "/instagram.png",
              href: "https://www.instagram.com/tempuracute?igsh=MWFkODQ3aDJiNWJvaA==",
            },
            {
              alt: "Lemon",
              src: "/lemon.png",
              href: "https://s.lemon8-app.com/al/GgZZvfZFbY", // 🟡 ใส่ลิงก์จริงภายหลัง
            },
            {
              alt: "TikTok",
              src: "/tiktok.png",
              href: "https://www.tiktok.com/@review56review56?_t=ZS-8zPo0JgciYK&_r=1",
            },
            {
              alt: "YouTube",
              src: "/youtube.png",
              href: "https://youtube.com/@jullidain?si=5mLXJ8muzdd_upgx",
            },
          ].map((s) => (
            <a
              key={s.alt}
              aria-label={s.alt}
              href={s.href}
              title={s.alt}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-9 w-9 place-items-center rounded-full
                         bg-[#2C2C2C] border border-[#D4AF37]/40 text-[#FFD700]
                         hover:bg-[#FFD700]/15 transition"
            >
              <Image src={s.src} alt={s.alt} width={20} height={20} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}