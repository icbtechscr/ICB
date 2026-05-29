"use client";
import { useRouter } from "next/navigation";

type BranchOpt = { id: string; city: string };

export function HorarioFilters({
  day,
  branchId,
  branches,
}: {
  day: string;
  branchId: string;
  branches: BranchOpt[];
}) {
  const router = useRouter();

  function update(next: { day?: string; branch?: string }) {
    const params = new URLSearchParams();
    const d = next.day ?? day;
    const b = next.branch ?? branchId;
    if (d) params.set("day", d);
    if (b) params.set("branch", b);
    router.push(`/admin/colaboradores/horario?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-500">
          Día
        </span>
        <input
          type="date"
          value={day}
          onChange={(e) => update({ day: e.target.value })}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-500">
          Sede
        </span>
        <select
          value={branchId}
          onChange={(e) => update({ branch: e.target.value })}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
        >
          <option value="">Todas las sedes</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.city}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
