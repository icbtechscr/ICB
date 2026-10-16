"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Clock3, GripVertical, ImagePlus, Plus, RefreshCw, X } from "lucide-react";
import {
  activeMilliseconds, costaRicaInput, DIFFICULTIES, duration, elapsedMilliseconds,
  SCHEDULE_COLUMNS, type ScheduleColumn, type ScheduleProgress, type ScheduleSnapshot, type ScheduleTask,
} from "@/lib/schedule";

const API = "/api/admin/schedule";
const inputStyle = "w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500";
const buttonStyle = "inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50";
const primaryStyle = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";
const date = (value: string) => new Date(value).toLocaleString("es-CR", { timeZone: "America/Costa_Rica", dateStyle: "medium", timeStyle: "short" });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo conectar con el cronograma.");
  return data as T;
}
function Modal({ title, children, onClose, busy }: { title: string; children: ReactNode; onClose: () => void; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby="schedule-modal-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-900/60">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-ink-200 bg-white px-5 py-4">
      <h2 id="schedule-modal-title" className="min-w-0 break-words text-lg font-black">{title}</h2>
      <button type="button" aria-label="Cerrar ventana" disabled={busy} onClick={onClose} className={buttonStyle}><X className="size-4" /></button>
    </header>
    <div className="space-y-5 p-5">{children}</div>
  </dialog>;
}
function ErrorNotice({ message }: { message: string | null }) {
  return message ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p> : null;
}
function DifficultySelect({ value, onChange, disabled, label }: { value: number; onChange: (value: number) => void; disabled?: boolean; label: string }) {
  return <label className="block space-y-1.5 text-sm font-semibold">{label}
    <select className={inputStyle} value={value} onChange={e => onChange(Number(e.target.value))} disabled={disabled}>
      {DIFFICULTIES.map((name, index) => <option key={name} value={index}>{name}</option>)}
    </select>
  </label>;
}

export function ScheduleBoard({ canManage: initialCanManage }: { canManage: boolean }) {
  const [board, setBoard] = useState<ScheduleSnapshot | null>(null);
  const [canManage, setCanManage] = useState(initialCanManage);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const [now, setNow] = useState(Date.now());
  const clockOffset = useRef(0);
  const [synced, setSynced] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<ScheduleColumn | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [search, setSearch] = useState("");
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const data = await api<ScheduleSnapshot & { canManage: boolean }>(API);
    if (!mounted.current) return;
    setBoard(previous => !previous || data.revision >= previous.revision ? data : previous);
    setCanManage(data.canManage);
    clockOffset.current = Date.parse(data.server_now) - Date.now();
    setNow(Date.now() + clockOffset.current);
    setSynced(data.server_now);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const sync = () => { if (document.visibilityState === "visible") void refresh().then(() => setError(null)).catch(e => setError(e.message)); };
    sync();
    const poll = window.setInterval(sync, 5000);
    const tick = window.setInterval(() => setNow(Date.now() + clockOffset.current), 1000);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("online", sync);
    return () => { mounted.current = false; clearInterval(poll); clearInterval(tick); document.removeEventListener("visibilitychange", sync); window.removeEventListener("online", sync); };
  }, [refresh]);

  async function mutate(path: string, init: RequestInit): Promise<boolean> {
    if (mutationLock.current) return false;
    mutationLock.current = true; setBusy(true); setError(null);
    try {
      await api(path, init);
      await refresh().catch(() => setError("El cambio se guardó. No se pudo actualizar la vista; pulsa Actualizar."));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el cambio.");
      await refresh().catch(() => {});
      return false;
    } finally { mutationLock.current = false; setBusy(false); }
  }
  function change(task: ScheduleTask, data: object) {
    return mutate(`${API}/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, revision: board?.revision }) });
  }
  function move(task: ScheduleTask, column: ScheduleColumn, position: number) {
    return change(task, { action: "move", column_id: column, position });
  }
  const tasks = board?.tasks ?? [];
  const ordered = (column: ScheduleColumn) => tasks.filter(t => t.column_id === column).sort((a, b) => a.position - b.position);
  const selected = tasks.find(t => t.id === selectedId);
  const active = ordered("active");
  function drop(event: React.DragEvent, column: ScheduleColumn, beforeId?: string) {
    event.preventDefault(); event.stopPropagation(); setOver(null); setDragged(null);
    if (!canManage || busy || search.trim()) return;
    const id = event.dataTransfer.getData("application/x-icb-task");
    const task = tasks.find(t => t.id === id);
    if (!task || task.id === beforeId) return;
    const siblings = ordered(column).filter(t => t.id !== id);
    const position = beforeId ? siblings.findIndex(t => t.id === beforeId) : siblings.length;
    if (position >= 0) void move(task, column, position);
  }
  const dragEvents = (column: ScheduleColumn, beforeId?: string) => ({
    onDragOver: (e: React.DragEvent) => { if (canManage && dragged && !busy && !search.trim()) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; setOver(column); } },
    onDrop: (e: React.DragEvent) => drop(e, column, beforeId),
  });
  function card(task: ScheduleTask) {
    return <article key={task.id} draggable={canManage && !busy && !search.trim()}
      onDragStart={e => { e.dataTransfer.setData("application/x-icb-task", task.id); e.dataTransfer.effectAllowed = "move"; setDragged(task.id); }}
      onDragEnd={() => { setDragged(null); setOver(null); }} {...dragEvents(task.column_id, task.id)}
      className={`rounded-xl border bg-white shadow-sm transition ${dragged === task.id ? "border-brand-400 opacity-40" : "border-ink-200 hover:border-brand-400"}`}>
      <button type="button" onClick={() => { setSelectedId(task.id); setError(null); }} className="w-full space-y-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-brand-600">
        <div className="flex items-start justify-between gap-2">
          <span className="break-words text-sm font-bold leading-5">{task.name}</span>
          {canManage && <GripVertical aria-hidden className="size-4 shrink-0 text-ink-400" />}
        </div>
        <p className="line-clamp-2 break-words text-xs leading-5 text-ink-500">{task.description}</p>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
          <span className="rounded-md bg-ink-100 px-2 py-1 text-ink-600">Dificultad: {DIFFICULTIES[task.difficulty]}</span>
          {!!task.suggested_difficulty && task.difficulty !== task.suggested_difficulty && <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">Sugerida: {DIFFICULTIES[task.suggested_difficulty]}</span>}
        </div>
        <div className="space-y-1 border-t border-ink-100 pt-2 text-xs text-ink-500">
          <p className={task.column_id === "active" ? "font-bold text-emerald-700" : ""}><Clock3 className="mr-1 inline size-3" />{duration(activeMilliseconds(task, now))} en vivo</p>
          <p className="truncate">Creada por {task.created_by_name}</p>
        </div>
      </button>
    </article>;
  }
  function column(columnId: ScheduleColumn) {
    const definition = SCHEDULE_COLUMNS.find(c => c.id === columnId)!;
    const entries = ordered(columnId);
    const visible = entries.filter(t => `${t.name} ${t.description} ${t.created_by_name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    return <section key={columnId} {...dragEvents(columnId)} aria-label={definition.label}
      className={`min-w-0 rounded-2xl border border-t-4 ${definition.color} ${over === columnId ? "bg-brand-50 ring-2 ring-brand-400" : "bg-ink-50"} p-3`}>
      <div className="mb-3 px-1"><div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">{definition.label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-500">{entries.length}</span></div><p className="mt-1 text-xs text-ink-500">{definition.hint}</p></div>
      <div className="space-y-3">{visible.map(card)}
        {!visible.length && <p className="rounded-xl border border-dashed border-ink-200 px-3 py-8 text-center text-xs text-ink-500">{search ? "Sin coincidencias" : canManage ? "Arrastra una tarea aquí" : "Sin tareas"}</p>}
        {!!visible.length && canManage && !search.trim() && <div {...dragEvents(columnId)} className="min-h-8 rounded-lg border border-dashed border-ink-200 p-2 text-center text-[10px] text-ink-400">Soltar al final</div>}
      </div>
    </section>;
  }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-600"><span className={`size-2 rounded-full ${synced && !error ? "bg-emerald-500" : "bg-amber-500"}`} />Desarrollo · ICB</div>
        <h1 className="text-3xl font-black tracking-tight">Cronograma</h1><p className="mt-2 max-w-xl text-sm text-ink-500">El trabajo de hoy, los próximos pasos y cada avance en un solo lugar.</p>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonStyle} disabled={busy} onClick={() => void refresh().then(() => setError(null)).catch(e => setError(e.message))}><RefreshCw className="size-4" />Actualizar</button>
        <button type="button" className={primaryStyle} disabled={!board || busy} onClick={() => { setCreating(true); setError(null); }}><Plus className="size-4" />Nueva tarea</button></div>
    </div>
    <ErrorNotice message={error} />
    {!board ? <div className="rounded-2xl border border-ink-200 bg-white p-10 text-center text-sm text-ink-500">{error ? "Cronograma no disponible. Puedes volver a intentar con Actualizar." : "Cargando cronograma…"}</div> : <>
      <section {...dragEvents("active")} className={`rounded-2xl border p-5 ${over === "active" ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400" : "border-emerald-200 bg-emerald-50/40"}`} aria-label="Trabajando ahora">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative size-2.5 rounded-full bg-emerald-500" /></span><h2 className="font-black">Trabajando ahora</h2><span className="text-xs font-bold text-emerald-700">{active.length}/3</span></div><p className="text-xs text-ink-500">El tiempo en vivo se pausa al salir de aquí</p></div>
        <div className="grid gap-3 md:grid-cols-3">{active.map(card)}{Array.from({ length: 3 - active.length }, (_, i) => <div key={`slot-${i}`} {...dragEvents("active")}
          className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 p-4 text-center text-emerald-700"><Plus className="size-5 opacity-60" /><p className="text-xs font-semibold">Espacio {active.length + i + 1} disponible</p><p className="text-[11px] opacity-70">{canManage ? "Arrastra una tarea para empezar" : "El desarrollador puede ocupar este espacio"}</p></div>)}</div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="w-full sm:max-w-xs"><span className="sr-only">Buscar tareas</span><input type="search" className={inputStyle} placeholder="Buscar tarea o administrador…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <p className="text-xs text-ink-500">{canManage ? search.trim() ? "Borra la búsqueda para arrastrar. También puedes mover desde el detalle." : "Arrastra para ordenar · Haz clic para ver detalles" : "Puedes crear tareas y sugerir dificultad. El desarrollador organiza el trabajo."}</p></div>
      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">{(["unassigned", "urgent", "important", "low"] as const).map(column)}</div>
      <section className="space-y-3"><button type="button" className={buttonStyle} aria-expanded={showDone} onClick={() => setShowDone(!showDone)}><Check className="size-4" />Terminadas ({ordered("done").length}) {showDone ? "−" : "+"}</button>
        {showDone ? column("done") : canManage && <div {...dragEvents("done")} className={`rounded-xl border border-dashed p-3 text-center text-xs text-ink-500 ${over === "done" ? "border-brand-500 bg-brand-50" : "border-ink-200"}`}>Suelta aquí una tarea para marcarla como terminada</div>}
      </section>
      <p className="text-xs text-ink-400" aria-live="off">{busy ? "Guardando…" : `Última sincronización: ${synced ? date(synced) : "pendiente"} · Se actualiza cada 5 segundos · Horario de Costa Rica`}</p>
    </>}
    {creating && <CreateTask busy={busy} error={error} onClose={() => setCreating(false)} onCreate={async data => {
      const saved = await mutate(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (saved) setCreating(false);
    }} />}
    {selected && <TaskDetails key={selected.id} task={selected} revision={board!.revision} now={now} canManage={canManage} busy={busy} error={error}
      onClose={() => setSelectedId(null)} onMove={(col, pos) => move(selected, col, pos)} count={col => ordered(col).filter(t => t.id !== selected.id).length}
      onSave={data => change(selected, { action: "edit", ...data })}
      onProgress={form => mutate(`${API}/${selected.id}/progress`, { method: "POST", body: form })} />}
  </div>;
}

function CreateTask({ busy, error, onClose, onCreate }: { busy: boolean; error: string | null; onClose: () => void; onCreate: (data: object) => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [started, setStarted] = useState(() => costaRicaInput());
  const [difficulty, setDifficulty] = useState(0);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const timestamp = new Date(`${started}:00-06:00`);
    if (!Number.isFinite(timestamp.getTime())) return;
    await onCreate({ name, description, started_at: timestamp.toISOString(), suggested_difficulty: difficulty });
  }
  return <Modal title="Nueva tarea" busy={busy} onClose={onClose}><ErrorNotice message={error} />
    <p className="text-sm text-ink-500">La tarea aparecerá en Sin asignar con tu nombre como creador.</p>
    <form className="space-y-4" onSubmit={submit}>
      <label className="block space-y-1.5 text-sm font-semibold">Nombre<input autoFocus required maxLength={160} className={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Integrar reportes de ventas" /></label>
      <label className="block space-y-1.5 text-sm font-semibold">¿Qué estoy haciendo?<textarea required maxLength={10000} rows={4} className={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el trabajo y el resultado esperado…" /></label>
      <label className="block space-y-1.5 text-sm font-semibold">Fecha y hora de inicio (Costa Rica)<input type="datetime-local" required max={costaRicaInput()} className={inputStyle} value={started} onChange={e => setStarted(e.target.value)} /></label>
      <DifficultySelect label="Dificultad sugerida" value={difficulty} onChange={setDifficulty} />
      <div className="flex justify-end gap-2"><button type="button" className={buttonStyle} disabled={busy} onClick={onClose}>Cancelar</button><button className={primaryStyle} disabled={busy}>{busy ? "Creando…" : "Crear tarea"}</button></div>
    </form>
  </Modal>;
}

function TaskDetails({ task, revision, now, canManage, busy, error, onClose, onMove, onSave, onProgress, count }: {
  task: ScheduleTask; revision: number; now: number; canManage: boolean; busy: boolean; error: string | null;
  onClose: () => void; onMove: (column: ScheduleColumn, position: number) => Promise<boolean>;
  onSave: (data: object) => Promise<boolean>; onProgress: (form: FormData) => Promise<boolean>; count: (column: ScheduleColumn) => number;
}) {
  const [description, setDescription] = useState(task.description);
  const [difficulty, setDifficulty] = useState(task.difficulty);
  const [dirty, setDirty] = useState(false);
  const editBase = useRef(task.updated_at);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [history, setHistory] = useState<ScheduleProgress[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const loadedOlder = useRef(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!dirty) { setDescription(task.description); setDifficulty(task.difficulty); } }, [task.description, task.difficulty, dirty]);
  useEffect(() => {
    let alive = true;
    void api<{ progress: ScheduleProgress[]; hasMore: boolean }>(`${API}/${task.id}`).then(data => {
      if (!alive) return;
      setHistory(previous => Array.from(new Map([...previous, ...data.progress].map(p => [p.id, p])).values()).sort((a, b) => b.id - a.id));
      if (!loadedOlder.current) setHasMore(data.hasMore);
      setHistoryError(null);
    }).catch(e => { if (alive) setHistoryError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [task.id, revision]);
  async function older() {
    setLoading(true);
    try {
      const last = history[history.length - 1];
      const data = await api<{ progress: ScheduleProgress[]; hasMore: boolean }>(`${API}/${task.id}?before=${last.id}`);
      setHistory(previous => Array.from(new Map([...previous, ...data.progress].map(p => [p.id, p])).values()).sort((a, b) => b.id - a.id));
      loadedOlder.current = true; setHasMore(data.hasMore); setHistoryError(null);
    } catch (e) { setHistoryError(e instanceof Error ? e.message : "No se pudieron cargar los avances."); }
    finally { setLoading(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (await onSave({ description, difficulty, expected_updated_at: editBase.current })) { setDirty(false); setMessage("Detalles guardados."); }
  }
  async function addProgress(event: FormEvent) {
    event.preventDefault();
    const form = new FormData(); form.set("body", body); files.forEach(file => form.append("images", file));
    if (await onProgress(form)) { setBody(""); setFiles([]); if (fileRef.current) fileRef.current.value = ""; setMessage("Avance guardado."); }
  }
  const col = SCHEDULE_COLUMNS.find(c => c.id === task.column_id)!;
  return <Modal title={task.name} busy={busy} onClose={onClose}>
    <ErrorNotice message={error} /><p role="status" className="text-sm text-emerald-700">{message}</p>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Tiempo trabajado en vivo</p><p className="mt-1 font-mono text-xl font-bold text-emerald-800">{duration(activeMilliseconds(task, now))}</p></div>
      <div className="rounded-xl border border-ink-200 bg-ink-50 p-4"><p className="text-xs text-ink-500">Tiempo desde el inicio {task.completed_at ? "hasta completar" : "(incluye espera)"}</p><p className="mt-1 font-mono text-xl font-bold">{duration(elapsedMilliseconds(task, now))}</p></div></div>
    <dl className="grid gap-2 text-xs text-ink-500 sm:grid-cols-2"><div><dt className="font-bold">Creada / asignada por</dt><dd>{task.created_by_name} · {date(task.created_at)}</dd></div><div><dt className="font-bold">Inicio indicado</dt><dd>{date(task.started_at)}</dd></div><div><dt className="font-bold">Dificultad sugerida</dt><dd>{DIFFICULTIES[task.suggested_difficulty]}</dd></div><div><dt className="font-bold">Estado</dt><dd>{col.label}{task.completed_at && ` · ${date(task.completed_at)}`}</dd></div></dl>
    {canManage && <div className="space-y-3 rounded-xl border border-ink-200 p-3"><label className="block space-y-1.5 text-sm font-semibold">Mover a
      <select value={task.column_id} className={inputStyle} disabled={busy} onChange={e => void onMove(e.target.value as ScheduleColumn, count(e.target.value as ScheduleColumn))}>
        {SCHEDULE_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select></label><div className="flex gap-2"><button className={buttonStyle} disabled={busy || task.position === 0} onClick={() => void onMove(task.column_id, task.position - 1)}><ArrowUp className="size-4" />Subir</button><button className={buttonStyle} disabled={busy || task.position >= count(task.column_id)} onClick={() => void onMove(task.column_id, task.position + 1)}><ArrowDown className="size-4" />Bajar</button></div></div>}
    <form onSubmit={save} className="space-y-3"><label className="block space-y-1.5 text-sm font-semibold">¿Qué estoy haciendo?<textarea required maxLength={10000} rows={4} className={inputStyle} readOnly={!canManage} value={description} onChange={e => { if (!dirty) editBase.current = task.updated_at; setDescription(e.target.value); setDirty(true); setMessage(""); }} /></label>
      <DifficultySelect label="Dificultad definida por el desarrollador" value={difficulty} disabled={!canManage || busy} onChange={v => { if (!dirty) editBase.current = task.updated_at; setDifficulty(v); setDirty(true); setMessage(""); }} />
      {canManage && <div className="flex flex-wrap gap-2"><button className={buttonStyle} disabled={busy || !dirty}>Guardar detalles</button>{dirty && <button type="button" className={buttonStyle} disabled={busy} onClick={() => { setDescription(task.description); setDifficulty(task.difficulty); setDirty(false); editBase.current = task.updated_at; }}>Recargar detalles y descartar edición</button>}</div>}
    </form>
    <section className="space-y-4 border-t border-ink-200 pt-5"><h3 className="font-black">Bitácora de avances</h3>
      {canManage && <form onSubmit={addProgress} className="space-y-3"><label className="block space-y-1.5 text-sm font-semibold">Nuevo avance<textarea maxLength={10000} rows={3} value={body} onChange={e => setBody(e.target.value)} className={inputStyle} placeholder="¿Qué resolviste? ¿Cuál es el siguiente paso?" /></label>
        <label className="block space-y-2 text-xs text-ink-500"><span className="inline-flex items-center gap-1.5 font-semibold"><ImagePlus className="size-4" />Adjuntar imágenes (hasta 4 · 5 MB cada una)</span><input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} className="block w-full rounded-xl border border-ink-200 p-2 text-xs" onChange={e => {
          const next = Array.from(e.target.files ?? []);
          if (next.length > 4 || next.some(f => f.size > 5 * 1024 * 1024)) { setHistoryError("Selecciona hasta 4 imágenes de máximo 5 MB cada una."); e.target.value = ""; setFiles([]); return; }
          setFiles(next); setHistoryError(null);
        }} /></label>
        <button className={primaryStyle} disabled={busy || (!body.trim() && !files.length)}>{busy ? "Guardando…" : "Registrar avance"}</button>
        <p className="text-xs text-ink-400">La fecha, hora y autor se registran automáticamente.</p>
      </form>}
      <ErrorNotice message={historyError} />
      {!history.length && <p className="text-sm text-ink-500">{loading ? "Cargando avances…" : historyError ? "Los avances no están disponibles." : "Todavía no hay avances registrados."}</p>}
      <ol className="space-y-4">{history.map(progress => <li key={progress.id} className="rounded-xl border border-ink-200 bg-ink-50 p-4"><div className="mb-2 flex flex-wrap justify-between gap-1 text-xs"><span className="font-bold">{progress.author_name}</span><time dateTime={progress.created_at} className="text-ink-500">{date(progress.created_at)}</time></div>
        {progress.body && <p className="whitespace-pre-wrap break-words text-sm leading-6">{progress.body}</p>}
        {!!progress.attachments.length && <div className="mt-3 grid grid-cols-2 gap-2">{progress.attachments.map(attachment => {
          const src = `${API}/${task.id}/images/${attachment.id}`;
          return <a key={attachment.id} href={src} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-ink-200 bg-white"><img src={src} alt={attachment.name} loading="lazy" className="h-32 w-full object-contain" /><span className="block truncate px-2 py-1 text-[10px] text-ink-500">{attachment.name}</span></a>;
        })}</div>}
      </li>)}</ol>
      {hasMore && !!history.length && <button className={buttonStyle} disabled={loading} onClick={() => void older()}>{loading ? "Cargando…" : "Ver avances anteriores"}</button>}
    </section>
  </Modal>;
}
