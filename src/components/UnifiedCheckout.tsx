"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock, CreditCard } from "lucide-react";

// Tipos mínimos del SDK de Cybersource Unified Checkout (Accept).
type AcceptInstance = {
  unifiedPayments: (review?: boolean) => Promise<UnifiedPaymentsInstance>;
};

type UnifiedPaymentsInstance = {
  show: (opts: Record<string, unknown>) => Promise<unknown>;
};

declare global {
  interface Window {
    Accept?: (captureContext: string) => Promise<AcceptInstance>;
  }
}

type Props = {
  sdkUrl: string;
  sdkIntegrity?: string | null;
  captureContext: string;
  onToken: (transientToken: string) => void;
  onError: (err: string) => void;
};

const sdkPromises = new Map<string, Promise<void>>();

function loadSdk(url: string, integrity?: string | null) {
  if (typeof window === "undefined") return Promise.resolve();
  const cached = sdkPromises.get(url);
  if (cached) return cached;
  const p = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-cybs-sdk="${url}"]`);
    if (existing) {
      if (window.Accept) resolve();
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
      (obj.error as string | undefined) ??
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

function extractTransientToken(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    return (
      (obj.transientToken as string | undefined) ??
      (obj.transientTokenJwt as string | undefined) ??
      (obj.token as string | undefined) ??
      null
    );
  }
  return null;
}

export function UnifiedCheckout({
  sdkUrl,
  sdkIntegrity,
  captureContext,
  onToken,
  onError,
}: Props) {
  const initStartedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        await loadSdk(sdkUrl, sdkIntegrity);
        if (cancelled) return;
        if (!window.Accept) throw new Error("SDK de UC se cargó pero no expuso window.Accept");

        await new Promise((r) => setTimeout(r, 0));
        if (!document.querySelector("#cybs-up-selection")) {
          throw new Error("Contenedor #cybs-up-selection no está en el DOM");
        }

        const accept = await window.Accept(captureContext);
        const up = await accept.unifiedPayments();
        if (cancelled) return;
        setStatus("ready");

        await new Promise<void>((r) => requestAnimationFrame(() => r()));

        const result = await up.show({
          containers: { paymentSelection: "#cybs-up-selection" },
        });
        if (cancelled) return;

        const tt = extractTransientToken(result);
        if (tt) {
          onToken(tt);
        } else {
          onError("No se recibió el token de pago");
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[UC] error:", e);
        setStatus("error");
        onError(describeError(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdkUrl, sdkIntegrity, captureContext, onToken, onError]);

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

      {/* Card del pago con el botón de UC dentro — fondo transparente */}
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

          {/* Loading state */}
          {status === "loading" && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-r-transparent" />
              Inicializando pasarela segura…
            </div>
          )}

          {/* Container donde UC monta su botón "Pay With Card" */}
          <div
            id="cybs-up-selection"
            className="cybs-container"
            style={{ minHeight: status === "loading" ? 0 : 60 }}
          />

          {/* Estilos para que el botón inyectado por UC se vea integrado */}
          <style jsx>{`
            :global(#cybs-up-selection button) {
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
            :global(#cybs-up-selection button:hover) {
              transform: translateY(-1px);
              box-shadow: 0 15px 30px -10px rgba(0, 184, 124, 0.8) !important;
            }
            :global(#cybs-up-selection button:active) {
              transform: translateY(0) scale(0.98);
            }
          `}</style>
        </div>
      </div>

      {/* Trust badges */}
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
