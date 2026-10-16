export const SCHEDULE_COLUMNS = [
  { id: "unassigned", label: "Sin asignar", hint: "Nuevas tareas por organizar", color: "border-ink-300" },
  { id: "active", label: "Trabajando ahora", hint: "Hasta 3 tareas en vivo", color: "border-emerald-500" },
  { id: "urgent", label: "Urgente", hint: "Lo siguiente por resolver", color: "border-red-400" },
  { id: "important", label: "Importante", hint: "Trabajo prioritario", color: "border-amber-400" },
  { id: "low", label: "No importante", hint: "Puede esperar", color: "border-sky-400" },
  { id: "done", label: "Terminadas", hint: "Historial de tareas completadas", color: "border-violet-400" },
] as const;
export type ScheduleColumn = typeof SCHEDULE_COLUMNS[number]["id"];
export const DIFFICULTIES = ["Sin definir", "Baja", "Media", "Alta", "Muy alta"] as const;
export type ScheduleTask = {
  id: string; name: string; description: string; started_at: string;
  created_at: string; updated_at: string; created_by: string; created_by_name: string;
  column_id: ScheduleColumn; position: number; suggested_difficulty: number;
  difficulty: number; active_since: string | null; active_ms: number; completed_at: string | null;
};
export type ScheduleAttachment = { id: string; name: string; path: string; mime: string; size: number };
export type ScheduleProgress = {
  id: number; task_id: string; author_name: string; created_at: string;
  body: string; attachments: ScheduleAttachment[];
};
export type ScheduleSnapshot = { revision: number; tasks: ScheduleTask[]; server_now: string };

export function isScheduleColumn(value: unknown): value is ScheduleColumn {
  return SCHEDULE_COLUMNS.some(c => c.id === value);
}
export function isDifficulty(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4;
}
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 3600)}h ${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}m ${String(seconds % 60).padStart(2, "0")}s`;
}
export function activeMilliseconds(task: ScheduleTask, now: number): number {
  return task.active_ms + (task.active_since ? Math.max(0, now - Date.parse(task.active_since)) : 0);
}
export function elapsedMilliseconds(task: ScheduleTask, now: number): number {
  return Math.max(0, (task.completed_at ? Date.parse(task.completed_at) : now) - Date.parse(task.started_at));
}
/** datetime-local is always expressed in Costa Rica, independently of the device zone. */
export function costaRicaInput(now = new Date()): string {
  return new Date(now.getTime() - 6 * 3600000).toISOString().slice(0, 16);
}
export function validStart(value: unknown, now = Date.now()): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && Date.parse(value) <= now;
}
export function detectImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  const ascii = (a: number, b: number) => String.fromCharCode(...bytes.slice(a, b));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "image/gif";
  return null;
}
