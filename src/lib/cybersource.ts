import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Cliente Cybersource / Unified Checkout (BAC Costa Rica)
// Autenticación: HTTP Signature (HMAC-SHA256) — el estándar que documenta
// Cybersource para integraciones server-to-server.
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

/**
 * Realiza una llamada firmada a Cybersource y devuelve la respuesta parseada.
 * Si la respuesta es 2xx pero contiene application/jwt (capture context) la
 * devuelve como string. Si es JSON la devuelve como objeto.
 */
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
    // Insert "digest" right after "(request-target)" — order de firma estable.
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
// Capture Context — JWT que se le pasa al SDK del frontend para renderizar
// el iframe de Unified Checkout.
// ---------------------------------------------------------------------------

export type CaptureContextInput = {
  amountCRC: number;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    locality?: string;        // cantón / ciudad
    administrativeArea?: string; // provincia (ej. "SJ")
    postalCode?: string;
  };
};

export async function createCaptureContext(input: CaptureContextInput): Promise<string> {
  const rawOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "").trim().replace(/\/$/, "");
  if (!rawOrigin) {
    throw new Error("NEXT_PUBLIC_SITE_ORIGIN no está definido");
  }
  if (!rawOrigin.startsWith("https://")) {
    throw new Error(
      `targetOrigin debe usar HTTPS. Recibido: "${rawOrigin}". Usá ngrok o 'next dev --experimental-https'.`
    );
  }
  const origin = rawOrigin;

  const body = {
    clientVersion: "0.23",
    targetOrigins: [origin],
    allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX"],
    allowedPaymentTypes: ["PANENTRY"],
    country: "CR",
    locale: "es_CR",
    captureMandate: {
      billingType: "FULL",
      requestEmail: true,
      requestPhone: true,
      requestShipping: false,
      shipToCountries: ["CR"],
      showAcceptedNetworkIcons: true,
    },
    orderInformation: {
      amountDetails: {
        totalAmount: input.amountCRC.toFixed(2),
        currency: "CRC",
      },
      billTo: {
        firstName: input.customer.name.split(" ")[0] ?? input.customer.name,
        lastName:
          input.customer.name.split(" ").slice(1).join(" ") || input.customer.name,
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
  };

  const { status, data, raw } = await signedRequest("POST", "/up/v1/capture-contexts", body);
  if (status >= 200 && status < 300) {
    // Cybersource devuelve el JWT como texto plano (application/jwt).
    return typeof data === "string" ? data.trim() : raw.trim();
  }
  throw new Error(`Cybersource capture-context falló (${status}): ${raw}`);
}

// ---------------------------------------------------------------------------
// Procesar el pago usando el transient token devuelto por Unified Checkout.
// Si UC ya ejecutó 3-D Secure, los datos vienen embebidos en el TT.
// ---------------------------------------------------------------------------

export type ProcessPaymentInput = {
  transientTokenJwt: string;
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

export type PaymentResult = {
  ok: boolean;
  status: string;             // AUTHORIZED, DECLINED, etc.
  id?: string;                // payment id de Cybersource
  reasonCode?: string;
  message?: string;
  raw: unknown;
};

export async function processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
  const body = {
    clientReferenceInformation: {
      code: input.orderNumber,
    },
    processingInformation: {
      capture: true,
      commerceIndicator: "internet",
    },
    tokenInformation: {
      transientTokenJwt: input.transientTokenJwt,
    },
    orderInformation: {
      amountDetails: {
        totalAmount: input.amountCRC.toFixed(2),
        currency: "CRC",
      },
      billTo: {
        firstName: input.customer.name.split(" ")[0] ?? input.customer.name,
        lastName:
          input.customer.name.split(" ").slice(1).join(" ") || input.customer.name,
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
  };

  const { status, data, raw } = await signedRequest("POST", "/pts/v2/payments", body);

  const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const cybsStatus = String(obj.status ?? "");
  const reasonCode = obj.reasonCode as string | undefined;
  const message = (obj.message as string | undefined) ?? (obj.errorInformation as { message?: string } | undefined)?.message;

  return {
    ok: status >= 200 && status < 300 && (cybsStatus === "AUTHORIZED" || cybsStatus === "PARTIAL_AUTHORIZED"),
    status: cybsStatus || `HTTP_${status}`,
    id: obj.id as string | undefined,
    reasonCode,
    message,
    raw: typeof data === "object" ? data : raw,
  };
}

// Decodifica el payload del JWT (sin verificar firma, lo hace el SDK del navegador).
// Devuelve el campo `clientLibrary` (URL del SDK) y `clientLibraryIntegrity` (SRI).
export function decodeCaptureContext(jwt: string): {
  clientLibrary: string | null;
  clientLibraryIntegrity: string | null;
} {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return { clientLibrary: null, clientLibraryIntegrity: null };
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payloadB64 + "=".repeat((4 - (payloadB64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    const obj = JSON.parse(json) as {
      ctx?: Array<{ data?: { clientLibrary?: string; clientLibraryIntegrity?: string } }>;
      clientLibrary?: string;
      clientLibraryIntegrity?: string;
    };
    const fromCtx = obj.ctx?.[0]?.data;
    return {
      clientLibrary: fromCtx?.clientLibrary ?? obj.clientLibrary ?? null,
      clientLibraryIntegrity: fromCtx?.clientLibraryIntegrity ?? obj.clientLibraryIntegrity ?? null,
    };
  } catch {
    return { clientLibrary: null, clientLibraryIntegrity: null };
  }
}
