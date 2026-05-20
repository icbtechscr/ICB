import { ProductCard } from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";

export const metadata = { title: "Catálogo — ICB Tech" };

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const perPage = 40;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const { products: slice, total } = await getAllProducts({ page, perPage });
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-ink-900">Catálogo</h1>
        <p className="text-sm text-ink-500">{total} productos disponibles</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {slice.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div className="mt-10 flex items-center justify-center gap-2">
        {page > 1 && (
          <a
            href={`/productos?page=${page - 1}`}
            className="rounded-md border border-ink-200 px-4 py-2 text-sm hover:bg-ink-50"
          >
            ← Anterior
          </a>
        )}
        <span className="text-sm text-ink-500">
          Página {page} de {totalPages}
        </span>
        {page < totalPages && (
          <a
            href={`/productos?page=${page + 1}`}
            className="rounded-md border border-ink-200 px-4 py-2 text-sm hover:bg-ink-50"
          >
            Siguiente →
          </a>
        )}
      </div>
    </div>
  );
}
