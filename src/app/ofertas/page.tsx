import { ProductCard } from "@/components/ProductCard";
import { getOnSaleProducts } from "@/lib/products";

export const metadata = { title: "Ofertas — ICB Tech" };
export const revalidate = 60;

export default async function OfertasPage() {
  const onSale = await getOnSaleProducts(200);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold text-ink-900">Ofertas</h1>
      <p className="text-sm text-ink-500">{onSale.length} productos rebajados</p>

      {onSale.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {onSale.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-ink-500">No hay ofertas activas en este momento.</p>
      )}
    </div>
  );
}
