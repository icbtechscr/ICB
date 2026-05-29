import { createAdminClient } from "./supabase";
import {
  crTodayIso,
  crDayRangeUtcFromIso,
  type TimeEntry,
} from "./timeclock";

/** Marcajes de un colaborador en el día de hoy (hora de Costa Rica). */
export async function listMyEntriesToday(userId: string): Promise<TimeEntry[]> {
  const sb = createAdminClient();
  const { start, end } = crDayRangeUtcFromIso(crTodayIso());
  const { data, error } = await sb
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("punched_at", start)
    .lt("punched_at", end)
    .order("punched_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TimeEntry[];
}

/** Marcajes para el panel admin, filtrables por día (YYYY-MM-DD CR) y sede. */
export async function adminListEntries(opts: {
  day?: string;
  branchId?: string;
}): Promise<TimeEntry[]> {
  const sb = createAdminClient();
  let query = sb
    .from("time_entries")
    .select("*")
    .order("punched_at", { ascending: false })
    .limit(500);

  if (opts.day) {
    const { start, end } = crDayRangeUtcFromIso(opts.day);
    query = query.gte("punched_at", start).lt("punched_at", end);
  }
  if (opts.branchId) {
    query = query.eq("branch_id", opts.branchId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as TimeEntry[];
}
