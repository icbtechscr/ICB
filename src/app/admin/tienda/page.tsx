import { getSiteContent } from "@/lib/site-content";
import { adminListCategories } from "@/lib/admin";
import { getProductsByIds } from "@/lib/products";
import { StoreEditor } from "@/components/admin/StoreEditor";

export const dynamic = "force-dynamic";

export default async function AdminTiendaPage() {
  const content = await getSiteContent();
  const categories = await adminListCategories();

  const ids = [
    ...(content.hero.featuredProductId ? [content.hero.featuredProductId] : []),
    ...content.ofertas.productIds,
    ...content.destacados.productIds,
  ];
  const products = await getProductsByIds([...new Set(ids)]);
  const initialProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    image: p.images[0]?.src ?? null,
    priceCRC: p.priceCRC,
    salePriceCRC: p.salePriceCRC,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight">Edición de la tienda</h1>
        <p className="mt-1 text-sm text-ink-500">
          Editá textos, imágenes y productos de la página de inicio, en orden de
          arriba hacia abajo.
        </p>
      </div>
      <StoreEditor
        content={content}
        categories={categories}
        initialProducts={initialProducts}
      />
    </div>
  );
}
