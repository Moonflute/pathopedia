import {createCombatAudio} from './play-audio.mjs';
import {siteAt} from './city-tile-layout.mjs';
import {homeSites} from './city-homeostasis-data.mjs';

// Reuse Shoot's bounded one-shots; two nearby facilities share a noise buffer.
export function createPilotAudio(){
 const combat=createCombatAudio(),voices=new Map();let context=null,master=null,noise=null,lastShot=-1,lastWork=-1,lastBeat=0,enabled=true,closed=false;
 try{enabled=localStorage.getItem('pathopedia:city:pilot:sound:v1')!=='off';}catch{}
 function unlock(){
  if(!enabled||closed)return;
  try{if(!context){context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=.5;master.connect(context.destination);noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const a=noise.getChannelData(0);let seed=19,low=0;for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low=low*.94+(seed/2147483648-1)*.06;a[i]=low;}}
   void context.resume().catch(()=>{});
  }catch{}
 }
 function stopVoice(v){try{v.source.stop();}catch{}v.source.disconnect();v.filter.disconnect();v.gain.disconnect();v.pan.disconnect();}
 function update(s,v,paused){
  if(!context||!master)return;const now=context.currentTime;
  if(!enabled||paused){for(const a of voices.values())a.gain.gain.setTargetAtTime(0,now,.04);return;}
  if(v.shot&&v.shot.at!==lastShot){lastShot=v.shot.at;combat.play(context,master,'shot-pulse');if(v.shot.hit)combat.play(context,master,v.shot.defeated?'shield-hit':'effective-hit');}
  if(v.workPulse&&v.workPulse.at!==lastWork){lastWork=v.workPulse.at;combat.play(context,master,'effective-hit');}
  const sites=['lung','heart','gut','kidney','marrow','lymph'].map(id=>({id,...siteAt(s.layout,id)}));
  if(s.homeostasis)sites.push(...homeSites(s.layout));
  const near=sites.map(o=>({...o,d:Math.hypot(o.x-v.position.x,o.z-v.position.z)})).filter(o=>o.d<13).sort((a,b)=>a.d-b.d).slice(0,2),keep=new Set(near.map(o=>o.id));
  for(const [id,a]of voices)if(!keep.has(id)){stopVoice(a);voices.delete(id);}
  for(const o of near){
   let a=voices.get(o.id);if(!a){const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();source.buffer=noise;source.loop=true;filter.type='bandpass';filter.frequency.value=({lung:420,heart:100,gut:700,kidney:1100,marrow:280,lymph:1800})[o.id]||550;filter.Q.value=.7;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(master);source.start();a={source,filter,gain,pan};voices.set(o.id,a);}
   const state=s.districts[o.id]||s.homeostasis?.organs[o.id],running=(state?.hp??100)>0&&(state?.oxygen??100)>10,phase=s.time*(o.id==='heart'?(s.homeostasis?.pulse||72)/60:o.id==='lung'?.26:.8),pulse=.35+Math.sin(phase*Math.PI*2)**2*.65;
   a.gain.gain.setTargetAtTime(running?(1-o.d/13)**2*.14*pulse:0,now,.12);const angle=Math.atan2(o.x-v.position.x,-(o.z-v.position.z))-v.yaw;a.pan.pan.setTargetAtTime(Math.sin(angle),now,.1);
  }
  if(v.flying&&now-lastBeat>.15){lastBeat=now;/* facility beds remain quiet during flight */}
 }
 return {unlock,update,get enabled(){return enabled;},toggle(){enabled=!enabled;try{localStorage.setItem('pathopedia:city:pilot:sound:v1',enabled?'on':'off');}catch{}if(enabled)unlock();else{for(const a of voices.values())a.gain.gain.setTargetAtTime(0,context.currentTime,.03);}return enabled;},quiet(){if(context)for(const a of voices.values())a.gain.gain.setTargetAtTime(0,context.currentTime,.03);},dispose(){closed=true;combat.dispose();for(const a of voices.values())stopVoice(a);voices.clear();if(context)void context.close().catch(()=>{});}};
}
