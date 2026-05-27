"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Zap, ShieldCheck } from "lucide-react";
import type { Product } from "@/lib/products";
import type { HeroContent } from "@/lib/site-content";
import { formatCRC } from "@/lib/utils";

const BULLET_ICONS = [ShieldCheck, Zap, Sparkles];

export function HeroBanner({
  featured,
  hero,
}: {
  featured: Product | null;
  hero: HeroContent;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-ink-200 bg-gradient-to-r from-brand-900 to-brand-700 text-white">

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-16 lg:py-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-accent-300 backdrop-blur-md"
          >
            <Sparkles className="size-3.5" />
            {hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-5 text-4xl font-black leading-[1.05] tracking-tight drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl"
          >
            {hero.titleLine1}
            <br />
            <span className="bg-gradient-to-r from-accent-300 via-accent-400 to-emerald-300 bg-clip-text text-transparent">
              {hero.titleLine2}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 max-w-md text-base text-white/85 drop-shadow md:text-lg"
          >
            {hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-7 flex flex-wrap gap-3"
          >
            <Link
              href={hero.primaryCtaHref}
              className="group inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 hover:shadow-accent-500/50 active:scale-95"
            >
              {hero.primaryCtaLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={hero.secondaryCtaHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Zap className="size-4 text-warn" />
              {hero.secondaryCtaLabel}
            </Link>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 grid grid-cols-3 gap-3 border-t border-white/15 pt-6 text-xs text-white/85 sm:gap-4"
          >
            {hero.bullets.map((b, i) => {
              const Icon = BULLET_ICONS[i] ?? Sparkles;
              return (
                <li key={i} className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-accent-400" />
                  {b}
                </li>
              );
            })}
          </motion.ul>
        </div>

        {featured && featured.images[0] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-accent-400/30 to-brand-500/30 blur-2xl" />
            <Link
              href={`/productos/${featured.slug}`}
              className="group relative block overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl transition-all hover:border-accent-400/50 hover:bg-white/15"
            >
              <div className="absolute right-4 top-4 z-10 rounded-full bg-accent-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-900">
                Destacado
              </div>
              <div className="relative aspect-square w-full">
                <Image
                  src={featured.images[0].src}
                  alt={featured.name}
                  fill
                  sizes="(max-width: 768px) 90vw, 500px"
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                  priority
                  unoptimized
                />
              </div>
              <div className="mt-4 border-t border-white/15 pt-4">
                {featured.brand && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-300">
                    {featured.brand}
                  </span>
                )}
                <h3 className="line-clamp-2 text-sm font-semibold text-white">
                  {featured.name}
                </h3>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-2xl font-black text-white tabular-nums">
                    {formatCRC(featured.salePriceCRC ?? featured.priceCRC)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-300 transition-transform group-hover:translate-x-1">
                    Ver más <ArrowRight className="size-3" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}
