import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import crypto from 'node:crypto';
function load(file,mocks={},extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{exports,require:n=>{if(Object.hasOwn(mocks,n))return mocks[n];throw Error(n);},Request,Response,URL,Buffer,Date,AbortSignal,Uint8Array,...extra});return exports;}
const auth=load('src/lib/sgi-paylink-auth.ts',{'node:crypto':crypto}),secret=Buffer.alloc(32,9).toString('base64'),id='11111111-1111-4111-8111-111111111111',reference='SGIPL-'+'1'.repeat(32);
function signed(body, timestamp=String(Date.now())){return{timestamp,signature:crypto.createHmac('sha256',Buffer.from(secret,'base64')).update(`sgi-paylinks-sandbox-v1\n${timestamp}\n${body}`).digest('hex')};}
test('HMAC binds exact body, timestamp, sandbox purpose; stale/tampered/missing requests rejected',()=>{
 const body=JSON.stringify({action:'session',attemptId:id}),s=signed(body);assert.equal(auth.verifySgiPaylinkRequest(body,s.timestamp,s.signature,secret),true);
 for(const args of [[body+' ',s.timestamp,s.signature,secret],[body,String(Number(s.timestamp)-120000),s.signature,secret],[body,s.timestamp,s.signature,Buffer.alloc(32,8).toString('base64')],[body,s.timestamp,null,secret],[body,s.timestamp,s.signature,'invalid']])assert.equal(auth.verifySgiPaylinkRequest(...args),false);
});
test('sandbox service signature cannot be replayed as production, even with same signing key',()=>{
 const body=JSON.stringify({action:'session',attemptId:id}),s=signed(body);assert.equal(auth.verifySgiPaylinkRequest(body,s.timestamp,s.signature,secret,Date.now(),'live_pilot'),false);
 const liveSignature=crypto.createHmac('sha256',Buffer.from(secret,'base64')).update(`sgi-paylinks-live_pilot-v1\n${s.timestamp}\n${body}`).digest('hex');assert.equal(auth.verifySgiPaylinkRequest(body,s.timestamp,liveSignature,secret,Date.now(),'live_pilot'),true);assert.equal(auth.verifySgiPaylinkRequest(body,s.timestamp,liveSignature,secret),false);
});
function harness(){
 const env={SGI_PAYLINK_BRIDGE_MODE:'sandbox',SGI_PAYLINK_BRIDGE_SECRET:secret,SGI_CYBS_SANDBOX_MERCHANT_ID:'synthetic-sandbox',SGI_CYBS_SANDBOX_KEY_ID:'synthetic-key',SGI_CYBS_SANDBOX_SECRET_KEY:Buffer.alloc(32,2).toString('base64')};
 const state={calls:[],providers:[],dispatched:false,dbError:false,badSdk:false,evidence:{found:true,ok:true,id:'12345',amount:'25.00',currency:'CRC',status:'COMPLETED',payload:{clientReferenceInformation:{code:reference},cardNumber:'NEVER_PROJECT'}}};
 const provider={createSession:async(input,sandbox)=>{state.providers.push({action:'session',input,sandbox});return'context';},getSdkAssets:()=>({clientLibrary:state.badSdk?'https://evil.test/sdk.js':'https://apitest.cybersource.com/sdk.js',clientLibraryIntegrity:'sha384-'+Buffer.alloc(48).toString('base64')}),lookupTransactionByOrderNumber:async(ref,strict,paymentId,sandbox)=>{state.providers.push({action:'confirm',ref,strict,paymentId,sandbox});return state.evidence;}};
 const route=load('src/app/api/internal/sgi-paylinks/route.ts',{'@/lib/sgi-paylink-auth':auth,'@/lib/cybersource':provider,'@/lib/supabase':{createAdminClient:()=>({rpc:(name,args)=>({abortSignal:async()=>{state.calls.push({name,args});if(state.dbError||(name==='sgi_paylink_dispatch'&&state.dispatched))return{error:{message:'PRIVATE_DB'}};if(name==='sgi_paylink_dispatch')state.dispatched=true;return{data:{id,mode:'sandbox',reference,amount:'25.00',customer:{name:'Cliente QA',email:'qa@example.test'}}};}})})}},{process:{env}});
 function request(input,authorized=true){const body=typeof input==='string'?input:JSON.stringify(input),s=signed(body);return new Request('https://www.icbtechscr.com/api/internal/sgi-paylinks',{method:'POST',headers:{'content-type':'application/json','x-sgi-time':s.timestamp,'x-sgi-signature':authorized?s.signature:'0'.repeat(64)},body});}
 return{route,state,env,request};
}
test('bridge disabled, unauthorized, missing separate sandbox keys: no DB/provider calls',async()=>{
 for(const change of [{SGI_PAYLINK_BRIDGE_MODE:'disabled'},{SGI_CYBS_SANDBOX_SECRET_KEY:''}]){const{route,state,env,request}=harness();Object.assign(env,change);assert.equal((await route.POST(request({action:'session',attemptId:id}))).status,503);assert.equal(state.calls.length,0);assert.equal(state.providers.length,0);}
 const{route,state,request}=harness();assert.equal((await route.POST(request({action:'session',attemptId:id},false))).status,401);assert.equal(state.calls.length,0);
});
test('bridge never accepts browser amount/customer/host, only allowlisted action and attempt',async()=>{
 for(const input of [{action:'session',attemptId:id,amount:'1'},{action:'session',attemptId:id,host:'evil.test'},{action:'capture',attemptId:id},{action:'session',attemptId:'bad'},'x'.repeat(1025)]){const{route,state,request}=harness();const response=await route.POST(request(input));assert.ok([400,503].includes(response.status));assert.equal(state.calls.length,0);assert.equal(state.providers.length,0);}
});
test('authoritative DB amount and reference, atomic dispatch before session and rejects replay',async()=>{
 const{route,state,request}=harness(),input={action:'session',attemptId:id};let r=await route.POST(request(input));assert.equal(r.status,200);assert.equal((await r.json()).mode,'sandbox');assert.equal(state.calls[0].name,'sgi_paylink_dispatch');const p=state.providers[0];assert.equal(p.input.amountCRC,25);assert.equal(p.input.orderNumber,reference);assert.equal(p.sandbox.origin,'https://sgi.icbtechscr.com');assert.equal(p.sandbox.merchantId,'synthetic-sandbox');r=await route.POST(request(input));assert.equal(r.status,409);assert.equal(state.providers.length,1);
});
test('confirmation strictly queries provider and excludes raw payload/customer/card details',async()=>{
 const{route,state,request}=harness();const r=await route.POST(request({action:'confirm',attemptId:id})),text=await r.text();assert.equal(r.status,200);assert.doesNotMatch(text,/NEVER_PROJECT|Cliente QA|sessionJwt/);assert.equal(state.providers[0].action,'confirm');assert.equal(state.providers[0].strict,true);assert.equal(state.providers[0].ref,reference);assert.equal(state.calls[0].name,'sgi_paylink_bridge_read');assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('multiple captured transactions request review; wrong SDK host and DB failures never expose internals',async()=>{
 const{route,state,request}=harness();state.evidence.multipleCaptures=true;const e=(await(await route.POST(request({action:'confirm',attemptId:id}))).json()).evidence;assert.equal(e.ok,false);assert.equal(e.captured,true);
 const second=harness();second.state.badSdk=true;assert.equal((await second.route.POST(second.request({action:'session',attemptId:id}))).status,503);
 const third=harness();third.state.dbError=true;const r=await third.route.POST(third.request({action:'session',attemptId:id}));assert.equal(r.status,409);assert.doesNotMatch(await r.text(),/PRIVATE_DB/);assert.equal(third.state.providers.length,0);
});
test('sandbox context never uses live endpoint or live credentials, regular shop stays on configured host',async()=>{
 const env={CYBS_RUN_ENV:'api',CYBS_MERCHANT_ID:'fake-live',CYBS_KEY_ID:'fake-live-key',CYBS_SECRET_KEY:Buffer.alloc(32,4).toString('base64'),NEXT_PUBLIC_SITE_ORIGIN:'https://www.icbtechscr.com'};
 const calls=[],cybs=load('src/lib/cybersource.ts',{'node:crypto':crypto},{process:{env},fetch:async(url,opts)=>{calls.push({url,opts});return new Response('synthetic',{headers:{'content-type':'application/jwt'}});}});
 const input={amountCRC:25,orderNumber:reference,targetOrigin:'https://sgi.icbtechscr.com',customer:{name:'Cliente QA',email:'qa@example.test'}},sandbox={merchantId:'fake-sandbox',keyId:'fake-sandbox-key',secretKey:Buffer.alloc(32,5).toString('base64'),origin:'https://sgi.icbtechscr.com'};
 await cybs.createSession(input,sandbox);await cybs.createSession(input);assert.equal(new URL(calls[0].url).origin,'https://apitest.cybersource.com');assert.equal(calls[0].opts.headers['v-c-merchant-id'],'fake-sandbox');assert.equal(new URL(calls[1].url).origin,'https://api.cybersource.com');assert.equal(calls[1].opts.headers['v-c-merchant-id'],'fake-live');assert.equal(env.CYBS_RUN_ENV,'api');
});
