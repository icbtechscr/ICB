import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { searchProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Búsqueda",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const results = await searchProducts(q, 60);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-brand-600">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <span className="text-ink-900">Búsqueda</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-ink-900 md:text-5xl">
            Buscar: <span className="text-brand-600">{q}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {results.length} resultado{results.length !== 1 ? "s" : ""}
          </p>
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink-500">No se encontraron productos.</p>
        )}
      </div>
    </div>
  );
}
