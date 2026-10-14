import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(relative, dependencies = {}) {
  const source = fs.readFileSync(new URL('../src/' + relative, import.meta.url), 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
    {exports, Date, Number, Set, Map, Error, Request, Response, require(name) {
      if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
      return dependencies[name];
    }});
  return exports;
}
const roles = load('lib/roles.ts', {'./image-url':{rewriteMediaUrl:v=>v}});
const clock = load('lib/timeclock.ts');
const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const other='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const admin = {id, user_metadata:{full_name:'Admin que marca',role:'admin',branch_ids:['cartago'],clock_in_required:true}};
const noop=()=>{};
const jsx = (type,props)=>({type,props});
const runtime={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'}};

test('marcar no quita ni concede permisos administrativos y no activa otros administradores', () => {
  assert.equal(roles.getUserRole(admin),'admin');
  assert.equal(roles.isAdminLike(roles.getUserRole(admin)),true);
  assert.equal(roles.mustClockIn(admin),true);
  assert.equal(roles.mustClockIn({user_metadata:{role:'admin'}}),false);
  assert.equal(roles.mustClockIn({user_metadata:{role:'admin',clock_in_required:'true'}}),false);
  assert.equal(roles.mustClockIn('admin'),false);
  for (const role of ['dev','colaborador']) assert.equal(roles.mustClockIn({user_metadata:{role}}),true);
  assert.equal(roles.getUserRole({user_metadata:{role:'colaborador',clock_in_required:true}}),'colaborador');
});

test('roster pagina, incluye admin autorizado y conserva error en vez de ocultar la lista', async () => {
  const calls=[];
  const rosterLib=load('lib/timeclock-roster.ts',{'./roles':roles,'./supabase':{createAdminClient:()=>({auth:{admin:{listUsers:async opts=>{
    calls.push(opts.page);
    return {data:{users:opts.page===1?Array.from({length:500},(_,i)=>({id:String(i),user_metadata:{role:'admin'}})):[admin]},error:null};
  }}}})}});
  const roster=await rosterLib.listTimeclockEmployees();
  assert.deepEqual(calls,[1,2]);
  assert.equal(roster.length,1); assert.equal(roster[0].id,id);
  assert.equal(rosterLib.unassignedUsersForBranch(roster,'cartago')[0],id);
  assert.equal(rosterLib.unassignedUsersForBranch(roster,'heredia').length,0);
  const failed=load('lib/timeclock-roster.ts',{'./roles':roles,'./supabase':{createAdminClient:()=>({auth:{admin:{listUsers:async()=>({data:null,error:new Error('auth unavailable')})}}})}});
  await assert.rejects(failed.listTimeclockEmployees(),/auth unavailable/);
});

test('GPS sin sede no es Sin GPS ni En sede; remoto/fuera/manual se distinguen', () => {
  const cell={lat:9.9,lng:-84,branchId:null,branchName:null,distance:null,within:false};
  assert.equal(clock.punchLocationStatus(cell).label,'GPS registrado · Sin sede');
  assert.equal(clock.punchLocationStatus(cell).kind,'unassigned');
  assert.equal(clock.punchLocationStatus({...cell,lat:null}).label,'Sin GPS');
  assert.equal(clock.punchLocationStatus({...cell,lng:NaN}).label,'Sin GPS');
  assert.equal(clock.punchLocationStatus({...cell,branchId:'cartago',within:true,branchName:'ICB Technologies Costa Rica Cartago'}).label,'Cartago');
  assert.equal(clock.punchLocationStatus({...cell,branchId:'remoto',within:true}).label,'Casa');
  assert.equal(clock.punchLocationStatus({...cell,branchId:'cartago',distance:350}).label,'A 350 m');
  assert.equal(clock.punchLocationStatus({...cell,branchId:'cartago',within:null}).label,'GPS registrado · Sin validar');
});

test('consulta filtra sede real o marcas nulas del roster, nunca otra sede ni todos los nulos', async () => {
  const calls=[];
  const chain={};
  for(const name of ['select','order','limit','gte','lt','eq','or']) chain[name]=(...args)=>{calls.push([name,...args]);return chain;};
  chain.then=resolve=>Promise.resolve({data:[],error:null}).then(resolve);
  const server=load('lib/timeclock-server.ts',{'./timeclock':clock,'./supabase':{createAdminClient:()=>({from:()=>chain})}});
  await server.adminListEntries({from:'2026-09-14',to:'2026-10-13',branchId:'cartago',userId:id,unassignedUserIds:[id,id]});
  assert.ok(calls.some(c=>c[0]==='or'&&c[1]===`branch_id.eq.cartago,and(branch_id.is.null,user_id.in.(${id}))`));
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]===id));
  assert.ok(calls.some(c=>c[0]==='lt'&&c[2]==='2026-10-14T06:00:00.000Z'));
  calls.length=0;
  await server.adminListEntries({branchId:'heredia',unassignedUserIds:[]});
  assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='branch_id'&&c[2]==='heredia'));
  assert.ok(!calls.some(c=>c[0]==='or'));
  await assert.rejects(server.adminListEntries({branchId:'cartago),user_id.not.is.null'}),/Sede inválida/);
  await assert.rejects(server.adminListEntries({branchId:'cartago',unassignedUserIds:['bad.id']}),/Colaborador inválido/);
});

