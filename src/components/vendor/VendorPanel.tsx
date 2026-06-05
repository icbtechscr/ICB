/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Megaphone,
  Check,
  X,
  Upload,
  Loader2,
  ExternalLink,
  Link2,
  Unlink,
  AlertCircle,
  ImagePlus,
} from "lucide-react";
import { formatCRC } from "@/lib/utils";

export type VendorProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  priceCRC: number;
  salePriceCRC: number | null;
  shortDescription: string;
  images: string[];
};

type Post = {
  id: string;
  productName: string | null;
  permalink: string | null;
  title: string | null;
  imageUrl: string | null;
  status: string;
  error: string | null;
  createdAt: string;
};

type Props = {
  employeeName: string;
  products: VendorProduct[];
  connection: { pageName: string; fbUserName: string | null } | null;
  fbConfigured: boolean;
  initialPosts: Post[];
  siteOrigin: string;
};

const ERRORS: Record<string, string> = {
  fb_not_configured: "Facebook todavía no está configurado por el administrador.",
  fb_cancelled: "Conexión cancelada.",
  fb_no_code: "Facebook no devolvió el código de acceso.",
  fb_bad_state: "La sesión de conexión expiró. Probá de nuevo.",
  fb_no_pages: "No encontramos Páginas que administres en esa cuenta de Facebook.",
  fb_exception: "Hubo un error al conectar con Facebook.",
};

