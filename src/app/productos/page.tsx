import { ProductCard } from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";
import { BackgroundShader } from "@/components/ui/background-shader";

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
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight drop-shadow md:text-5xl">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-white/75">{total} productos disponibles</p>
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
              href={`/productos?page=${page + 1}`}
              className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Siguiente →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
