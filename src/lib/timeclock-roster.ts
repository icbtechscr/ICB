import { createAdminClient } from "./supabase";
import { getUserBranchIds, getUserFullName, mustClockIn } from "./roles";

export type TimeclockEmployee = { id: string; name: string; branchIds: string[] };

/** No confundir permisos administrativos con obligación de marcar. */
export async function listTimeclockEmployees(): Promise<TimeclockEmployee[]> {
  const sb = createAdminClient();
  const roster: TimeclockEmployee[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 500 });
    if (error) throw error;
    for (const user of data.users) {
      if (mustClockIn(user)) roster.push({ id: user.id, name: getUserFullName(user) || "—", branchIds: getUserBranchIds(user) });
    }
    if (data.users.length < 500) return roster.sort((a, b) => a.name.localeCompare(b.name));
  }
  throw new Error("La lista de colaboradores está incompleta. No se mostrará una lista parcial.");
}

/** Incluye marcas sin sede registrada, pero nunca cambia ni infiere la sede histórica. */
export function unassignedUsersForBranch(roster: TimeclockEmployee[], branchId: string): string[] {
  return branchId ? roster.filter(e => e.branchIds.includes(branchId)).map(e => e.id) : [];
}
