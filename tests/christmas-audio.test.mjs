import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/christmas-audio.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function setup({preference=null,blocked=false,quiet=false}={}){
 const listeners=new Map(),states=[],saved=new Map();if(preference)saved.set('icb-christmas-music-v2',preference);
 const media={paused:true,plays:0,pauses:0,async play(){this.plays++;if(blocked){blocked=false;throw Error('NotAllowedError');}this.paused=false;},pause(){this.paused=true;this.pauses++;}};
 const document={hidden:false,addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}};
 const exports={};class KeyboardEvent{};vm.runInNewContext(code,{exports,document,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},KeyboardEvent});
 const session=exports.connectChristmasAudio(media,quiet,v=>states.push(v));const fire=(name,event={isTrusted:true,target:{closest:()=>null}})=>listeners.get(name)?.(event);
 return{session,media,states,saved,document,listeners,fire};
}
test('new visitor starts automatically; browser denial recovers with first trusted gesture without starting a second player',async()=>{
 const a=setup();await flush();assert.equal(a.media.plays,1);assert.equal(a.media.paused,false);assert.equal(a.states.at(-1),true);a.session.dispose();assert.equal(a.listeners.size,0);assert.equal(a.media.paused,true);
 const b=setup({blocked:true});await flush();assert.equal(b.states.at(-1),false);b.fire('pointerdown',{isTrusted:false,target:null});assert.equal(b.media.plays,1);b.fire('pointerdown');await flush();assert.equal(b.media.plays,2);assert.equal(b.media.paused,false);b.fire('pointerdown');assert.equal(b.media.plays,2);b.session.dispose();
});
test('explicit pause persists across visits and gestures; quiet pages never start music',async()=>{
 for(const options of [{preference:'off'},{quiet:true}]){const a=setup(options);await flush();a.fire('pointerdown');await flush();assert.equal(a.media.plays,0);assert.equal(a.media.paused,true);a.session.dispose();}
 const a=setup();await flush();await a.session.setEnabled(false);a.fire('pointerdown');await flush();assert.equal(a.media.plays,1);assert.equal(a.saved.get('icb-christmas-music-v2'),'off');assert.equal(a.media.paused,true);await a.session.setEnabled(true);assert.equal(a.media.paused,false);a.session.dispose();
});
test('touch waits for click activation and does not consume recovery on pointerdown',async()=>{
 const a=setup({blocked:true});await flush();a.fire('pointerdown',{type:'pointerdown',pointerType:'touch',isTrusted:true,target:null});assert.equal(a.media.plays,1);a.fire('click',{type:'click',isTrusted:true,target:null});await flush();assert.equal(a.media.plays,2);assert.equal(a.media.paused,false);a.session.dispose();assert.equal(a.listeners.size,0);
});
test('visibility suspends sound and restores only when enabled; music controls do not consume the gesture fallback',async()=>{
 const a=setup({blocked:true});await flush();a.fire('pointerdown',{isTrusted:true,target:{closest:()=>({})}});assert.equal(a.media.plays,1);a.fire('pointerdown');await flush();assert.equal(a.media.paused,false);a.document.hidden=true;a.fire('visibilitychange');assert.equal(a.media.paused,true);a.document.hidden=false;a.fire('visibilitychange');await flush();assert.equal(a.media.paused,false);a.session.dispose();
});
