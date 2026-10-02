import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(path, overrides = {}, globals = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require: name => overrides[name] ?? require(name), Buffer, process,
    fetch, AbortSignal, console, Response, ...globals }, { filename: path });
  return exports;
}
const cybs = load("src/lib/cybersource.ts");
test("captura exige un servicio de captura exitoso; autorización no basta", () => {
  assert.equal(cybs.hasSuccessfulCapture({ applicationInformation: { reasonCode: "100", applications: [{ name: "ics_auth", reasonCode: "100" }] } }), false);
  assert.equal(cybs.hasSuccessfulCapture({ applicationInformation: { applications: [{ name: "ics_bill", reasonCode: "100" }] } }), true);
  assert.equal(cybs.hasSuccessfulCapture({ applicationInformation: { applications: [{ name: "ics_bill", reasonCode: "200" }] } }), false);
});
test("búsqueda comprueba referencia y no considera pagada una autorización", async () => {
  const env = { CYBS_RUN_ENV: "apitest", CYBS_KEY_ID: "test", CYBS_SECRET_KEY: Buffer.from("test").toString("base64"), CYBS_MERCHANT_ID: "test", ICB_PAYMENTS_ENABLED: "true" };
  let response;
  const lib = load("src/lib/cybersource.ts", {}, { process: { env }, fetch: async () => new Response(JSON.stringify({ _embedded: { transactionSummaries: response } }), { headers: { "content-type": "application/json" } }) });
  response = [{ clientReferenceInformation: { code: "OTHER" }, applicationInformation: { applications: [{ name: "ics_bill", reasonCode: "100" }] } }];
  assert.equal((await lib.lookupTransactionByOrderNumber("ICB-TEST", true)).found, false);
  response = [{ clientReferenceInformation: { code: "ICB-TEST" }, applicationInformation: { reasonCode: "100", applications: [{ name: "ics_auth", reasonCode: "100" }] }, orderInformation: { amountDetails: { totalAmount: "100.00", currency: "CRC" } } }];
  assert.equal((await lib.lookupTransactionByOrderNumber("ICB-TEST", true)).ok, false);
  response[0].applicationInformation.applications.push({ name: "ics_bill", reasonCode: "100" });
  assert.equal((await lib.lookupTransactionByOrderNumber("ICB-TEST", true)).ok, true);
});
const order = { id: "order-test", order_number: "ICB-TEST", payment_status: "pendiente", payment_method: "tarjeta", total_crc: 100 };
const verified = { found: true, ok: true, status: "APROBADA", id: "provider-test", amount: "100.00", currency: "CRC", reasonCode: "100", payload: {} };
async function confirm({ result = verified, row = order, saveError = null, saved = { id: "order-test" } } = {}) {
  const mutations = [], events = [], mails = [];
  let reads = 0;
  const builder = { select: () => builder, eq: () => builder, neq: () => builder,
    single: async () => ({ data: ++reads > 1 && !saved ? { ...row, payment_status: "pagado" } : row, error: null }), update: data => { mutations.push(data); return builder; },
    maybeSingle: async () => ({ data: saved, error: saveError }) };
  const route = load("src/app/api/payments/confirm/route.ts", {
    "next/server": { NextResponse: class extends Response { static json(data, init) { return Response.json(data, init); } } },
    "@/lib/supabase": { createAdminClient: () => ({ from: () => builder }) },
    "@/lib/cybersource": { paymentErrorDetails: () => ({ error_type: "Error" }), lookupTransactionByOrderNumber: async (code, strict) => { assert.equal(code, "ICB-TEST"); assert.equal(strict, true); if (result instanceof Error) throw result; return result; } },
    "@/lib/audit": { writeAuditEvent: async event => { events.push(event); } },
    "@/lib/email": { sendCustomerReceipt: async () => mails.push("receipt"), notifyPaymentResult: async () => mails.push("admin") }
  }, { console: { error: () => {} } });
  // Un JWT inventado nunca puede aprobar el pago por sí solo.
  const res = await route.POST({ json: async () => ({ orderId: "order-test", resultJwt: "forged.AUTHORIZED.fake" }) });
  return { status: res.status, data: await res.json(), mutations, events, mails };
}
test("JWT falso y proveedor sin transacción: pendiente, sin mutaciones", async () => {
  const r = await confirm({ result: { found: false, ok: false, status: "NOT_FOUND" } });
  assert.equal(r.status, 202); assert.equal(r.mutations.length, 0); assert.equal(r.mails.length, 0);
});
test("solo autorización: no aprobar ni marcar como rechazo", async () => {
  const r = await confirm({ result: { ...verified, ok: false, status: "AUTHORIZED" } });
  assert.equal(r.status, 202); assert.equal(r.mutations.length, 0);
});
for (const [name, change] of [["monto", { amount: "99.00" }], ["moneda", { currency: "USD" }], ["monto inválido", { amount: undefined }]]) {
  test(`no guardar si no coincide ${name}`, async () => {
    const r = await confirm({ result: { ...verified, ...change } });
    assert.equal(r.status, 409); assert.equal(r.mutations.length, 0);
  });
}
test("error al guardar no genera éxito ni comprobantes", async () => {
  const r = await confirm({ saveError: { code: "42703" } });
  assert.equal(r.status, 503); assert.equal(r.data.ok, false); assert.equal(r.mails.length, 0);
});
test("captura verificada y guardada produce éxito y auditoría", async () => {
  const r = await confirm();
  assert.equal(r.status, 200); assert.equal(r.data.ok, true); assert.equal(r.mutations[0].payment_status, "pagado");
  assert.equal(r.mutations[0].payment_response.verified_by, "cybersource_server_search");
  assert.ok(r.events.some(e => e.action === "PAYMENT_CAPTURE_VERIFIED"));
});
test("confirmar pago no revierte un pedido entregado", async () => {
  const r = await confirm({ row: { ...order, status: "entregado" } });
  assert.equal(r.mutations[0].status, "entregado");
});
test("rechazo confirmado permite reintentar sin aprobar", async () => {
  const r = await confirm({ result: { ...verified, ok: false, status: "DECLINED", reasonCode: "200" } });
  assert.equal(r.status, 402); assert.equal(r.mutations[0].payment_status, "rechazado");
});
test("pedido ya pagado es idempotente", async () => {
  const r = await confirm({ row: { ...order, payment_status: "pagado" } });
  assert.equal(r.status, 200); assert.equal(r.mutations.length, 0); assert.equal(r.mails.length, 0);
});
test("confirmaciones concurrentes no duplican comprobantes", async () => {
  const r = await confirm({ saved: null });
  assert.equal(r.status, 200); assert.equal(r.mails.length, 0);
});
test("proveedor inaccesible no altera el pedido", async () => {
  const r = await confirm({ result: new Error("offline") });
  assert.equal(r.status, 503); assert.equal(r.mutations.length, 0);
});
