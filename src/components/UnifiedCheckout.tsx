"use client";

import { useEffect, useRef, useState } from "react";

// Tipos mínimos del SDK de Cybersource Unified Checkout (Accept).
// El SDK se carga dinámicamente desde `apps.test.cybersource.com` (o `apps.cybersource.com`
// en producción) y expone un global `Accept`.
type AcceptInstance = {
  unifiedPayments: () => Promise<{
    show: (opts: { containerSelector: string }) => Promise<{ transientToken: string }>;
  }>;
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

export function UnifiedCheckout({ sdkUrl, sdkIntegrity, captureContext, onToken, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSdk(sdkUrl, sdkIntegrity);
        if (cancelled || !window.Accept) throw new Error("SDK de UC no disponible");
        const accept = await window.Accept(captureContext);
        const up = await accept.unifiedPayments();
        if (cancelled) return;
        setStatus("ready");
        const result = await up.show({ containerSelector: "#unified-checkout-container" });
        if (cancelled) return;
        if (result?.transientToken) {
          onToken(result.transientToken);
        } else {
          onError("No se recibió el token de pago");
        }
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        onError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sdkUrl, sdkIntegrity, captureContext, onToken, onError]);

  return (
    <div>
      {status === "loading" && (
        <div className="flex items-center justify-center py-12 text-sm text-white/70">
          <span className="mr-3 size-5 animate-spin rounded-full border-2 border-white/40 border-r-transparent" />
          Cargando pasarela segura…
        </div>
      )}
      <div
        id="unified-checkout-container"
        ref={containerRef}
        className="min-h-[500px] rounded-2xl bg-white/95 p-2"
      />
      <p className="mt-3 text-[11px] text-white/60">
        Procesado por Cybersource · BAC Costa Rica · Datos cifrados en el navegador
      </p>
    </div>
  );
}
