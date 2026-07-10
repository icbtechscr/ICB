"use client";
import { useState } from "react";
import Image from "next/image";

type GalleryImage = { src: string; alt: string };

export function ProductGallery({
  images,
  name,
  onSale,
  priceCRC,
  salePriceCRC,
}: {
  images: GalleryImage[];
  name: string;
  onSale: boolean;
  priceCRC: number;
  salePriceCRC: number | null;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-200 bg-white p-4 shadow-sm md:p-8">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white">
        {current ? (
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt || name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-6"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-500">
            Sin imagen
          </div>
        )}
        {onSale && salePriceCRC && (
          <div className="absolute left-4 top-4 rounded-full bg-danger px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
            -{Math.round((1 - salePriceCRC / priceCRC) * 100)}%
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((img, i) => (
            <button
              key={img.src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={`relative aspect-square overflow-hidden rounded-xl border bg-white transition ${
                i === active
                  ? "border-brand-500 ring-2 ring-brand-500/30"
                  : "border-ink-200 hover:border-brand-300"
              }`}
            >
              <Image
                src={img.src}
                alt={img.alt || name}
                fill
                sizes="120px"
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
