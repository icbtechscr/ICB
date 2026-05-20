"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCRC } from "@/lib/utils";
import { BackgroundShader } from "@/components/ui/background-shader";

export default function CartPage() {
  const { items, subtotal, count, setQty, remove } = useCart();
  const tax = Math.round(subtotal * 0.13);
  const total = subtotal + tax;

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="brand" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="text-white">Carrito</span>
        </nav>

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight drop-shadow md:text-5xl">
              Tu carrito
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {count === 0
                ? "Aún no tenés productos"
                : `${count} ${count === 1 ? "producto" : "productos"} listo${count === 1 ? "" : "s"} para revisar`}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-3">
              {items.map((it, i) => (
                <motion.article
                  key={it.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="flex flex-col gap-4 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:p-5"
                >
                  <Link
                    href={`/productos/${it.slug}`}
                    className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white sm:size-28 sm:shrink-0"
                  >
                    {it.image ? (
                      <Image
                        src={it.image}
                        alt={it.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 112px"
                        className="object-contain p-3"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-ink-400">
                        Sin imagen
                      </div>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    {it.brand && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-300">
                        {it.brand}
                      </span>
                    )}
                    <Link
                      href={`/productos/${it.slug}`}
                      className="line-clamp-2 text-sm font-semibold text-white hover:text-accent-300"
                    >
                      {it.name}
                    </Link>
                    <div className="mt-2 text-xs text-white/60">
                      Precio unitario:{" "}
                      <span className="font-bold text-white">
                        {formatCRC(it.unitPrice)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <div className="inline-flex items-center rounded-full border border-white/25 bg-white/10 p-1 backdrop-blur">
                      <button
                        aria-label="Restar"
                        onClick={() => setQty(it.id, it.qty - 1)}
                        className="inline-flex size-8 items-center justify-center rounded-full text-white hover:bg-white/15"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-sm font-bold tabular-nums">
                        {it.qty}
                      </span>
                      <button
                        aria-label="Sumar"
                        onClick={() => setQty(it.id, it.qty + 1)}
                        className="inline-flex size-8 items-center justify-center rounded-full text-white hover:bg-white/15"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black tabular-nums text-white">
                        {formatCRC(it.qty * it.unitPrice)}
                      </div>
                      <button
                        onClick={() => remove(it.id)}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-white/60 hover:text-danger"
                      >
                        <Trash2 className="size-3" />
                        Quitar
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
                <h2 className="text-lg font-black">Resumen del pedido</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-white/10 pb-3">
                    <dt className="text-white/70">Subtotal</dt>
                    <dd className="font-semibold tabular-nums">{formatCRC(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-3">
                    <dt className="text-white/70">IVA (13%)</dt>
                    <dd className="font-semibold tabular-nums">{formatCRC(tax)}</dd>
                  </div>
                  <div className="flex justify-between border-b border-white/10 pb-3">
                    <dt className="text-white/70">Envío</dt>
                    <dd className="font-semibold text-accent-300">A calcular</dd>
                  </div>
                  <div className="flex items-end justify-between pt-2">
                    <dt className="text-sm font-bold">Total</dt>
                    <dd className="text-3xl font-black tabular-nums">
                      {formatCRC(total)}
                    </dd>
                  </div>
                </dl>

                <Link
                  href="/checkout"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-400 active:scale-95"
                >
                  Proceder al pago
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/productos"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-xs font-semibold text-white/85 transition hover:bg-white/15"
                >
                  Seguir comprando
                </Link>

                <p className="mt-4 text-center text-[11px] text-white/60">
                  Pago seguro · SINPE Móvil · Tarjeta · Cuotas
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/15 bg-white/10 p-10 text-center backdrop-blur-xl">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
        <ShoppingBag className="size-7 text-accent-300" />
      </div>
      <h2 className="mt-4 text-xl font-black">Carrito vacío</h2>
      <p className="mt-2 text-sm text-white/70">
        Explorá el catálogo y agregá productos que te interesen.
      </p>
      <Link
        href="/productos"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400"
      >
        Ver catálogo
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
