import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const exports = {};
  const source = fs.readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Date, Number, Set, Map, Error, Request, Response, File, FormData, URL, Uint8Array, crypto, console,
      process: { env: { NODE_ENV: 'production', NEXT_PUBLIC_SITE_ORIGIN: 'https://www.icbtechscr.com', NEXT_PUBLIC_SITE_URL: 'https://icbtechscr.com/', NEXT_PUBLIC_SUPABASE_URL: 'https://example.invalid', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test', SUPABASE_SECRET_KEY: 'secret-test' } },
      require(name) { if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name); return dependencies[name]; } });
  return exports;
}
const model = load('lib/schedule.ts');
const roles = load('lib/roles.ts', { './image-url': { rewriteMediaUrl: v => v } });
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
let current;
let rpcCalls = [];
const sb = { rpc: async (name, data) => { rpcCalls.push({ name, data }); return { data: { id }, error: null }; } };
const server = load('lib/schedule-server.ts', {
  'next/server': { NextResponse: Response }, './schedule': model, './roles': roles,
  './supabase-server': { getCurrentUser: async () => current }, './supabase': { createAdminClient: () => sb },
});
const request = (method = 'GET', origin = 'https://icbtechscr.com') => new Request('http://internal:3000/api/admin/schedule', { method, headers: { host: 'icbtechscr.com', origin } });

