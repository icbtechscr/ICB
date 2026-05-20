import { ProductCard } from "@/components/ProductCard";
import { searchProducts } from "@/lib/products";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const results = await searchProducts(q, 60);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ink-900">
        Buscar: <span className="text-brand-600">{q}</span>
      </h1>
      <p className="text-sm text-ink-500">
        {results.length} resultado{results.length !== 1 ? "s" : ""}
      </p>

      {results.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-ink-500">No se encontraron productos.</p>
      )}
    </div>
  );
}
