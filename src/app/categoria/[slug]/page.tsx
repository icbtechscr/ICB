import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getProductsByCategory, getCategoryBySlug } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Categoría no encontrada" };
  const desc = `Comprá ${cat.name.toLowerCase()} en ICB Tech Costa Rica. Productos con garantía oficial y envío a todo el país.`;
  const url = absoluteUrl(`/categoria/${cat.slug}`);
  return {
    title: cat.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: cat.name, description: desc, url },
  };
}

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
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-brand-600">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <Link href="/productos" className="hover:text-brand-600">
            Catálogo
          </Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <span className="text-ink-900">{cat.name}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-ink-900 md:text-5xl">
            {cat.name}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{products.length} productos</p>
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
