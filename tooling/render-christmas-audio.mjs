// Local instrumental arrangement of the traditional Jingle Bells refrain.
// Melody: James Lord Pierpont; historical score: https://www.loc.gov/item/2023812429/
// New synthesis/arrangement, no third-party recording or sampled performance.
import fs from 'node:fs';
const E=76,G=79,C=72,D=74,F=77;
export const bars=[
 [[E,1],[E,1],[E,2]],[[E,1],[E,1],[E,2]],[[E,1],[G,1],[C,1.5],[D,.5]],[[E,4]],
 [[F,1],[F,1],[F,1],[F,1]],[[F,1],[E,1],[E,1],[E,1]],[[E,1],[D,1],[D,1],[E,1]],[[D,2],[G,2]],
 [[E,1],[E,1],[E,2]],[[E,1],[E,1],[E,2]],[[E,1],[G,1],[C,1.5],[D,.5]],[[E,4]],
 [[F,1],[F,1],[F,1],[F,1]],[[F,1],[E,1],[E,1],[E,1]],[[G,1],[G,1],[F,1],[D,1]],[[C,4]],
];
const rate=22050,beat=60/114,lead=2,tail=2,duration=(lead+64)*beat+tail,mix=new Float64Array(Math.ceil(duration*rate));
const frequency=n=>440*2**((n-69)/12);
function tone(note,start,beats,gain,kind){
 const freq=frequency(note),length=Math.min(beats*beat+.4,kind==='bell'?2.5:1.5),count=Math.ceil(length*rate),offset=Math.round(start*rate);
 for(let i=0;i<count&&offset+i<mix.length;i++){
  const t=i/rate,attack=Math.min(1,t/.009),release=Math.max(0,Math.min(1,(length-t)/.15));
  const wave=kind==='bell'?(Math.sin(2*Math.PI*freq*t)*Math.exp(-t*2.4)+.25*Math.sin(2*Math.PI*freq*2*t)*Math.exp(-t*4)+.08*Math.sin(2*Math.PI*freq*3*t)*Math.exp(-t*6)):(Math.sin(2*Math.PI*freq*t)+.28*Math.sin(2*Math.PI*freq*2*t)+.08*Math.sin(2*Math.PI*freq*3*t))*Math.exp(-t*4);
  mix[offset+i]+=wave*gain*attack*release;
 }
}
let cursor=lead;for(const bar of bars)for(const[n,len]of bar){tone(n,cursor*beat,len,.38,'bell');cursor+=len;}
const chords=[[48,52,55],[48,52,55],[48,52,55],[48,52,55],[53,57,60],[48,52,55],[55,59,62],[55,59,62],[48,52,55],[48,52,55],[48,52,55],[48,52,55],[53,57,60],[48,52,55],[55,59,62],[48,52,55]];
for(let bar=0;bar<16;bar++)for(let pulse=0;pulse<4;pulse++){
 const start=(lead+bar*4+pulse)*beat,chord=chords[bar];
 if(pulse%2===0)tone(chord[pulse===0?0:2]-12,start,.75,.15,'piano');
 else for(const n of chord)tone(n,start,.75,.055,'piano');
 // Gentle high sleigh-bell accent on each half beat, deterministic and musical.
 if(pulse===1||pulse===3){tone(96,start,.2,.025,'bell');tone(103,start+.025,.2,.015,'bell');}
}
// Quiet arpeggio introduces and resolves the familiar refrain.
[72,76,79,84].forEach((n,i)=>tone(n,i*.24,.5,.16,'bell'));
tone(72,(lead+63)*beat,2,.11,'piano');
// Very small room reflection, not an infinite feedback loop.
for(const[seconds,gain]of[[.075,.11],[.14,.07]]){const delay=Math.round(seconds*rate);for(let i=mix.length-1;i>=delay;i--)mix[i]+=mix[i-delay]*gain;}
let peak=0;for(const value of mix)peak=Math.max(peak,Math.abs(value));
const pcm=Buffer.alloc(mix.length*2),scale=.82/Math.max(1,peak);
for(let i=0;i<mix.length;i++){const t=i/rate,fade=Math.min(1,t/.05,(duration-t)/.55);pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[i]*scale*fade))*32767),i*2);}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
fs.writeFileSync(new URL('../public/audio/jingle-bells-icb.wav',import.meta.url),Buffer.concat([header,pcm]));
console.log(JSON.stringify({track:'Jingle Bells',bars:bars.length,durationSeconds:duration,sampleRate:rate,sourceRecordingUsed:false}));
