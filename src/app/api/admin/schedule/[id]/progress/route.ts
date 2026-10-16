import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { detectImage, type ScheduleAttachment } from "@/lib/schedule";
import { mutateSchedule, scheduleActor, ScheduleError, scheduleFailure, UUID } from "@/lib/schedule-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const uploaded: string[] = [];
  let sb: ReturnType<typeof createAdminClient> | undefined;
  let mutationAttempted = false;
  try {
    const actor = await scheduleActor(request, true);
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ScheduleError("Tarea inválida.");
    if (Number(request.headers.get("content-length")) > 21 * 1024 * 1024) throw new ScheduleError("Los adjuntos superan el límite permitido.", 413);
    const form = await request.formData();
    const body = form.get("body");
    if (typeof body !== "string" || body.length > 10000) throw new ScheduleError("El avance puede tener hasta 10000 caracteres.");
    const files = form.getAll("images");
    if (files.length > 4) throw new ScheduleError("Puedes adjuntar hasta 4 imágenes por avance.");
    if (!body.trim() && !files.length) throw new ScheduleError("Escribe un avance o adjunta una imagen.");
    const validated: { file: File; bytes: Uint8Array; mime: string }[] = [];
    for (const file of files) {
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024 || !file.size) throw new ScheduleError("Cada imagen debe pesar entre 1 byte y 5 MB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = detectImage(bytes);
      if (!mime || mime !== file.type) throw new ScheduleError("Adjunta imágenes PNG, JPG, WebP o GIF válidas.");
      validated.push({ file, bytes, mime });
    }
    sb = createAdminClient({ disableAuthRefresh: true });
    const { data: task, error } = await sb.from("icb_schedule_tasks").select("id").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!task) throw new ScheduleError("Tarea no encontrada.", 404);
    const attachments: ScheduleAttachment[] = [];
    for (const { file, bytes, mime } of validated) {
      const attachmentId = crypto.randomUUID();
      const path = `${id}/${attachmentId}`;
      const { error: uploadError } = await sb.storage.from("icb-schedule").upload(path, bytes, { contentType: mime, upsert: false });
      if (uploadError) throw uploadError;
      uploaded.push(path);
      attachments.push({ id: attachmentId, path, name: file.name.slice(0, 180), mime, size: file.size });
    }
    mutationAttempted = true;
    const data = await mutateSchedule("progress", { id, body: body.trim(), attachments }, actor, sb);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    // A lost RPC response may have committed; keep files in that case to avoid broken saved notes.
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (sb && uploaded.length && (!mutationAttempted || ["P0001", "23514", "23502", "23503"].includes(code))) {
      try { await sb.storage.from("icb-schedule").remove(uploaded); } catch { /* cleanup can be retried by operations */ }
    }
    return scheduleFailure(error);
  }
}
