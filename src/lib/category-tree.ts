import rawCategories from "../../data/categories.json";
import { supabase } from "./supabase";

type RawCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
};

export type SubCategory = { name: string; slug: string; count: number };
export type NavItem = {
  label: string;
  href: string;
  children: SubCategory[];
  brands: string[];
};

const CATEGORIES = rawCategories as RawCategory[];

function decodeHtml(s: string): string {
  return (s ?? "")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// Group children by their parent woo id.
const childrenByParent = new Map<number, RawCategory[]>();
for (const c of CATEGORIES) {
  if (!childrenByParent.has(c.parent)) childrenByParent.set(c.parent, []);
  childrenByParent.get(c.parent)!.push(c);
}

function getChildren(parentWooId: number | null, limit = 10): SubCategory[] {
  if (parentWooId == null) return [];
  return (childrenByParent.get(parentWooId) ?? [])
    .filter((c) => c.count > 0 && c.name !== "Todas las Categorías")
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((c) => ({ name: decodeHtml(c.name), slug: c.slug, count: c.count }));
}

// Curated top-level navigation. `parentWooId` is the WooCommerce parent id used
// to look up the subcategories shown on hover (mega menu).
const CURATED: { label: string; href: string; parentWooId: number | null }[] = [
  { label: "Inicio", href: "/", parentWooId: null },
  { label: "Computadoras", href: "/categoria/computadoras", parentWooId: 51 },
  { label: "Seguridad", href: "/categoria/camaras-de-vigilancia", parentWooId: 58 },
  { label: "Redes", href: "/categoria/redes", parentWooId: 62 },
  { label: "POS", href: "/categoria/punto-de-venta-pos", parentWooId: 55 },
  { label: "Accesorios", href: "/productos", parentWooId: 195 },
  { label: "Ofertas", href: "/ofertas", parentWooId: null },
];

// Menú desde el JSON legado de WooCommerce (fallback).
function navMenuFromJson(): NavItem[] {
  return CURATED.map((item) => ({
    label: item.label,
    href: item.href,
    children: getChildren(item.parentWooId),
    brands: [],
  }));
}

// Menú con subcategorías reales desde la base (jerarquía `parent_id`).
// Mantiene las pestañas curadas pero las subcategorías salen de la base.
// Si la jerarquía aún no está cargada (o falla la consulta), cae al JSON.
export async function getNavMenu(): Promise<NavItem[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, woo_id, product_categories(count)");
    if (error || !data) return navMenuFromJson();

    type Row = {
      id: string;
      name: string;
      slug: string;
      parent_id: string | null;
      woo_id: number | null;
      product_categories: { count: number }[];
    };
    const rows = data as unknown as Row[];
    const countOf = (r: Row) => r.product_categories?.[0]?.count ?? 0;

    // El submenú se arma con la jerarquía REAL de la base (parent_id),
    // emparejando cada pestaña curada por su SLUG (no por woo_id, que quedó
    // desfasado al administrar categorías desde el panel).
    const bySlug = new Map<string, Row>();
    for (const r of rows) bySlug.set(r.slug, r);

    const childRowsByParent = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.parent_id) continue;
      if (!childRowsByParent.has(r.parent_id)) childRowsByParent.set(r.parent_id, []);
      childRowsByParent.get(r.parent_id)!.push(r);
    }

    const slugFromHref = (href: string): string | null => {
      const m = href.match(/^\/categoria\/(.+)$/);
      return m ? m[1] : null;
    };

    // Mapear cada categoría relevante (pestañas curadas + sus hijas) a su pestaña,
    // para juntar las marcas de los productos de cada rama.
    const catToTab = new Map<string, string>();
    for (const item of CURATED) {
      const slug = slugFromHref(item.href);
      const row = slug ? bySlug.get(slug) : undefined;
      if (!row) continue;
      catToTab.set(row.id, row.id);
      for (const ch of childRowsByParent.get(row.id) ?? []) catToTab.set(ch.id, row.id);
    }

    // Marcas por pestaña (de los productos de la categoría + subcategorías).
    const brandsByTab = new Map<string, Set<string>>();
    try {
      const ids = [...catToTab.keys()];
      if (ids.length) {
        const { data: pcb } = await supabase
          .from("product_categories")
          .select("category_id, product:products(brand:brands(name))")
          .in("category_id", ids);
        const brandRows =
          (pcb ?? []) as unknown as {
            category_id: string;
            product: { brand: { name: string } | null } | null;
          }[];
        for (const r of brandRows) {
          const tab = catToTab.get(r.category_id);
          const name = r.product?.brand?.name;
          if (!tab || !name) continue;
          if (!brandsByTab.has(tab)) brandsByTab.set(tab, new Set());
          brandsByTab.get(tab)!.add(name);
        }
      }
    } catch {
      // si falla, el menú igual sale sin marcas
    }

    return CURATED.map((item) => {
      const slug = slugFromHref(item.href);
      const row = slug ? bySlug.get(slug) : undefined;
      // TODAS las subcategorías (incluso vacías), ordenadas por nombre.
      const dbChildren = row
        ? (childRowsByParent.get(row.id) ?? [])
            .map((c) => ({ name: c.name, slug: c.slug, count: countOf(c) }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
      const children = dbChildren.length
        ? dbChildren
        : getChildren(item.parentWooId);
      const brands = row
        ? [...(brandsByTab.get(row.id) ?? [])].sort((a, b) => a.localeCompare(b))
        : [];
      return { label: item.label, href: item.href, children, brands };
    });
  } catch {
    return navMenuFromJson();
  }
}

// Para slugs que son categorías "padre" sin página propia (ej. "redes"):
// devuelve el nombre y los slugs de sus subcategorías para juntar sus productos.
export function getCategoryGroup(
  slug: string
): { name: string; childSlugs: string[] } | null {
  const item = CURATED.find(
    (c) => c.href === `/categoria/${slug}` && c.parentWooId != null
  );
  if (!item) return null;
  const children = getChildren(item.parentWooId, 100);
  if (!children.length) return null;
  return { name: item.label, childSlugs: children.map((c) => c.slug) };
}