export function VendorPanel({
  employeeName,
  products,
  connection,
  fbConfigured,
  initialPosts,
  siteOrigin,
}: Props) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<VendorProduct | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const justConnected = params.get("connected") === "1";
  const errorCode = params.get("error");
  const errorDetail = params.get("detail");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-ink-900">
          <Megaphone className="size-6 text-brand-600" />
          Vender en Facebook
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Hola {employeeName || "vendedor"}, elegí un producto y publicalo en tu
          Página. Luego lo compartís en los grupos que quieras.
        </p>
      </div>

      {/* Banners de estado tras conectar */}
      {justConnected && (
        <Banner kind="ok">
          ¡Facebook conectado! Ya podés publicar productos en tu Página.
        </Banner>
      )}
      {errorCode && (
        <Banner kind="error">
          {ERRORS[errorCode] ?? "Ocurrió un error."}
          {errorDetail ? ` (${decodeURIComponent(errorDetail)})` : ""}
        </Banner>
      )}

      {/* Tarjeta de conexión */}
      <ConnectionCard connection={connection} fbConfigured={fbConfigured} />

      {/* Buscador */}
      <div className="mb-4 mt-8">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto por nombre o marca…"
            className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500"
          />
        </div>
        <p className="mt-1.5 text-xs text-ink-400">
          {filtered.length} producto{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Grilla de productos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft"
          >
            <div className="relative aspect-square overflow-hidden bg-[#fff]">
              {p.images[0] ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="size-full object-contain p-3 transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-ink-400">
                  Sin foto
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-3">
              {p.brand && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                  {p.brand}
                </span>
              )}
              <span className="line-clamp-2 text-xs font-semibold text-ink-800">
                {p.name}
              </span>
              <span className="mt-auto pt-2 text-sm font-black text-accent-700">
                {formatCRC(p.salePriceCRC ?? p.priceCRC)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Historial */}
      {posts.length > 0 && <History posts={posts} />}

      {/* Modal de composición */}
      {active && (
        <ComposeModal
          product={active}
          siteOrigin={siteOrigin}
          canPublish={!!connection}
          onClose={() => setActive(null)}
          onPublished={(post) => {
            setPosts((prev) => [post, ...prev]);
            setActive(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Banner({
  kind,
  children,
}: {
  kind: "ok" | "error";
  children: React.ReactNode;
}) {
  const ok = kind === "ok";
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        ok
          ? "border-accent-200 bg-accent-50 text-accent-800"
          : "border-danger/30 bg-danger/10 text-danger"
      }`}
    >
      {ok ? (
        <Check className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}

function ConnectionCard({
  connection,
  fbConfigured,
}: {
  connection: { pageName: string; fbUserName: string | null } | null;
  fbConfigured: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/vendor/facebook/disconnect", { method: "POST" });
      window.location.href = "/vendedor";
    } finally {
      setBusy(false);
    }
  }

  if (connection) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#1877F2] text-white">
            <Link2 className="size-5" />
          </span>
          <div>
            <p className="text-sm font-black text-ink-900">{connection.pageName}</p>
            <p className="text-xs text-ink-500">
              Conectado{connection.fbUserName ? ` por ${connection.fbUserName}` : ""} ·
              tus publicaciones salen acá
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={disconnect}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-50 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Unlink className="size-3.5" />}
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50 p-5 text-center">
      <span className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#1877F2] text-white">
        <Link2 className="size-6" />
      </span>
      <h3 className="text-base font-black text-ink-900">
        Conectá tu Página de Facebook
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
        Para publicar productos necesitás vincular una Página que administres.
        Lo hacés una sola vez.
      </p>
      {fbConfigured ? (
        <a
          href="/api/vendor/facebook/login"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
        >
          <Link2 className="size-4" />
          Conectar con Facebook
        </a>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
          La conexión con Facebook todavía no está activada por el administrador.
        </p>
      )}
    </div>
  );
}

function History({ posts }: { posts: Post[] }) {
  return (
    <div className="mt-10">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-ink-700">
        Tus publicaciones recientes
      </h2>
      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center gap-3 rounded-xl border border-ink-200 bg-white p-2.5"
          >
            {post.imageUrl ? (
              <img
                src={post.imageUrl}
                alt=""
                className="size-12 shrink-0 rounded-lg object-contain bg-[#fff]"
              />
            ) : (
              <div className="size-12 shrink-0 rounded-lg bg-ink-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-800">
                {post.title || post.productName || "Publicación"}
              </p>
              <p className="text-xs text-ink-400">
                {new Date(post.createdAt).toLocaleString("es-CR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            {post.status === "published" && post.permalink ? (
              <a
                href={post.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
              >
                Ver <ExternalLink className="size-3" />
              </a>
            ) : (
              <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-bold uppercase text-danger">
                Error
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function buildDefaultMessage(p: VendorProduct, siteOrigin: string): string {
  const price = p.salePriceCRC ?? p.priceCRC;
  const url = `${siteOrigin}/productos/${p.slug}`;
  const lines: string[] = [p.name];
  if (p.shortDescription) lines.push("", p.shortDescription);
  lines.push("", `💰 Precio: ${formatCRC(price)}`);
  if (p.salePriceCRC && p.salePriceCRC < p.priceCRC) {
    lines.push("🔥 ¡En oferta!");
  }
  lines.push("", `🛒 Pedilo aquí: ${url}`, "", "📍 ICB Technologies Costa Rica");
  return lines.join("\n");
}

function ComposeModal({
  product,
  siteOrigin,
  canPublish,
  onClose,
  onPublished,
}: {
  product: VendorProduct;
  siteOrigin: string;
  canPublish: boolean;
  onClose: () => void;
  onPublished: (post: Post) => void;
}) {
  const [title, setTitle] = useState(product.name);
  const [message, setMessage] = useState(() =>
    buildDefaultMessage(product, siteOrigin)
  );
  const [images, setImages] = useState<string[]>(product.images);
  const [selected, setSelected] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedImage = images[selected];

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/vendor/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir la imagen");
      setImages((prev) => {
        const next = [...prev, data.url as string];
        setSelected(next.length - 1);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function publish() {
    if (!selectedImage) {
      setError("Elegí o subí una imagen.");
      return;
    }
    setError(null);
    setPublishing(true);
    try {
      const res = await fetch("/api/vendor/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          title,
          message,
          imageUrl: selectedImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo publicar");
      onPublished({
        id: crypto.randomUUID(),
        productName: product.name,
        permalink: data.permalink ?? null,
        title,
        imageUrl: selectedImage,
        status: "published",
        error: null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-3xl border border-ink-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h3 className="text-base font-black text-ink-900">
            Publicar producto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-2">
          {/* Editor */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-600">
              Título (referencia interna)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
            />

            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-600">
              Texto de la publicación
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="mb-4 w-full resize-y rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-brand-500"
            />

            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-600">
              Imagen
            </label>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`relative size-16 overflow-hidden rounded-lg border-2 bg-[#fff] ${
                    selected === i ? "border-brand-500" : "border-ink-200"
                  }`}
                >
                  <img src={src} alt="" className="size-full object-contain p-1" />
                  {selected === i && (
                    <span className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="size-2.5" />
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex size-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink-300 text-ink-400 hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImagePlus className="size-4" />
                )}
                <span className="text-[9px] font-bold">Subir</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onUpload}
              />
            </div>
          </div>

          {/* Preview tipo Facebook */}
          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-600">
              Vista previa
            </p>
            <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
              <div className="flex items-center gap-2 p-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#1877F2] text-sm font-black text-white">
                  ICB
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">Tu Página</p>
                  <p className="text-[11px] text-ink-400">Ahora · 🌎</p>
                </div>
              </div>
              <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-ink-800">
                {message}
              </p>
              {selectedImage && (
                <img
                  src={selectedImage}
                  alt=""
                  className="w-full bg-[#fff] object-contain"
                  style={{ maxHeight: 280 }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-200 px-6 py-4">
          {error && (
            <p className="mb-3 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}
          {!canPublish && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Primero conectá tu Página de Facebook (arriba) para poder publicar.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={publishing || !canPublish}
              className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Publicar en mi Página
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
