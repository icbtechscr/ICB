import rawCategories from "../../data/categories.json";
import { supabase } from "./supabase";
import {
  DEFAULT_NAVBAR_ITEMS,
  normalizeNavbarItems,
  type NavbarItem,
} from "./site-content";

type RawCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
};

export type SubCategory = { name: string; slug: string; count: number };
// Nodo del árbol de navegación: una subcategoría que puede tener sub-subcategorías.
export type NavSubNode = SubCategory & { children: NavSubNode[] };
export type NavItem = {
  label: string;
  href: string;
  children: NavSubNode[];
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
  { label: "Seguridad", href: "/categoria/seguridad", parentWooId: 58 },
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
    children: getChildren(item.parentWooId).map((c) => ({ ...c, children: [] })),
  }));
}

// Menú con subcategorías reales desde la base (jerarquía `parent_id`).
// Mantiene las pestañas curadas pero las subcategorías salen de la base.
// Si la jerarquía aún no está cargada (o falla la consulta), cae al JSON.
export async function getNavMenu(): Promise<NavItem[]> {
  try {
    const [{ data, error }, navSetting] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, parent_id, woo_id, product_categories(count)"),
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "navbar")
        .maybeSingle(),
    ]);
    if (error || !data) return navMenuFromJson();

    // Config de la navbar (desde el panel) o el default. Normaliza + migra.
    const stored = navSetting.data?.value as { items?: unknown } | undefined;
    const cfgItems: NavbarItem[] =
      Array.isArray(stored?.items) && stored.items.length > 0
        ? normalizeNavbarItems(stored.items)
        : DEFAULT_NAVBAR_ITEMS;

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

    // Árbol anidado de subcategorías (N niveles), todas (incluso vacías).
    const buildTree = (pid: string): NavSubNode[] =>
      (childRowsByParent.get(pid) ?? [])
        .map((r) => ({
          name: r.name,
          slug: r.slug,
          count: countOf(r),
          children: buildTree(r.id),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return cfgItems.map((it) => {
      const children: NavSubNode[] = [];
      const seen = new Set<string>();
      const pushRow = (row: Row | undefined) => {
        if (!row || seen.has(row.slug)) return;
        seen.add(row.slug);
        children.push({
          name: row.name,
          slug: row.slug,
          count: countOf(row),
          children: buildTree(row.id),
        });
      };
      // Categoría del botón → sus SUBCATEGORÍAS directas (cada una con su árbol).
      if (it.categorySlug) {
        const row = bySlug.get(it.categorySlug);
        if (row) for (const ch of childRowsByParent.get(row.id) ?? []) pushRow(ch);
      }
      // Categorías sueltas extra → cada una como rama.
      for (const slug of it.categorySlugs ?? []) pushRow(bySlug.get(slug));

      const href = it.href
        ? it.href
        : it.categorySlug
        ? `/categoria/${it.categorySlug}`
        : it.categorySlugs[0]
        ? `/categoria/${it.categorySlugs[0]}`
        : "#";
      return { label: it.label, href, children };
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
