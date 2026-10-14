import { History } from "lucide-react";
import { crTodayIso, buildDayRows, fmtDayLabel } from "@/lib/timeclock";
import { adminListEntries } from "@/lib/timeclock-server";
import { listTimeclockEmployees, unassignedUsersForBranch } from "@/lib/timeclock-roster";
import { getCurrentUser } from "@/lib/supabase-server";
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

  const roster = await listTimeclockEmployees();
  const entries = await adminListEntries({
    from,
    to,
    branchId: branchId || undefined,
    userId: userId || undefined,
    unassignedUserIds: unassignedUsersForBranch(roster, branchId),
  });
  // El historial son días pasados: excluimos el día de hoy.
  const rows = buildDayRows(entries).filter((r) => r.dayIso !== today);

  const currentUser = await getCurrentUser();
  const isDev = getUserRole(currentUser) === "dev";

  const employees = roster.map(({ id, name }) => ({ id, name }));
  // Las marcas siguen visibles aunque el perfil actual ya no deba marcar.
  for (const row of rows) if (!employees.some(e => e.id === row.userId)) employees.push({ id: row.userId, name: row.employeeName || "—" });
  employees.sort((a, b) => a.name.localeCompare(b.name));

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

      {branchId && <p className="mt-3 text-xs text-ink-500">Se incluyen marcas sin sede registrada de usuarios actualmente asignados a esta sede. Su ubicación histórica no se modifica ni se considera validada.</p>}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
          <History className="size-4 text-brand-600" />
          <h2 className="text-sm font-bold text-ink-900">
            {rows.length} día{rows.length === 1 ? "" : "s"} con marcajes
          </h2>
        </div>
        {isDev && (
          <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
            Modo Dev: podés editar la hora (lápiz), borrar o agregar marcas.
          </p>
        )}
        <HorarioTable
          rows={rows}
          editable={isDev}
          emptyText="No hay marcajes en este rango."
        />
      </div>
    </div>
  );
}