test('cronograma: sesión, rol y origen se comprueban en el handler antes de acceder a datos', async () => {
  current = null;
  await assert.rejects(server.scheduleActor(request()), e => e.status === 401);
  current = { id, user_metadata: { role: 'colaborador' } };
  await assert.rejects(server.scheduleActor(request()), e => e.status === 403);
  current = { id, user_metadata: { role: 'admin', full_name: 'Admin' } };
  assert.equal((await server.scheduleActor(request())).dev, false);
  await assert.rejects(server.scheduleActor(request('POST'), true), e => e.status === 403);
  await assert.rejects(server.scheduleActor(request('POST', 'https://otro.example')), e => e.status === 403);
  await assert.rejects(server.scheduleActor(new Request('https://icbtechscr.com/api/admin/schedule', { method: 'POST' })), e => e.status === 403);
  current = { id, user_metadata: { role: 'dev', full_name: 'Dev' } };
  const actor = await server.scheduleActor(request('PATCH'), true);
  assert.equal(actor.dev, true);
  assert.equal(actor.id, id);
});
test('cronograma: crear detrás del proxy acepta el origen público aunque Host sea interno', async () => {
  current = { id, user_metadata: { role: 'dev', full_name: 'Dev real' } };
  const route = load('app/api/admin/schedule/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/supabase': { createAdminClient: () => sb }, '@/lib/schedule-server': server });
  for (const origin of ['https://www.icbtechscr.com', 'https://icbtechscr.com']) {
    const before = rpcCalls.length;
    const req = new Request('http://localhost:3000/api/admin/schedule', { method: 'POST', headers: {
      host: 'localhost:3000', origin, 'content-type': 'application/json', 'x-forwarded-host': 'www.icbtechscr.com',
    }, body: JSON.stringify({ name: 'Correos con dominio', description: 'Crear un buzón para diferentes correos', started_at: '2026-01-01T13:00:00Z', suggested_difficulty: 4 }) });
    const response = await route.POST(req);
    assert.equal(response.status, 201);
    assert.equal(rpcCalls.length, before + 1);
    assert.equal(rpcCalls.at(-1).data.p_input.name, 'Correos con dominio');
    assert.equal(rpcCalls.at(-1).data.p_actor, id);
  }
  for (const origin of ['https://malicioso.example', 'http://localhost:3000', 'null', 'https://www.icbtechscr.com.malicioso.example', 'https://www.icbtechscr.com/']) {
    const forged = new Request('http://localhost:3000/api/admin/schedule', { method: 'POST', headers: {
      host: 'malicioso.example', origin, 'x-forwarded-host': 'www.icbtechscr.com',
    } });
    await assert.rejects(server.scheduleActor(forged), e => e.status === 403);
  }
});
test('cronograma: altas ignoran identidad, columna y dificultad definitiva suministradas por el cliente', async () => {
  const input = server.validateCreate({ name: ' Tarea ', description: ' Trabajo ', started_at: '2026-01-01T10:00:00Z', suggested_difficulty: 3,
    created_by: 'otro', column_id: 'active', difficulty: 4, p_dev: true });
  assert.equal(input.name, 'Tarea');
  assert.equal(input.created_by, undefined); assert.equal(input.column_id, undefined); assert.equal(input.difficulty, undefined);
  assert.throws(() => server.validateCreate({ ...input, name: ' ' }));
  assert.throws(() => server.validateCreate({ ...input, started_at: '2099-01-01T00:00:00Z' }));
  assert.throws(() => server.validateCreate({ ...input, suggested_difficulty: '3' }));
  await server.mutateSchedule('create', input, { id, name: 'Admin real', dev: false });
  const call = rpcCalls.at(-1);
  assert.equal(call.data.p_actor, id); assert.equal(call.data.p_name, 'Admin real'); assert.equal(call.data.p_dev, false);
});
test('cronograma: movimientos y edición exigen versión, posición y tarea válidas', () => {
  const move = { action: 'move', column_id: 'active', position: 0, revision: 2 };
  assert.equal(server.validateChange(move, id).id, id);
  for (const patch of [{ revision: undefined }, { position: -1 }, { position: 0.5 }, { column_id: 'inventada' }]) assert.throws(() => server.validateChange({ ...move, ...patch }, id));
  assert.throws(() => server.validateChange(move, '../otra'));
  assert.throws(() => server.validateChange({ action: 'edit', revision: 2, description: 'Cambio', difficulty: 2 }, id));
  assert.equal(server.validateChange({ action: 'edit', revision: 2, description: 'Cambio', difficulty: 2, expected_updated_at: '2026-01-01T10:00:00Z' }, id).difficulty, 2);
  assert.equal(server.validateChange({ action: 'edit', revision: 2, description: 'Cambio', difficulty: 2, expected_updated_at: '2026-01-01T10:00:00.123456+00:00' }, id).expected_updated_at, '2026-01-01T10:00:00.123456+00:00');
});
test('cronograma: errores de capacidad/conflicto se comunican sin filtrar detalles internos', async () => {
  for (const code of ['SCHEDULE_FULL', 'SCHEDULE_CONFLICT']) {
    const response = server.scheduleFailure({ message: code + ' detalle privado' });
    assert.equal(response.status, 409); assert.ok(!(await response.text()).includes('privado'));
  }
  assert.equal(server.scheduleFailure({ code: 'PGRST202' }).status, 503);
});
test('cronograma: reloj acumula solo sesiones activas, congela finalizadas y usa Costa Rica', () => {
  const task = { active_ms: 60000, active_since: '2026-10-16T14:00:00Z', started_at: '2026-10-16T12:00:00Z', completed_at: null };
  const now = Date.parse('2026-10-16T14:02:00Z');
  assert.equal(model.activeMilliseconds(task, now), 180000);
  assert.equal(model.activeMilliseconds({ ...task, active_since: null }, now + 60000), 60000);
  assert.equal(model.elapsedMilliseconds({ ...task, completed_at: '2026-10-16T13:00:00Z' }, now), 3600000);
  assert.equal(model.costaRicaInput(new Date('2026-10-16T14:02:00Z')), '2026-10-16T08:02');
  assert.equal(model.duration(3661000), '1h 01m 01s');
});
test('cronograma: adjuntos verifican cabecera real y no admiten HTML o SVG', () => {
  assert.equal(model.detectImage(new Uint8Array([137,80,78,71,13,10,26,10])), 'image/png');
  assert.equal(model.detectImage(new Uint8Array([255,216,255,0])), 'image/jpeg');
  assert.equal(model.detectImage(new TextEncoder().encode('GIF89atest')), 'image/gif');
  assert.equal(model.detectImage(new TextEncoder().encode('RIFF0000WEBP')), 'image/webp');
  for (const text of ['<svg onload="alert(1)">', '<!doctype html>', 'not an image']) assert.equal(model.detectImage(new TextEncoder().encode(text)), null);
});
test('cronograma: rutas rechazan accesos sin sesión antes de invocar Supabase', async () => {
  current = null; rpcCalls = [];
  const deps = { 'next/server': { NextResponse: Response }, '@/lib/supabase': { createAdminClient: () => { throw new Error('Must not access data'); } }, '@/lib/schedule-server': server, '@/lib/schedule': model };
  for (const [path, method, context] of [
    ['app/api/admin/schedule/route.ts', 'GET'], ['app/api/admin/schedule/route.ts', 'POST'],
    ['app/api/admin/schedule/[id]/route.ts', 'GET', { params: Promise.resolve({ id }) }],
    ['app/api/admin/schedule/[id]/route.ts', 'PATCH', { params: Promise.resolve({ id }) }],
    ['app/api/admin/schedule/[id]/progress/route.ts', 'POST', { params: Promise.resolve({ id }) }],
    ['app/api/admin/schedule/[id]/images/[imageId]/route.ts', 'GET', { params: Promise.resolve({ id, imageId: id }) }],
  ]) {
    const route = load(path, deps);
    assert.equal((await route[method](request(method), context)).status, 401, path);
  }
  assert.equal(rpcCalls.length, 0);
});
test('cronograma: clientes de polling no activan temporizadores de refresco ni cambian otros clientes', () => {
  const created = [];
  const factory = load('lib/supabase.ts', {
    '@supabase/supabase-js': { createClient: (url, key, options) => { const value = { url, key, options }; created.push(value); return value; } },
    'next/headers': { headers: async () => new Headers() }, './audit': { writeAuditEvent: async () => {} },
  });
  factory.createAdminClient();
  factory.createAdminClient({ disableAuthRefresh: true });
  assert.equal(created[1].options.auth.autoRefreshToken, undefined);
  assert.equal(created[2].options.auth.autoRefreshToken, false);
  assert.equal(created[2].options.auth.detectSessionInUrl, false);
  assert.equal(created[2].options.auth.persistSession, false);
  assert.equal(created[2].key, 'secret-test');
  assert.notEqual(created[1], created[2]);
});
test('cronograma: imágenes solo se sirven si están vinculadas a la tarea y con headers privados', async () => {
  current = { id, user_metadata: { role: 'admin' } };
  let path = `${id}/${id}`, downloaded = [];
  const attachment = () => ({ id, path, mime: 'image/png', name: 'prueba.png' });
  const chain = {};
  for (const name of ['select', 'eq', 'contains', 'limit']) chain[name] = () => chain;
  chain.maybeSingle = async () => ({ data: { attachments: [attachment()] }, error: null });
  const route = load('app/api/admin/schedule/[id]/images/[imageId]/route.ts', {
    '@/lib/schedule-server': server,
    '@/lib/supabase': { createAdminClient: options => {
      assert.equal(options.disableAuthRefresh, true);
      return { from: () => chain, storage: { from: () => ({ download: async key => { downloaded.push(key); return { data: new Blob(['image']), error: null }; } }) } };
    } },
  });
  const context = { params: Promise.resolve({ id, imageId: id }) };
  const response = await route.GET(request(), context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(downloaded.length, 1);
  path = 'otra-tarea/imagen';
  assert.equal((await route.GET(request(), context)).status, 404);
  assert.equal(downloaded.length, 1);
});
test('cronograma: avance guarda imágenes privadas y autor real; limpia rechazos y preserva respuestas ambiguas', async () => {
  current = { id, user_metadata: { role: 'dev', full_name: 'Dev real' } };
  let rpcError = null;
  const uploads = [], removals = [], writes = [];
  const chain = {};
  for (const name of ['select', 'eq']) chain[name] = () => chain;
  chain.maybeSingle = async () => ({ data: { id }, error: null });
  const storage = { upload: async (path, bytes, options) => { uploads.push({ path, bytes, options }); return { error: null }; }, remove: async paths => { removals.push(paths); return { error: null }; } };
  const client = { from: () => chain, storage: { from: bucket => { assert.equal(bucket, 'icb-schedule'); return storage; } }, rpc: async (name, data) => { writes.push(data); return { data: { id }, error: rpcError }; } };
  const route = load('app/api/admin/schedule/[id]/progress/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/schedule-server': server, '@/lib/schedule': model, '@/lib/supabase': { createAdminClient: () => client } });
  const context = { params: Promise.resolve({ id }) };
  const req = (valid = true) => {
    const form = new FormData(); form.set('body', 'Avance con imagen'); form.set('author_name', 'Autor falso');
    form.append('images', new File([valid ? new Uint8Array([137,80,78,71,13,10,26,10]) : '<html>'], 'prueba.png', { type: 'image/png' }));
    return new Request('http://internal:3000/api/admin/schedule', { method: 'POST', headers: { host: 'icbtechscr.com', origin: 'https://icbtechscr.com' }, body: form });
  };
  assert.equal((await route.POST(req(), context)).status, 201);
  assert.equal(writes[0].p_name, 'Dev real'); assert.equal(writes[0].p_actor, id);
  assert.equal(writes[0].p_input.attachments.length, 1);
  assert.equal(writes[0].p_input.attachments[0].path, uploads[0].path);
  assert.equal(uploads[0].options.upsert, false);
  assert.equal((await route.POST(req(false), context)).status, 400);
  assert.equal(uploads.length, 1, 'Una imagen inválida no se sube');
  rpcError = { code: 'P0001', message: 'SCHEDULE_NOT_FOUND' };
  assert.equal((await route.POST(req(), context)).status, 404);
  assert.equal(removals.length, 1);
  rpcError = { message: 'Lost connection' };
  assert.equal((await route.POST(req(), context)).status, 500);
  assert.equal(removals.length, 1, 'No eliminar adjuntos si la escritura pudo confirmarse');
});
