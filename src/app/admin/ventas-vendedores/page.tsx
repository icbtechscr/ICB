import Link from "next/link";
import { UserCog, ArrowLeft } from "lucide-react";
import { VendorMapManager } from "@/components/admin/VendorMapManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asignar vendedores — ICB Admin" };

export default function VentasVendedoresPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/ventas-sucursales"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft className="size-3.5" /> Ventas en sucursales
        </Link>
        <h1 className="inline-flex items-center gap-2 text-2xl font-black tracking-tight text-ink-900">
          <UserCog className="size-6 text-brand-600" />
          Asignar vendedores
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-600">
          Cada venta de CPI se le atribuye a un colaborador según su nombre de
          vendedor. Enlazá aquí los que no coincidan automáticamente para que
          cada quien vea sus ventas en su portal. El cambio se aplica también a
          las facturas ya sincronizadas.
        </p>
      </div>
      <VendorMapManager />
    </div>
  );
}
