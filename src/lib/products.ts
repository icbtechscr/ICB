import { supabase } from "./supabase";
import { rewriteMediaUrl } from "./image-url";
import { decodeHtml } from "./utils";
import {
  isPurchasableStock,
  isMissingStockStatusError,
  normalizeStockStatus,
  readStockStatusAttribute,
  type StockStatus,
} from "./stock";

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
  stockStatus: StockStatus;
  stockQty: number | null;
  priceCRC: number;
  salePriceCRC: number | null;
  images: { src: string; alt: string; position: number }[];
  categories: { id: string; name: string; slug: string }[];
  brand: string | null;
};

export type ProductCategoryBreadcrumb = {
  id: string;
  name: string;
  slug: string;
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
  stock_status?: string | null;
  stock_qty: number | null;
  attributes?: Record<string, unknown> | null;
  price_crc: number;
  sale_price_crc: number | null;
  brand: { name: string } | null;
  product_images: { url: string; alt: string | null; position: number }[];
  product_categories: { category: { id: string; name: string; slug: string } | null }[];
};

const SELECT_WITH_STOCK_STATUS = `
  id, woo_id, name, slug, sku, short_description, description,
  on_sale, in_stock, stock_status, stock_qty, attributes, price_crc, sale_price_crc,
  brand:brands ( name ),
  product_images ( url, alt, position ),
  product_categories ( category:categories ( id, name, slug ) )
`;

const SELECT_LEGACY_STOCK = `
  id, woo_id, name, slug, sku, short_description, description,
  on_sale, in_stock, stock_qty, attributes, price_crc, sale_price_crc,
  brand:brands ( name ),
  product_images ( url, alt, position ),
  product_categories ( category:categories ( id, name, slug ) )
`;

// LISTADOS: la descripcion larga (HTML de WooCommerce) y `attributes` pesan
// muchisimo y no se usan en las tarjetas. Pedirlas en cada listado era la
// causa principal del egress de Supabase. Solo el detalle usa el SELECT completo.
const SELECT_LIST = `
  id, woo_id, name, slug, sku, short_description,
  on_sale, in_stock, stock_status, stock_qty, price_crc, sale_price_crc,
  brand:brands ( name ),
  product_images ( url, alt, position ),
  product_categories ( category:categories ( id, name, slug ) )
`;

const SELECT_LIST_LEGACY = `
  id, woo_id, name, slug, sku, short_description,
  on_sale, in_stock, stock_qty, attributes, price_crc, sale_price_crc,
  brand:brands ( name ),
  product_images ( url, alt, position ),
  product_categories ( category:categories ( id, name, slug ) )
`;

// Si la base falla (caida, cuota agotada, red), los LISTADOS publicos devuelven
// vacio en vez de tumbar el build o la pagina entera. Queda el aviso en el log.
function warnQuery(where: string, error: unknown): void {
  console.warn(
    `[products] ${where}:`,
    error instanceof Error ? error.message : JSON.stringify(error)
  );
}

type ProductQueryResult<T> = {
  data: T | null;
  error: unknown;
  count?: number | null;
};

async function withStockStatusFallback<T>(
  build: (select: string) => PromiseLike<ProductQueryResult<T>>,
  primarySelect = SELECT_WITH_STOCK_STATUS,
  fallbackSelect = SELECT_LEGACY_STOCK
): Promise<ProductQueryResult<T>> {
  const result = await build(primarySelect);
  if (!result.error || !isMissingStockStatusError(result.error)) return result;
  return build(fallbackSelect);
}

