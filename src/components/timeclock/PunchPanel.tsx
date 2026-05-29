"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  MapPin,
  MapPinOff,
  Loader2,
  AlertTriangle,
  Sun,
  Utensils,
  Coffee,
  DoorOpen,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  PUNCH_TYPES,
  PUNCH_COL,
  buildDayRows,
  crTodayIso,
  fmtDayLabel,
  type PunchType,
  type PunchCell,
  type DayRow,
  type TimeEntry,
} from "@/lib/timeclock";

type BranchInfo = { id: string; name: string; address: string } | null;
type Coords = { lat: number; lng: number; accuracy: number };
type GeoStatus = "loading" | "ready" | "denied" | "unsupported";

const ACTION: Record<
  Exclude<PunchType, "entrada">,
  { label: string; Icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  salida_almuerzo: {
    label: "Almorzar",
    Icon: Utensils,
    cls: "bg-amber-500 text-white hover:bg-amber-600",
  },
  regreso_almuerzo: {
    label: "Entrar",
    Icon: Coffee,
    cls: "bg-brand-600 text-white hover:bg-brand-700",
  },
  salida: {
    label: "Salir",
    Icon: DoorOpen,
    cls: "bg-red-600 text-white hover:bg-red-700",
  },
};

export function PunchPanel({
  employeeName,
  branch,
  initialEntries,
}: {
  employeeName: string;
  branch: BranchInfo;
  initialEntries: TimeEntry[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [loadingType, setLoadingType] = useState<PunchType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const todayIso = crTodayIso();

  // --- Geolocalización: se precalienta al entrar y se mantiene fresca ---
  const coordsRef = useRef<Coords | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("loading");
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return;
    }
    let settled = false;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        settled = true;
        coordsRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setAccuracy(pos.coords.accuracy);
        setGeoStatus("ready");
      },
      (err) => {
        settled = true;
        setGeoStatus(
          err.code === err.PERMISSION_DENIED ? "denied" : "ready"
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
    // Salvavidas: si el GPS no responde en 12s, no bloquear al colaborador.
    const fallback = setTimeout(() => {
      if (!settled) setGeoStatus("ready");
    }, 12000);
    return () => {
      navigator.geolocation.clearWatch(id);
      clearTimeout(fallback);
    };
  }, []);

  const geoLoading = geoStatus === "loading";
  const busy = geoLoading || loadingType !== null;

  const rows = useMemo(() => {
    const built = buildDayRows(entries);
    if (!built.some((r) => r.dayIso === todayIso)) {
      built.unshift({
        key: `today|${todayIso}`,
        userId: "",
        employeeName,
        branchName: branch?.name ?? null,
        dayIso: todayIso,
        cells: {
          entrada: null,
          salida_almuerzo: null,
          regreso_almuerzo: null,
          salida: null,
        },
      });
    }
    return built;
  }, [entries, todayIso, employeeName, branch]);

  const todayRow = rows.find((r) => r.dayIso === todayIso)!;
  const startedToday = !!todayRow.cells.entrada;
  const historyRows = rows.filter((r) => r.dayIso !== todayIso);

  async function punch(type: PunchType) {
    if (geoLoading) return; // no debería pasar (botones deshabilitados)
    setLoadingType(type);
    setError(null);
    try {
      const pos = coordsRef.current;
      const res = await fetch("/api/timeclock/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          punchType: type,
          latitude: pos?.lat,
          longitude: pos?.lng,
          accuracy: pos?.accuracy,
        }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const json = (await res.json()) as { entry: TimeEntry };
      setEntries((prev) => [...prev, json.entry]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">Hola,</p>
          <h1 className="text-2xl font-black tracking-tight text-ink-900 md:text-3xl">
            {employeeName || "Colaborador"}
          </h1>
          {branch ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-600">
              <MapPin className="size-4 text-accent-600" />
              {branch.name}
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-700">
              <AlertTriangle className="size-4" />
              Sin sede asignada — avisá a tu administrador.
            </p>
          )}
        </div>
        <button
          onClick={async () => {
            await createSupabaseBrowser().auth.signOut();
            router.replace("/ingresar");
            router.refresh();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50"
        >
          <LogOut className="size-3.5" />
          Salir
        </button>
      </div>

      <GeoBanner status={geoStatus} accuracy={accuracy} />

      {error && (
        <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Antes de comenzar el día: botón rojo protagonista */}
      {!startedToday ? (
        <div className="mt-6 rounded-3xl border border-ink-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-ink-500">
            {fmtDayLabel(todayIso)}
          </p>
          <h2 className="mt-1 text-xl font-black text-ink-900">
            ¿Listo para arrancar?
          </h2>
          <button
            onClick={() => punch("entrada")}
            disabled={busy}
            className="mt-5 inline-flex w-full max-w-sm items-center justify-center gap-2.5 rounded-2xl bg-red-600 px-8 py-5 text-lg font-black text-white shadow-xl shadow-red-600/30 transition-all hover:bg-red-700 hover:shadow-red-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingType === "entrada" || geoLoading ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Sun className="size-6" />
            )}
            {geoLoading ? "Obteniendo ubicación…" : "Comenzar Día"}
          </button>
          <p className="mt-3 text-xs text-ink-400">
            Se registrará tu hora y ubicación al tocar el botón.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <DayTable
            rows={[todayRow]}
            todayIso={todayIso}
            loadingType={loadingType}
            busy={busy}
            onPunch={punch}
          />
        </div>
      )}

      {/* Historial de días anteriores */}
      {historyRows.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-500">
            Días anteriores
          </h3>
          <DayTable
            rows={historyRows}
            todayIso={todayIso}
            loadingType={null}
            busy={false}
            onPunch={punch}
          />
        </div>
      )}
    </div>
  );
}

function GeoBanner({
  status,
  accuracy,
}: {
  status: GeoStatus;
  accuracy: number | null;
}) {
  if (status === "loading") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        Activando ubicación… aceptá el permiso de GPS para poder marcar.
      </div>
    );
  }
  if (status === "ready") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
        <MapPin className="size-4 shrink-0" />
        Ubicación lista{accuracy ? ` (±${Math.round(accuracy)} m)` : ""}.
      </div>
    );
  }
  // denied / unsupported
  return (
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-600">
      <MapPinOff className="size-4 shrink-0" />
      Ubicación desactivada — podés marcar igual, pero quedará registrado sin
      ubicación.
    </div>
  );
}

