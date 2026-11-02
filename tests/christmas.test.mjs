import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import React from 'react';import * as jsx from 'react/jsx-runtime';import * as icons from 'lucide-react';import {renderToStaticMarkup} from 'react-dom/server';
const root=path.resolve(import.meta.dirname,'..');
function load(file,mocks={},extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n);},Date,Intl,...extra});return exports;}
test('Christmas uses Costa Rica dates, Nov/Dec through Jan6, and explicit season overrides stay authoritative',()=>{
 const env={},s=load('src/lib/seasonal.ts',{}, {process:{env}}),at=str=>s.getSiteSeason(new Date(str));
 assert.equal(at('2026-11-01T05:59:59Z'),'halloween');assert.equal(at('2026-11-01T06:00:00Z'),'christmas');assert.equal(at('2027-01-07T05:59:59Z'),'christmas');assert.equal(at('2027-01-07T06:00:00Z'),null);
 for(const override of ['off','halloween','patriotic-month','christmas','navidad']){env.SEASON_OVERRIDE=override;assert.equal(at('2026-11-02T18:00:00Z'),({off:null,halloween:'halloween','patriotic-month':'patriotic-month',christmas:'christmas',navidad:'christmas'})[override]);}
});

test('refined background stays out of payment/admin and lamp string replaces the garland',()=>{
 const styles=new Proxy({},{get:(_,k)=>k});
 const render=(pathname,component)=>{const d=load('src/components/seasonal/ChristmasDecor.tsx',{'react':React,'react/jsx-runtime':jsx,'lucide-react':icons,'next/navigation':{usePathname:()=>pathname},'./ChristmasDecor.module.css':{default:styles}});return renderToStaticMarkup(React.createElement(d[component]));};
 for(const route of ['/','/productos','/productos/camara','/categoria/seguridad','/sobre-nosotros'])assert.match(render(route,'ChristmasPageDecor'),/data-christmas-background/);
 for(const route of ['/checkout','/carrito','/pagar/example','/admin','/portal'])assert.equal(render(route,'ChristmasPageDecor'),'');
 assert.doesNotMatch(render('/productos','ChristmasHeaderDecor'),/christmas-garland|ornament/);
 const css=fs.readFileSync(path.join(root,'src/components/seasonal/ChristmasDecor.module.css'),'utf8');assert.match(css,/width:13px;height:19px/);assert.match(css,/box-shadow:0 0 5px/);assert.match(css,/\.lights i::before/);
});

test('Jingle Bells uses the recognizable refrain and sixteen complete four-beat bars',async()=>{
 const {bars}=await import('../tooling/render-christmas-audio.mjs');assert.equal(bars.length,16);assert.deepEqual(bars.slice(0,3),[[[76,1],[76,1],[76,2]],[[76,1],[76,1],[76,2]],[[76,1],[79,1],[72,1.5],[74,.5]]]);
 for(const bar of bars)assert.equal(bar.reduce((sum,note)=>sum+note[1],0),4);
 assert.deepEqual(bars.at(-1),[[72,4]]);
});
test('Christmas controls are accessible, default to silence, do not preload music, and vector decoration cannot intercept input',()=>{
 const styles=new Proxy({},{get:(_,k)=>k}),d=load('src/components/seasonal/ChristmasDecor.tsx',{'react':React,'react/jsx-runtime':jsx,'lucide-react':icons,'next/navigation':{usePathname:()=>'/productos'},'./ChristmasDecor.module.css':{default:styles}});
 const html=renderToStaticMarkup(React.createElement(d.ChristmasBar,{paused:false,onToggle(){}}));assert.match(html,/Activar música navideña/);assert.match(html,/Pausar luces navideñas/);assert.match(html,/preload="none"/);assert.doesNotMatch(html,/autoplay/i);assert.match(html,/aria-pressed="false"/);
 const css=fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),decorCss=fs.readFileSync(path.join(root,'src/components/seasonal/ChristmasDecor.module.css'),'utf8');assert.match(css,/\.christmas-card-frame\{display:none\}/);assert.match(css,/pointer-events:none/);assert.match(decorCss,/prefers-reduced-motion:reduce/);
 const wav=fs.readFileSync(path.join(root,'public/audio/jingle-bells-icb.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(40),wav.length-44);
});
