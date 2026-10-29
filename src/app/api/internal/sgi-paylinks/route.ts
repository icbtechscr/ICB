import { createAdminClient } from "@/lib/supabase";
import { createSession, getSdkAssets, lookupTransactionByOrderNumber, type CybersourceSandbox } from "@/lib/cybersource";
import { verifySgiPaylinkRequest } from "@/lib/sgi-paylink-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
async function bounded(request: Request) {
  if (request.headers.get("content-type") !== "application/json" || Number(request.headers.get("content-length")) > 1024) throw Error("body");
  const reader = request.body?.getReader();if (!reader) throw Error("body");
  let size = 0;const parts: Uint8Array[] = [];
  try { for (;;) { const { value, done } = await reader.read();if (done) break;size += value.byteLength;if (size > 1024) { await reader.cancel();throw Error("body"); }parts.push(value); } } finally { reader.releaseLock(); }
  return Buffer.concat(parts).toString("utf8");
}
export async function POST(request: Request) {
  const mode = process.env.SGI_PAYLINK_BRIDGE_MODE;
  if (mode !== "sandbox" && mode !== "live_pilot") return json({ error: "Servicio desactivado." }, 503);
  try {
    const body = await bounded(request);
    const bridgeSecret = process.env[mode === "live_pilot" ? "SGI_PAYLINK_LIVE_BRIDGE_SECRET" : "SGI_PAYLINK_BRIDGE_SECRET"] || "";
    if (!verifySgiPaylinkRequest(body, request.headers.get("x-sgi-time"), request.headers.get("x-sgi-signature"), bridgeSecret, Date.now(), mode)) return json({ error: "No autorizado." }, 401);
    const input = JSON.parse(body);
    if (!input || Object.keys(input).some(key => !["action", "attemptId"].includes(key)) || !["session", "confirm"].includes(input.action) || typeof input.attemptId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(input.attemptId)) return json({ error: "Solicitud inválida." }, 400);
    const live = mode === "live_pilot";
    if (live && process.env.CYBS_RUN_ENV !== "api") return json({ error: "Entorno productivo no disponible." }, 503);
    const sandbox: CybersourceSandbox = { merchantId: process.env[live ? "CYBS_MERCHANT_ID" : "SGI_CYBS_SANDBOX_MERCHANT_ID"] || "", keyId: process.env[live ? "CYBS_KEY_ID" : "SGI_CYBS_SANDBOX_KEY_ID"] || "", secretKey: process.env[live ? "CYBS_SECRET_KEY" : "SGI_CYBS_SANDBOX_SECRET_KEY"] || "", origin: "https://sgi.icbtechscr.com", mode };
    if (!sandbox.merchantId || !sandbox.keyId || !sandbox.secretKey) return json({ error: "Faltan credenciales del entorno seleccionado." }, 503);
    const db = createAdminClient();
    // The ledger, not the service request, fixes reference, amount, customer and currency.
    const name = input.action === "session" ? "sgi_paylink_dispatch" : "sgi_paylink_bridge_read";
    const { data: attempt, error } = await db.rpc(name, { p_attempt: input.attemptId, ...(input.action === "session" ? { p_mode: mode } : {}) }).abortSignal(AbortSignal.timeout(10000));
    if (error || !attempt || attempt.mode !== mode || !/^SGIPL-[a-f0-9]{32}$/.test(attempt.reference) || !/^\d{1,12}\.\d{2}$/.test(attempt.amount)) return json({ error: "Intento no disponible. Consultá su estado antes de repetir." }, 409);
    if (input.action === "session") {
      const sessionJwt = await createSession({ amountCRC: Number(attempt.amount), orderNumber: attempt.reference, targetOrigin: sandbox.origin, customer: { name: attempt.customer.name, email: attempt.customer.email } }, sandbox);
      const assets = getSdkAssets(sessionJwt);
      if (!assets.clientLibrary || new URL(assets.clientLibrary).origin !== (live ? "https://api.cybersource.com" : "https://apitest.cybersource.com") || !assets.clientLibraryIntegrity || !/^sha(?:256|384|512)-[A-Za-z0-9+/]+=*$/.test(assets.clientLibraryIntegrity)) return json({ error: "Respuesta de checkout no válida. No repitas el intento." }, 503);
      return json({ sessionJwt, sdkUrl: assets.clientLibrary, sdkIntegrity: assets.clientLibraryIntegrity, mode });
    }
    const evidence = await lookupTransactionByOrderNumber(attempt.reference, true, undefined, sandbox);
    // Projection excludes raw provider payload, card details and customer data.
    const reference = (evidence.payload?.clientReferenceInformation as { code?: unknown } | undefined)?.code;
    return json({ mode, evidence: { found: evidence.found, ok: evidence.ok && !evidence.multipleCaptures, id: evidence.id, amount: evidence.amount, currency: evidence.currency, status: evidence.status, reasonCode: evidence.reasonCode, reference, captured: evidence.ok } });
  } catch { return json({ error: "No se confirmó la operación. Consultá el estado antes de repetir." }, 503); }
}
