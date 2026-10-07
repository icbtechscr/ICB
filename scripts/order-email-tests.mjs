import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {createRequire} from "node:module";
const require = createRequire(import.meta.url);
const isICB = JSON.parse(fs.readFileSync("package.json", "utf8")).name === "web";
const source = fs.readFileSync("src/lib/email.ts", "utf8");
const shop = source.includes('shop: "ICB"') ? "ICB" : "TuStore";
const globalFlag = shop === "ICB" ? "ICB_EXTERNAL_EFFECTS_ENABLED" : "TUSTORE_EXTERNAL_EFFECTS_ENABLED";
function transpile(source, mocks = {}, extra = {}) {
  const exports = {};
  const result = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
  vm.runInNewContext(result.outputText, {exports, require: name => mocks[name] ?? require(name), process, Response, AbortSignal, console, ...extra});
  return exports;
}
function mail(env = {}, providerStatus = 200, offline = false) {
  const calls = [], logs = [];
  const api = transpile(source, {}, {process: {env: {[globalFlag]: "false", ORDER_ADMIN_NOTIFICATIONS_ENABLED: "true",
    RESEND_API_KEY: "fake-secret", ORDER_MAIL_FROM: "Store <shop@example.invalid>", ORDER_NOTIFY_EMAIL: "admin@example.invalid", ...env}},
    console: {info: (...a) => logs.push(a)},
    fetch: async (url, options) => { calls.push({url, options, body: JSON.parse(options.body)}); if (offline) throw Error("SECRET_EMAIL_DETAILS");
      return new Response(null, {status: providerStatus}); }});
  return {api, calls, logs};
}
const order = {orderNumber: "QA-ORDER", customerName: "<script>fake</script>", customerEmail: "customer@example.invalid",
  customerPhone: "00000000", total: 1000, paymentMethod: "tarjeta", shippingMethod: "recogida",
  items: [{name: "<b>Test</b>", qty: 1, lineTotal: 1000}]};
test("alerta admin funciona con efectos globales apagados, pero recibos de clientes no", async () => {
  const m = mail(); await m.api.notifyNewOrder(order); await m.api.sendCustomerReceipt(order);
  assert.equal(m.calls.length, 1); assert.equal(m.calls[0].body.to.join(), "admin@example.invalid");
  assert.ok(m.calls[0].body.subject.startsWith("[" + shop + "]"));
  assert.match(m.calls[0].body.html, /pendiente de pago/); assert.match(m.calls[0].body.html, /no el pago/);
  assert.match(m.calls[0].body.html, /&lt;script&gt;/); assert.ok(!m.calls[0].body.html.includes("<script>"));
  assert.ok(m.calls[0].body.html.includes(shop === "ICB" ? "https://icbtechscr.com/admin/pedidos" : "https://tustorecr.com/admin/pedidos"));
  assert.ok(m.calls[0].options.headers["Idempotency-Key"].includes("/order-created/"));
});
test("flag admin false bloquea solo admin, no cambia comportamiento autorizado del cliente", async () => {
  const m = mail({[globalFlag]: "true", ORDER_ADMIN_NOTIFICATIONS_ENABLED: "false"});
  await m.api.notifyNewOrder(order); assert.equal(m.calls.length, 0);
  await m.api.sendCustomerReceipt(order); assert.equal(m.calls.length, 1);
  assert.equal(m.calls[0].body.to.join(), order.customerEmail);
});
test("sin override se conserva apagado de migración", async () => {
  const m = mail({ORDER_ADMIN_NOTIFICATIONS_ENABLED: undefined}); await m.api.notifyNewOrder(order); assert.equal(m.calls.length, 0);
});
test("múltiples destinatarios se limpian y no se repiten", async () => {
  const m = mail({ORDER_NOTIFY_EMAIL: " a@example.invalid, b@example.invalid, a@example.invalid, "}); await m.api.notifyNewOrder(order);
  assert.equal(m.calls[0].body.to.join(), "a@example.invalid,b@example.invalid");
});
test("creación, aprobado y rechazado usan claves separadas y estables", async () => {
  const m = mail(); await m.api.notifyNewOrder(order); await m.api.notifyPaymentResult(order, true); await m.api.notifyPaymentResult(order, false);
  assert.equal(new Set(m.calls.map(c => c.options.headers["Idempotency-Key"])).size, 3);
  assert.match(m.calls[1].body.subject, /Pago aprobado/); assert.match(m.calls[2].body.subject, /Pago rechazado/);
});
test("fallo del proveedor no rompe pedido ni imprime secretos/contactos", async () => {
  for (const offline of [true, false]) {
    const m = mail({}, 422, offline); await m.api.notifyNewOrder(order);
    const logs = JSON.stringify(m.logs); assert.ok(!logs.includes("fake-secret")); assert.ok(!logs.includes(order.customerEmail));
    assert.ok(!logs.includes("SECRET_EMAIL_DETAILS")); assert.ok(m.logs.length > 0);
  }
});
test("falta de configuración deja evidencia, sin llamada externa", async () => {
  const m = mail({RESEND_API_KEY: ""}); await m.api.notifyNewOrder(order);
  assert.equal(m.calls.length, 0); assert.ok(JSON.stringify(m.logs).includes("configuration_missing"));
});
async function createOrder(method, itemsError = null) {
  const notifications = [];
  const builder = {insert() {return this;}, select() {return this;}, eq() {return this;}, delete() {return this;},
    single: async () => ({data: {id: "fake-id", order_number: "QA-ORDER"}, error: null}),
    then: resolve => resolve({error: itemsError})};
  const module = transpile(fs.readFileSync("src/app/api/orders/route.ts", "utf8"), {
    "next/server": {NextResponse: class extends Response {static json(data) {return Response.json(data);}}},
    "@/lib/supabase": {createAdminClient: () => ({from: () => builder})},
    "@/lib/products": {getProductsByIds: async () => [{id: "product", name: "Test", slug: "test", priceCRC: 1000, stockStatus: "instock", stockQty: 2}]},
    "@/lib/orders": {computeShippingCost: () => 0, generateOrderNumber: () => "QA-ORDER", requiresShippingMinimum: () => false, MINIMUM_SUBTOTAL_FOR_SHIPPING: 10000},
    "@/lib/shipping": {getZone: () => null, distanceKm: () => 0, ORIGIN: {}},
    "@/lib/stock": {isPurchasableProduct: () => true, stockOrderLimit: () => 2},
    "@/lib/email": {notifyNewOrder: async o => notifications.push(o)},
  });
  const response = await module.POST(new Request("https://example.invalid/api/orders", {method: "POST", headers: {"content-type": "application/json"},
    body: JSON.stringify({items: [{id: "product", qty: 1}], customer: {name: "QA", email: "qa@example.invalid", phone: "00000000"}, shipping: {method: "recogida"}, paymentMethod: method})}));
  return {response, notifications};
}
for (const method of ["tarjeta", "sinpe", "transferencia"]) test("pedido " + method + " avisa al admin al registrarse", async () => {
  const r = await createOrder(method); assert.equal(r.response.status, 200); assert.equal(r.notifications.length, 1);
  assert.equal(r.notifications[0].paymentMethod, method); assert.equal(r.notifications[0].items.length, 1);
});
test("pedido incompleto no manda alerta de venta", async () => {
  const r = await createOrder("tarjeta", {message: "Failed items"}); assert.equal(r.response.status, 500); assert.equal(r.notifications.length, 0);
});
