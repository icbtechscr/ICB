import { MapPin } from "lucide-react";
import {
  fmtDayLabel,
  PUNCH_TYPES,
  PUNCH_COL,
  type DayRow,
  type PunchCell,
} from "@/lib/timeclock";

export function HorarioTable({
  rows,
  emptyText = "No hay marcajes.",
  showDay = true,
}: {
  rows: DayRow[];
  emptyText?: string;
  showDay?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-ink-400">{emptyText}</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ink-50 text-left text-xs font-bold uppercase tracking-wider text-ink-500">
            {showDay && (
              <th className="border-b border-r border-ink-200 px-4 py-2.5">Día</th>
            )}
            <th className="border-b border-r border-ink-200 px-4 py-2.5">
              Colaborador
            </th>
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
              {showDay && (
                <td className="whitespace-nowrap border-r border-t border-ink-100 px-4 py-3 font-semibold text-ink-900">
                  {fmtDayLabel(row.dayIso)}
                </td>
              )}
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
