/** Autoplay is attempted; browser policy is respected, never bypassed. */
export function connectChristmasAudio(media:HTMLAudioElement,quiet:boolean,onPlaying:(playing:boolean)=>void){
 const preference='icb-christmas-music-v2';
 let active=true,wanted=true,gestureTried=false;
 try{wanted=localStorage.getItem(preference)!=='off';}catch{}
 media.volume=.24;
 const sync=async()=>{
  if(!active)return;
  if(quiet||document.hidden||!wanted){media.pause();onPlaying(false);return;}
  try{await media.play();if(active){if(wanted&&!quiet&&!document.hidden)onPlaying(true);else{media.pause();onPlaying(false);}}}
  catch{if(active)onPlaying(false);}
 };
 const gesture=(event:Event)=>{
  if(!event.isTrusted||gestureTried||!wanted||quiet||document.hidden)return;
  if((event.target as Element|null)?.closest?.('[data-christmas-music-toggle]'))return;
  if(event instanceof KeyboardEvent&&(event.ctrlKey||event.altKey||event.metaKey||['Shift','Control','Alt','Meta'].includes(event.key)))return;
  gestureTried=true;void sync();
 };
 const visible=()=>{void sync();};
 document.addEventListener('visibilitychange',visible);
 document.addEventListener('pointerdown',gesture,{passive:true});
 document.addEventListener('keydown',gesture);
 void sync();
 return {
  async setEnabled(enabled:boolean){wanted=enabled;try{localStorage.setItem(preference,enabled?'on':'off');}catch{}await sync();},
  dispose(){active=false;media.pause();document.removeEventListener('visibilitychange',visible);document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);},
 };
}
