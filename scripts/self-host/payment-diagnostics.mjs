// Diagnóstico sin tarjetas ni cobros. --session solo crea un contexto de SDK.
import crypto from "node:crypto";
const host = process.env.CYBS_RUN_ENV === "api" ? "api.cybersource.com" : "apitest.cybersource.com";
const merchant = process.env.CYBS_MERCHANT_ID;
const key = process.env.CYBS_KEY_ID;
const secret = process.env.CYBS_SECRET_KEY;
if (!merchant || !key || !secret) throw Error("Faltan credenciales del proveedor");
const session = process.argv.includes("--session");
const path = session ? "/uc/v1/sessions" : "/tss/v2/searches";
const body = JSON.stringify(session ? {
  targetOrigins: [process.env.NEXT_PUBLIC_SITE_ORIGIN], country: "CR", locale: "es_CR",
  allowedPaymentTypes: ["PANENTRY"], allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX"], completeMandate: { type: "CAPTURE" },
  data: { clientReferenceInformation: { code: `ICB-DIAGNOSTIC-${Date.now()}` }, orderInformation: {
    amountDetails: { totalAmount: "1.00", currency: "CRC" },
    billTo: { firstName: "Diagnostico", lastName: "SinCobro", email: "diagnostico@example.invalid", country: "CR", address1: "San Jose", locality: "San Jose", administrativeArea: "SJ", postalCode: "10101" }
  } }
} : { save: false, name: "ICB diagnostico sin cobros", timezone: "America/Costa_Rica", query: "submitTimeUtc:[NOW-7DAYS TO NOW]", offset: 0, limit: 10, sort: "submitTimeUtc:desc" });
const date = new Date().toUTCString();
const digest = "SHA-256=" + crypto.createHash("sha256").update(body).digest("base64");
const signature = crypto.createHmac("sha256", Buffer.from(secret, "base64"))
  .update(`host: ${host}\ndate: ${date}\n(request-target): post ${path}\ndigest: ${digest}\nv-c-merchant-id: ${merchant}`).digest("base64");
const res = await fetch(`https://${host}${path}`, { method: "POST", body, signal: AbortSignal.timeout(20000), headers: {
  host, date, digest, "v-c-merchant-id": merchant, "Content-Type": "application/json",
  Signature: `keyid="${key}", algorithm="HmacSHA256", headers="host date (request-target) digest v-c-merchant-id", signature="${signature}"`
} });
const raw = await res.text();
if (!res.ok) {
  let error; try { error = JSON.parse(raw); } catch { error = {}; }
  console.log(JSON.stringify({ environment: process.env.CYBS_RUN_ENV, check: session ? "session" : "search", httpStatus: res.status,
    reason: error.reason ?? error.errorInformation?.reason, message: error.message ?? error.errorInformation?.message,
    fields: error.details?.map(x => ({ field: x.field, reason: x.reason })) }));
  process.exitCode = 1;
} else if (session) {
  const p = JSON.parse(Buffer.from(raw.trim().split(".")[1], "base64url"));
  const data = p.ctx?.[0]?.data ?? p;
  console.log(JSON.stringify({ check: "session", httpStatus: res.status, sdk: data.clientLibrary ?? p.clientLibrary,
    integrityPresent: Boolean(data.clientLibraryIntegrity ?? p.clientLibraryIntegrity), jwtPresent: raw.trim().split(".").length === 3 }));
} else {
  const parsed = JSON.parse(raw);
  console.log(JSON.stringify({ check: "search", httpStatus: res.status, total: parsed.totalCount,
    transactions: (parsed._embedded?.transactionSummaries ?? []).map(t => ({ order: t.clientReferenceInformation?.code,
      date: t.submitTimeUtc, amount: t.orderInformation?.amountDetails?.totalAmount,
      currency: t.orderInformation?.amountDetails?.currency, status: t.applicationInformation?.status,
      reason: t.applicationInformation?.reasonCode, applications: t.applicationInformation?.applications?.map(a => ({ name: a.name, reason: a.reasonCode, flag: a.rFlag })) })) }));
}
