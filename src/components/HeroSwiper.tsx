// src/components/HeroSwiper.tsx
type Banner = { id: string; image_url: string; alt_text: string; order: number };

export default function HeroSwiper({ banners }: { banners: Banner[] }) {
  if (!banners?.length) return null;

  const ordered = banners.slice().sort((a, b) => a.order - b.order);

  return (
    <section className="max-w-6xl mx-auto px-4 py-6">
      {/* scroll-snap carousel */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-2xl">
          {ordered.map((b) => (
            <div
              key={b.id}
              className="min-w-full snap-center aspect-[3/1] bg-gray-200 overflow-hidden rounded-2xl"
            >
              <img
                src={b.image_url}
                alt={b.alt_text}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* pagination dots */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {ordered.map((b, i) => (
            <span
              key={b.id}
              className="h-2 w-2 bg-white/70 rounded-full shadow ring-1 ring-black/10"
              aria-label={`slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}