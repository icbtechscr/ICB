"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

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
      : "border-ink-200 bg-white shadow-soft";

  return (
    <ul
      className={`relative mx-auto flex w-fit rounded-full border-2 p-1 transition-colors ${containerCls}`}
      onMouseLeave={() => {
        setPosition((p) => ({ ...p, opacity: 0 }));
        setHovered(null);
      }}
    >
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
        ? "text-accent-500"
        : "text-ink-700";

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
        className={`block cursor-pointer px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors md:px-5 md:py-2.5 md:text-sm ${textCls}`}
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
      className="absolute z-0 h-7 rounded-full bg-brand-600 shadow-lg shadow-brand-600/40 md:h-10"
    />
  );
}
