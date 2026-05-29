import { MapPin, CalendarDays } from "lucide-react";
import {
  crTodayIso,
  buildDayRows,
  fmtDayLabel,
  PUNCH_TYPES,
  PUNCH_COL,
  type PunchCell,
} from "@/lib/timeclock";
import { adminListEntries } from "@/lib/timeclock-server";
import { createAdminClient } from "@/lib/supabase";
import { getUserRole } from "@/lib/roles";
import { BRANCHES } from "@/lib/branches";
import { HorarioFilters } from "@/components/admin/HorarioFilters";
import { TimeclockExport } from "@/components/admin/TimeclockExport";

export const dynamic = "force-dynamic";

export default async function ControlHorarioPage({
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
  const to = sp.to || crTodayIso();
  const from =
    sp.from || crTodayIso(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const branchId = sp.branch || "";
  const userId = sp.user || "";

  const entries = await adminListEntries({
    from,
    to,
    branchId: branchId || undefined,
    userId: userId || undefined,
  });
  const rows = buildDayRows(entries);

  // Lista de colaboradores para el filtro.
  let employees: { id: string; name: string }[] = [];
  try {
    const sb = createAdminClient();
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
    employees = data.users
      .filter((u) => getUserRole(u) === "colaborador")
      .map((u) => ({
        id: u.id,
        name:
          (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "—",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    employees = [];
  }

  const rangeLabel = `Del ${fmtDayLabel(from)} al ${fmtDayLabel(to)}${
    branchId
      ? ` · ${BRANCHES.find((b) => b.id === branchId)?.city ?? ""}`
      : ""
  }${userId ? ` · ${employees.find((e) => e.id === userId)?.name ?? ""}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HorarioFilters
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
          <CalendarDays className="size-4 text-brand-600" />
          <h2 className="text-sm font-bold text-ink-900">
            {rows.length} día{rows.length === 1 ? "" : "s"} con marcajes
          </h2>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-400">
            No hay marcajes en este rango.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-ink-50 text-left text-xs font-bold uppercase tracking-wider text-ink-500">
                  <th className="border-b border-r border-ink-200 px-4 py-2.5">Día</th>
                  <th className="border-b border-r border-ink-200 px-4 py-2.5">Colaborador</th>
                  <th className="border-b border-r border-ink-200 px-4 py-2.5">Sede</th>
                  {PUNCH_TYPES.map((t) => (
                    <th
                      key={t}
                      className="border-b border-r border-ink-200 px-4 py-2.5 last:border-r-0"
                    >
                      {PUNCH_COL[t]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="align-top hover:bg-ink-50/40">
                    <td className="border-r border-t border-ink-100 px-4 py-3 font-semibold whitespace-nowrap text-ink-900">
                      {fmtDayLabel(row.dayIso)}
                    </td>
                    <td className="border-r border-t border-ink-100 px-4 py-3 text-ink-800">
                      {row.employeeName || (
                        <span className="italic text-ink-400">Sin nombre</span>
                      )}
                    </td>
                    <td className="border-r border-t border-ink-100 px-4 py-3 text-ink-600">
                      {row.branchName ?? "—"}
                    </td>
                    {PUNCH_TYPES.map((t) => (
                      <td
                        key={t}
                        className="border-r border-t border-ink-100 px-4 py-3 last:border-r-0"
                      >
                        <Cell cell={row.cells[t]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ cell }: { cell: PunchCell | null }) {
  if (!cell) return <span className="text-ink-300">—</span>;
  const badge =
    cell.within === null || cell.distance === null ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
        Sin ubic.
      </span>
    ) : (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          cell.within
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        }`}
      >
        <MapPin className="size-2.5" />
        {cell.within ? "En sede" : `${cell.distance} m`}
      </span>
    );
  const content = (
    <div className="space-y-1">
      <div className="font-mono text-sm font-semibold tabular-nums text-ink-900">
        {cell.time}
      </div>
      {badge}
    </div>
  );
  if (cell.lat !== null && cell.lng !== null) {
    return (
      <a
        href={`https://www.google.com/maps?q=${cell.lat},${cell.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver en el mapa"
      >
        {content}
      </a>
    );
  }
  return content;
}
