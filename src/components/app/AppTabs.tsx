"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, Megaphone } from "lucide-react";

const TABS = [
  { href: "/marcar", label: "Marcar hora", Icon: Clock },
  { href: "/vendedor", label: "Vender en Facebook", Icon: Megaphone },
];

export function AppTabs() {
  const pathname = usePathname() ?? "";
  return (
    <div className="mb-6 flex gap-2 rounded-2xl border border-ink-200 bg-ink-50 p-1.5">
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-ink-600 hover:bg-white hover:text-ink-900"
            }`}
          >
            <Icon className="size-4" />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
