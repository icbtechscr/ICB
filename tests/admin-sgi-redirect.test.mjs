import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const {outputText}=ts.transpileModule(fs.readFileSync(new URL("../src/lib/admin-sgi-redirect.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const exports={}; vm.runInNewContext(outputText,{exports,URL,URLSearchParams});
const destination=exports.adminSgiDestination;
const origin=destination("/admin").replace(/\/gestion$/,"");
test("retired admin routes use only their company SGI and preserve product identity",()=>{
  const id="11111111-1111-4111-8111-111111111111";
  for(const [before,after] of [["/admin","/gestion"],["/admin/","/gestion"],["/admin/login","/ingresar"],["/admin/productos","/gestion/productos"],["/admin/productos/nuevo","/gestion/productos/nuevo"],["/admin/productos/"+id,"/gestion/productos/"+id],["/admin/pedidos","/gestion/pedidos"],["/admin/inventario-cpi","/gestion/inventario-cpi"],["/admin/tienda","/gestion/ajustes"],["/admin/colaboradores/horario","/gestion/colaboradores/horario"],["/admin/unknown","/gestion"]]) assert.equal(destination(before),origin+after);
});
test("all historical admin page paths have an explicit migration destination",()=>{
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(dir+"/"+entry.name):[dir+"/"+entry.name]);
 const base=new URL("../src/app/admin",import.meta.url).pathname.replace(/^\/([A-Z]:\/)/,"$1");
 for(const file of walk(decodeURI(base)).filter(file=>file.endsWith("/page.tsx")&&!file.includes("[id]"))){
  const route="/admin"+file.slice(base.length).replace(/\/page.tsx$/,"");
  if(route!=="/admin") assert.notEqual(new URL(destination(route)).pathname,"/gestion","missing mapping: "+route);
 }
});
test("filters survive but actions, redirect targets and credentials never transfer",()=>{
 const url=new URL(destination("/admin/productos","q=monitor&page=3&status=hidden&next=https://evil.test&token=secret&delete=1"));
 assert.equal(url.origin,origin);assert.equal(url.search,"?q=monitor&page=3&status=hidden");
 assert.equal(new URL(destination("/admin/login","next=https://evil.test")).search,"");
 assert.equal(new URL(destination("/admin/inventario-cpi","sucursal=BARREAL")).search,"?sucursal=BARREAL");
 assert.equal(new URL(destination("/admin/analitica","days=30&period=month&ref=2026-10")).search,"?days=30&period=month&ref=2026-10");
 for(const path of ["/","/checkout","/api/admin/orders","/api/portal/sgi","/admin-other","/productos/x"])assert.equal(destination(path),null);
 assert.equal(destination("/admin/../../checkout"),origin+"/gestion");
});
test("legacy page writes are blocked before authentication while private API services remain routed",()=>{
 const proxy=fs.readFileSync(new URL("../src/proxy.ts",import.meta.url),"utf8");
 assert.ok(proxy.indexOf("adminSgiDestination(request.")<proxy.indexOf("createServerClient("));
 assert.match(proxy,/\["GET", "HEAD"\]\.includes\(request.method\)/);
 assert.match(proxy,/status: 410/);
 assert.match(proxy,/"\/api\/admin"/);
 assert.match(proxy,/matcher:[\s\S]*_next/);
});