function rowToProduct(r: Row): Product {
  const stockStatus = normalizeStockStatus(
    r.stock_status ?? readStockStatusAttribute(r.attributes),
    r.in_stock
  );
  const images = [...(r.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => ({
      src: rewriteMediaUrl(i.url),
      alt: decodeHtml(i.alt ?? r.name),
      position: i.position,
    }));
  const categories = (r.product_categories ?? [])
    .map((pc) => pc.category)
    .filter((c): c is { id: string; name: string; slug: string } => !!c)
    .map((category) => ({
      ...category,
      name: decodeHtml(category.name),
    }));
  return {
    id: r.id,
    wooId: r.woo_id,
    name: decodeHtml(r.name),
    slug: r.slug,
    sku: r.sku,
    shortDescription: r.short_description ?? "",
    description: r.description ?? "",
    onSale: r.on_sale,
    inStock: isPurchasableStock(stockStatus, r.stock_qty),
    stockStatus,
    stockQty: r.stock_qty,
    priceCRC: r.price_crc,
    salePriceCRC: r.sale_price_crc,
    images,
    categories,
    brand: r.brand?.name ? decodeHtml(r.brand.name) : null,
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

  const { data, count, error } = await withStockStatusFallback(
    (select) =>
      supabase
        .from("products")
        .select(select, { count: "exact" })
        .eq("is_visible", true)
        .order("name")
        .range(from, to),
    SELECT_LIST,
    SELECT_LIST_LEGACY
  );

  if (error) {
    warnQuery("getAllProducts", error);
    return { products: [], total: 0 };
  }
  return { products: (data as unknown as Row[]).map(rowToProduct), total: count ?? 0 };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await withStockStatusFallback((select) =>
    supabase
      .from("products")
      .select(select)
      .eq("slug", slug)
      .eq("is_visible", true)
      .maybeSingle()
  );
  if (error) throw error;
  if (!data) return null;
  return rowToProduct(data as unknown as Row);
}

/**
 * Ruta canónica de categorías para una ficha de producto.
 *
 * Un producto puede estar vinculado tanto a su categoría raíz como a la más
 * específica. Se reconstruyen todas las rutas posibles y se elige la más
 * profunda para mostrar Familia > Subgrupo > Categoría de forma determinista.
 */
export async function getProductCategoryBreadcrumb(
  categoryIds: string[]
): Promise<ProductCategoryBreadcrumb[]> {
  const assignedIds = new Set(categoryIds.filter(Boolean));
  if (assignedIds.size === 0) return [];

  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id");
    if (error || !data) return [];

    type CategoryRow = {
      id: string;
      name: string;
      slug: string;
      parent_id: string | null;
    };
    const rows = data as unknown as CategoryRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));

    const paths = [...assignedIds]
      .map((id) => {
        const path: CategoryRow[] = [];
        const visited = new Set<string>();
        let current = byId.get(id);
        while (current && !visited.has(current.id)) {
          visited.add(current.id);
          if (current.name !== "Todas las Categorías") path.unshift(current);
          current = current.parent_id ? byId.get(current.parent_id) : undefined;
        }
        return path;
      })
      .filter((path) => path.length > 0)
      .sort(
        (a, b) =>
          b.length - a.length ||
          a.map((item) => item.name).join("/").localeCompare(
            b.map((item) => item.name).join("/"),
            "es"
          )
      );

    return (paths[0] ?? []).map((item) => ({
      id: item.id,
      name: decodeHtml(item.name),
      slug: item.slug,
    }));
  } catch {
    return [];
  }
}

export async function getFeaturedProducts(limit = 10): Promise<Product[]> {
  const { data, error } = await withStockStatusFallback((select) => {
    let query = supabase
      .from("products")
      .select(select)
      .eq("is_visible", true)
      .gt("price_crc", 0)
      .order("created_at", { ascending: false })
      .limit(limit);
    query =
      select === SELECT_LIST
        ? query.neq("stock_status", "out_of_stock")
        : query.eq("in_stock", true);
    return query;
  }, SELECT_LIST, SELECT_LIST_LEGACY);
  if (error) {
    warnQuery("getFeaturedProducts", error);
    return [];
  }
  return (data as unknown as Row[]).map(rowToProduct);
}

