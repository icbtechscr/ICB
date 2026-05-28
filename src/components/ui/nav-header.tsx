"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, ChevronDown } from "lucide-react";
import type { NavItem } from "@/lib/category-tree";

export function NavHeader({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const active = items.find((i) => i.href === open && i.children.length > 0);

  return (
    <ul
      className="relative mx-auto flex w-full max-w-7xl items-center gap-1 px-1.5 py-1"
      onMouseLeave={() => setOpen(null)}
    >
      <li className="relative z-10 shrink-0">
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 rounded-sm bg-accent-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-500"
        >
          <Menu className="size-4" />
          Categorías
        </Link>
      </li>

      {items.map((it) => {
        const hasChildren = it.children.length > 0;
        const isOpen = open === it.href;
        return (
          <li
            key={it.href}
            className="relative z-10"
            onMouseEnter={() => setOpen(it.href)}
          >
            <Link
              href={it.href}
              className={`inline-flex items-center gap-1 rounded-sm px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors md:px-4 ${
                isOpen && hasChildren ? "text-accent-300" : "text-white hover:text-accent-300"
              }`}
            >
              {it.label}
              {hasChildren && <ChevronDown className="size-3 opacity-70" aria-hidden />}
            </Link>
          </li>
        );
      })}

      {active && (
        <div className="absolute inset-x-0 top-full z-50 pt-px">
          <div className="rounded-b-md border border-t-0 border-ink-200 bg-white p-5 shadow-xl">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-400">
              {active.label}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 md:grid-cols-3 lg:grid-cols-4">
              {active.children.map((c) => (
                <Link
                  key={c.slug}
                  href={`/categoria/${c.slug}`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-brand-600"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 text-[11px] text-ink-400">{c.count}</span>
                </Link>
              ))}
            </div>
            <Link
              href={active.href}
              className="mt-3 inline-block text-xs font-bold uppercase tracking-wide text-brand-600 transition-colors hover:text-brand-700"
            >
              Ver todo →
            </Link>
          </div>
        </div>
      )}
    </ul>
  );
}
