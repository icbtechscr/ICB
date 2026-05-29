import rawCategories from "../../data/categories.json";

type RawCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
};

export type SubCategory = { name: string; slug: string; count: number };
export type NavItem = { label: string; href: string; children: SubCategory[] };

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

export function getNavMenu(): NavItem[] {
  return CURATED.map((item) => ({
    label: item.label,
    href: item.href,
    children: getChildren(item.parentWooId),
  }));
}
