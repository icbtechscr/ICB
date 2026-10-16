import { NextResponse } from "next/server";
import { getCurrentUser } from "./supabase-server";
import { getUserFullName, getUserRole, isAdminLike } from "./roles";
import { createAdminClient } from "./supabase";
import { isDifficulty, isScheduleColumn, validStart } from "./schedule";

export class ScheduleError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function scheduleActor(request: Request, devOnly = false) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const expectedOrigin = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? `http://${host}` : `https://${host}`;
  if (!["GET", "HEAD"].includes(request.method) && request.headers.get("origin") !== expectedOrigin) {
    throw new ScheduleError("Origen de la solicitud no permitido.", 403);
  }
  const user = await getCurrentUser();
  if (!user) throw new ScheduleError("Inicia sesión para abrir el cronograma.", 401);
  const role = getUserRole(user);
  if (!isAdminLike(role) || (devOnly && role !== "dev")) throw new ScheduleError("Solo el desarrollador puede organizar y actualizar las tareas.", 403);
  return { id: user.id, name: getUserFullName(user) || "Administrador", dev: role === "dev" };
}
export function scheduleFailure(error: unknown) {
  if (error instanceof ScheduleError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const known: Record<string, [string, number]> = {
    SCHEDULE_FULL: ["Ya hay 3 tareas en vivo. Mueve una a otra columna para liberar un espacio.", 409],
    SCHEDULE_CONFLICT: ["El tablero cambió en otra sesión. Se actualizó la vista; vuelve a intentar el cambio.", 409],
    SCHEDULE_NOT_FOUND: ["Esta tarea ya no está disponible.", 404],
    SCHEDULE_FORBIDDEN: ["Solo el desarrollador puede hacer este cambio.", 403],
    SCHEDULE_INVALID: ["Revisa los datos de la tarea.", 400],
  };
  for (const [code, [text, status]] of Object.entries(known)) {
    if (message.includes(code)) return NextResponse.json({ error: text }, { status });
  }
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (["42P01", "42883", "PGRST202", "PGRST205"].includes(code)) {
    return NextResponse.json({ error: "El cronograma necesita instalar su esquema en la base de datos de ICB (supabase/schedule.sql)." }, { status: 503 });
  }
  console.error("[schedule]", code || "unavailable");
  return NextResponse.json({ error: "No se pudo guardar o consultar el cronograma. Vuelve a intentarlo." }, { status: 500 });
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function scheduleJson(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > 40000) throw new ScheduleError("Solicitud demasiado grande.", 413);
  const raw = await request.text();
  if (raw.length > 30000) throw new ScheduleError("Solicitud demasiado grande.", 413);
  let data;
  try { data = JSON.parse(raw); } catch { throw new ScheduleError("Solicitud inválida."); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new ScheduleError("Solicitud inválida.");
  return data;
}
export function taskText(value: unknown, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new ScheduleError(`Completa el texto (máximo ${max} caracteres).`);
  return value.trim();
}
export function validateCreate(data: Record<string, unknown>) {
  const name = taskText(data.name, 160), description = taskText(data.description, 10000);
  if (!validStart(data.started_at)) throw new ScheduleError("Indica una fecha y hora de inicio válida, que no esté en el futuro.");
  if (!isDifficulty(data.suggested_difficulty)) throw new ScheduleError("Dificultad inválida.");
  return { name, description, started_at: data.started_at, suggested_difficulty: data.suggested_difficulty };
}
export function validateChange(data: Record<string, unknown>, id: string) {
  if (!UUID.test(id)) throw new ScheduleError("Tarea inválida.");
  if (!Number.isSafeInteger(data.revision) || Number(data.revision) < 0) throw new ScheduleError("Actualiza el tablero antes de continuar.");
  if (data.action === "move") {
    if (!isScheduleColumn(data.column_id) || !Number.isSafeInteger(data.position) || Number(data.position) < 0) throw new ScheduleError("Posición inválida.");
    return { id, revision: data.revision, column_id: data.column_id, position: data.position };
  }
  if (data.action === "edit" && isDifficulty(data.difficulty)) {
    if (typeof data.expected_updated_at !== "string" || data.expected_updated_at.length > 40 || !Number.isFinite(Date.parse(data.expected_updated_at))) {
      throw new ScheduleError("Recarga los detalles de la tarea antes de editar.");
    }
    return { id, revision: data.revision, expected_updated_at: data.expected_updated_at, description: taskText(data.description, 10000), difficulty: data.difficulty };
  }
  throw new ScheduleError("Cambio inválido.");
}
export async function mutateSchedule(action: string, input: object, actor: Awaited<ReturnType<typeof scheduleActor>>, sb = createAdminClient({ disableAuthRefresh: true })) {
  const { data, error } = await sb.rpc("icb_schedule_mutate", {
    p_action: action, p_input: input, p_actor: actor.id, p_name: actor.name, p_dev: actor.dev,
  });
  if (error) throw error;
  return data;
}
