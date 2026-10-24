import {pilotedCell,pilotPose} from './city-pilot-state.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {pathogenDef} from './city-pathogens.mjs';

const encounters=new WeakMap();
export const pilotThreatView=e=>encounters.get(e)||null;
export function tickPilotThreat(s,e,dt){
 const c=pilotedCell(s),pose=pilotPose(s);if(!c||c.lost||!e.entered||e.dead||e.compartment==='lumen'||pose.height>1.8)return false;
 const p=groundPoint(c),q=groundPoint(e),distance=Math.hypot(p.x-q.x,p.z-q.z),world=pilotWorld(s.layout,pose.theme);
 if(distance>8||!world.clear({...q,y:.43},{...p,y:pose.eye})){encounters.delete(e);return false;}
 const def=pathogenDef(e.recordId),style=def?.capsule?'armored':def?.localSpread||def?.anaerobic?'charge':def?.shape==='rod'||def?.shape==='shortRod'?'flank':'pursuit';
 let a=encounters.get(e);if(!a){a={style,until:0,ready:0,windup:0,direction:null,hit:false};encounters.set(e,a);}
 e.action='attack';e.attackX=c.x;e.attackY=c.y;
 let speed=style==='armored'?.9:1.5,dx=(p.x-q.x)/Math.max(.01,distance),dz=(p.z-q.z)/Math.max(.01,distance);
 if(a.windup>s.time){speed=0;}
 else if(a.windup){a.windup=0;a.until=s.time+(style==='charge'?.35:.2);a.hit=false;}
 if(a.until>s.time){
  if(style==='charge'&&a.direction){dx=a.direction.x;dz=a.direction.z;speed=5.5;}
  else speed=0;
  if(!a.hit&&distance<1.05){c.integrity=Math.max(0,c.integrity-(style==='charge'?6:style==='armored'?5:3));a.hit=true;}
 }else if(s.time>=a.ready&&(distance<1.3||style==='charge'&&distance<4.5)){
  a.windup=s.time+(style==='charge'?.65:.4);a.ready=s.time+(style==='charge'?2.8:1.6);a.direction={x:dx,z:dz};speed=0;
 }else if(style==='flank'&&distance>1.4){const side=e.id%2?1:-1,old=dx;dx=dx*.85-dz*.5*side;dz=dz*.85+old*.5*side;}
 if(distance<.7&&a.until<=s.time)speed=0;
 if(speed){world.move(q,dx*speed*dt,dz*speed*dt,'neutrophil');Object.assign(e,groundCoordinate(q));}
 return true;
}
