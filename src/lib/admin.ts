import { createAdminClient } from "./supabase";

export type AdminProduct = {
  id: string;
  woo_id: number | null;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  price_crc: number;
  sale_price_crc: number | null;
  on_sale: boolean;
  in_stock: boolean;
  stock_qty: number | null;
  brand_id: string | null;
  brand?: { id: string; name: string } | null;
  product_images: { id: string; url: string; alt: string | null; position: number }[];
  product_categories: { category: { id: string; name: string; slug: string } | null }[];
  created_at?: string;
  updated_at?: string;
};

const SELECT = `
  id, woo_id, name, slug, sku, short_description, description,
  price_crc, sale_price_crc, on_sale, in_stock, stock_qty, brand_id, created_at, updated_at,
  brand:brands ( id, name ),
  product_images ( id, url, alt, position ),
  product_categories ( category:categories ( id, name, slug ) )
`;

export async function adminListProducts(opts: {
  page?: number;
  perPage?: number;
  q?: string;
  onSale?: boolean;
  outOfStock?: boolean;
}): Promise<{ products: AdminProduct[]; total: number }> {
  const sb = createAdminClient();
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 25;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = sb
    .from("products")
    .select(SELECT, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  const q = opts.q?.trim();
  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,slug.ilike.%${q}%`);
  }
  if (opts.onSale) query = query.eq("on_sale", true);
  if (opts.outOfStock) query = query.eq("in_stock", false);

  const { data, error, count } = await query;
  if (error) throw error;
  return { products: (data ?? []) as unknown as AdminProduct[], total: count ?? 0 };
}

export async function adminGetProduct(id: string): Promise<AdminProduct | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("products")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as AdminProduct) ?? null;
}

export async function adminListBrands(): Promise<{ id: string; name: string; slug: string }[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("brands").select("id, name, slug").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function adminListCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const sb = createAdminClient();
  const { data, error } = await sb.from("categories").select("id, name, slug").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function adminStats(): Promise<{
  productCount: number;
  onSaleCount: number;
  outOfStockCount: number;
}> {
  const sb = createAdminClient();
  const [{ count: productCount }, { count: onSaleCount }, { count: outOfStockCount }] =
    await Promise.all([
      sb.from("products").select("id", { count: "exact", head: true }),
      sb.from("products").select("id", { count: "exact", head: true }).eq("on_sale", true),
      sb.from("products").select("id", { count: "exact", head: true }).eq("in_stock", false),
    ]);
  return {
    productCount: productCount ?? 0,
    onSaleCount: onSaleCount ?? 0,
    outOfStockCount: outOfStockCount ?? 0,
  };
}

export type ProductWritePayload = {
  name: string;
  slug: string;
  sku?: string | null;
  short_description?: string | null;
  description?: string | null;
  price_crc: number;
  sale_price_crc?: number | null;
  on_sale?: boolean;
  in_stock?: boolean;
  stock_qty?: number | null;
  brand_id?: string | null;
  category_ids?: string[];
  images?: { url: string; alt?: string | null; position?: number }[];
};

export async function adminCreateProduct(payload: ProductWritePayload): Promise<string> {
  const sb = createAdminClient();
  const { category_ids, images, ...row } = payload;
  const insertRow = {
    ...row,
    on_sale: row.on_sale ?? false,
    in_stock: row.in_stock ?? true,
    sale_price_crc: row.sale_price_crc || null,
  };
  const { data, error } = await sb.from("products").insert(insertRow).select("id").single();
  if (error) throw error;
  const id = data.id as string;

  if (category_ids?.length) {
    const rows = category_ids.map((cid) => ({ product_id: id, category_id: cid }));
    const { error: e2 } = await sb.from("product_categories").insert(rows);
    if (e2) throw e2;
  }
  if (images?.length) {
    const rows = images.map((img, i) => ({
      product_id: id,
      url: img.url,
      alt: img.alt ?? null,
      position: img.position ?? i,
    }));
    const { error: e3 } = await sb.from("product_images").insert(rows);
    if (e3) throw e3;
  }
  return id;
}

export async function adminUpdateProduct(
  id: string,
  payload: Partial<ProductWritePayload>
): Promise<void> {
  const sb = createAdminClient();
  const { category_ids, images, ...row } = payload;
  const updateRow: Record<string, unknown> = { ...row, updated_at: new Date().toISOString() };
  if ("sale_price_crc" in row) {
    updateRow.sale_price_crc = row.sale_price_crc || null;
  }
  const { error } = await sb.from("products").update(updateRow).eq("id", id);
  if (error) throw error;

  if (category_ids) {
    await sb.from("product_categories").delete().eq("product_id", id);
    if (category_ids.length) {
      const rows = category_ids.map((cid) => ({ product_id: id, category_id: cid }));
      const { error: e2 } = await sb.from("product_categories").insert(rows);
      if (e2) throw e2;
    }
  }

  if (images) {
    await sb.from("product_images").delete().eq("product_id", id);
    if (images.length) {
      const rows = images.map((img, i) => ({
        product_id: id,
        url: img.url,
        alt: img.alt ?? null,
        position: img.position ?? i,
      }));
      const { error: e3 } = await sb.from("product_images").insert(rows);
      if (e3) throw e3;
    }
  }
}

export async function adminDeleteProduct(id: string): Promise<void> {
  const sb = createAdminClient();
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) throw error;
}
