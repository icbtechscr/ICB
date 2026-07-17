import { supabase } from "./supabase";
import { rewriteMediaUrl } from "./image-url";

export type HeroContent = {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  bullets: string[];
  featuredProductId: string | null; // legacy (1 producto) — se migra a featuredProductIds
  featuredProductIds: string[]; // hasta 5 productos para el carrusel del hero
};

export type CategoryItem = {
  categoryId: string;
  nameOverride: string;
  imageUrl: string;
};

export type CategoriesContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: CategoryItem[];
};

export type ProductSectionContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  productIds: string[];
};

export type CtaContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
};

export type FooterColumn = {
  title: string;
  items: { label: string; href: string }[];
};

export type FooterContent = {
  description: string;
  locationsText: string;
  phone: string;
  email: string;
  facebook: string;
  instagram: string;
  youtube: string;
  newsletterTitle: string;
  newsletterSubtitle: string;
  columns: FooterColumn[];
};

// Botón de la barra de navegación.
// - `categorySlug`: categoría asignada al botón. Si se pone, el menú muestra
//   SUS SUBCATEGORÍAS automáticamente (cada una con su árbol).
// - `categorySlugs`: categorías sueltas extra que también se muestran como ramas.
// - Si no hay categorías, es un enlace simple a `href` (ej. Inicio, Ofertas).
export type NavbarItem = {
  id: string;
  label: string;
  href: string | null;
  categorySlug: string | null;
  categorySlugs: string[];
};
export type NavbarContent = { items: NavbarItem[] };

export const DEFAULT_NAVBAR_ITEMS: NavbarItem[] = [
  { id: "inicio", label: "Inicio", href: "/", categorySlug: null, categorySlugs: [] },
  { id: "computadoras", label: "Computadoras", href: null, categorySlug: "computadoras", categorySlugs: [] },
  { id: "seguridad", label: "Seguridad", href: null, categorySlug: "seguridad", categorySlugs: [] },
  { id: "redes", label: "Redes", href: null, categorySlug: "redes", categorySlugs: [] },
  { id: "pos", label: "POS", href: null, categorySlug: "punto-de-venta-pos", categorySlugs: [] },
  { id: "accesorios", label: "Accesorios", href: "/productos", categorySlug: null, categorySlugs: [] },
  { id: "ofertas", label: "Ofertas", href: "/ofertas", categorySlug: null, categorySlugs: [] },
];

// Normaliza items guardados (incluye migración de formatos anteriores).
export function normalizeNavbarItems(items: unknown): NavbarItem[] {
  if (!Array.isArray(items)) return DEFAULT_NAVBAR_ITEMS;
  return items.map((raw) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const slugs = Array.isArray(it.categorySlugs)
      ? (it.categorySlugs as unknown[]).filter(
          (s): s is string => typeof s === "string" && s.length > 0
        )
      : [];
    return {
      id: typeof it.id === "string" ? it.id : Math.random().toString(36).slice(2),
      label: typeof it.label === "string" ? it.label : "Botón",
      href: typeof it.href === "string" ? it.href : null,
      categorySlug:
        typeof it.categorySlug === "string" && it.categorySlug
          ? it.categorySlug
          : null,
      categorySlugs: slugs,
    };
  });
}

