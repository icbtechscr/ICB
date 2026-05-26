import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Cliente Cybersource / Unified Checkout (BAC Costa Rica)
// API correcta: /uc/v1/sessions + VAS.UnifiedCheckout SDK con autoProcessing.
// Autenticación: HTTP Signature (HMAC-SHA256).
// ---------------------------------------------------------------------------

type Env = "apitest" | "api";

function cfg() {
  const env = (process.env.CYBS_RUN_ENV ?? "apitest") as Env;
  const merchantId = process.env.CYBS_MERCHANT_ID;
  const keyId = process.env.CYBS_KEY_ID;
  const secretKey = process.env.CYBS_SECRET_KEY;
  if (!merchantId || !keyId || !secretKey) {
    throw new Error(
      "Cybersource no configurado: faltan CYBS_MERCHANT_ID / CYBS_KEY_ID / CYBS_SECRET_KEY"
    );
  }
  const host = env === "api" ? "api.cybersource.com" : "apitest.cybersource.com";
  return { env, merchantId, keyId, secretKey, host };
}

function sha256Base64(body: string) {
  return crypto.createHash("sha256").update(body, "utf8").digest("base64");
}

function hmacSha256Base64(message: string, secretBase64: string) {
  const key = Buffer.from(secretBase64, "base64");
  return crypto.createHmac("sha256", key).update(message, "utf8").digest("base64");
}

function gmtDate() {
  return new Date().toUTCString();
}

