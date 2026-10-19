import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const file=new URL('../src/lib/portal-sgi-redirect.ts',import.meta.url);
const {outputText}=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const exports={};vm.runInNewContext(outputText,{exports,URL,URLSearchParams});
const {portalSgiDestination:destination,retiredWorkerApi:retired}=exports;
const origin='https://sgi.icbtechscr.com';
test('worker pages move only to their own company SGI',()=>{
 for(const [old,next] of [['/portal','/'],['/portal/marcar','/mi-espacio/horario'],['/marcar','/mi-espacio/horario'],['/portal/vacaciones','/mi-espacio/vacaciones'],['/portal/perfil','/mi-espacio/perfil'],['/portal/rendimiento','/mi-espacio/rendimiento'],['/vendedor/facebook','/'],['/vendedor/mercadolibre','/']])assert.equal(destination(old,''),origin+next);
 assert.equal(destination('/portal/ventas','period=month&ref=2026-10&user_id=other&next=https://evil.test'),origin+'/mi-espacio/ventas?period=month&ref=2026-10');
});
test('login bridge preserves same-company links only; payments, admin and APIs stay untouched',()=>{
 assert.equal(destination('/ingresar','next=https://evil.test'),origin+'/ingresar');
 const next='/api/portal/sgi?next='+encodeURIComponent(origin+'/mi-espacio/horario');
 assert.equal(new URL(destination('/ingresar','next='+encodeURIComponent(next))).searchParams.get('next'),'/mi-espacio/horario');
 const foreign='/api/portal/sgi?next='+encodeURIComponent('https://sgi.tustorecr.com/gestion');
 assert.equal(destination('/ingresar','next='+encodeURIComponent(foreign)),origin+'/ingresar');
 for(const route of ['/','/checkout','/api/payments','/api/portal/sgi','/admin','/api/admin/users','/portal-other'])assert.equal(destination(route,''),null);
});
test('only retired personal write APIs return gone; checkout and admin stay intact',()=>{
 for(const route of ['/api/timeclock/punch','/api/portal/vacations','/api/portal/vacations/id/cancel','/api/portal/avatar','/api/push/subscribe','/api/push/unsubscribe'])assert.equal(retired(route),true);
 for(const route of ['/api/timeclock/admin','/api/portal/sgi','/api/admin/users','/api/checkout','/api/payments','/api/push/subscribe-other'])assert.equal(retired(route),false);
 const proxy=fs.readFileSync(new URL('../src/proxy.ts',import.meta.url),'utf8');assert.match(proxy,/GET.*HEAD/s);assert.match(proxy,/410/);
});
