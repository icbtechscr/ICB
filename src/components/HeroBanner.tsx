import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/products";
import type { HeroContent } from "@/lib/site-content";

const BULLET_ICONS = [ShieldCheck, Zap, Sparkles];

// Server component, sin framer-motion: el texto (LCP) se pinta de inmediato.
export function HeroBanner({
  featured,
  hero,
}: {
  featured: Product | null;
  hero: HeroContent;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-ink-200 bg-white text-ink-900">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-16 lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <Sparkles className="size-3.5" />
            {hero.badge}
          </div>

          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-brand-900 sm:text-5xl md:text-6xl">
            {hero.titleLine1}
            <br />
            <span className="text-accent-700">{hero.titleLine2}</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-ink-700 md:text-lg">
            {hero.subtitle}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={hero.primaryCtaHref}
              className="group inline-flex items-center gap-2 rounded-md bg-accent-600 px-6 py-3 text-sm font-bold text-ink-900 transition-all hover:bg-accent-500 active:scale-95"
            >
              {hero.primaryCtaLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={hero.secondaryCtaHref}
              className="inline-flex items-center gap-2 rounded-md border border-brand-200 bg-white px-6 py-3 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50"
            >
              <Zap className="size-4 text-brand-700" />
              {hero.secondaryCtaLabel}
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-3 gap-3 border-t border-ink-200 pt-6 text-xs text-ink-700 sm:gap-4">
            {hero.bullets.map((b, i) => {
              const Icon = BULLET_ICONS[i] ?? Sparkles;
              return (
                <li key={i} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-accent-600" />
                  {b}
                </li>
              );
            })}
          </ul>
        </div>

        {featured && featured.images[0] && (
          <div className="relative mx-auto w-full max-w-xl">
            <Link
              href={`/productos/${featured.slug}`}
              className="group relative block overflow-hidden rounded-xl border border-ink-200 bg-white p-4 transition-all hover:border-brand-200"
            >
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src={featured.images[0].src}
                  alt={featured.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 640px"
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>
              <div className="mt-3 border-t border-ink-100 pt-3">
                {featured.brand && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
                    {featured.brand}
                  </span>
                )}
                <h3 className="line-clamp-2 text-sm font-semibold text-ink-900">
                  {featured.name}
                </h3>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition-transform group-hover:translate-x-1">
                  Ver producto <ArrowRight className="size-3" />
                </span>
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
