"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock, CreditCard } from "lucide-react";

// API real de Unified Checkout v1: VAS.UnifiedCheckout(sessionJwt)
type UCClient = {
  createCheckout: (opts?: { autoProcessing?: boolean }) => Promise<UCCheckout>;
  destroy: () => void;
};

type UCCheckout = {
  // mount con string = sidebar mode (buttons inline, payment screen en sidebar)
  // mount con {paymentSelection,paymentScreen} = embedded mode
  // mount() sin args = full sidebar
  // Devuelve un JWT con el resultado del pago (cuando autoProcessing=true).
  mount: (
    target?: string | { paymentSelection?: string; paymentScreen?: string }
  ) => Promise<string>;
  complete?: (transientToken: string) => Promise<string>;
  unmount: () => void;
  destroy: () => void;
};

type UCError = Error & { reason?: string };

declare global {
  interface Window {
    VAS?: {
      UnifiedCheckout: (sessionJwt: string) => Promise<UCClient>;
    };
  }
}

type Props = {
  sdkUrl: string;
  sdkIntegrity?: string | null;
  sessionJwt: string;
  onResult: (resultJwt: string) => void;
  onError: (err: string) => void;
};

const sdkPromises = new Map<string, Promise<void>>();

function loadSdk(url: string, integrity?: string | null) {
  if (typeof window === "undefined") return Promise.resolve();
  const cached = sdkPromises.get(url);
  if (cached) return cached;
  const p = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-cybs-sdk="${url}"]`
    );
    if (existing) {
      if (window.VAS) resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error(`No se pudo cargar el SDK de Unified Checkout: ${url}`))
        );
      }
      return;
    }
    const s = document.createElement("script");
    s.src = url;
    s.async = true;
    if (integrity) {
      s.integrity = integrity;
      s.crossOrigin = "anonymous";
    }
    s.dataset.cybsSdk = url;
    s.onload = () => resolve();
    s.onerror = () =>
      reject(new Error(`No se pudo cargar el SDK de Unified Checkout: ${url}`));
    document.head.appendChild(s);
  });
  sdkPromises.set(url, p);
  return p;
}

function describeError(e: unknown): string {
  if (!e) return "Error desconocido";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const direct =
      (obj.message as string | undefined) ??
      (obj.reason as string | undefined);
    if (direct) return String(direct);
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

export function UnifiedCheckout({
  sdkUrl,
  sdkIntegrity,
  sessionJwt,
  onResult,
  onError,
}: Props) {
  const initStartedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;
    let client: UCClient | null = null;
    let checkout: UCCheckout | null = null;

    (async () => {
      try {
        console.log("[UC] cargando SDK desde:", sdkUrl);
        await loadSdk(sdkUrl, sdkIntegrity);
        if (cancelled) return;
        if (!window.VAS?.UnifiedCheckout) {
          throw new Error(
            "El SDK se cargó pero no expone window.VAS.UnifiedCheckout"
          );
        }

        console.log("[UC] inicializando VAS.UnifiedCheckout…");
        client = await window.VAS.UnifiedCheckout(sessionJwt);
        if (cancelled) return;

        // autoProcessing=true (default cuando hay completeMandate en la session).
        // mount() devolverá un JWT con el pago ya procesado.
        console.log("[UC] createCheckout()…");
        checkout = await client.createCheckout();
        if (cancelled) return;

        setStatus("ready");

        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        const container = document.querySelector("#cybs-up-buttons");
        if (!container) {
          throw new Error("Contenedor #cybs-up-buttons no está en el DOM");
        }

        // Sidebar mode: buttons inline, payment screen como sidebar.
        // Por defecto este merchant solo soporta sidebar.
        console.log("[UC] mount('#cybs-up-buttons')…");
        const resultJwt = await checkout.mount("#cybs-up-buttons");
        console.log("[UC] mount() devolvió JWT (len):", resultJwt?.length);

        if (cancelled) return;
        if (typeof resultJwt === "string" && resultJwt.length > 0) {
          onResult(resultJwt);
        } else {
          onError(
            "El SDK no devolvió un JWT de resultado. Respuesta: " +
              JSON.stringify(resultJwt)
          );
        }
      } catch (e) {
        if (cancelled) return;
        const err = e as UCError;
        console.error("[UC] error:", err);
        if (err?.reason) console.error("[UC] reason:", err.reason);
        setStatus("error");
        onError(describeError(e));
      }
    })();

    return () => {
      cancelled = true;
      try {
        checkout?.destroy();
      } catch {}
      try {
        client?.destroy();
      } catch {}
    };
  }, [sdkUrl, sdkIntegrity, sessionJwt, onResult, onError]);

  return (
    <div className="space-y-4">
      {/* Header con marcas aceptadas */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-accent-300" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
            Pago con tarjeta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CardBrand label="VISA" />
          <CardBrand label="MC" />
          <CardBrand label="AMEX" />
        </div>
      </div>

      {/* Card del pago - fondo transparente */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-md">
        <div className="absolute right-0 top-0 size-32 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-brand-500/15 blur-3xl" />

        <div className="relative">
          <h4 className="mb-1 text-base font-black text-white">
            Listo para pagar de forma segura
          </h4>
          <p className="mb-5 text-sm text-white/70">
            Hacé clic en el botón abajo. Se abrirá la pasarela protegida de BAC
            Costa Rica donde podés ingresar los datos de tu tarjeta.
          </p>

          {status === "loading" && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-r-transparent" />
              Inicializando pasarela segura…
            </div>
          )}

          {/* Container donde UC monta el botón "Pay With Card" */}
          <div
            id="cybs-up-buttons"
            style={{ minHeight: status === "loading" ? 0 : 60 }}
          />

          <style jsx>{`
            :global(#cybs-up-buttons button) {
              width: 100% !important;
              background: linear-gradient(135deg, #00b87c 0%, #00d68f 100%) !important;
              color: #0a1f2c !important;
              border: none !important;
              border-radius: 9999px !important;
              padding: 14px 24px !important;
              font-weight: 800 !important;
              font-size: 14px !important;
              cursor: pointer !important;
              box-shadow: 0 10px 25px -10px rgba(0, 184, 124, 0.6) !important;
              transition: transform 0.15s, box-shadow 0.15s !important;
              text-transform: none !important;
              letter-spacing: 0.02em !important;
            }
            :global(#cybs-up-buttons button:hover) {
              transform: translateY(-1px);
              box-shadow: 0 15px 30px -10px rgba(0, 184, 124, 0.8) !important;
            }
            :global(#cybs-up-buttons button:active) {
              transform: translateY(0) scale(0.98);
            }
          `}</style>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <TrustBadge Icon={Lock} label="Encriptación SSL" />
        <TrustBadge Icon={ShieldCheck} label="3-D Secure" />
        <TrustBadge Icon={CreditCard} label="PCI DSS" />
      </div>

      <p className="text-center text-[10px] uppercase tracking-wider text-white/50">
        Procesado por Cybersource · BAC Credomatic Costa Rica
      </p>
    </div>
  );
}

function CardBrand({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-black tracking-wider text-ink-900 shadow">
      {label}
    </span>
  );
}

function TrustBadge({
  Icon,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 backdrop-blur-sm">
      <Icon className="size-3.5 text-accent-300" />
      <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">
        {label}
      </span>
    </div>
  );
}