test('historial y hoy incluyen admin que marca, conservan GPS y sede histórica nula sin editar', async () => {
  const day=clock.crTodayIso();
  const yesterday=clock.crTodayIso(new Date(Date.now()-86400000));
  const original={id:'entry',user_id:id,employee_name:'Admin que marca',branch_id:null,branch_name:null,punch_type:'entrada',
    punched_at:yesterday+'T14:30:00Z',latitude:9.9,longitude:-84,distance_m:null,within_range:false};
  const snapshot=JSON.stringify(original);
  const queries=[];
  const dependencies={...runtime,'lucide-react':{History:'History',CalendarDays:'CalendarDays'},'@/lib/timeclock':clock,
    '@/lib/timeclock-server':{adminListEntries:async opts=>{queries.push(opts);return [{...original,punched_at:(opts.to===day?day:yesterday)+'T14:30:00Z'}];}},
    '@/lib/timeclock-roster':{listTimeclockEmployees:async()=>[{id,name:'Admin que marca',branchIds:['cartago']},{id:other,name:'Otra sede',branchIds:['heredia']}],
      unassignedUsersForBranch:(r,b)=>r.filter(e=>e.branchIds.includes(b)).map(e=>e.id)},
    '@/lib/supabase-server':{getCurrentUser:async()=>admin},'@/lib/roles':roles,
    '@/lib/branches':{BRANCHES:[{id:'cartago',city:'Cartago'},{id:'heredia',city:'Heredia'}]},
    '@/components/admin/HorarioFilters':{HorarioFilters:'Filters'},'@/components/admin/HorarioTable':{HorarioTable:'Table'},
    '@/components/admin/TimeclockExport':{TimeclockExport:'Export'}};
  function find(node,type) {
    if(Array.isArray(node)) return node.map(n=>find(n,type)).find(Boolean);
    if(!node||typeof node!=='object') return null;
    return node.type===type?node:find(node.props?.children,type);
  }
  for(const route of ['historial','horario']) {
    const page=load(`app/admin/colaboradores/${route}/page.tsx`,dependencies);
    const tree=await page.default({searchParams:Promise.resolve({branch:'cartago',user:id})});
    const filters=find(tree,'Filters'), table=find(tree,'Table');
    assert.ok(filters.props.employees.some(e=>e.id===id));
    assert.equal(table.props.editable,false);
    assert.equal(table.props.rows.length,1);
    assert.equal(table.props.rows[0].branchName,null);
    assert.equal(table.props.rows[0].cells.entrada.lat,9.9);
    assert.equal(table.props.rows[0].cells.entrada.branchId,null);
    assert.equal(queries.at(-1).unassignedUserIds.join(','),id);
  }
  assert.equal(JSON.stringify(original),snapshot);
});

test('las tres vistas y las exportaciones usan la misma distinción de GPS/sede', () => {
  for(const component of ['admin/HorarioTable.tsx','admin/EditableCell.tsx','timeclock/PunchPanel.tsx']) {
    const source=fs.readFileSync(new URL('../src/components/'+component,import.meta.url),'utf8');
    assert.match(source,/import \{ LocationBadge \}/);
    assert.doesNotMatch(source,/Sin ubic\.|Sin ubicación/);
  }
  const exporter=fs.readFileSync(new URL('../src/components/admin/TimeclockExport.tsx',import.meta.url),'utf8');
  assert.match(exporter,/punchLocationStatus\(cell\).label/);
  assert.doesNotMatch(exporter,/sin ubicacion/);
});

test('una marca nueva usa Cartago asignado y GPS validado sin alterar rol ni otras marcas', async () => {
  const branches=load('lib/branches.ts');
  const cartago=branches.getLocation('cartago');
  const writes=[];
  const saved={insert:row=>{writes.push(row);return {select:()=>({single:async()=>({data:{id:'fake-entry',...row},error:null})})};}};
  class NextResponse extends Response { static json(body) {return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});} }
  const route=load('app/api/timeclock/punch/route.ts',{
    'next/server':{NextResponse},'@/lib/roles':roles,'@/lib/timeclock':clock,'@/lib/branches':branches,
    '@/lib/supabase-server':{createSupabaseServer:async()=>({auth:{getUser:async()=>({data:{user:admin}})}})},
    '@/lib/supabase':{createAdminClient:()=>({from:table=>{assert.equal(table,'time_entries');return saved;}})}});
  const result=await route.POST(new Request('https://example.invalid/api/timeclock/punch',{method:'POST',body:JSON.stringify({punchType:'entrada',latitude:cartago.lat,longitude:cartago.lng,accuracy:10})}));
  assert.equal(result.status,200);
  assert.equal(writes.length,1);
  assert.equal(writes[0].branch_id,'cartago');
  assert.equal(writes[0].within_range,true);
  assert.equal(writes[0].distance_m,0);
  assert.equal(writes[0].latitude,cartago.lat);
  assert.equal(admin.user_metadata.role,'admin');
  const rejected=await route.POST(new Request('https://example.invalid/api/timeclock/punch',{method:'POST',body:JSON.stringify({punchType:'entrada'})}));
  assert.equal(rejected.status,400);
  assert.equal(writes.length,1);
});
