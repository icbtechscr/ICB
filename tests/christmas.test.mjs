import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import ts from 'typescript';import React from 'react';import * as jsx from 'react/jsx-runtime';import * as icons from 'lucide-react';import {renderToStaticMarkup} from 'react-dom/server';
const root=path.resolve(import.meta.dirname,'..');
function load(file,mocks={},extra={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n);},Date,Intl,...extra});return exports;}
test('Christmas uses Costa Rica dates, Nov/Dec through Jan6, and explicit season overrides stay authoritative',()=>{
 const env={},s=load('src/lib/seasonal.ts',{}, {process:{env}}),at=str=>s.getSiteSeason(new Date(str));
 assert.equal(at('2026-11-01T05:59:59Z'),'halloween');assert.equal(at('2026-11-01T06:00:00Z'),'christmas');assert.equal(at('2027-01-07T05:59:59Z'),'christmas');assert.equal(at('2027-01-07T06:00:00Z'),null);
 for(const override of ['off','halloween','patriotic-month','christmas','navidad']){env.SEASON_OVERRIDE=override;assert.equal(at('2026-11-02T18:00:00Z'),({off:null,halloween:'halloween','patriotic-month':'patriotic-month',christmas:'christmas',navidad:'christmas'})[override]);}
});
test('Christmas controls are accessible, default to silence, do not preload music, and vector decoration cannot intercept input',()=>{
 const styles=new Proxy({},{get:(_,k)=>k}),d=load('src/components/seasonal/ChristmasDecor.tsx',{'react':React,'react/jsx-runtime':jsx,'lucide-react':icons,'next/navigation':{usePathname:()=>'/productos'},'./ChristmasDecor.module.css':{default:styles}});
 const html=renderToStaticMarkup(React.createElement(d.ChristmasBar,{paused:false,onToggle(){}}));assert.match(html,/Activar música navideña/);assert.match(html,/Pausar luces navideñas/);assert.match(html,/preload="none"/);assert.doesNotMatch(html,/autoplay/i);assert.match(html,/aria-pressed="false"/);
 const css=fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8'),decorCss=fs.readFileSync(path.join(root,'src/components/seasonal/ChristmasDecor.module.css'),'utf8');assert.match(css,/\.christmas-card-frame\{display:none\}/);assert.match(css,/pointer-events:none/);assert.match(decorCss,/prefers-reduced-motion:reduce/);
 const wav=fs.readFileSync(path.join(root,'public/audio/icb-christmas-bells.wav'));assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(40),wav.length-44);
});
