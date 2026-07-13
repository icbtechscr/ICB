"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };
type CatNode = {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
};

const SORTS: Option[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "nombre", label: "Nombre (A-Z)" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nuevos", label: "Más nuevos" },
];

export function CatalogFilters({
  categories,
  categoryTree = [],
  brands,
}: {
  categories: { slug: string; name: string }[];
  categoryTree?: CatNode[];
  brands: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const cat = params.get("cat") ?? "";
  const brand = params.get("brand") ?? "";
  const sort = params.get("sort") ?? "relevancia";
  const stock = params.get("stock") ?? "";
  const active =
    (cat ? 1 : 0) +
    (brand ? 1 : 0) +
    (stock ? 1 : 0) +
    (sort !== "relevancia" ? 1 : 0);

  const useTree = categoryTree.length > 0;

  // Con árbol: resolver qué categoría/subcategoría está activa según `cat`.
  const selectedParent =
    categoryTree.find((n) => n.slug === cat) ??
    categoryTree.find((n) => n.children.some((c) => c.slug === cat)) ??
    null;
  const parentSlug = selectedParent?.slug ?? "";
  const childSlug =
    selectedParent && selectedParent.children.some((c) => c.slug === cat)
      ? cat
      : "";
  const subOptions = selectedParent?.children ?? [];

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // reset paginación
    router.push(`/productos?${next.toString()}`);
  }

  function onParentChange(slug: string) {
    // Al cambiar la categoría, el filtro pasa a esa categoría (sin subcategoría).
    update("cat", slug);
  }
  function onChildChange(slug: string) {
    // Si elige subcategoría, filtra por ella; si la limpia, vuelve al padre.
    update("cat", slug || parentSlug);
  }

  const selectCls =
    "rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-900 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:text-ink-900";

  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
      >
        <SlidersHorizontal className="size-4" />
        Filtros y orden
        {active > 0 && (
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
            {active}
          </span>
        )}
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-200 bg-ink-50 p-4">
          {useTree ? (
            <>
              <select
                value={parentSlug}
                onChange={(e) => onParentChange(e.target.value)}
                className={selectCls}
                aria-label="Categoría"
              >
                <option value="">Todas las categorías</option>
                {categoryTree.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </select>

              <select
                value={childSlug}
                onChange={(e) => onChildChange(e.target.value)}
                className={selectCls}
                aria-label="Subcategoría"
                disabled={!selectedParent || subOptions.length === 0}
              >
                <option value="">
                  {!selectedParent
                    ? "Todas las subcategorías"
                    : subOptions.length === 0
                    ? "Sin subcategorías"
                    : "Todas las subcategorías"}
                </option>
                {subOptions.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <select
              value={cat}
              onChange={(e) => update("cat", e.target.value)}
              className={selectCls}
              aria-label="Categoría"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={brand}
            onChange={(e) => update("brand", e.target.value)}
            className={selectCls}
            aria-label="Marca"
          >
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={stock}
            onChange={(e) => update("stock", e.target.value)}
            className={selectCls}
            aria-label="Disponibilidad"
          >
            <option value="">Toda disponibilidad</option>
            <option value="in">En stock</option>
            <option value="out">Agotados</option>
          </select>

          <select
            value={sort}
            onChange={(e) => update("sort", e.target.value)}
            className={selectCls}
            aria-label="Ordenar"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {active > 0 && (
            <button
              type="button"
              onClick={() => {
                // Conserva la búsqueda (q) al limpiar categoría/marca/orden.
                const q = params.get("q");
                router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-white"
            >
              <X className="size-3.5" />
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
