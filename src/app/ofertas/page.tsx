import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getOnSaleProducts } from "@/lib/products";
import { BackgroundShader } from "@/components/ui/background-shader";

export const metadata = { title: "Ofertas — ICB Tech" };
export const revalidate = 60;

export default async function OfertasPage() {
  const onSale = await getOnSaleProducts(200);

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="ocean" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Ofertas</span>
        </nav>

        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-accent-300 backdrop-blur-md">
            <Zap className="size-3.5" />
            Tiempo limitado
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight drop-shadow md:text-5xl">
            Ofertas activas
          </h1>
          <p className="mt-1 text-sm text-white/75">{onSale.length} productos rebajados</p>
        </div>

        {onSale.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {onSale.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-white/70">No hay ofertas activas en este momento.</p>
        )}
      </div>
    </div>
  );
}
