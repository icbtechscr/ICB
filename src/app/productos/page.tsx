import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { CatalogFilters } from "@/components/CatalogFilters";
import {
  getCatalogProducts,
  getTopCategories,
  getBrands,
  type CatalogSort,
} from "@/lib/products";
import { BackgroundShader } from "@/components/ui/background-shader";

export const metadata = { title: "Catálogo" };

export const revalidate = 60;

const SORTS: CatalogSort[] = [
  "relevancia",
  "precio-asc",
  "precio-desc",
  "nombre",
  "nuevos",
];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    cat?: string;
    brand?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const perPage = 40;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const cat = params.cat || undefined;
  const brand = params.brand || undefined;
  const sort: CatalogSort = SORTS.includes(params.sort as CatalogSort)
    ? (params.sort as CatalogSort)
    : "relevancia";

  const [{ products: slice, total }, categories, brands] = await Promise.all([
    getCatalogProducts({ page, perPage, category: cat, brand, sort }),
    getTopCategories(100),
    getBrands(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // querystring para paginación, preservando filtros
  function pageHref(p: number) {
    const qs = new URLSearchParams();
    if (cat) qs.set("cat", cat);
    if (brand) qs.set("brand", brand);
    if (sort !== "relevancia") qs.set("sort", sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/productos?${s}` : "/productos";
  }

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight drop-shadow md:text-5xl">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-white/75">
            {total} producto{total !== 1 ? "s" : ""}
            {cat || brand ? " (filtrado)" : " disponibles"}
          </p>
        </div>

        <Suspense fallback={<div className="mb-8 h-10" />}>
          <CatalogFilters
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
            }))}
            brands={brands}
          />
        </Suspense>

        {slice.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {slice.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-white/70">
            No se encontraron productos con esos filtros.
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={pageHref(page - 1)}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                ← Anterior
              </a>
            )}
            <span className="text-sm text-white/75">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={pageHref(page + 1)}
                className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Siguiente →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
