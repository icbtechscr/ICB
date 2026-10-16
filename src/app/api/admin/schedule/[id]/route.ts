import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { mutateSchedule, scheduleActor, ScheduleError, scheduleFailure, scheduleJson, UUID, validateChange } from "@/lib/schedule-server";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await scheduleActor(request);
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ScheduleError("Tarea inválida.");
    const sb = createAdminClient({ disableAuthRefresh: true });
    const { data: task, error } = await sb.from("icb_schedule_tasks").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!task) throw new ScheduleError("Tarea no encontrada.", 404);
    const before = new URL(request.url).searchParams.get("before");
    if (before !== null && !/^\d{1,16}$/.test(before)) throw new ScheduleError("Página inválida.");
    let query = sb.from("icb_schedule_progress").select("*").eq("task_id", id).order("id", { ascending: false }).limit(51);
    if (before) query = query.lt("id", before);
    const { data: history, error: historyError } = await query;
    if (historyError) throw historyError;
    return NextResponse.json({ task, progress: history.slice(0, 50), hasMore: history.length > 50 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return scheduleFailure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const actor = await scheduleActor(request, true);
    const { id } = await context.params;
    const data = await scheduleJson(request);
    const input = validateChange(data, id);
    return NextResponse.json(await mutateSchedule(String(data.action), input, actor));
  } catch (error) { return scheduleFailure(error); }
}
