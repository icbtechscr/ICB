"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

type Option = { value: string; label: string };

const SORTS: Option[] = [
  { value: "relevancia", label: "Relevancia" },
  { value: "nombre", label: "Nombre (A-Z)" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nuevos", label: "Más nuevos" },
];

export function CatalogFilters({
  categories,
  brands,
}: {
  categories: { slug: string; name: string }[];
  brands: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const cat = params.get("cat") ?? "";
  const brand = params.get("brand") ?? "";
  const sort = params.get("sort") ?? "relevancia";
  const hasFilters = !!cat || !!brand || sort !== "relevancia";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // reset paginación
    router.push(`/productos?${next.toString()}`);
  }

  const selectCls =
    "rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white outline-none backdrop-blur-md transition focus:border-accent-400 [&>option]:text-ink-900";

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80">
        <SlidersHorizontal className="size-4" />
        Filtrar
      </span>

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

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/productos")}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/15"
        >
          <X className="size-3.5" />
          Limpiar
        </button>
      )}
    </div>
  );
}
