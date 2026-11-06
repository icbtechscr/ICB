import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";
import ts from "typescript";
function load(file,mocks={}){
 const {outputText}=ts.transpileModule(fs.readFileSync(new URL("../src/"+file,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const exports={};vm.runInNewContext(outputText,{exports,require:name=>{if(!(name in mocks))throw Error("Unexpected import: "+name);return mocks[name];},process:{env:{}},URL,URLSearchParams,crypto:webcrypto});return exports;
}
const state={user:null,grant:null,error:null,authReads:0};
const cookies={getAll:()=>[],set:()=>{},delete:()=>{}};
const {proxy}=load("proxy.ts",{
 "next/server":{NextResponse:{next:()=>({status:200,cookies}),json:(body,options)=>Response.json(body,options),redirect:(url,status=307)=>Response.redirect(url,status)}},
 "@supabase/ssr":{createServerClient:()=>({auth:{getUser:async()=>{state.authReads++;return {data:{user:state.user},error:null};}}})},
 "@/lib/roles":{getUserRole:user=>user.user_metadata.role,canSell:()=>true},
 "@/lib/audit":{writeAuditEvent:async()=>{}},
 "@/lib/portal-sgi-redirect":load("lib/portal-sgi-redirect.ts"),
 "@/lib/admin-sgi-redirect":load("lib/admin-sgi-redirect.ts"),
 "@/lib/supabase":{createAdminClient:()=>({from:table=>{assert.equal(table,"sgi_user_access");return {select:()=>({eq:()=>({maybeSingle:async()=>({data:state.grant,error:state.error})})})};}})},
});
function request(path,method="GET"){
 const request=new Request("https://icbtechscr.com"+path,{method});request.nextUrl=new URL(request.url);request.nextUrl.clone=()=>new URL(request.url);request.cookies=cookies;return request;
}
test("administrative services use active server grants, never editable metadata",async()=>{
 state.user={id:"admin",user_metadata:{role:"admin"}};
 for(const grant of [null,{enabled:false,role:"admin"},{enabled:true,role:"seller"}]){
  state.grant=grant;assert.equal((await proxy(request("/api/admin/orders"))).status,403);
 }
 state.grant={enabled:true,role:"admin"};assert.equal((await proxy(request("/api/admin/orders"))).status,200);
 state.user.user_metadata.role="colaborador";assert.equal((await proxy(request("/api/admin/orders"))).status,200);
 state.error={message:"private diagnostic"};const unavailable=await proxy(request("/api/admin/orders"));assert.equal(unavailable.status,503);assert.doesNotMatch(await unavailable.text(),/private diagnostic/);
 state.error=null;state.user=null;assert.equal((await proxy(request("/api/admin/orders"))).status,401);
});
test("retired screens redirect or reject stale writes before invoking authentication",async()=>{
 state.authReads=0;
 const get=await proxy(request("/admin/pedidos"));assert.equal(get.status,307);assert.equal(get.headers.get("location"),"https://sgi.icbtechscr.com/gestion/pedidos");
 assert.equal((await proxy(request("/admin/productos/nuevo","POST"))).status,410);
 assert.equal(state.authReads,0);
});
