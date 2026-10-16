import { createAdminClient } from "@/lib/supabase";
import { scheduleActor, ScheduleError, scheduleFailure, UUID } from "@/lib/schedule-server";
import type { ScheduleAttachment } from "@/lib/schedule";

export async function GET(request: Request, context: { params: Promise<{ id: string; imageId: string }> }) {
  try {
    await scheduleActor(request);
    const { id, imageId } = await context.params;
    if (!UUID.test(id) || !UUID.test(imageId)) throw new ScheduleError("Imagen inválida.");
    const sb = createAdminClient({ disableAuthRefresh: true });
    const { data, error } = await sb.from("icb_schedule_progress").select("attachments")
      .eq("task_id", id).contains("attachments", [{ id: imageId }]).limit(1).maybeSingle();
    if (error) throw error;
    const attachment = (data?.attachments as ScheduleAttachment[] | undefined)?.find(a => a.id === imageId);
    if (!attachment || attachment.path !== `${id}/${imageId}`) throw new ScheduleError("Imagen no encontrada.", 404);
    const { data: file, error: downloadError } = await sb.storage.from("icb-schedule").download(attachment.path);
    if (downloadError || !file) throw new ScheduleError("No se pudo cargar la imagen.", 404);
    return new Response(file, { headers: {
      "Content-Type": attachment.mime, "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch (error) { return scheduleFailure(error); }
}
