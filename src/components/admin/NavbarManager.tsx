"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Menu,
} from "lucide-react";
import type { NavbarItem } from "@/lib/site-content";

type CatOption = { slug: string; name: string; parentId: string | null; id: string };

export function NavbarManager({
  initialItems,
  categories,
}: {
  initialItems: NavbarItem[];
  categories: CatOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<NavbarItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Opciones de categoría indentadas (todos los niveles) para el selector.
  const catOptions = useMemo(() => {
    const out: { slug: string; label: string }[] = [];
    const walk = (pid: string | null, depth: number) => {
      categories
        .filter((c) => c.parentId === pid)
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((c) => {
          out.push({ slug: c.slug, label: `${"— ".repeat(depth)}${c.name}` });
          walk(c.id, depth + 1);
        });
    };
    walk(null, 0);
    return out;
  }, [categories]);

  function update(i: number, patch: Partial<NavbarItem>) {
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  }
  function move(i: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, j) => j !== i));
  }
  function add() {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "Nuevo botón",
        categorySlug: null,
        href: "/",
      },
    ]);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    // Limpieza: cada botón es categoría O enlace.
    const clean = items
      .map((it) => ({
        id: it.id,
        label: it.label.trim() || "Sin nombre",
        categorySlug: it.categorySlug || null,
        href: it.categorySlug ? null : it.href || "/",
      }))
      .filter((it) => it.categorySlug || it.href);
    try {
      const res = await fetch("/api/admin/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "navbar", value: { items: clean } }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ ok: true, text: "Navbar guardada. Recargá la tienda para verla." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6">
      <div className="mb-1 flex items-center gap-2">
        <Menu className="size-5 text-brand-600" />
        <h3 className="text-base font-bold text-ink-900">Botones de la barra</h3>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        Elegí qué categorías y enlaces aparecen en la barra de navegación, en qué
        orden. Si un botón es una categoría, su megamenú muestra las
        subcategorías y marcas automáticamente.
      </p>

      {msg && (
        <div
          className={`mb-4 rounded-xl border px-4 py-2.5 text-sm ${
            msg.ok
              ? "border-accent-200 bg-accent-50 text-accent-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="space-y-2">
        {items.map((it, i) => {
          const isCategory = !!it.categorySlug;
          return (
            <div
              key={it.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 bg-ink-50/40 p-2.5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-ink-400 hover:text-brand-600 disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="text-ink-400 hover:text-brand-600 disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <input
                value={it.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Etiqueta"
                className="w-32 rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500"
              />

              <select
                value={isCategory ? "category" : "link"}
                onChange={(e) =>
                  e.target.value === "category"
                    ? update(i, { categorySlug: catOptions[0]?.slug ?? "", href: null })
                    : update(i, { categorySlug: null, href: it.href || "/" })
                }
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 [&>option]:text-ink-900"
              >
                <option value="category">Categoría</option>
                <option value="link">Enlace</option>
              </select>

              {isCategory ? (
                <select
                  value={it.categorySlug ?? ""}
                  onChange={(e) => update(i, { categorySlug: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 [&>option]:text-ink-900"
                >
                  {catOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={it.href ?? ""}
                  onChange={(e) => update(i, { href: e.target.value })}
                  placeholder="/ofertas"
                  className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2.5 py-2 font-mono text-sm outline-none focus:border-brand-500"
                />
              )}

              <button
                type="button"
                onClick={() => remove(i)}
                title="Quitar"
                className="inline-flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-300 px-4 py-2 text-sm font-semibold text-ink-600 hover:border-brand-500 hover:text-brand-600"
        >
          <Plus className="size-4" />
          Agregar botón
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar navbar
        </button>
      </div>
    </div>
  );
}
