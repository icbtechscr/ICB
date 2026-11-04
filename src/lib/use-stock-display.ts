"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {stockDisplayMode,type StockDisplayMode} from './stock-display';
const values=new Map<string,StockDisplayMode>(),listeners=new Map<string,Set<()=>void>>();
let timer:ReturnType<typeof setInterval>|undefined,queued=false,running=false;
function publish(id:string,mode:StockDisplayMode){if(values.get(id)===mode)return;values.set(id,mode);listeners.get(id)?.forEach(fn=>fn());}
async function refresh(){if(running)return;running=true;try{
 const ids=[...listeners.keys()].filter(id=>/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id));
 for(let n=0;n<ids.length;n+=100){const chunk=ids.slice(n,n+100);try{
  const r=await fetch('/api/products/stock-display?ids='+encodeURIComponent(chunk.join(',')),{cache:'no-store',signal:AbortSignal.timeout(8000)}),body=await r.json();if(!r.ok||!body.modes||typeof body.modes!=='object')throw Error('display_unavailable');
  for(const id of chunk)publish(id,stockDisplayMode(body.modes[id]));
 }catch{/* A failed presentation lookup never changes stock or purchase eligibility. Retain last label. */}}
 }finally{running=false;}}
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;void refresh();});}
function refreshVisible(){if(document.visibilityState==='visible')schedule();}
export function useStockDisplay(id:string){
 const mode=useSyncExternalStore(fn=>{const set=listeners.get(id)||new Set();set.add(fn);listeners.set(id,set);return()=>{set.delete(fn);if(!set.size)listeners.delete(id);};},()=>values.get(id),()=>undefined);
 useEffect(()=>{schedule();if(!timer){timer=setInterval(refreshVisible,15000);window.addEventListener('focus',refreshVisible);document.addEventListener('visibilitychange',refreshVisible);}return()=>{if(!listeners.size&&timer){clearInterval(timer);timer=undefined;window.removeEventListener('focus',refreshVisible);document.removeEventListener('visibilitychange',refreshVisible);}};},[id]);
 return mode;
}
