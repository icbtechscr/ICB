"use client";
import { useEffect, useRef, useState } from "react";
import { Music2, VolumeX, Pause, Play } from "lucide-react";
import { usePathname } from "next/navigation";
import styles from "./ChristmasDecor.module.css";

import { connectChristmasAudio } from "@/lib/christmas-audio";
export function ChristmasBar({paused,onToggle}:{paused:boolean;onToggle:()=>void}) {
 const audio=useRef<HTMLAudioElement>(null),controller=useRef<ReturnType<typeof connectChristmasAudio>|null>(null),[playing,setPlaying]=useState(false),[unavailable,setUnavailable]=useState(false);
 const pathname=usePathname()||"/";
 const quiet=/^\/(?:checkout|pago|pagar|admin|portal)(?:\/|$)/.test(pathname);
 useEffect(()=>{
  const media=audio.current;if(!media)return;
  const session=connectChristmasAudio(media,quiet,setPlaying);controller.current=session;
  return()=>{session.dispose();controller.current=null;};
 },[quiet]);
 async function toggleMusic(){setUnavailable(false);await controller.current?.setEnabled(!playing);}
 return <div className={styles.bar} data-christmas-paused={paused}>
  <div className={styles.inner}><span className={styles.holly} aria-hidden="true">✦</span><div className={styles.greeting}><span>La magia de regalar</span><strong>Navidad en ICB</strong></div><span className={styles.star} aria-hidden="true">✦</span>
   <div className={styles.controls}>
    {!quiet&&<button data-christmas-music-toggle type="button" onClick={()=>void toggleMusic()} aria-pressed={playing} aria-label={playing?"Pausar música navideña":"Activar música navideña"} className={styles.music}>{playing?<VolumeX size={16}/>:<Music2 size={16}/>}<span>{playing?"Pausar música":"Jingle Bells"}</span></button>}
    <button type="button" onClick={onToggle} aria-pressed={paused} aria-label={paused?"Activar luces navideñas":"Pausar luces navideñas"} className={styles.pause}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>
   </div>
  </div>
  <div className={styles.lights} data-christmas-lights aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{animationDelay:`${i%5*-.7}s`}}/>)}</div>
  <audio ref={audio} src="/audio/jingle-bells-icb.wav" title="Jingle Bells · instrumental navideño" loop preload="none" onError={()=>{setPlaying(false);setUnavailable(true);}}/>
  {unavailable&&<p className={styles.error} role="status">La música no está disponible en este navegador.</p>}
 </div>;
}
export function ChristmasHeaderDecor(){
 return <div className={styles.headerDecor} aria-hidden="true" />;
}

export function ChristmasPageDecor(){
 const pathname=usePathname()||"/";
 if(/^\/(?:checkout|pago|pagar|carrito|admin|portal)(?:\/|$)/.test(pathname))return null;
 return <div data-christmas-background aria-hidden="true" className={styles.pageDecor}><span className={styles.leftDecoration}/><span className={styles.rightDecoration}/></div>;
}
