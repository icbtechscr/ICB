"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX, Pause, Play } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./ChristmasDecor.module.css";

const preference = "icb-christmas-music-v1";
export function ChristmasBar({paused,onToggle}:{paused:boolean;onToggle:()=>void}) {
 const audio=useRef<HTMLAudioElement>(null),wanted=useRef(false),[playing,setPlaying]=useState(false),[unavailable,setUnavailable]=useState(false);
 const pathname=usePathname()||"/";
 const quiet=/^\/(?:checkout|pago|pagar|admin|portal)(?:\/|$)/.test(pathname);
 useEffect(()=>{
  const media=audio.current;if(!media)return;media.volume=.24;
  try{wanted.current=localStorage.getItem(preference)==="on";}catch{}
  let active=true;
  const sync=()=>{
   if(quiet||document.hidden||!wanted.current){media.pause();setPlaying(false);return;}
   void media.play().then(()=>{if(active)setPlaying(true);}).catch(()=>{if(active)setPlaying(false);});
  };
  sync();document.addEventListener("visibilitychange",sync);
  return()=>{active=false;media.pause();document.removeEventListener("visibilitychange",sync);};
 },[quiet]);
 async function toggleMusic(){
  const media=audio.current;if(!media)return;
  wanted.current=!playing;setUnavailable(false);
  try{localStorage.setItem(preference,wanted.current?"on":"off");}catch{}
  if(!wanted.current){media.pause();setPlaying(false);return;}
  try{await media.play();setPlaying(true);}catch{setPlaying(false);setUnavailable(true);}
 }
 return <div className={styles.bar} data-christmas-paused={paused}>
  <div className={styles.inner}><span className={styles.holly} aria-hidden="true">✦</span><div className={styles.greeting}><span>La magia de regalar</span><strong>Navidad en ICB</strong></div><span className={styles.star} aria-hidden="true">✦</span>
   <div className={styles.controls}>
    {!quiet&&<button type="button" onClick={()=>void toggleMusic()} aria-pressed={playing} aria-label={playing?"Pausar música navideña":"Activar música navideña"} className={styles.music}>{playing?<VolumeX size={16}/>:<Music2 size={16}/>}<span>{playing?"Pausar música":"Música navideña"}</span></button>}
    <button type="button" onClick={onToggle} aria-pressed={paused} aria-label={paused?"Activar luces navideñas":"Pausar luces navideñas"} className={styles.pause}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>
   </div>
  </div>
  <div className={styles.lights} aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{animationDelay:`${i%5*-.7}s`}}/>)}</div>
  <audio ref={audio} src="/audio/icb-christmas-bells.wav" loop preload="none" onError={()=>{setPlaying(false);setUnavailable(true);}}/>
  {unavailable&&<p className={styles.error} role="status">La música no está disponible en este navegador.</p>}
 </div>;
}
export function ChristmasHeaderDecor(){
 return <div className={styles.headerDecor} aria-hidden="true"><img src="/seasonal/christmas-garland.svg" alt="" className={styles.garland}/><span className={styles.ornament}/><span className={`${styles.ornament} ${styles.gold}`}/></div>;
}
