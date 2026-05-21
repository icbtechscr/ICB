import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getProductsByCategory, getCategoryBySlug } from "@/lib/products";
import { BackgroundShader } from "@/components/ui/background-shader";

export const revalidate = 60;

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [cat, products] = await Promise.all([
    getCategoryBySlug(slug),
    getProductsByCategory(slug),
  ]);
  if (!cat) notFound();

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="ocean" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <Link href="/productos" className="hover:text-accent-300">
            Catálogo
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">{cat.name}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight drop-shadow md:text-5xl">
            {cat.name}
          </h1>
          <p className="mt-1 text-sm text-white/75">{products.length} productos</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
