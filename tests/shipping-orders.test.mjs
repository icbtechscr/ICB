import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(relative, dependencies = {}) {
  const source = fs.readFileSync(new URL(relative, import.meta.url), "utf8");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, require(name) {
      if (!(name in dependencies)) throw new Error("Unexpected dependency: " + name);
      return dependencies[name];
    },
  });
  return exports;
}
const shipping = load("../src/lib/shipping.ts");
const orders = load("../src/lib/orders.ts", { "./shipping": shipping });

test("Correos cuesta 12000 para moto y carro en cliente y servidor", () => {
  const zone = shipping.getZone("correos");
  for (const size of ["moto", "carro"]) {
    assert.equal(shipping.zoneRate(zone, size), 12000);
    assert.equal(orders.computeShippingCost({ method: "encomienda", zoneId: "correos", size }), 12000);
  }
  assert.equal(orders.computeShippingCost({ method: "encomienda", zoneId: "correos" }), 12000);
});

test("el envío por distancia sale de ICB San José y no cambia retiro, mínimo ni otras tarifas", () => {
  assert.equal(shipping.ORIGIN.lat, 9.93111);
  assert.equal(shipping.ORIGIN.lng, -84.0886275);
  assert.equal(shipping.PER_KM_RATE, 750);
  for (const destination of [{lat: 9.93111, lng: -84.0886275}, {lat: 9.9812842, lng: -84.1513852}, {lat: 9.86444, lng: -83.91944}]) {
    const expected = Math.max(1, shipping.distanceKm(9.93111, -84.0886275, destination.lat, destination.lng)) * 750;
    assert.equal(shipping.distanceShippingCost(destination.lat, destination.lng), expected);
    assert.equal(orders.computeShippingCost({method: "envio", ...destination}), expected);
  }
  assert.equal(orders.computeShippingCost({method: "recogida"}), 0);
  assert.equal(orders.MINIMUM_SUBTOTAL_FOR_SHIPPING, 10000);
  assert.equal(shipping.zoneRate(shipping.getZone("bodega-anay"), "moto"), 7000);
  assert.equal(shipping.zoneRate(shipping.getZone("bodega-anay"), "carro"), 11000);
  assert.equal(shipping.zoneFromLocation("Heredia", "Sarapiquí"), "sancarlenos");
});

test("detalle expandido conserva el nombre completo, ajusta líneas y no recalcula importes históricos", () => {
  const productName = "KIT 4 CAMARAS WIFI TP-LINK TAPO C210 3MP CON MICRO SD 64 GB Y ACCESORIOS — NOMBRE COMPLETO";
  const order = {
    id: "qa-order", orderNumber: "QA-NO-GUARDADO", status: "pagado", paymentStatus: "pagado",
    paymentMethod: "sinpe", customerName: "Prueba", customerEmail: "qa@example.invalid", customerPhone: "",
    shippingMethod: "encomienda", shippingProvince: null, shippingCanton: null, shippingAddress: null,
    shippingNotes: null, paymentReference: null, createdAt: "2026-10-08T12:00:00Z",
    subtotal: 92000, shippingCost: 6750, total: 98750,
    items: [{ id: "qa-item", qty: 1, productName, unitPrice: 92000, lineTotal: 92000 }],
  };
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const react = { useMemo: fn => fn(), useState: initial => [stateIndex++ === 3 ? order.id : initial, () => {}] };
  const names = ["Loader2", "Package", "ShieldCheck", "ChevronDown", "Search", "Phone", "Mail", "MapPin", "CreditCard", "Truck", "Trash2"];
  const { OrdersManager } = load("../src/components/admin/OrdersManager.tsx", {
    react, "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "next/navigation": {useRouter: () => ({refresh() {}})},
    "lucide-react": Object.fromEntries(names.map(name => [name, name])),
    "@/lib/orders": orders, "@/lib/utils": {formatCRC: value => "CRC " + value},
  });
  const tree = OrdersManager({initialOrders: [order]});
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (node && typeof node === "object") { nodes.push(node); visit(node.props?.children); }
  }
  function text(node) {
    if (Array.isArray(node)) return node.map(text).join("");
    if (node && typeof node === "object") return text(node.props?.children);
    return node == null ? "" : String(node);
  }
  visit(tree);
  const name = nodes.find(node => node.type === "p" && text(node).includes(productName));
  assert.ok(name);
  assert.equal(text(name), "1× " + productName);
  assert.match(name.props.className, /whitespace-normal/);
  assert.match(name.props.className, /break-words/);
  assert.doesNotMatch(name.props.className, /truncate|line-clamp|whitespace-nowrap/);
  assert.ok(text(tree).includes("CRC 6750"));
  assert.ok(text(tree).includes("CRC 98750"));
});

test("cliente y servidor siguen usando la tarifa común; TuStore no cambia dirección de recogida", () => {
  const checkout = fs.readFileSync(new URL("../src/app/checkout/page.tsx", import.meta.url), "utf8");
  const api = fs.readFileSync(new URL("../src/app/api/orders/route.ts", import.meta.url), "utf8");
  assert.match(checkout, /zoneRate\(zone, form.size\)/);
  assert.match(api, /const shippingCost = computeShippingCost/);
  const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  if (pkg.name === "tustorecr-web") {
    assert.match(checkout, /desde ICB San José centro/);
    assert.match(api, /desde ICB San José centro/);
    assert.doesNotMatch(checkout + api, /desde TUStore Barreal/);
    assert.match(checkout, /Retirás en nuestra tienda de Barreal de Heredia/);
  }
});
