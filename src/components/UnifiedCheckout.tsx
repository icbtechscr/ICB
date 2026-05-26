"use client";

import { useEffect, useRef, useState } from "react";

// Tipos mínimos del SDK de Cybersource Unified Checkout (Accept).
type AcceptInstance = {
  unifiedPayments: (review?: boolean) => Promise<UnifiedPaymentsInstance>;
};

type UnifiedPaymentsInstance = {
  show: (opts: {
    containerSelector?: string;
    container?: string;
  }) => Promise<unknown>;
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

// Convierte cualquier cosa (Error, Object, string) en un mensaje legible.
function describeError(e: unknown): string {
  if (!e) return "Error desconocido";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const direct =
      (obj.message as string | undefined) ??
      (obj.error as string | undefined) ??
      (obj.reason as string | undefined) ??
      (obj.details as string | undefined);
    if (direct) return String(direct);
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

// Extrae el transient token de cualquier forma posible que devuelva el SDK.
function extractTransientToken(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === "string") return result; // a veces devuelve JWT pelado
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
  const containerRef = useRef<HTMLDivElement>(null);
  const initStartedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // Guardar contra doble-mount de React StrictMode.
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        await loadSdk(sdkUrl, sdkIntegrity);
        if (cancelled) return;
        if (!window.Accept) throw new Error("SDK de UC se cargó pero no expuso window.Accept");

        // Pequeño delay para que el contenedor esté en el DOM.
        await new Promise((r) => setTimeout(r, 0));
        if (!document.querySelector("#unified-checkout-container")) {
          throw new Error("Contenedor #unified-checkout-container no está en el DOM");
        }

        let accept: AcceptInstance;
        try {
          accept = await window.Accept(captureContext);
        } catch (e) {
          console.error("[UC] Accept(captureContext) falló:", e);
          throw new Error(`Accept() falló: ${describeError(e)}`);
        }

        let up: UnifiedPaymentsInstance;
        try {
          up = await accept.unifiedPayments();
        } catch (e) {
          console.error("[UC] accept.unifiedPayments() falló:", e);
          throw new Error(`unifiedPayments() falló: ${describeError(e)}`);
        }

        if (cancelled) return;
        setStatus("ready");

        let result: unknown;
        try {
          result = await up.show({ containerSelector: "#unified-checkout-container" });
        } catch (e) {
          console.error("[UC] up.show() falló:", e);
          throw new Error(`show() falló: ${describeError(e)}`);
        }
        if (cancelled) return;

        console.log("[UC] show() devolvió:", result);
        const tt = extractTransientToken(result);
        if (tt) {
          onToken(tt);
        } else {
          onError(
            "No se encontró transient token en la respuesta del SDK. Respuesta cruda: " +
              describeError(result)
          );
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[UC] error general:", e);
        setStatus("error");
        onError(describeError(e));
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