export type SiteContent = {
  hero: HeroContent;
  categories: CategoriesContent;
  ofertas: ProductSectionContent;
  destacados: ProductSectionContent;
  cta: CtaContent;
  footer: FooterContent;
  navbar: NavbarContent;
};

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    badge: "100% costarricense · +20 años en el mercado",
    titleLine1: "Tecnología que",
    titleLine2: "trabaja por vos.",
    subtitle:
      "Soluciones confiables, competitivas y de alta calidad. Computadoras, cámaras de vigilancia, redes, UPS y POS — con respaldo formal de fábrica.",
    primaryCtaLabel: "Ver catálogo",
    primaryCtaHref: "/productos",
    secondaryCtaLabel: "Ofertas activas",
    secondaryCtaHref: "/ofertas",
    bullets: ["Garantía oficial", "Envío rápido CR", "Soporte técnico"],
    featuredProductId: null,
    featuredProductIds: [],
  },
  categories: {
    eyebrow: "Catálogo",
    title: "Categorías de la tienda",
    subtitle: "Deslizá y explorá lo que tenemos para vos",
    items: [],
  },
  ofertas: {
    eyebrow: "Tiempo limitado",
    title: "Ofertas activas",
    subtitle: "Precios rebajados mientras dure el stock",
    productIds: [],
  },
  destacados: {
    eyebrow: "Lo más buscado",
    title: "Productos destacados",
    subtitle: "Equipos seleccionados por el equipo ICB",
    productIds: [],
  },
  cta: {
    eyebrow: "¿Necesitás asesoría?",
    title: "Hablemos de tu proyecto.",
    subtitle:
      "Diseñamos soluciones de videovigilancia, redes y punto de venta para empresas y comercios en todo Costa Rica.",
    primaryCtaLabel: "Contactanos",
    primaryCtaHref: "/contacto",
    secondaryCtaLabel: "Explorar catálogo",
    secondaryCtaHref: "/productos",
  },
  footer: {
    description:
      "Organización 100% costarricense con más de 20 años de experiencia en el comercio de tecnología. 5 sucursales + CEDI propio.",
    locationsText: "San José · Alajuela · Heredia · Cartago · Ciudad Quesada",
    phone: "+506 2222 3333",
    email: "info@icbtechscr.com",
    facebook: "#",
    instagram: "#",
    youtube: "#",
    newsletterTitle: "Mantente al día",
    newsletterSubtitle: "Ofertas exclusivas, lanzamientos y promociones cada semana.",
    columns: [
      {
        title: "Catálogo",
        items: [
          { label: "Computadoras", href: "/categoria/computadoras" },
          { label: "Componentes", href: "/categoria/componentes" },
          { label: "Cámaras de seguridad", href: "/categoria/camaras-de-vigilancia" },
          { label: "Redes", href: "/categoria/redes" },
          { label: "POS", href: "/categoria/punto-de-venta" },
          { label: "Ofertas", href: "/ofertas" },
        ],
      },
      {
        title: "Compañía",
        items: [
          { label: "Sobre ICB", href: "/sobre-nosotros" },
          { label: "Sucursales", href: "/sucursales" },
        ],
      },
      {
        title: "Soporte",
        items: [
          { label: "Contacto", href: "/contacto" },
          { label: "Política de Garantía, Cambios y Devoluciones", href: "/devoluciones" },
          { label: "Política de envíos", href: "/envios" },
          { label: "Términos y condiciones", href: "/terminos" },
        ],
      },
    ],
  },
  navbar: { items: DEFAULT_NAVBAR_ITEMS },
};

export const SECTION_KEYS = [
  "hero",
  "categories",
  "ofertas",
  "destacados",
  "cta",
  "footer",
  "navbar",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

function mergeSection<K extends SectionKey>(
  key: K,
  stored: Record<string, unknown> | undefined
): SiteContent[K] {
  if (!stored) return DEFAULT_CONTENT[key];
  return { ...DEFAULT_CONTENT[key], ...stored } as SiteContent[K];
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value");
    if (error) throw error;
    const map = new Map(
      (data ?? []).map((r) => [r.key as string, r.value as Record<string, unknown>])
    );
    const hero = mergeSection("hero", map.get("hero"));
    // Migración: si hay 1 producto legacy y no hay lista, usar la lista de 1.
    if (
      (!hero.featuredProductIds || hero.featuredProductIds.length === 0) &&
      hero.featuredProductId
    ) {
      hero.featuredProductIds = [hero.featuredProductId];
    }

    const categories = mergeSection("categories", map.get("categories"));
    // Reescribe las imágenes de categorías (legacy WordPress) al subdominio CDN.
    categories.items = (categories.items ?? []).map((it) => ({
      ...it,
      imageUrl: rewriteMediaUrl(it.imageUrl),
    }));
    return {
      hero,
      categories,
      ofertas: mergeSection("ofertas", map.get("ofertas")),
      destacados: mergeSection("destacados", map.get("destacados")),
      cta: mergeSection("cta", map.get("cta")),
      footer: mergeSection("footer", map.get("footer")),
      navbar: {
        items: normalizeNavbarItems(
          (map.get("navbar") as { items?: unknown } | undefined)?.items
        ),
      },
    };
  } catch {
    return DEFAULT_CONTENT;
  }
}
