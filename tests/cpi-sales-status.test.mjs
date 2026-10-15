import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path,dependencies={}) {
 const exports={};const source=fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
  {exports,Date,Intl,Number,AbortSignal,require:name=>{if(!(name in dependencies))throw Error('Unexpected dependency '+name);return dependencies[name];}});
 return exports;
}
const now=new Date('2026-10-15T16:00:00Z');
function statusReader({syncedAt='2026-10-15T15:50:00Z',fecha='2026-10-15T12:00:00Z',error=null,fail=false}={}) {
 const calls=[];
 const sb={from:table=>{assert.equal(table,'cpi_sales');const chain={};let column='';
  chain.select=name=>{column=name;calls.push(name);return chain;};
  chain.order=()=>chain;chain.limit=()=>chain;chain.abortSignal=()=>chain;
  chain.maybeSingle=async()=>{if(fail)throw Error('offline');return {data:column==='synced_at'?(syncedAt?{synced_at:syncedAt}:null):(fecha?{fecha}:null),error};};
  return chain;
 }};
 const mod=load('lib/cpi-sales-status.ts',{'@/lib/supabase':{createAdminClient:()=>sb}});
 return {read:()=>mod.getCpiSalesStatus(now),calls};
}
test('actualización reciente se distingue de una copia detenida el 1 de octubre',async()=>{
 assert.equal((await statusReader().read()).state,'fresh');
 const old=await statusReader({syncedAt:'2026-10-01T22:00:37Z',fecha:'2026-10-01T12:00:00Z'}).read();
 assert.equal(old.state,'stale');assert.equal(old.syncedAt,'2026-10-01T22:00:37Z');
});
test('base vacía, error de Supabase y fecha inválida no se presentan como actualización exitosa',async()=>{
 assert.equal((await statusReader({syncedAt:null,fecha:null}).read()).state,'empty');
 for(const opts of [{error:{code:'PGRST205'}},{fail:true},{syncedAt:'bad-date'},{syncedAt:'2027-01-01T00:00:00Z'}]) assert.equal((await statusReader(opts).read()).state,'unavailable');
});
test('última sincronización no se confunde con la fecha de la factura',async()=>{
 const reader=statusReader({fecha:'2026-09-01T12:00:00Z'});const result=await reader.read();
 assert.equal(result.state,'fresh');assert.equal(result.latestSaleAt,'2026-09-01T12:00:00Z');
 assert.deepEqual(reader.calls.sort(),['fecha','synced_at']);
});
const jsx=(type,props)=>({type,props});
function text(node){if(Array.isArray(node))return node.map(text).join('');if(node&&typeof node==='object')return text(node.props?.children);return node==null?'':String(node);}
test('aviso explica datos incompletos sin culpar al vendedor ni afirmar que no vendió',async()=>{
 for(const state of ['stale','empty','unavailable']){
  const component=load('components/CpiSalesStatusNotice.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},'@/lib/cpi-sales-status':{getCpiSalesStatus:async()=>({state,syncedAt:state==='stale'?'2026-10-01T22:00:37Z':null,latestSaleAt:'2026-10-01T12:00:00Z'})}});
  const tree=await component.CpiSalesStatusNotice();
  assert.equal(tree.props.role,'status');
  assert.match(text(tree),/no confirma que el vendedor no haya vendido/);
  assert.match(text(tree),/copia disponible/);
  assert.doesNotMatch(text(tree),/undefined|Invalid Date/);
 }
});
test('aviso de copia fresca muestra fecha y no produce falsas alertas',async()=>{
 const component=load('components/CpiSalesStatusNotice.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx},'@/lib/cpi-sales-status':{getCpiSalesStatus:async()=>({state:'fresh',syncedAt:'2026-10-15T15:50:00Z',latestSaleAt:'2026-10-15T12:00:00Z'})}});
 const tree=await component.CpiSalesStatusNotice();assert.equal(tree.type,'p');assert.match(text(tree),/Última actualización registrada/);assert.doesNotMatch(text(tree),/desactualizados/);
});
test('aviso está en analítica, sucursales, vendedores e inicio/ventas/rendimiento del portal',()=>{
 for(const path of ['admin/analitica','admin/ventas-sucursales','admin/desempeno-vendedores','portal','portal/ventas','portal/rendimiento']) {
  const source=fs.readFileSync(new URL('../src/app/'+path+'/page.tsx',import.meta.url),'utf8');assert.match(source,/<CpiSalesStatusNotice\s*\/>/);
 }
});