async function signedRequest(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown; raw: string }> {
  const { host, keyId, secretKey, merchantId } = cfg();
  const date = gmtDate();
  const bodyStr = body ? JSON.stringify(body) : "";

  const headers: Record<string, string> = {
    host,
    date,
    "v-c-merchant-id": merchantId,
  };

  const signedHeaderNames = ["host", "date", "(request-target)", "v-c-merchant-id"];

  if (method === "POST") {
    const digest = "SHA-256=" + sha256Base64(bodyStr);
    headers["digest"] = digest;
    signedHeaderNames.splice(3, 0, "digest");
  }

  const requestTarget = `${method.toLowerCase()} ${path}`;
  const signingString = signedHeaderNames
    .map((h) => (h === "(request-target)" ? `(request-target): ${requestTarget}` : `${h}: ${headers[h]}`))
    .join("\n");

  const signature = hmacSha256Base64(signingString, secretKey);

  const signatureHeader =
    `keyid="${keyId}", ` +
    `algorithm="HmacSHA256", ` +
    `headers="${signedHeaderNames.join(" ")}", ` +
    `signature="${signature}"`;

  const url = `https://${host}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...headers,
      Signature: signatureHeader,
      "User-Agent": "icb-tech-store/1.0",
      Accept: "application/json, application/jwt",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? bodyStr : undefined,
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  let data: unknown = text;
  if (contentType.includes("application/json")) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data, raw: text };
}

// ---------------------------------------------------------------------------
// Crear sesión (capture context) - endpoint /uc/v1/sessions
// ---------------------------------------------------------------------------

export type CreateSessionInput = {
  amountCRC: number;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
};

export async function createSession(input: CreateSessionInput): Promise<string> {
  const rawOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "").trim().replace(/\/$/, "");
  if (!rawOrigin) {
    throw new Error("NEXT_PUBLIC_SITE_ORIGIN no está definido");
  }
  if (!rawOrigin.startsWith("https://")) {
    throw new Error(
      `targetOrigin debe usar HTTPS. Recibido: "${rawOrigin}".`
    );
  }
  const origin = rawOrigin;

  const firstName = input.customer.name.split(" ")[0] || input.customer.name;
  const lastName = input.customer.name.split(" ").slice(1).join(" ") || input.customer.name;

  const body = {
    targetOrigins: [origin],
    clientVersion: "1.x",
    country: "CR",
    locale: "es_CR",
    allowedPaymentTypes: ["PANENTRY"],
    allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX"],
    // autoProcessing se activa automáticamente cuando hay completeMandate.
    // type "CAPTURE" = autoriza + captura inmediato (pago final, no solo hold).
    completeMandate: {
      type: "CAPTURE",
    },
    data: {
      clientReferenceInformation: {
        code: input.orderNumber,
      },
      orderInformation: {
        amountDetails: {
          totalAmount: input.amountCRC.toFixed(2),
          currency: "CRC",
        },
        billTo: {
          firstName,
          lastName,
          email: input.customer.email,
          phoneNumber: input.customer.phone ?? "",
          country: "CR",
          address1: input.customer.address ?? "S/N",
          buildingNumber: "S/N",
          locality: input.customer.locality || "San Jose",
          administrativeArea: input.customer.administrativeArea || "SJ",
          postalCode: input.customer.postalCode ?? "10101",
        },
      },
    },
  };

  const { status, data, raw } = await signedRequest("POST", "/uc/v1/sessions", body);
  if (status >= 200 && status < 300) {
    return typeof data === "string" ? data.trim() : raw.trim();
  }
  throw new Error(`Cybersource /uc/v1/sessions falló (${status}): ${raw}`);
}

// ---------------------------------------------------------------------------
// Decodificar JWT (sin verificar firma - para inspección del payload)
// ---------------------------------------------------------------------------

export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// Decodifica el sessionJWT y devuelve la URL del SDK y el integrity hash.
export function getSdkAssets(sessionJwt: string): {
  clientLibrary: string | null;
  clientLibraryIntegrity: string | null;
} {
  const payload = decodeJwtPayload(sessionJwt);
  if (!payload) return { clientLibrary: null, clientLibraryIntegrity: null };

  // El JWT de /uc/v1/sessions trae estos campos en distintos lugares según versión.
  // Buscamos en raíz y en ctx[0].data.
  const ctxArr = payload.ctx as Array<{ data?: Record<string, unknown> }> | undefined;
  const ctxData = ctxArr?.[0]?.data;

  const clientLibrary =
    (payload.clientLibrary as string | undefined) ??
    (ctxData?.clientLibrary as string | undefined) ??
    null;
  const clientLibraryIntegrity =
    (payload.clientLibraryIntegrity as string | undefined) ??
    (ctxData?.clientLibraryIntegrity as string | undefined) ??
    null;
  return { clientLibrary, clientLibraryIntegrity };
}

// ---------------------------------------------------------------------------
// Verificar el resultado de mount() — JWT con el pago completado por UC.
// Cuando autoProcessing=true + completeMandate=CAPTURE, UC procesa el pago y
// devuelve un JWT con processingInformation, paymentInformation y el status.
// ---------------------------------------------------------------------------

export type PaymentVerification = {
  ok: boolean;
  status: string;             // AUTHORIZED, DECLINED, etc.
  id?: string;                // payment id de Cybersource
  reasonCode?: string;
  message?: string;
  payload: Record<string, unknown> | null;
};

export function verifyMountResult(resultJwt: string): PaymentVerification {
  const payload = decodeJwtPayload(resultJwt);
  if (!payload) {
    return { ok: false, status: "INVALID_JWT", payload: null };
  }

  // El payload del JWT del resultado contiene el resultado del pago.
  // Estructura típica: { content: { processingInformation, paymentInformation, ... }, status, ... }
  const content = (payload.content as Record<string, unknown> | undefined) ?? payload;
  const status =
    (content.status as string | undefined) ??
    (payload.status as string | undefined) ??
    "";
  const reasonCode =
    (content.reasonCode as string | undefined) ??
    (payload.reasonCode as string | undefined);
  const message =
    (content.message as string | undefined) ??
    (payload.message as string | undefined);
  const id =
    (content.id as string | undefined) ??
    (payload.id as string | undefined);

  return {
    ok: status === "AUTHORIZED" || status === "PARTIAL_AUTHORIZED" || status === "PENDING" || status === "TRANSMITTED",
    status: status || "UNKNOWN",
    id,
    reasonCode,
    message,
    payload,
  };
}
