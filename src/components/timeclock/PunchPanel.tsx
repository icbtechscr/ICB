"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  Coffee,
  Utensils,
  MapPin,
  Loader2,
  Check,
  AlertTriangle,
  X,
  Clock,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import {
  PUNCH_TYPES,
  PUNCH_LABELS,
  PUNCH_SHORT,
  type PunchType,
  type TimeEntry,
} from "@/lib/timeclock";

const ICONS: Record<PunchType, React.ComponentType<{ className?: string }>> = {
  entrada: LogIn,
  salida_almuerzo: Utensils,
  regreso_almuerzo: Coffee,
  salida: LogOut,
};

type BranchInfo = {
  id: string;
  name: string;
  address: string;
} | null;

type GeoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; lat: number; lng: number; accuracy: number }
  | { status: "error"; message: string };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Costa_Rica",
  });
}

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
  const [pending, setPending] = useState<PunchType | null>(null);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doneTypes = useMemo(
    () => new Set(entries.map((e) => e.punch_type)),
    [entries]
  );

  function openConfirm(type: PunchType) {
    setError(null);
    setPending(type);
    setGeo({ status: "loading" });
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", message: "Tu dispositivo no permite ubicación." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          status: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        setGeo({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Permiso de ubicación denegado."
              : "No se pudo obtener la ubicación.",
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function cancel() {
    setPending(null);
    setGeo({ status: "idle" });
  }

  async function confirm() {
    if (!pending) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/timeclock/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          punchType: pending,
          latitude: geo.status === "ok" ? geo.lat : undefined,
          longitude: geo.status === "ok" ? geo.lng : undefined,
          accuracy: geo.status === "ok" ? geo.accuracy : undefined,
        }),
      });
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const json = (await res.json()) as { entry: TimeEntry };
      setEntries((prev) => [...prev, json.entry]);
      setPending(null);
      setGeo({ status: "idle" });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await createSupabaseBrowser().auth.signOut();
    router.replace("/ingresar");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
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
          onClick={logout}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition hover:bg-ink-50"
        >
          <LogOut className="size-3.5" />
          Salir
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PUNCH_TYPES.map((type) => {
          const Icon = ICONS[type];
          const done = doneTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => openConfirm(type)}
              className="group flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-left shadow-sm transition-all hover:border-brand-300 hover:bg-brand-50/40 active:scale-[0.99]"
            >
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-ink-900">
                  {PUNCH_LABELS[type]}
                </span>
                {done && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <Check className="size-3" />
                    Marcado hoy
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Marcajes del día */}
      <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-900">
          <Clock className="size-4 text-accent-600" />
          Marcajes de hoy
        </h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">
            Aún no has marcado nada hoy.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold text-ink-900">
                    {PUNCH_SHORT[e.punch_type]}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ink-600">
                    {fmtTime(e.punched_at)}
                  </span>
                </div>
                <LocationBadge entry={e} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de confirmación */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl border border-ink-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-ink-900">
                {PUNCH_LABELS[pending]}
              </h3>
              <button
                onClick={cancel}
                className="inline-flex size-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50 p-4 text-sm">
              {geo.status === "loading" && (
                <span className="flex items-center gap-2 text-ink-600">
                  <Loader2 className="size-4 animate-spin" />
                  Obteniendo tu ubicación…
                </span>
              )}
              {geo.status === "ok" && (
                <span className="flex items-center gap-2 text-emerald-700">
                  <MapPin className="size-4" />
                  Ubicación lista (±{Math.round(geo.accuracy)} m)
                </span>
              )}
              {geo.status === "error" && (
                <span className="flex items-start gap-2 text-amber-700">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {geo.message} Se registrará el marcaje sin ubicación.
                </span>
              )}
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                onClick={cancel}
                className="flex-1 rounded-full border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={submitting || geo.status === "loading"}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent-500 px-4 py-3 text-sm font-bold text-ink-900 shadow-lg shadow-accent-500/30 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationBadge({ entry }: { entry: TimeEntry }) {
  if (entry.within_range === null || entry.distance_m === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-500">
        Sin ubicación
      </span>
    );
  }
  const ok = entry.within_range;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      <MapPin className="size-3" />
      {ok ? "En sede" : `A ${entry.distance_m} m`}
    </span>
  );
}
