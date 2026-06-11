import { supabase } from "./supabase";
import { rewriteMediaUrl } from "./image-url";

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
    .map((i) => ({
      src: rewriteMediaUrl(i.url),
      alt: i.alt ?? "",
      position: i.position,
    }));
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

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: { id: string; name: string; slug: string; count: number }[];
};

// Árbol Categoría → Subcategoría desde la jerarquía `parent_id`.
// Si la jerarquía no está cargada o falla la consulta, devuelve [] (el catálogo
// cae al filtro plano de categorías).
export async function getCategoryTree(): Promise<CategoryNode[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, product_categories(count)");
    if (error || !data) return [];

    type Row = {
      id: string;
      name: string;
      slug: string;
      parent_id: string | null;
      product_categories: { count: number }[];
    };
    const rows = data as unknown as Row[];
    const countOf = (r: Row) => r.product_categories?.[0]?.count ?? 0;

    const childrenByParent = new Map<string, CategoryNode["children"]>();
    for (const r of rows) {
      if (!r.parent_id) continue;
      const c = countOf(r);
      if (c <= 0) continue;
      if (!childrenByParent.has(r.parent_id)) childrenByParent.set(r.parent_id, []);
      childrenByParent
        .get(r.parent_id)!
        .push({ id: r.id, name: r.name, slug: r.slug, count: c });
    }

    return rows
      .filter(
        (r) =>
          !r.parent_id &&
          r.name !== "Todas las Categorías" &&
          (countOf(r) > 0 || (childrenByParent.get(r.id)?.length ?? 0) > 0)
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        count: countOf(r),
        children: (childrenByParent.get(r.id) ?? []).sort(
          (a, b) => b.count - a.count
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

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
          imageUrl = rewriteMediaUrl(first.url);
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

// Productos de una categoría INCLUYENDO toda su descendencia (recursivo, N
// niveles). Así un padre (ej. Seguridad) muestra los de Cámaras Analógicas y
// los de las sub-subcategorías que cuelguen de ahí.
export async function getProductsByCategoryDeep(slug: string): Promise<Product[]> {
  const { data: cat, error: e1 } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (e1) throw e1;
  if (!cat) return [];

  // Árbol completo (tabla chica) para juntar todos los descendientes.
  const { data: all } = await supabase
    .from("categories")
    .select("id, parent_id");
  const childrenMap = new Map<string, string[]>();
  for (const c of (all ?? []) as { id: string; parent_id: string | null }[]) {
    if (!c.parent_id) continue;
    if (!childrenMap.has(c.parent_id)) childrenMap.set(c.parent_id, []);
    childrenMap.get(c.parent_id)!.push(c.id);
  }
  const ids: string[] = [];
  const stack = [cat.id];
  while (stack.length) {
    const id = stack.pop()!;
    ids.push(id);
    for (const ch of childrenMap.get(id) ?? []) stack.push(ch);
  }

  const { data: pcs, error } = await supabase
    .from("product_categories")
    .select("product:products(" + SELECT + ")")
    .in("category_id", ids);
  if (error) throw error;

  const map = new Map<string, Product>();
  for (const r of (pcs ?? []) as unknown as { product: Row | null }[]) {
    if (r.product && !map.has(r.product.id)) {
      map.set(r.product.id, rowToProduct(r.product));
    }
  }
  return [...map.values()];
}

// Subcategorías hijas directas de una categoría (para navegar niveles más
// profundos desde la página de la categoría).
export async function getChildCategories(
  slug: string
): Promise<{ name: string; slug: string; count: number }[]> {
  const { data: cat } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cat) return [];
  const { data } = await supabase
    .from("categories")
    .select("name, slug, product_categories(count)")
    .eq("parent_id", cat.id);
  return ((data ?? []) as unknown as {
    name: string;
    slug: string;
    product_categories: { count: number }[];
  }[])
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      count: c.product_categories?.[0]?.count ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Junta productos de varias subcategorías (para categorías "padre" sin página).
export async function getProductsByCategorySlugs(
  slugs: string[]
): Promise<Product[]> {
  if (!slugs.length) return [];
  const { data: cats } = await supabase
    .from("categories")
    .select("id")
    .in("slug", slugs);
  const ids = (cats ?? []).map((c) => c.id);
  if (!ids.length) return [];
  const { data: pcs, error } = await supabase
    .from("product_categories")
    .select("product:products(" + SELECT + ")")
    .in("category_id", ids);
  if (error) throw error;
  const map = new Map<string, Product>();
  for (const r of (pcs ?? []) as unknown as { product: Row | null }[]) {
    if (r.product && !map.has(r.product.id)) {
      map.set(r.product.id, rowToProduct(r.product));
    }
  }
  return [...map.values()];
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

// Para sitemap: todos los slugs (con updated_at si existe)
export async function getAllProductSlugs(): Promise<
  { slug: string; updatedAt: string | null }[]
> {
  const { data, error } = await supabase
    .from("products")
    .select("slug, updated_at")
    .range(0, 4999);
  if (error) throw error;
  return ((data ?? []) as { slug: string; updated_at: string | null }[]).map(
    (r) => ({ slug: r.slug, updatedAt: r.updated_at })
  );
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .range(0, 4999);
  if (error) throw error;
  return ((data ?? []) as { slug: string; name: string }[])
    .filter((c) => c.name !== "Todas las Categorías")
    .map((c) => c.slug);
}

export async function getBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("name")
    .order("name");
  if (error) throw error;
  return ((data ?? []) as { name: string | null }[])
    .map((b) => b.name)
    .filter((n): n is string => !!n);
}

export type CatalogSort = "relevancia" | "precio-asc" | "precio-desc" | "nombre" | "nuevos";

export type CatalogParams = {
  page?: number;
  perPage?: number;
  category?: string; // slug
  brand?: string; // name
  sort?: CatalogSort;
  q?: string; // texto de búsqueda (nombre, SKU, descripción corta)
};

export async function getCatalogProducts(params: CatalogParams): Promise<{
  products: Product[];
  total: number;
}> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 40;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // SELECT con inner joins solo cuando se filtra, para que el filtro recorte filas
  const catInner = params.category ? "!inner" : "";
  const brandInner = params.brand ? "!inner" : "";
  const select = `
    id, woo_id, name, slug, sku, short_description, description,
    on_sale, in_stock, price_crc, sale_price_crc,
    brand:brands${brandInner} ( name ),
    product_images ( url, alt, position ),
    product_categories${catInner} ( category:categories${catInner} ( id, name, slug ) )
  `;

  let query = supabase.from("products").select(select, { count: "exact" });

  if (params.category) {
    query = query.eq("product_categories.category.slug", params.category);
  }
  if (params.brand) {
    query = query.eq("brand.name", params.brand);
  }
  const needle = params.q?.trim();
  if (needle) {
    // Escapa comas y paréntesis que romperían la sintaxis del filtro `or`.
    const safe = needle.replace(/[,()]/g, " ");
    query = query.or(
      `name.ilike.%${safe}%,sku.ilike.%${safe}%,short_description.ilike.%${safe}%`
    );
  }

  switch (params.sort) {
    case "precio-asc":
      query = query.order("price_crc", { ascending: true });
      break;
    case "precio-desc":
      query = query.order("price_crc", { ascending: false });
      break;
    case "nuevos":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("name", { ascending: true });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;
  return {
    products: (data as unknown as Row[]).map(rowToProduct),
    total: count ?? 0,
  };
}
