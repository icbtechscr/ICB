import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Check, ShieldCheck, Truck, Headphones, Heart } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getProductBySlug, getProductSlugs } from "@/lib/products";
import { formatCRC, decodeHtml } from "@/lib/utils";
import { parseKitDescription } from "@/lib/parseKit";
import { BackgroundShader } from "@/components/ui/background-shader";
import { ProductTabs } from "@/components/ProductTabs";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getProductSlugs(50);
  return slugs.map((slug) => ({ slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const kit = parseKitDescription(product.description);
  const fallbackDescription = !kit
    ? decodeHtml(
        product.description
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n\n")
          .replace(/<[^>]+>/g, "")
      ).trim()
    : "";

  const visibleCategories = product.categories.filter(
    (c) => c.name !== "Todas las Categorías"
  );

  return (
    <div className="relative isolate -mt-[88px] overflow-hidden pt-[88px] text-white md:-mt-[200px] md:pt-[200px]">
      <BackgroundShader palette="ocean" speed={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-white/80">
          <Link href="/" className="hover:text-accent-300">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <Link href="/productos" className="hover:text-accent-300">
            Catálogo
          </Link>
          <ChevronRight className="size-3.5 text-white/40" />
          <span className="line-clamp-1 text-white">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl md:p-8">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white">
              {product.images[0] ? (
                <Image
                  src={product.images[0].src}
                  alt={product.images[0].alt || product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-6"
                  priority
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-500">
                  Sin imagen
                </div>
              )}
              {product.onSale && product.salePriceCRC && (
                <div className="absolute left-4 top-4 rounded-full bg-danger px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                  -{Math.round((1 - product.salePriceCRC / product.priceCRC) * 100)}%
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="mt-4 grid grid-cols-5 gap-2">
                {product.images.slice(0, 5).map((img, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-white/20 bg-white"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || product.name}
                      fill
                      sizes="120px"
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl md:p-8">
            {product.brand && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-300">
                {product.brand}
              </span>
            )}
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight drop-shadow md:text-4xl">
              {product.name}
            </h1>
            {product.sku && (
              <p className="mt-2 text-xs text-white/70">
                SKU: <span className="font-mono text-white">{product.sku}</span>
              </p>
            )}

            <div className="mt-6 flex items-end gap-3 border-y border-white/15 py-5">
              {product.salePriceCRC ? (
                <>
                  <span className="text-4xl font-black tabular-nums text-accent-300 drop-shadow md:text-5xl">
                    {formatCRC(product.salePriceCRC)}
                  </span>
                  <span className="pb-2 text-lg text-white/50 line-through tabular-nums">
                    {formatCRC(product.priceCRC)}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-black tabular-nums text-white drop-shadow md:text-5xl">
                  {formatCRC(product.priceCRC)}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {product.inStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/40">
                  <Check className="size-3.5" />
                  En stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white/70 ring-1 ring-white/20">
                  Agotado
                </span>
              )}
            </div>

            {product.shortDescription && (
              <p className="mt-5 text-sm leading-relaxed text-white/80">
                {decodeHtml(product.shortDescription.replace(/<[^>]+>/g, ""))}
              </p>
            )}

            <div className="mt-7 flex items-stretch gap-2">
              <AddToCartButton
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.images[0]?.src ?? null,
                  brand: product.brand,
                  unitPrice: product.salePriceCRC ?? product.priceCRC,
                }}
                disabled={!product.inStock}
                className="flex-1"
              />
              <button
                aria-label="Favorito"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-colors hover:border-accent-400 hover:text-accent-300"
              >
                <Heart className="size-5" />
              </button>
            </div>

            <ul className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5 text-[11px] text-white/85">
              <li className="flex items-start gap-1.5">
                <Truck className="size-4 shrink-0 text-accent-400" />
                Sistema de envíos
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="size-4 shrink-0 text-accent-400" />
                Garantía con la marca y tienda
              </li>
              <li className="flex items-start gap-1.5">
                <Headphones className="size-4 shrink-0 text-accent-400" />
                Soporte ICB
              </li>
            </ul>

            {visibleCategories.length > 0 && (
              <div className="mt-6 border-t border-white/15 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                  Categorías
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleCategories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/categoria/${c.slug}`}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur transition-colors hover:bg-accent-500 hover:text-ink-900"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-10">
          <ProductTabs
            tabs={[
              {
                id: "desc",
                label: "Descripción",
                content: kit ? (
                  <KitTableBlock kit={kit} />
                ) : fallbackDescription ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-white/85">
                    {fallbackDescription}
                  </p>
                ) : (
                  <p className="text-sm text-white/70">
                    Sin descripción disponible. Contactanos para más información.
                  </p>
                ),
              },
              {
                id: "specs",
                label: "Especificaciones",
                content: <SpecsBlock product={product} />,
              },
              {
                id: "warranty",
                label: "Garantía & envío",
                content: <WarrantyBlock />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function KitTableBlock({ kit }: { kit: { header: string[]; rows: string[][] } }) {
  return (
    <div>
      <p className="mb-4 text-sm text-white/75">
        Este producto es un kit. Incluye los siguientes componentes:
      </p>
      <div className="overflow-x-auto rounded-2xl border border-white/15">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/10 text-left text-xs font-bold uppercase tracking-wider text-accent-300">
              {kit.header.map((h, i) => (
                <th key={i} className="px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kit.rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-white/10 transition-colors hover:bg-white/5"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 align-top ${
                      j === 0 ? "font-mono text-xs text-accent-300" : "text-white/85"
                    } ${j === row.length - 1 ? "text-right font-bold tabular-nums text-white" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpecsBlock({
  product,
}: {
  product: Awaited<ReturnType<typeof getProductBySlug>>;
}) {
  if (!product) return null;
  const rows: [string, string | null][] = [
    ["Marca", product.brand],
    ["SKU", product.sku],
    ["Disponibilidad", product.inStock ? "En stock" : "Agotado"],
    [
      "Precio regular",
      product.priceCRC ? formatCRC(product.priceCRC) : null,
    ],
    [
      "Precio oferta",
      product.salePriceCRC ? formatCRC(product.salePriceCRC) : null,
    ],
    [
      "Categorías",
      product.categories
        .filter((c) => c.name !== "Todas las Categorías")
        .map((c) => c.name)
        .join(", ") || null,
    ],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between border-b border-white/10 pb-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-white/60">
            {k}
          </dt>
          <dd className="text-right text-sm font-medium text-white">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function WarrantyBlock() {
  const items = [
    {
      Icon: ShieldCheck,
      title: "Garantía oficial",
      desc: "Todos nuestros productos cuentan con respaldo de fábrica. Cambios y soporte en sitio para clientes empresariales.",
    },
    {
      Icon: Truck,
      title: "Envío a todo Costa Rica",
      desc: "Despacho 24-48h en GAM y 2-4 días al resto del país. Recogida gratuita en sucursal disponible.",
    },
    {
      Icon: Headphones,
      title: "Soporte técnico ICB",
      desc: "Equipo de ingenieros disponible para instalación, configuración y mantenimiento preventivo.",
    },
  ];
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {items.map(({ Icon, title, desc }) => (
        <div
          key={title}
          className="rounded-2xl border border-white/15 bg-white/5 p-5 transition-colors hover:border-accent-400/40 hover:bg-white/10"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-500/20 text-accent-300 ring-1 ring-accent-400/30">
            <Icon className="size-5" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-white">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-white/70">{desc}</p>
        </div>
      ))}
    </div>
  );
}
