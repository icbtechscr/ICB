import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { searchProducts } from "@/lib/products";
import { BackgroundShader } from "@/components/ui/background-shader";

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
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Búsqueda</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight drop-shadow md:text-5xl">
            Buscar: <span className="text-accent-300">{q}</span>
          </h1>
          <p className="mt-1 text-sm text-white/75">
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
          <p className="mt-8 text-white/70">No se encontraron productos.</p>
        )}
      </div>
    </div>
  );
}
