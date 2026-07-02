import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  IdCard,
  Mail,
  MapPin,
  Briefcase,
  Palmtree,
  CalendarClock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase-server";
import {
  getUserRole,
  getUserFullName,
  getUserAvatar,
  getUserBranchIds,
  getInitials,
  ROLE_LABEL,
} from "@/lib/roles";
import {
  getEmployeeHrProfile,
  computeBalance,
  fullMonthsSince,
} from "@/lib/vacations";
import { listMyVacationRequests } from "@/lib/vacations-server";
import { getLocation, type Branch } from "@/lib/branches";
import { AvatarUploader } from "@/components/portal/AvatarUploader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi perfil",
};

function fmtDateEs(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "set", "oct", "nov", "dic",
  ];
  return `${d} ${meses[m - 1]} ${y}`;
}

function antiguedad(hireIso: string | null): string {
  if (!hireIso) return "—";
  const months = fullMonthsSince(hireIso);
  const y = Math.floor(months / 12);
  const mo = months % 12;
  if (y === 0 && mo === 0) return "Recién ingresó";
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${y === 1 ? "año" : "años"}`);
  if (mo > 0) parts.push(`${mo} ${mo === 1 ? "mes" : "meses"}`);
  return parts.join(" ");
}

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");

  const name = getUserFullName(user);
  const role = getUserRole(user);
  const avatar = getUserAvatar(user);
  const profile = getEmployeeHrProfile(user);
  const branches = getUserBranchIds(user)
    .map(getLocation)
    .filter((b): b is Branch => !!b);

  let requests: Awaited<ReturnType<typeof listMyVacationRequests>> = [];
  try {
    requests = await listMyVacationRequests(user.id, 100);
  } catch {
    requests = [];
  }
  const balance = computeBalance(profile, requests);

  const rows: { icon: typeof Mail; label: string; value: string }[] = [
    { icon: Briefcase, label: "Rol", value: ROLE_LABEL[role] },
    { icon: IdCard, label: "Cédula", value: profile.cedula || "—" },
    { icon: Mail, label: "Correo", value: user.email ?? "—" },
    {
      icon: MapPin,
      label: branches.length > 1 ? "Sedes" : "Sede",
      value: branches.length ? branches.map((b) => b.city).join(", ") : "—",
    },
    { icon: CalendarDays, label: "Ingreso", value: fmtDateEs(profile.hireDate) },
    { icon: CalendarClock, label: "Antigüedad", value: antiguedad(profile.hireDate) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Tarjeta banner */}
      <section className="overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-soft">
        <div className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 pb-6 pt-8 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.25),transparent_45%)]" />
          <div className="relative flex flex-col items-center">
            <AvatarUploader initialUrl={avatar} initials={getInitials(name)} />
            <h1 className="mt-4 text-xl font-black tracking-tight text-white">
              {name || "Colaborador"}
            </h1>
            <p className="mt-0.5 text-sm text-white/70">{ROLE_LABEL[role]}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-500/20 px-3 py-1 text-xs font-bold text-accent-100 ring-1 ring-inset ring-accent-400/30">
              <BadgeCheck className="size-3.5" />
              Activo
            </span>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 divide-x divide-ink-200 border-b border-ink-200">
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-brand-600">
              {balance.hasHireDate ? balance.available : "—"}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              Días de vacaciones
            </p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-brand-600">
              {branches.length || "—"}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              {branches.length === 1 ? "Sede asignada" : "Sedes asignadas"}
            </p>
          </div>
        </div>

        {/* Datos */}
        <dl className="divide-y divide-ink-100">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 px-5 py-3.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <r.icon className="size-4" />
              </span>
              <dt className="text-sm text-ink-500">{r.label}</dt>
              <dd className="ml-auto max-w-[60%] truncate text-right text-sm font-bold text-ink-900">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Acceso rápido a vacaciones */}
      <Link
        href="/portal/vacaciones"
        className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-soft"
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Palmtree className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink-900">Vacaciones</span>
          <span className="block text-xs text-ink-600">
            Consultá tu saldo y solicitá días libres.
          </span>
        </span>
      </Link>

      <p className="mt-6 text-center text-xs text-ink-400">
        ¿Algún dato incorrecto? Contactá a RRHH para actualizarlo.
      </p>
    </div>
  );
}
