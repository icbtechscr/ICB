import { CalendarDays } from "lucide-react";
import { crTodayIso, buildDayRows, fmtDayLabel } from "@/lib/timeclock";
import { adminListEntries } from "@/lib/timeclock-server";
import { createAdminClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server";
import { getUserRole, mustClockIn } from "@/lib/roles";
import { BRANCHES } from "@/lib/branches";
import { HorarioFilters } from "@/components/admin/HorarioFilters";
import { HorarioTable } from "@/components/admin/HorarioTable";
import { TimeclockExport } from "@/components/admin/TimeclockExport";

export const dynamic = "force-dynamic";

export default async function ControlHorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; user?: string }>;
}) {
  const sp = await searchParams;
  const today = crTodayIso();
  const branchId = sp.branch || "";
  const userId = sp.user || "";

  const entries = await adminListEntries({
    from: today,
    to: today,
    branchId: branchId || undefined,
    userId: userId || undefined,
  });
  const rows = buildDayRows(entries);

  const currentUser = await getCurrentUser();
  const isDev = getUserRole(currentUser) === "dev";

  let employees: { id: string; name: string }[] = [];
  try {
    const sb = createAdminClient();
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
    employees = data.users
      .filter((u) => mustClockIn(getUserRole(u)))
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

  const rangeLabel = `Hoy · ${fmtDayLabel(today)}${
    branchId ? ` · ${BRANCHES.find((b) => b.id === branchId)?.city ?? ""}` : ""
  }`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HorarioFilters
          basePath="/admin/colaboradores/horario"
          from={today}
          to={today}
          branchId={branchId}
          userId={userId}
          branches={BRANCHES.map((b) => ({ id: b.id, city: b.city }))}
          employees={employees}
          showDates={false}
        />
        <TimeclockExport rows={rows} rangeLabel={rangeLabel} />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
          <CalendarDays className="size-4 text-brand-600" />
          <h2 className="text-sm font-bold text-ink-900">
            Hoy · {fmtDayLabel(today)} — {rows.length} colaborador
            {rows.length === 1 ? "" : "es"}
          </h2>
        </div>
        {isDev && (
          <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
            Modo Dev: podés editar la hora (lápiz), borrar o agregar marcas.
          </p>
        )}
        <HorarioTable
          rows={rows}
          showDay={false}
          editable={isDev}
          emptyText="Nadie ha marcado hoy todavía."
        />
      </div>
    </div>
  );
}
