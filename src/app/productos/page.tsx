import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { CatalogFilters } from "@/components/CatalogFilters";
import {
  getCatalogProducts,
  getTopCategories,
  getCategoryTree,
  getBrands,
  type CatalogSort,
  type CatalogStock,
} from "@/lib/products";

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
    stock?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const perPage = 40;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const cat = params.cat || undefined;
  const brand = params.brand || undefined;
  const q = params.q?.trim() || undefined;
  const stock: CatalogStock | undefined =
    params.stock === "out" || params.stock === "in"
      ? params.stock
      : undefined;
  const sort: CatalogSort = SORTS.includes(params.sort as CatalogSort)
    ? (params.sort as CatalogSort)
    : "relevancia";

  const [{ products: slice, total }, categories, categoryTree, brands] =
    await Promise.all([
      getCatalogProducts({ page, perPage, category: cat, brand, sort, stock, q }),
      getTopCategories(100),
      getCategoryTree(),
      getBrands(),
    ]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // querystring para paginación, preservando filtros y búsqueda
  function pageHref(p: number) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (cat) qs.set("cat", cat);
    if (brand) qs.set("brand", brand);
    if (stock) qs.set("stock", stock);
    if (sort !== "relevancia") qs.set("sort", sort);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/productos?${s}` : "/productos";
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-ink-900 md:text-5xl">
            {q ? (
              <>
                Resultados para{" "}
                <span className="text-brand-600">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              "Catálogo"
            )}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} producto{total !== 1 ? "s" : ""}
            {q || cat || brand || stock ? " (filtrado)" : " disponibles"}
          </p>
        </div>

        <Suspense fallback={<div className="mb-8 h-10" />}>
          <CatalogFilters
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
            }))}
            categoryTree={categoryTree.map((n) => ({
              slug: n.slug,
              name: n.name,
              children: n.children.map((c) => ({ slug: c.slug, name: c.name })),
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
          <p className="mt-8 text-ink-500">
            {q
              ? `No se encontraron productos para "${q}".`
              : "No se encontraron productos con esos filtros."}
          </p>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={pageHref(page - 1)}
                className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                ← Anterior
              </a>
            )}
            <span className="text-sm text-ink-500">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={pageHref(page + 1)}
                className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
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
