import { adminBrandProductCounts, adminListBrands } from "@/lib/admin";
import { BrandsManager, type AdminBrandRow } from "@/components/admin/BrandsManager";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const [brands, counts] = await Promise.all([
    adminListBrands(),
    adminBrandProductCounts(),
  ]);

  const rows: AdminBrandRow[] = brands.map((b) => ({
    ...b,
    productCount: counts.get(b.id) ?? 0,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Marcas</h1>
        <p className="mt-1 text-sm text-ink-500">
          Administrá las marcas del catálogo. Se usan al crear productos y como
          filtro en la tienda.
        </p>
      </div>
      <BrandsManager initialBrands={rows} />
    </div>
  );
}