function DayTable({
  rows,
  todayIso,
  loadingType,
  busy,
  onPunch,
}: {
  rows: DayRow[];
  todayIso: string;
  loadingType: PunchType | null;
  busy: boolean;
  onPunch: (t: PunchType) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ink-50 text-left text-xs font-bold uppercase tracking-wider text-ink-500">
            <th className="border-b border-r border-ink-200 px-4 py-3">Día</th>
            {PUNCH_TYPES.map((t) => (
              <th
                key={t}
                className="border-b border-r border-ink-200 px-4 py-3 last:border-r-0"
              >
                {PUNCH_COL[t]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isToday = row.dayIso === todayIso;
            return (
              <tr key={row.key} className="align-top">
                <td className="border-r border-ink-200 px-4 py-3 font-semibold text-ink-900">
                  {fmtDayLabel(row.dayIso)}
                  {isToday && (
                    <span className="ml-2 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-600">
                      Hoy
                    </span>
                  )}
                </td>
                {PUNCH_TYPES.map((t) => (
                  <td
                    key={t}
                    className="border-r border-t border-ink-100 px-4 py-3 last:border-r-0"
                  >
                    <Cell
                      cell={row.cells[t]}
                      type={t}
                      interactive={isToday}
                      cells={row.cells}
                      loading={loadingType === t}
                      busy={busy}
                      onPunch={onPunch}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function isActionable(
  type: PunchType,
  cells: Record<PunchType, PunchCell | null>
): boolean {
  if (cells.salida) return false; // día cerrado
  switch (type) {
    case "entrada":
      return false; // se hace con "Comenzar Día"
    case "salida_almuerzo":
      return !!cells.entrada && !cells.salida_almuerzo;
    case "regreso_almuerzo":
      return !!cells.salida_almuerzo && !cells.regreso_almuerzo;
    case "salida":
      return !!cells.entrada;
  }
}

function Cell({
  cell,
  type,
  interactive,
  cells,
  loading,
  busy,
  onPunch,
}: {
  cell: PunchCell | null;
  type: PunchType;
  interactive: boolean;
  cells: Record<PunchType, PunchCell | null>;
  loading: boolean;
  busy: boolean;
  onPunch: (t: PunchType) => void;
}) {
  if (cell) {
    return (
      <div className="space-y-1">
        <div className="font-mono text-sm font-semibold tabular-nums text-ink-900">
          {cell.time}
        </div>
        <LocationBadge cell={cell} />
      </div>
    );
  }
  if (interactive && type !== "entrada" && isActionable(type, cells)) {
    const a = ACTION[type];
    return (
      <button
        onClick={() => onPunch(type)}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${a.cls}`}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <a.Icon className="size-3.5" />
        )}
        {a.label}
      </button>
    );
  }
  return <span className="text-ink-300">—</span>;
}

function LocationBadge({ cell }: { cell: PunchCell }) {
  if (cell.within === null || cell.distance === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500">
        Sin ubicación
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        cell.within
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      <MapPin className="size-3" />
      {cell.within ? "En sede" : `A ${cell.distance} m`}
    </span>
  );
}
