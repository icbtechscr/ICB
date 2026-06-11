import {
  adminListCategories,
  adminCategoryProductCounts,
  adminListBrands,
  adminBrandProductCounts,
} from "@/lib/admin";
import { ProductTabs } from "@/components/ProductTabs";
import {
  CategoriesManager,
  type AdminCategoryRow,
} from "@/components/admin/CategoriesManager";
import {
  BrandsManager,
  type AdminBrandRow,
} from "@/components/admin/BrandsManager";
import { NavbarManager } from "@/components/admin/NavbarManager";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [categories, catCounts, brands, brandCounts, site] = await Promise.all([
    adminListCategories(),
    adminCategoryProductCounts(),
    adminListBrands(),
    adminBrandProductCounts(),
    getSiteContent(),
  ]);

  const categoryRows: AdminCategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
    productCount: catCounts.get(c.id) ?? 0,
  }));
  const brandRows: AdminBrandRow[] = brands.map((b) => ({
    ...b,
    productCount: brandCounts.get(b.id) ?? 0,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-ink-500">
          Ajustes generales del sistema, organizados por secciones.
        </p>
      </div>

      <ProductTabs
        tabs={[
          {
            id: "tienda",
            label: "Tienda y productos",
            content: (
              <div className="space-y-10">
                <section>
                  <h2 className="mb-1 text-lg font-black text-ink-900">
                    Categorías y subcategorías
                  </h2>
                  <p className="mb-4 text-sm text-ink-500">
                    Creá, renombrá o eliminá categorías. Las subcategorías
                    cuelgan de una categoría principal (ej: Redes → Routers).
                  </p>
                  <CategoriesManager initialCategories={categoryRows} />
                </section>

                <section>
                  <h2 className="mb-1 text-lg font-black text-ink-900">
                    Marcas
                  </h2>
                  <p className="mb-4 text-sm text-ink-500">
                    Marcas del catálogo. Se usan al crear productos y como filtro
                    en la tienda.
                  </p>
                  <BrandsManager initialBrands={brandRows} />
                </section>
              </div>
            ),
          },
          {
            id: "navbar",
            label: "Barra de navegación",
            content: (
              <NavbarManager
                initialItems={site.navbar.items}
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  slug: c.slug,
                  parentId: c.parent_id,
                }))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
