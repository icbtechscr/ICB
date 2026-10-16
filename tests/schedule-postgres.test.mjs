import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFile } from 'node:child_process';
const url = process.env.ICB_SCHEDULE_TEST_DATABASE_URL;
const psql = process.env.ICB_SCHEDULE_PSQL || 'psql';
async function sql(source) {
  const result = await new Promise((resolve, reject) => {
    const child = execFile(psql, [url, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
      { windowsHide: true, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, PGCLIENTENCODING: 'UTF8' } },
      (error, stdout, stderr) => error ? reject(Object.assign(error, { stdout, stderr })) : resolve({ stdout }));
    child.stdin.end(source, 'utf8');
  });
  return result.stdout.trim();
}
test('cronograma PostgreSQL: migración, permisos, orden, concurrencia, tiempos y bitácora', { skip: !url }, async () => {
  assert.match(new URL(url).pathname, /^\/icb_schedule_test(?:_\d+)?$/, 'Usar exclusivamente una base aislada icb_schedule_test');
  await sql(`do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
  end $$;
  create schema if not exists storage;
  create table if not exists storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  const migration = fs.readFileSync(new URL('../supabase/schedule.sql', import.meta.url), 'utf8');
  await sql(migration); await sql(migration);
  assert.equal(await sql('select count(*) from public.icb_schedule_tasks;'), '0', 'Esta prueba necesita una base nueva y vacía');
  const actor = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const mutate = async (action, input, dev = true) => JSON.parse(await sql(`set role service_role; select public.icb_schedule_mutate('${action}', '${JSON.stringify(input).replaceAll("'", "''")}'::jsonb, '${actor}', 'Prueba ICB', ${dev});`));
  const snapshot = async () => JSON.parse(await sql('set role service_role; select public.icb_schedule_snapshot();'));
  let state = await snapshot();
  assert.equal(state.revision, 0);
  const ids = [];
  for (let n = 0; n < 5; n++) ids.push((await mutate('create', { name: 'Tarea ' + n, description: 'Trabajo', started_at: '2026-01-01T10:00:00Z', suggested_difficulty: 3 }, false)).id);
  state = await snapshot();
  assert.equal(state.tasks.length, 5);
  assert.ok(state.tasks.every(t => t.column_id === 'unassigned' && t.difficulty === 0 && t.suggested_difficulty === 3 && t.created_by === actor));
  await assert.rejects(mutate('move', { id: ids[0], column_id: 'active', position: 0, revision: state.revision }, false), /SCHEDULE_FORBIDDEN/);
  for (let n = 0; n < 2; n++) {
    state = await snapshot();
    await mutate('move', { id: ids[n], column_id: 'active', position: n, revision: state.revision });
  }
  state = await snapshot();
  const simultaneous = await Promise.allSettled([2, 3].map(n => mutate('move', { id: ids[n], column_id: 'active', position: 2, revision: state.revision })));
  assert.equal(simultaneous.filter(r => r.status === 'fulfilled').length, 1);
  assert.ok(String(simultaneous.find(r => r.status === 'rejected').reason).includes('SCHEDULE_CONFLICT'));
  state = await snapshot();
  assert.equal(state.tasks.filter(t => t.column_id === 'active').length, 3);
  await assert.rejects(mutate('move', { id: ids[4], column_id: 'active', position: 3, revision: state.revision }), /SCHEDULE_FULL/);
  assert.equal((await snapshot()).revision, state.revision, 'Un rechazo no cambia la revisión');
  await mutate('move', { id: ids[0], column_id: 'active', position: 2, revision: state.revision });
  state = await snapshot();
  assert.equal(state.tasks.find(t => t.id === ids[0]).position, 2);
  const activeStart = state.tasks.find(t => t.id === ids[0]).active_since;
  await sql('select pg_sleep(0.03);');
  await mutate('move', { id: ids[0], column_id: 'urgent', position: 0, revision: state.revision });
  state = await snapshot();
  const paused = state.tasks.find(t => t.id === ids[0]);
  assert.ok(paused.active_ms > 0); assert.equal(paused.active_since, null);
  assert.ok(Date.parse(activeStart) <= Date.parse(paused.updated_at));
  assert.deepEqual(state.tasks.filter(t => t.column_id === 'active').map(t => t.position).sort(), [0, 1]);
  await mutate('move', { id: ids[0], column_id: 'active', position: 0, revision: state.revision });
  state = await snapshot();
  assert.equal(state.tasks.find(t => t.id === ids[0]).active_ms, paused.active_ms, 'Volver no reinicia el tiempo acumulado');
  await mutate('move', { id: ids[0], column_id: 'done', position: 0, revision: state.revision });
  state = await snapshot();
  const done = state.tasks.find(t => t.id === ids[0]);
  assert.ok(done.completed_at); assert.equal(done.active_since, null);
  await assert.rejects(mutate('edit', { id: done.id, revision: state.revision, expected_updated_at: paused.updated_at, description: 'Borrador antiguo', difficulty: 4 }), /SCHEDULE_CONFLICT/);
  await mutate('edit', { id: done.id, revision: state.revision, expected_updated_at: done.updated_at, description: 'Descripción final', difficulty: 2 });
  await mutate('progress', { id: done.id, body: 'Prueba terminada', attachments: [] });
  assert.equal(await sql(`select body from public.icb_schedule_progress where task_id='${done.id}';`), 'Prueba terminada');
  assert.equal(await sql(`select author_id from public.icb_schedule_progress where task_id='${done.id}';`), actor);
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(sql(`set role ${role}; select public.icb_schedule_snapshot();`), /permission denied/);
    await assert.rejects(sql(`set role ${role}; select * from public.icb_schedule_tasks;`), /permission denied/);
    await assert.rejects(sql(`set role ${role}; select public.icb_schedule_mutate('create','{}','${actor}','No autorizado',true);`), /permission denied/);
  }
  assert.equal(await sql("select public from storage.buckets where id='icb-schedule';"), 'f');
});
