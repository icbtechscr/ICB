import { MapPin, Clock } from "lucide-react";
import { crTodayIso, PUNCH_SHORT } from "@/lib/timeclock";
import { adminListEntries } from "@/lib/timeclock-server";
import { BRANCHES } from "@/lib/branches";
import { HorarioFilters } from "@/components/admin/HorarioFilters";

export const dynamic = "force-dynamic";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  });
}

export default async function ControlHorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; branch?: string }>;
}) {
  const sp = await searchParams;
  const day = sp.day || crTodayIso();
  const branchId = sp.branch || "";
  const entries = await adminListEntries({
    day,
    branchId: branchId || undefined,
  });

  return (
    <div>
      <HorarioFilters
        day={day}
        branchId={branchId}
        branches={BRANCHES.map((b) => ({ id: b.id, city: b.city }))}
      />

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
            <Clock className="size-4 text-brand-600" />
            {entries.length} marcaje{entries.length === 1 ? "" : "s"}
          </h2>
        </div>

        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-400">
            No hay marcajes para este día.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs font-bold uppercase tracking-wider text-ink-500">
                  <th className="px-4 py-2.5">Colaborador</th>
                  <th className="px-4 py-2.5">Sede</th>
                  <th className="px-4 py-2.5">Marcaje</th>
                  <th className="px-4 py-2.5">Hora</th>
                  <th className="px-4 py-2.5">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-ink-50/60">
                    <td className="px-4 py-3 font-semibold text-ink-900">
                      {e.employee_name || (
                        <span className="italic text-ink-400">Sin nombre</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {e.branch_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {PUNCH_SHORT[e.punch_type]}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-ink-900">
                      {fmtTime(e.punched_at)}
                    </td>
                    <td className="px-4 py-3">
                      <LocationCell
                        distance={e.distance_m}
                        within={e.within_range}
                        lat={e.latitude}
                        lng={e.longitude}
                      />
                    </td>
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

function LocationCell({
  distance,
  within,
  lat,
  lng,
}: {
  distance: number | null;
  within: boolean | null;
  lat: number | null;
  lng: number | null;
}) {
  if (within === null || distance === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
        Sin ubicación
      </span>
    );
  }
  const badge = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        within
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      <MapPin className="size-3" />
      {within ? "En sede" : `A ${distance} m`}
    </span>
  );
  if (lat !== null && lng !== null) {
    return (
      <a
        href={`https://www.google.com/maps?q=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Ver en el mapa"
      >
        {badge}
      </a>
    );
  }
  return badge;
}
