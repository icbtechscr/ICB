const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),test=require('node:test');
const root=process.cwd(),ts=require(path.join(root,'node_modules/typescript')),React=require(path.join(root,'node_modules/react')),jsx=require(path.join(root,'node_modules/react/jsx-runtime')),icons=require(path.join(root,'node_modules/lucide-react')),render=require(path.join(root,'node_modules/react-dom/server')).renderToStaticMarkup;
const isSgi=fs.existsSync(path.join(root,'src/components/ProductStockDisplay.tsx'));
function load(file,mocks={},globals={}){let exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n in mocks)return mocks[n];if(n==='react')return React;if(n==='react/jsx-runtime')return jsx;if(n==='lucide-react')return icons;throw Error('Unmocked '+n)},URL,Request,Response,AbortSignal,Map,Set,Promise,console,...globals});return exports;}
const uuid='11111111-1111-4111-8111-111111111111',uuid2='22222222-2222-4222-8222-222222222222';
const NextResponse={json:(body,init)=>Response.json(body,init)};
if(isSgi){
 class EmployeeHttpError extends Error{constructor(status,message){super(message);this.status=status;}}
 let role=true,rpcResult={data:{mode:'in_stock',revision:1},error:null},calls=[];
 const route=load('src/app/api/admin/stock-display/route.ts',{'next/server':{NextResponse},'@/lib/accounting-server':{accountingActor:async()=>{if(!role)throw new EmployeeHttpError(403,'No autorizado');return{id:uuid}}},'@/lib/employee-http':{EmployeeHttpError,employeeJson:r=>r.json(),employeeError:e=>Response.json({error:e.message},{status:e.status||503})},'@/lib/sgi-config':{getSgiConfig:()=>({organizationSlug:'tustore'})},'@/lib/supabase-admin':{createSupabaseAdminClient:()=>({rpc:(name,args)=>{calls.push({name,args});return{abortSignal:async()=>rpcResult}}})}});
 const request=body=>new Request('https://sgi.test/api/admin/stock-display',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 test('admin API checks authorization, product, mode and revision without writing the product table',async()=>{
  role=false;assert.equal((await route.GET(new Request('https://sgi.test?productId='+uuid))).status,403);role=true;
  assert.equal((await route.POST(request({productId:uuid,requestId:uuid2,mode:'sell_without_stock',revision:0}))).status,400);assert.equal(calls.length,0);
  const r=await route.POST(request({productId:uuid,requestId:uuid2,mode:'in_stock',revision:0}));assert.equal(r.status,200);assert.equal(calls[0].name,'sgi_stock_display_set');assert.equal(calls[0].args.p_revision,0);assert.equal((await r.json()).mode,'in_stock');
  rpcResult={data:null,error:{message:'display_stale'}};const stale=await route.POST(request({productId:uuid,requestId:uuid2,mode:'automatic',revision:0}));assert.equal(stale.status,409);assert.match((await stale.json()).error,/Otra sesión/);
 });
 test('inventory web actions expose the display control and preserve publish and store link',()=>{
  const component=load('src/components/ProductWebActions.tsx',{'./ProductStockDisplay':{ProductStockDisplay:({name})=>React.createElement('button',null,'Etiqueta de stock: '+name)},'./SgiCompanyContext':{useSgiCompany:()=>({storeOrigin:'https://shop.test'})}}).ProductWebActions;
  const html=render(React.createElement(component,{product:{id:uuid,name:'Monitor',slug:'monitor',isVisible:true,webManageable:true}}));assert.match(html,/Ocultar/);assert.match(html,/https:\/\/shop.test\/productos\/monitor/);assert.match(html,/Etiqueta de stock: Monitor/);
 });
}else{
 const modes=load('src/lib/stock-display.ts'),stock=load('src/lib/stock.ts');let mode='in_stock';
 const badge=load('src/components/StockDisplayBadge.tsx',{'@/lib/use-stock-display':{useStockDisplay:()=>mode},'@/lib/stock-display':modes});
 test('manual labels override only presentation; automatic preserves original badge',()=>{
  const renderBadge=()=>render(React.createElement(badge.StockDisplayBadge,{id:uuid},React.createElement('span',null,'Original')));
  assert.match(renderBadge(),/EN STOCK/);mode='out_of_stock';assert.match(renderBadge(),/AGOTADO/);assert.match(renderBadge(),/bg-red-600/);mode='automatic';assert.equal(renderBadge(),'<span>Original</span>');
  assert.equal(modes.manualStockLabel('backorder'),null);assert.equal(stock.stockOrderLimit('out_of_stock',0),0);
 });
 test('real product card remains unpurchasable at zero while displaying manual in-stock label',()=>{
  mode='in_stock';let added=0;
  const p={id:uuid,name:'Monitor',slug:'monitor',sku:'QA-1',priceCRC:100,salePriceCRC:null,stockQty:0,stockStatus:'out_of_stock',brand:null,images:[],categories:[],description:'',shortDescription:''};
  const mocks={'next/link':{default:({children,href})=>React.createElement('a',{href},children)},'./StockDisplayBadge':badge,'@/components/seasonal/ChristmasFrame':{ChristmasFrame:()=>null},'@/components/ProductImage':{ProductImage:()=>null,normalizeProductImageSrc:s=>s},'@/lib/cart':{useCart:()=>({add(){added++}})},'@/lib/stock':stock,'@/lib/live-stock':{useLiveStock:()=>undefined},'./StockBadge':{StockBadge:()=>React.createElement('span',null,'AGOTADO')},'@/lib/utils':{formatCRC:n=>'₡'+n},'framer-motion':{motion:{article:({children,className})=>React.createElement('article',{className},children)}}};
  const Card=load('src/components/ProductCard.tsx',mocks).ProductCard,html=render(React.createElement(Card,{product:p}));assert.match(html,/EN STOCK/);assert.match(html,/<button[^>]*disabled=""/);assert.equal(p.stockQty,0);assert.equal(p.stockStatus,'out_of_stock');assert.equal(added,0);
 });
 test('public display endpoint batches reads, rejects invalid IDs, returns no audit information and handles outage',async()=>{
  let calls=0,result={data:{[uuid]:'in_stock',unrequested:'out_of_stock'},error:null};
  const route=load('src/app/api/products/stock-display/route.ts',{'next/server':{NextResponse},'@/lib/stock-display':modes,'@/lib/supabase':{createAdminClient:()=>({rpc:(name,args,options)=>{calls++;assert.equal(name,'sgi_stock_display_public');assert.equal(options.get,true);assert.equal(args.p_ids.length,1);return{abortSignal:async()=>result}}})}});
  assert.equal((await route.GET(new Request('https://shop.test?ids=bad'))).status,400);assert.equal(calls,0);
  const r=await route.GET(new Request('https://shop.test?ids='+uuid+','+uuid));assert.deepEqual(await r.json(),{modes:{[uuid]:'in_stock'}});assert.equal(r.headers.get('cache-control'),'no-store');
  result={data:null,error:{message:'private_database_failure'}};const failed=await route.GET(new Request('https://shop.test?ids='+uuid));assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/private_database/);
 });
 test('visible badges share one request and refresh back to automatic without touching commerce state',async()=>{
  let wanted='in_stock',requests=[];const store=load('src/lib/use-stock-display.ts',{'react':{useSyncExternalStore:(subscribe,get)=>{subscribe(()=>{});return get()},useEffect:fn=>fn()},'./stock-display':modes},{queueMicrotask,setInterval:()=>1,clearInterval(){},window:{addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible',addEventListener(){},removeEventListener(){}},fetch:async url=>{requests.push(url);return Response.json({modes:{[uuid]:wanted,[uuid2]:wanted}})}});
  store.useStockDisplay(uuid);store.useStockDisplay(uuid2);await new Promise(r=>setTimeout(r,0));assert.equal(requests.length,1);assert.match(requests[0],new RegExp(uuid2));assert.equal(store.useStockDisplay(uuid),'in_stock');wanted='automatic';await new Promise(r=>setTimeout(r,0));assert.equal(store.useStockDisplay(uuid),'automatic');
 });
}
