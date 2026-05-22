"use client";
import { useMemo, useState } from "react";
import {
  Loader2,
  Package,
  ChevronDown,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Truck,
} from "lucide-react";
import {
  ORDER_STATUSES,
  STATUS_LABEL,
  SHIPPING_LABEL,
  PAYMENT_LABEL,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { formatCRC } from "@/lib/utils";

const STATUS_STYLE: Record<OrderStatus, string> = {
  pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  pagado: "bg-accent-50 text-accent-700 border-accent-200",
  preparando: "bg-sky-100 text-sky-700 border-sky-200",
  enviado: "bg-indigo-100 text-indigo-700 border-indigo-200",
  entregado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelado: "bg-red-100 text-red-700 border-red-200",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersManager({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filter, setFilter] = useState<"todos" | OrderStatus>("todos");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: orders.length };
    for (const s of ORDER_STATUSES) c[s] = 0;
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "todos" && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, query]);

  async function changeStatus(o: Order, status: OrderStatus) {
    setSavingId(o.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${o.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status } : x))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("todos")}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
            filter === "todos"
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-ink-200 text-ink-600 hover:bg-ink-100"
          }`}
        >
          Todos ({counts.todos})
        </button>
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              filter === s
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-600 hover:bg-ink-100"
            }`}
          >
            {STATUS_LABEL[s]} ({counts[s] ?? 0})
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pedido, cliente…"
            className="w-60 rounded-xl border border-ink-200 bg-transparent py-2 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-ink-400">
            <Package className="size-8" />
            <p className="text-sm">No hay pedidos para mostrar.</p>
          </div>
        )}
        <ul className="divide-y divide-ink-100">
          {visible.map((o) => {
            const open = expandedId === o.id;
            return (
              <li key={o.id}>
                <div
                  className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-ink-50"
                  onClick={() => setExpandedId(open ? null : o.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-ink-900">
                        {o.orderNumber}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          STATUS_STYLE[o.status]
                        }`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-ink-600">
                      {o.customerName} · {o.customerEmail}
                    </p>
                    <p className="text-xs text-ink-400">{fmtDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">
                      {formatCRC(o.total)}
                    </p>
                    <p className="text-xs text-ink-400">
                      {o.items.reduce((a, i) => a + i.qty, 0)} art.
                    </p>
                  </div>
                  <ChevronDown
                    className={`size-5 shrink-0 text-ink-400 transition ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {open && (
                  <div className="border-t border-ink-100 bg-ink-50 px-5 py-4">
                    <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
                      {/* Artículos */}
                      <div>
                        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">
                          Artículos
                        </h3>
                        <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 bg-white">
                          {o.items.map((i) => (
                            <li
                              key={i.id}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 truncate text-ink-700">
                                {i.qty}× {i.productName}
                              </span>
                              <span className="shrink-0 font-semibold text-ink-900">
                                {formatCRC(i.lineTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between text-ink-600">
                            <span>Subtotal</span>
                            <span>{formatCRC(o.subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-ink-600">
                            <span>Envío</span>
                            <span>{formatCRC(o.shippingCost)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-ink-900">
                            <span>Total</span>
                            <span>{formatCRC(o.total)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Cliente + envío */}
                      <div className="space-y-3 text-sm">
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-500">
                            Cliente
                          </h3>
                          <p className="font-semibold text-ink-900">
                            {o.customerName}
                          </p>
                          {o.customerIdNumber && (
                            <p className="text-ink-600">
                              Cédula: {o.customerIdNumber}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 text-ink-600">
                            <Mail className="size-3.5" /> {o.customerEmail}
                          </p>
                          <p className="flex items-center gap-1.5 text-ink-600">
                            <Phone className="size-3.5" /> {o.customerPhone}
                          </p>
                        </div>
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-500">
                            Entrega
                          </h3>
                          <p className="flex items-center gap-1.5 text-ink-600">
                            <Truck className="size-3.5" />
                            {SHIPPING_LABEL[o.shippingMethod] ??
                              o.shippingMethod}
                          </p>
                          {(o.shippingProvince || o.shippingAddress) && (
                            <p className="flex items-start gap-1.5 text-ink-600">
                              <MapPin className="mt-0.5 size-3.5 shrink-0" />
                              <span>
                                {[
                                  o.shippingAddress,
                                  o.shippingCanton,
                                  o.shippingProvince,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </p>
                          )}
                          {o.shippingNotes && (
                            <p className="text-ink-500">Nota: {o.shippingNotes}</p>
                          )}
                        </div>
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-500">
                            Pago
                          </h3>
                          <p className="flex items-center gap-1.5 text-ink-600">
                            <CreditCard className="size-3.5" />
                            {PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod} ·{" "}
                            {o.paymentStatus}
                          </p>
                        </div>
                        <div>
                          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-ink-500">
                            Estado del pedido
                          </h3>
                          <div className="flex items-center gap-2">
                            <select
                              value={o.status}
                              onChange={(e) =>
                                changeStatus(o, e.target.value as OrderStatus)
                              }
                              disabled={savingId === o.id}
                              className="rounded-xl border border-ink-200 bg-transparent px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500 disabled:opacity-60"
                            >
                              {ORDER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </option>
                              ))}
                            </select>
                            {savingId === o.id && (
                              <Loader2 className="size-4 animate-spin text-brand-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
