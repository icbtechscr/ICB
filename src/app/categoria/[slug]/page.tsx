import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { CategorySort } from "@/components/CategorySort";
import {
  getProductsByCategory,
  getProductsByCategorySlugs,
  getCategoryBySlug,
  type Product,
} from "@/lib/products";
import { getCategoryGroup } from "@/lib/category-tree";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 60;

function effectivePrice(p: Product) {
  return p.salePriceCRC ?? p.priceCRC;
}

function sortProducts(products: Product[], sort: string): Product[] {
  const arr = [...products];
  switch (sort) {
    case "precio-asc":
      return arr.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "precio-desc":
      return arr.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "nombre":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return arr;
  }
}

async function resolveCategory(
  slug: string
): Promise<{ name: string; products: Product[] } | null> {
  const real = await getCategoryBySlug(slug);
  if (real) {
    return { name: real.name, products: await getProductsByCategory(slug) };
  }
  // Categoría "padre" sin página propia (ej. redes): juntar subcategorías.
  const group = getCategoryGroup(slug);
  if (group) {
    return {
      name: group.name,
      products: await getProductsByCategorySlugs(group.childSlugs),
    };
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const view = await resolveCategory(slug);
  if (!view) return { title: "Categoría no encontrada" };
  const desc = `Comprá ${view.name.toLowerCase()} en ICB Tech Costa Rica. Productos con garantía oficial y envío a todo el país.`;
  const url = absoluteUrl(`/categoria/${slug}`);
  return {
    title: view.name,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: view.name, description: desc, url },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; brand?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const view = await resolveCategory(slug);
  if (!view) notFound();

  const sort = sp.sort ?? "relevancia";
  const brand = sp.brand ?? "";

  // Marcas disponibles dentro de esta categoría.
  const brands = [...new Set(view.products.map((p) => p.brand).filter(Boolean))]
    .sort() as string[];

  let products = brand
    ? view.products.filter((p) => p.brand === brand)
    : view.products;
  products = sortProducts(products, sort);

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
          <span className="text-ink-900">{view.name}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-ink-900 md:text-5xl">
            {view.name}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{products.length} productos</p>
        </div>

        <CategorySort
          basePath={`/categoria/${slug}`}
          sort={sort}
          brand={brand}
          brands={brands}
        />

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink-500">
            No se encontraron productos con esos filtros.
          </p>
        )}
      </div>
    </div>
  );
}
