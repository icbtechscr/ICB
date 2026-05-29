import { History } from "lucide-react";
import { crTodayIso, buildDayRows, fmtDayLabel } from "@/lib/timeclock";
import { adminListEntries } from "@/lib/timeclock-server";
import { createAdminClient } from "@/lib/supabase";
import { getUserRole } from "@/lib/roles";
import { BRANCHES } from "@/lib/branches";
import { HorarioFilters } from "@/components/admin/HorarioFilters";
import { HorarioTable } from "@/components/admin/HorarioTable";
import { TimeclockExport } from "@/components/admin/TimeclockExport";

export const dynamic = "force-dynamic";

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    branch?: string;
    user?: string;
  }>;
}) {
  const sp = await searchParams;
  const today = crTodayIso();
  const yesterday = crTodayIso(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const to = sp.to || yesterday;
  const from =
    sp.from || crTodayIso(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const branchId = sp.branch || "";
  const userId = sp.user || "";

  const entries = await adminListEntries({
    from,
    to,
    branchId: branchId || undefined,
    userId: userId || undefined,
  });
  // El historial son días pasados: excluimos el día de hoy.
  const rows = buildDayRows(entries).filter((r) => r.dayIso !== today);

  let employees: { id: string; name: string }[] = [];
  try {
    const sb = createAdminClient();
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
    employees = data.users
      .filter((u) => getUserRole(u) === "colaborador")
      .map((u) => ({
        id: u.id,
        name:
          (u.user_metadata?.full_name as string) ||
          u.email?.split("@")[0] ||
          "—",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    employees = [];
  }

  const rangeLabel = `Del ${fmtDayLabel(from)} al ${fmtDayLabel(to)}${
    branchId ? ` · ${BRANCHES.find((b) => b.id === branchId)?.city ?? ""}` : ""
  }${userId ? ` · ${employees.find((e) => e.id === userId)?.name ?? ""}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HorarioFilters
          basePath="/admin/colaboradores/historial"
          from={from}
          to={to}
          branchId={branchId}
          userId={userId}
          branches={BRANCHES.map((b) => ({ id: b.id, city: b.city }))}
          employees={employees}
        />
        <TimeclockExport rows={rows} rangeLabel={rangeLabel} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
          <History className="size-4 text-brand-600" />
          <h2 className="text-sm font-bold text-ink-900">
            {rows.length} día{rows.length === 1 ? "" : "s"} con marcajes
          </h2>
        </div>
        <HorarioTable rows={rows} emptyText="No hay marcajes en este rango." />
      </div>
    </div>
  );
}
