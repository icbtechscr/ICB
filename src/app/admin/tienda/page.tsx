import { getSiteContent } from "@/lib/site-content";
import { adminListCategories } from "@/lib/admin";
import {
  getProductsByIds,
  getTopCategoriesWithImage,
  getOnSaleProducts,
  getFeaturedProducts,
  type Product,
} from "@/lib/products";
import { StoreEditor } from "@/components/admin/StoreEditor";

export const dynamic = "force-dynamic";

function toLite(p: Product) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    image: p.images[0]?.src ?? null,
    priceCRC: p.priceCRC,
    salePriceCRC: p.salePriceCRC,
  };
}

export default async function AdminTiendaPage() {
  const content = await getSiteContent();

  const [categories, autoCats, autoOnSale, autoFeatured] = await Promise.all([
    adminListCategories(),
    getTopCategoriesWithImage(14),
    getOnSaleProducts(5),
    getFeaturedProducts(12),
  ]);

  // Productos ya referenciados manualmente
  const ids = [
    ...(content.hero.featuredProductId ? [content.hero.featuredProductId] : []),
    ...content.ofertas.productIds,
    ...content.destacados.productIds,
  ];
  const refProducts = await getProductsByIds([...new Set(ids)]);

  const autoHeroProduct = autoFeatured[0] ? toLite(autoFeatured[0]) : null;
  const autoDestacados = autoFeatured
    .filter((p) => p.id !== autoFeatured[0]?.id)
    .slice(0, 10)
    .map(toLite);
  const autoOfertas = autoOnSale.map(toLite);

  const autoCategories = autoCats.map((c) => ({
    categoryId: c.id,
    nameOverride: "",
    imageUrl: c.imageUrl ?? "",
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
        initialProducts={refProducts.map(toLite)}
        autoHeroProduct={autoHeroProduct}
        autoCategories={autoCategories}
        autoOfertas={autoOfertas}
        autoDestacados={autoDestacados}
      />
    </div>
  );
}
