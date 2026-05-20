import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { HeroBanner } from "@/components/HeroBanner";
import { FeatureStrip } from "@/components/FeatureStrip";
import { BrandMarquee } from "@/components/BrandMarquee";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { SectionHeader } from "@/components/SectionHeader";
import { BackgroundShader } from "@/components/ui/background-shader";
import {
  getFeaturedProducts,
  getOnSaleProducts,
  getTopCategoriesWithImage,
} from "@/lib/products";

export const revalidate = 60;

export default async function HomePage() {
  const [featured, onSale, cats] = await Promise.all([
    getFeaturedProducts(12),
    getOnSaleProducts(5),
    getTopCategoriesWithImage(14),
  ]);

  const heroFeatured = featured[0] ?? null;
  const featuredRest = featured.slice(1, 11);

  return (
    <div>
      <HeroBanner featured={heroFeatured} />

      <FeatureStrip />

      <CategoryCarousel categories={cats} />

      {onSale.length > 0 && (
        <section className="bg-gradient-to-b from-white to-ink-50 py-14">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader
              eyebrow="Tiempo limitado"
              title="Ofertas activas"
              subtitle="Precios rebajados mientras dure el stock"
              href="/ofertas"
              hrefLabel="Ver todas"
              accent="danger"
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {onSale.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionHeader
          eyebrow="Lo más buscado"
          title="Productos destacados"
          subtitle="Equipos seleccionados por el equipo ICB"
          href="/productos"
          accent="accent"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {featuredRest.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      <BrandMarquee />

      <section className="relative isolate overflow-hidden py-16 text-white md:py-20">
        <BackgroundShader palette="ocean" speed={0.4} />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent-400">
            ¿Necesitás asesoría?
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Hablemos de tu proyecto.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            Diseñamos soluciones de videovigilancia, redes y punto de venta para
            empresas y comercios en todo Costa Rica.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/contacto"
              className="rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400"
            >
              Contactanos
            </Link>
            <Link
              href="/productos"
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              Explorar catálogo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
