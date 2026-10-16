import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { mutateSchedule, scheduleActor, scheduleFailure, scheduleJson, validateCreate } from "@/lib/schedule-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const actor = await scheduleActor(request);
    const { data, error } = await createAdminClient({ disableAuthRefresh: true }).rpc("icb_schedule_snapshot");
    if (error) throw error;
    return NextResponse.json({ ...data, canManage: actor.dev }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return scheduleFailure(error); }
}
export async function POST(request: Request) {
  try {
    const actor = await scheduleActor(request);
    const input = validateCreate(await scheduleJson(request));
    return NextResponse.json(await mutateSchedule("create", input, actor), { status: 201 });
  } catch (error) { return scheduleFailure(error); }
}
