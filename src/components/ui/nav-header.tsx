"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";

type Item = { label: string; href: string };
type Pos = { left: number; width: number; opacity: number };
type Variant = "transparent" | "solid";

export function NavHeader({
  items,
  variant = "transparent",
}: {
  items: Item[];
  variant?: Variant;
}) {
  const [position, setPosition] = useState<Pos>({ left: 0, width: 0, opacity: 0 });
  const [hovered, setHovered] = useState<string | null>(null);

  const containerCls =
    variant === "transparent"
      ? "border-white/30 bg-white/10 backdrop-blur-md"
      : "border-brand-800 bg-brand-800";

  return (
    <ul
      className={`relative mx-auto flex w-full max-w-7xl items-center gap-1 border px-1.5 py-1 transition-colors ${containerCls}`}
      onMouseLeave={() => {
        setPosition((p) => ({ ...p, opacity: 0 }));
        setHovered(null);
      }}
    >
      {variant === "solid" && (
        <li className="relative z-10 shrink-0">
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 rounded-sm bg-accent-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-accent-500"
          >
            <Menu className="size-4" />
            Categorías
          </Link>
        </li>
      )}
      {items.map((it) => (
        <Tab
          key={it.href}
          href={it.href}
          variant={variant}
          isHovered={hovered === it.href}
          onHover={(rect) => {
            setPosition({ width: rect.width, opacity: 1, left: rect.left });
            setHovered(it.href);
          }}
        >
          {it.label}
        </Tab>
      ))}
      <Cursor position={position} />
    </ul>
  );
}

function Tab({
  children,
  href,
  variant,
  isHovered,
  onHover,
}: {
  children: React.ReactNode;
  href: string;
  variant: Variant;
  isHovered: boolean;
  onHover: (rect: { width: number; left: number }) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const textCls =
    variant === "transparent"
      ? isHovered
        ? "text-accent-400"
        : "text-white"
      : isHovered
        ? "text-accent-300"
        : "text-white";

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;
        const { width } = ref.current.getBoundingClientRect();
        onHover({ width, left: ref.current.offsetLeft });
      }}
      className="relative z-10 block"
    >
      <Link
        href={href}
        className={`block cursor-pointer rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors md:px-4 md:py-2.5 ${textCls}`}
      >
        {children}
      </Link>
    </li>
  );
}

function Cursor({ position }: { position: Pos }) {
  return (
    <motion.li
      animate={position}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="absolute z-0 h-8 rounded-sm bg-brand-600/90 md:h-10"
    />
  );
}
