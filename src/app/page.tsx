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
  getProductById,
  getProductsByIds,
  getCategoryCountsMap,
  type Product,
} from "@/lib/products";
import { getSiteContent } from "@/lib/site-content";

export const revalidate = 60;

export default async function HomePage() {
  const content = await getSiteContent();

  const [autoFeatured, autoCats] = await Promise.all([
    getFeaturedProducts(12),
    getTopCategoriesWithImage(14),
  ]);

  // Hero product
  let heroFeatured: Product | null = null;
  if (content.hero.featuredProductId) {
    heroFeatured = await getProductById(content.hero.featuredProductId);
  }
  if (!heroFeatured) heroFeatured = autoFeatured[0] ?? null;

  // Ofertas
  const onSale = content.ofertas.productIds.length
    ? await getProductsByIds(content.ofertas.productIds)
    : await getOnSaleProducts(5);

  // Destacados
  const destacados = content.destacados.productIds.length
    ? await getProductsByIds(content.destacados.productIds)
    : autoFeatured.filter((p) => p.id !== heroFeatured?.id).slice(0, 10);

  // Categorías
  let cats = autoCats;
  if (content.categories.items.length) {
    const counts = await getCategoryCountsMap();
    cats = content.categories.items
      .map((it) => {
        const c = counts.get(it.categoryId);
        if (!c) return null;
        return {
          id: it.categoryId,
          name: it.nameOverride || c.name,
          slug: c.slug,
          count: c.count,
          imageUrl: it.imageUrl || null,
        };
      })
      .filter((c): c is NonNullable<typeof c> => !!c);
  }

  return (
    <div>
      <HeroBanner featured={heroFeatured} hero={content.hero} />

      <FeatureStrip />

      <CategoryCarousel
        categories={cats}
        eyebrow={content.categories.eyebrow}
        title={content.categories.title}
        subtitle={content.categories.subtitle}
      />

      {onSale.length > 0 && (
        <section className="bg-gradient-to-b from-white to-ink-50 py-14">
          <div className="mx-auto max-w-7xl px-4">
            <SectionHeader
              eyebrow={content.ofertas.eyebrow}
              title={content.ofertas.title}
              subtitle={content.ofertas.subtitle}
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
          eyebrow={content.destacados.eyebrow}
          title={content.destacados.title}
          subtitle={content.destacados.subtitle}
          href="/productos"
          accent="accent"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {destacados.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      <BrandMarquee />

      <section className="relative isolate overflow-hidden py-16 text-white md:py-20">
        <BackgroundShader palette="ocean" speed={0.4} />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent-400">
            {content.cta.eyebrow}
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            {content.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            {content.cta.subtitle}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={content.cta.primaryCtaHref}
              className="rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400"
            >
              {content.cta.primaryCtaLabel}
            </Link>
            <Link
              href={content.cta.secondaryCtaHref}
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              {content.cta.secondaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
