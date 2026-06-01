import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Check, ShieldCheck, Truck, Headphones, Heart } from "lucide-react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getProductBySlug, getProductSlugs } from "@/lib/products";
import { formatCRC, decodeHtml, stripHtml } from "@/lib/utils";
import { parseKitDescription } from "@/lib/parseKit";
import { ProductTabs } from "@/components/ProductTabs";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getProductSlugs(50);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto no encontrado" };

  const desc =
    stripHtml(product.shortDescription) ||
    stripHtml(product.description).slice(0, 160) ||
    `${product.name} disponible en ICB Tech Costa Rica.`;
  const img = product.images[0]?.src;
  const url = absoluteUrl(`/productos/${product.slug}`);

  return {
    title: product.name,
    description: desc.slice(0, 160),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: product.name,
      description: desc.slice(0, 160),
      url,
      siteName: SITE_NAME,
      images: img ? [{ url: img }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: desc.slice(0, 160),
      images: img ? [img] : undefined,
    },
  };
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

  const price = product.salePriceCRC ?? product.priceCRC;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((i) => i.src),
    description:
      stripHtml(product.shortDescription) ||
      stripHtml(product.description).slice(0, 300),
    sku: product.sku ?? undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/productos/${product.slug}`),
      priceCurrency: "CRC",
      price: price > 0 ? price : undefined,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:pb-24">
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs font-medium text-ink-500">
          <Link href="/" className="hover:text-brand-600">
            Inicio
          </Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <Link href="/productos" className="hover:text-brand-600">
            Catálogo
          </Link>
          <ChevronRight className="size-3.5 text-ink-300" />
          <span className="line-clamp-1 text-ink-900">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-ink-200 bg-white p-4 shadow-sm md:p-8">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white">
              {product.images[0] ? (
                <Image
                  src={product.images[0].src}
                  alt={product.images[0].alt || product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-6"
                  priority
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
                    className="relative aspect-square overflow-hidden rounded-xl border border-ink-200 bg-white"
                  >
                    <Image
                      src={img.src}
                      alt={img.alt || product.name}
                      fill
                      sizes="120px"
                      className="object-contain p-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-ink-200 bg-white p-6 shadow-sm md:p-8">
            {product.brand && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-700">
                {product.brand}
              </span>
            )}
            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-ink-900 md:text-4xl">
              {product.name}
            </h1>
            {product.sku && (
              <p className="mt-2 text-xs text-ink-500">
                SKU: <span className="font-mono text-ink-700">{product.sku}</span>
              </p>
            )}

            <div className="mt-6 flex items-end gap-3 border-y border-ink-200 py-5">
              {product.salePriceCRC ? (
                <>
                  <span className="text-4xl font-black tabular-nums text-accent-700 md:text-5xl">
                    {formatCRC(product.salePriceCRC)}
                  </span>
                  <span className="pb-2 text-lg text-ink-400 line-through tabular-nums">
                    {formatCRC(product.priceCRC)}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-black tabular-nums text-ink-900 md:text-5xl">
                  {formatCRC(product.priceCRC)}
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {product.inStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <Check className="size-3.5" />
                  En stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-sm font-semibold text-ink-500 ring-1 ring-ink-200">
                  Agotado
                </span>
              )}
            </div>

            {product.shortDescription && (
              <p className="mt-5 text-sm leading-relaxed text-ink-600">
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
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 transition-colors hover:border-accent-500 hover:text-accent-600"
              >
                <Heart className="size-5" />
              </button>
            </div>

            <ul className="mt-6 grid grid-cols-3 gap-3 border-t border-ink-200 pt-5 text-[11px] text-ink-600">
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
              <div className="mt-6 border-t border-ink-200 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                  Categorías
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleCategories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/categoria/${c.slug}`}
                      className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 transition-colors hover:bg-accent-500 hover:text-ink-900"
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
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
                    {fallbackDescription}
                  </p>
                ) : (
                  <p className="text-sm text-ink-500">
                    Sin descripción disponible. Contactanos para más información.
                  </p>
                ),
              },
              {
                id: "specs",
                label: "Especificaciones",
                content: <SpecsBlock product={product} />,
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
      <p className="mb-4 text-sm text-ink-500">
        Este producto es un kit. Incluye los siguientes componentes:
      </p>
      <div className="overflow-x-auto rounded-2xl border border-ink-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-900 text-left text-xs font-bold uppercase tracking-wider text-accent-400">
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
                className="border-t border-ink-200 transition-colors hover:bg-ink-50"
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-3 align-top ${
                      j === 0 ? "font-mono text-xs text-brand-600" : "text-ink-600"
                    } ${j === row.length - 1 ? "text-right font-bold tabular-nums text-ink-900" : ""}`}
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
        <div key={k} className="flex items-start justify-between border-b border-ink-200 pb-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            {k}
          </dt>
          <dd className="text-right text-sm font-medium text-ink-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