export async function getOnSaleProducts(limit = 8): Promise<Product[]> {
  const { data, error } = await withStockStatusFallback(
    (select) =>
      supabase
        .from("products")
        .select(select)
        .eq("on_sale", true)
        .eq("is_visible", true)
        .limit(limit),
    SELECT_LIST,
    SELECT_LIST_LEGACY
  );
  if (error) {
    warnQuery("getOnSaleProducts", error);
    return [];
  }
  return (data as unknown as Row[]).map(rowToProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await withStockStatusFallback((select) =>
    supabase
      .from("products")
      .select(select)
      .eq("id", id)
      .eq("is_visible", true)
      .maybeSingle()
  );
  if (error) throw error;
  if (!data) return null;
  return rowToProduct(data as unknown as Row);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await withStockStatusFallback((select) =>
    supabase
      .from("products")
      .select(select)
      .in("id", ids)
      .eq("is_visible", true)
  );
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
  if (error) {
    warnQuery("getTopCategories", error);
    return [];
  }
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
        .select("product:products!inner(is_visible, product_images(url, position))")
        .eq("category_id", c.id)
        .eq("product.is_visible", true)
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
  if (error) {
    warnQuery("getCategoryCountsMap", error);
    return new Map();
  }
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
  if (e1) {
    warnQuery("getProductsByCategory", e1);
    return [];
  }
  if (!cat) return [];

  const { data: pcs, error: e2 } = await withStockStatusFallback(
    (select) =>
      supabase
        .from("product_categories")
        .select("product:products!inner(" + select + ")")
        .eq("category_id", cat.id)
        .eq("product.is_visible", true),
    SELECT_LIST,
    SELECT_LIST_LEGACY
  );
  if (e2) {
    warnQuery("getProductsByCategory", e2);
    return [];
  }

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
  if (e1) {
    warnQuery("getProductsByCategoryDeep", e1);
    return [];
  }
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

  const { data: pcs, error } = await withStockStatusFallback(
    (select) =>
      supabase
        .from("product_categories")
        .select("product:products!inner(" + select + ")")
        .in("category_id", ids)
        .eq("product.is_visible", true),
    SELECT_LIST,
    SELECT_LIST_LEGACY
  );
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
  const { data: pcs, error } = await withStockStatusFallback(
    (select) =>
      supabase
        .from("product_categories")
        .select("product:products!inner(" + select + ")")
        .in("category_id", ids)
        .eq("product.is_visible", true),
    SELECT_LIST,
    SELECT_LIST_LEGACY
  );
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
  const words = needle
    .split(/\s+/)
    .map((w) => w.split('"').join("").trim())
    .filter(Boolean)
    .slice(0, 6);
  const { data, error } = await withStockStatusFallback((select) => {
    let stockQuery = supabase
      .from("products")
      .select(select)
      .eq("is_visible", true)
      .limit(limit);
    for (const w of words) {
      stockQuery = stockQuery.or(
        `name.ilike."%${w}%",sku.ilike."%${w}%",short_description.ilike."%${w}%"`
      );
    }
    return stockQuery;
  }, SELECT_LIST, SELECT_LIST_LEGACY);
  if (error) throw error;
  return (data as unknown as Row[]).map(rowToProduct);
}

// Quita acentos/diacríticos de un texto: "Cámaras" -> "camaras".
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Convierte una palabra en un patrón regex (POSIX) insensible a tildes:
// "camaras" -> "c[aá]m[aá]r[aá]s", de modo que calce con o sin acento,
// sin importar cómo esté guardado el producto en la base.
const VOWEL_CLASS: Record<string, string> = {
  a: "[aá]",
  e: "[eé]",
  i: "[ií]",
  o: "[oó]",
  u: "[uúü]",
  n: "[nñ]",
};
function toAccentInsensitivePattern(word: string): string {
  const base = stripAccents(word.toLowerCase());
  let out = "";
  for (const ch of base) {
    if (VOWEL_CLASS[ch]) {
      out += VOWEL_CLASS[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    }
    // Cualquier otro carácter (regex-especial, comas, paréntesis) se descarta
    // para no romper el patrón ni el parser de PostgREST.
  }
  return out;
}

/**
 * Búsqueda "tolerante" pensada para el chatbot: ignora mayúsculas Y tildes,
 * así "camaras ip" encuentra "Cámaras IP". Usa el operador regex `imatch` (~*).
 * Si la base no lo soporta, cae de vuelta a la búsqueda normal (searchProducts)
 * para no dejar al bot sin resultados.
 */
export type LooseSearchOpts = {
  limit?: number;
  /** Precio máximo en colones (filtra por el precio efectivo: oferta si la hay). */
  maxPrice?: number | null;
  /** Precio mínimo en colones. */
  minPrice?: number | null;
  /** Solo productos disponibles (en stock). */
  inStockOnly?: boolean;
};

/** Precio efectivo de un producto: el de oferta si existe, si no el normal. */
function effectivePrice(p: Product): number {
  return p.salePriceCRC ?? p.priceCRC;
}

export async function searchProductsLoose(
  q: string,
  opts: LooseSearchOpts = {}
): Promise<Product[]> {
  const { limit = 12, maxPrice = null, minPrice = null, inStockOnly = false } = opts;
  const needle = q.trim();

  // Pedimos un colchón mayor a la base para poder filtrar por precio/stock
  // en memoria y aun así devolver suficientes resultados.
  const fetchLimit = Math.max(limit * 4, 40);

  async function fetchBy(useLoose: boolean): Promise<Product[]> {
    const { data, error } = await withStockStatusFallback((select) => {
      let query = supabase
        .from("products")
        .select(select)
        .eq("is_visible", true)
        .limit(fetchLimit);
      if (needle) {
        const words = needle
          .split(/\s+/)
          .map((w) =>
            useLoose ? toAccentInsensitivePattern(w) : w.split('"').join("").trim()
          )
          .filter(Boolean)
          .slice(0, 6);
        for (const w of words) {
          query = useLoose
            ? query.or(`name.imatch.${w},sku.imatch.${w},short_description.imatch.${w}`)
            : query.or(
                `name.ilike."%${w}%",sku.ilike."%${w}%",short_description.ilike."%${w}%"`
              );
        }
      }
      return query;
    }, SELECT_LIST, SELECT_LIST_LEGACY);
    if (error) throw error;
    return (data as unknown as Row[]).map(rowToProduct);
  }

  let products: Product[];
  try {
    products = await fetchBy(true);
  } catch (e) {
    // Fallback: si `imatch` no está disponible, usa el ilike clásico.
    console.warn(
      "[searchProductsLoose] fallback a ilike:",
      e instanceof Error ? e.message : String(e)
    );
    products = await fetchBy(false);
  }

  // Filtros y orden por precio (en memoria, para no depender de la BD).
  if (inStockOnly) products = products.filter((p) => p.inStock);
  if (minPrice != null) products = products.filter((p) => effectivePrice(p) >= minPrice);
  if (maxPrice != null) products = products.filter((p) => effectivePrice(p) <= maxPrice);
  products.sort((a, b) => effectivePrice(a) - effectivePrice(b));

  return products.slice(0, limit);
}

export async function getProductSlugs(limit = 100): Promise<string[]> {
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_visible", true)
    .limit(limit);
  if (error) {
    warnQuery("getProductSlugs", error);
    return [];
  }
  return (data ?? []).map((r) => r.slug);
}

// Para sitemap: todos los slugs (con updated_at si existe)
export async function getAllProductSlugs(): Promise<
  { slug: string; updatedAt: string | null; imageUrl: string | null }[]
> {
  const { data, error } = await supabase
    .from("products")
    .select("slug, updated_at, product_images(url, position)")
    .eq("is_visible", true)
    .range(0, 4999);
  if (error) {
    warnQuery("getAllProductSlugs", error);
    return [];
  }
  return (
    (data ?? []) as {
      slug: string;
      updated_at: string | null;
      product_images: { url: string; position: number }[];
    }[]
  ).map((r) => ({
    slug: r.slug,
    updatedAt: r.updated_at,
    imageUrl: r.product_images?.length
      ? rewriteMediaUrl(
          [...r.product_images].sort((a, b) => a.position - b.position)[0].url
        )
      : null,
  }));
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name")
    .range(0, 4999);
  if (error) {
    warnQuery("getAllCategorySlugs", error);
    return [];
  }
  return ((data ?? []) as { slug: string; name: string }[])
    .filter((c) => c.name !== "Todas las Categorías")
    .map((c) => c.slug);
}

export async function getBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("name")
    .order("name");
  if (error) {
    warnQuery("getBrands", error);
    return [];
  }
  return ((data ?? []) as { name: string | null }[])
    .map((b) => b.name)
    .filter((n): n is string => !!n);
}

export type CatalogSort = "relevancia" | "precio-asc" | "precio-desc" | "nombre" | "nuevos";
export type CatalogStock = "in" | "out" | "backorder";

export type CatalogParams = {
  page?: number;
  perPage?: number;
  category?: string; // slug
  brand?: string; // name
  sort?: CatalogSort;
  stock?: CatalogStock;
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
  const selectWithStockStatus = `
    id, woo_id, name, slug, sku, short_description,
    on_sale, in_stock, stock_status, stock_qty, price_crc, sale_price_crc,
    brand:brands${brandInner} ( name ),
    product_images ( url, alt, position ),
    product_categories${catInner} ( category:categories${catInner} ( id, name, slug ) )
  `;

  const selectLegacyStock = `
    id, woo_id, name, slug, sku, short_description,
    on_sale, in_stock, stock_qty, attributes, price_crc, sale_price_crc,
    brand:brands${brandInner} ( name ),
    product_images ( url, alt, position ),
    product_categories${catInner} ( category:categories${catInner} ( id, name, slug ) )
  `;

  let query = supabase
    .from("products")
    .select(selectWithStockStatus, { count: "exact" })
    .eq("is_visible", true);

  if (params.category) {
    query = query.eq("product_categories.category.slug", params.category);
  }
  if (params.brand) {
    query = query.eq("brand.name", params.brand);
  }
  if (params.stock === "in") {
    query = query.eq("stock_status", "in_stock");
  }
  if (params.stock === "out") {
    query = query.eq("stock_status", "out_of_stock");
  }
  if (params.stock === "backorder") {
    query = query.eq("stock_status", "backorder");
  }
  const needle = params.q?.trim();
  if (needle) {
    // Búsqueda por palabras clave: cada palabra debe aparecer en el nombre, el
    // SKU o la descripción. Se encierra cada valor en comillas dobles para que
    // los caracteres especiales (paréntesis, comas, etc.) sean LITERALES y no
    // rompan la sintaxis del filtro `or` de PostgREST.
    const words = needle
      .split(/\s+/)
      .map((w) => w.split('"').join("").trim())
      .filter(Boolean)
      .slice(0, 6);
    for (const w of words) {
      query = query.or(
        `name.ilike."%${w}%",sku.ilike."%${w}%",short_description.ilike."%${w}%"`
      );
    }
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

  let result = await query.range(from, to);
  if (result.error && isMissingStockStatusError(result.error)) {
    let legacyQuery = supabase
      .from("products")
      .select(selectLegacyStock, { count: "exact" })
      .eq("is_visible", true);

    if (params.category) {
      legacyQuery = legacyQuery.eq("product_categories.category.slug", params.category);
    }
    if (params.brand) {
      legacyQuery = legacyQuery.eq("brand.name", params.brand);
    }
    if (params.stock === "in") {
      legacyQuery = legacyQuery.eq("in_stock", true);
    }
    if (params.stock === "out") {
      legacyQuery = legacyQuery.eq("in_stock", false);
    }
    if (params.stock === "backorder") {
      legacyQuery = legacyQuery.eq("attributes->>icb_stock_status", "backorder");
    }
    if (needle) {
      const words = needle
        .split(/\s+/)
        .map((w) => w.split('"').join("").trim())
        .filter(Boolean)
        .slice(0, 6);
      for (const w of words) {
        legacyQuery = legacyQuery.or(
          `name.ilike."%${w}%",sku.ilike."%${w}%",short_description.ilike."%${w}%"`
        );
      }
    }

    switch (params.sort) {
      case "precio-asc":
        legacyQuery = legacyQuery.order("price_crc", { ascending: true });
        break;
      case "precio-desc":
        legacyQuery = legacyQuery.order("price_crc", { ascending: false });
        break;
      case "nuevos":
        legacyQuery = legacyQuery.order("created_at", { ascending: false });
        break;
      default:
        legacyQuery = legacyQuery.order("name", { ascending: true });
    }
    result = await legacyQuery.range(from, to);
  }
  const { data, count, error } = result;
  if (error) {
    warnQuery("getCatalogProducts", error);
    return { products: [], total: 0 };
  }
  return {
    products: (data as unknown as Row[]).map(rowToProduct),
    total: count ?? 0,
  };
}
