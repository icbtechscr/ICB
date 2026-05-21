import { supabase } from "./supabase";

export type Product = {
  id: string;
  wooId: number | null;
  name: string;
  slug: string;
  sku: string | null;
  shortDescription: string;
  description: string;
  onSale: boolean;
  inStock: boolean;
  priceCRC: number;
  salePriceCRC: number | null;
  images: { src: string; alt: string; position: number }[];
  categories: { id: string; name: string; slug: string }[];
  brand: string | null;
};

type Row = {
  id: string;
  woo_id: number | null;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  on_sale: boolean;
  in_stock: boolean;
  price_crc: number;
  sale_price_crc: number | null;
  brand: { name: string } | null;
  product_images: { url: string; alt: string | null; position: number }[];
  product_categories: { category: { id: string; name: string; slug: string } | null }[];
};

const SELECT = `
  id, woo_id, name, slug, sku, short_description, description,
  on_sale, in_stock, price_crc, sale_price_crc,
  brand:brands ( name ),
  product_images ( url, alt, position ),
  product_categories ( category:categories ( id, name, slug ) )
`;

function rowToProduct(r: Row): Product {
  const images = [...(r.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ src: i.url, alt: i.alt ?? "", position: i.position }));
  const categories = (r.product_categories ?? [])
    .map((pc) => pc.category)
    .filter((c): c is { id: string; name: string; slug: string } => !!c);
  return {
    id: r.id,
    wooId: r.woo_id,
    name: r.name,
    slug: r.slug,
    sku: r.sku,
    shortDescription: r.short_description ?? "",
    description: r.description ?? "",
    onSale: r.on_sale,
    inStock: r.in_stock,
    priceCRC: r.price_crc,
    salePriceCRC: r.sale_price_crc,
    images,
    categories,
    brand: r.brand?.name ?? null,
  };
}

export async function getAllProducts(opts?: { page?: number; perPage?: number }): Promise<{
  products: Product[];
  total: number;
}> {
  const page = opts?.page ?? 1;
  const perPage = opts?.perPage ?? 40;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, count, error } = await supabase
    .from("products")
    .select(SELECT, { count: "exact" })
    .order("name")
    .range(from, to);

  if (error) throw error;
  return { products: (data as unknown as Row[]).map(rowToProduct), total: count ?? 0 };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToProduct(data as unknown as Row);
}

export async function getFeaturedProducts(limit = 10): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("in_stock", true)
    .gt("price_crc", 0)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Row[]).map(rowToProduct);
}

export async function getOnSaleProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("on_sale", true)
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Row[]).map(rowToProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToProduct(data as unknown as Row);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .in("id", ids);
  if (error) throw error;
  const map = new Map(
    (data as unknown as Row[]).map((r) => [r.id, rowToProduct(r)])
  );
  return ids
    .map((id) => map.get(id))
    .filter((p): p is Product => !!p);
}

export type CategoryGroup = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

export async function getTopCategories(limit = 12): Promise<CategoryGroup[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, product_categories(count)");
  if (error) throw error;
  const rows = (data as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    product_categories: { count: number }[];
  }>)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c.product_categories?.[0]?.count ?? 0,
    }))
    .filter((c) => c.name !== "Todas las Categorías" && c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return rows;
}

export async function getTopCategoriesWithImage(
  limit = 8
): Promise<(CategoryGroup & { imageUrl: string | null })[]> {
  const cats = await getTopCategories(limit);
  const enriched = await Promise.all(
    cats.map(async (c) => {
      const { data } = await supabase
        .from("product_categories")
        .select("product:products(product_images(url, position))")
        .eq("category_id", c.id)
        .limit(6);
      type Pc = { product: { product_images: { url: string; position: number }[] } | null };
      const rows = (data ?? []) as unknown as Pc[];
      let imageUrl: string | null = null;
      for (const r of rows) {
        const imgs = r.product?.product_images ?? [];
        const first = [...imgs].sort((a, b) => a.position - b.position)[0];
        if (first?.url) {
          imageUrl = first.url;
          break;
        }
      }
      return { ...c, imageUrl };
    })
  );
  return enriched;
}

export async function getCategoryCountsMap(): Promise<
  Map<string, { name: string; slug: string; count: number }>
> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, product_categories(count)");
  if (error) throw error;
  const rows = (data as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    product_categories: { count: number }[];
  }>) ?? [];
  return new Map(
    rows.map((c) => [
      c.id,
      { name: c.name, slug: c.slug, count: c.product_categories?.[0]?.count ?? 0 },
    ])
  );
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const { data: cat, error: e1 } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (e1) throw e1;
  if (!cat) return [];

  const { data: pcs, error: e2 } = await supabase
    .from("product_categories")
    .select("product:products(" + SELECT + ")")
    .eq("category_id", cat.id);
  if (e2) throw e2;

  return ((pcs ?? []) as unknown as { product: Row | null }[])
    .map((r) => r.product)
    .filter((p): p is Row => !!p)
    .map(rowToProduct);
}

export async function getCategoryBySlug(
  slug: string
): Promise<{ id: string; name: string; slug: string } | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function searchProducts(q: string, limit = 50): Promise<Product[]> {
  const needle = q.trim();
  if (!needle) return [];
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .or(`name.ilike.%${needle}%,sku.ilike.%${needle}%,short_description.ilike.%${needle}%`)
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Row[]).map(rowToProduct);
}

export async function getProductSlugs(limit = 100): Promise<string[]> {
  const { data, error } = await supabase.from("products").select("slug").limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.slug);
}
