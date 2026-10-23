import {pilotInventory,pilotCooldowns,pilotPose,pilotTool} from './city-pilot-state.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {pilotHostile} from './city-pilot-tasks.mjs';

const stagger=new WeakMap();
export const pilotStaggered=(s,e)=>(stagger.get(e)||0)>s.time;
export function pilotRepulse(s,c){
 if(pilotInventory(s).tool!=='repulsor')return {ok:false};
 const timers=pilotCooldowns(s),def=pilotTool('repulsor');if((timers.repulsor||0)>s.time)return {ok:false};
 if(c.energy<12)return {ok:false,text:'에너지 부족'};
 const pose=pilotPose(s),p={...groundPoint(c),y:pose.eye},world=pilotWorld(s.layout,pose.theme),dx=Math.sin(pose.yaw||0)*Math.cos(pose.pitch||0),dz=-Math.cos(pose.yaw||0)*Math.cos(pose.pitch||0),dy=Math.sin(pose.pitch||0);
 let hits=0;
 for(const e of s.enemies){
  if(!pilotHostile(e))continue;const q={...groundPoint(e),y:.43},x=q.x-p.x,z=q.z-p.z,y=q.y-p.y,d=Math.hypot(x,y,z);
  if(d>def.range||d>.5&&(x*dx+y*dy+z*dz)/d<.15||!world.clear(p,q))continue;
  const horizontal=Math.hypot(x,z),direction=horizontal>.01?{x:x/horizontal,z:z/horizontal}:{x:Math.sin(pose.yaw||0),z:-Math.cos(pose.yaw||0)};
  world.move(q,direction.x*2.8,direction.z*2.8,'neutrophil');Object.assign(e,groundCoordinate(q));stagger.set(e,s.time+.65);e.hitUntil=s.time+.25;e.hitX=c.x;e.hitY=c.y;hits++;
 }
 c.energy-=12;timers.repulsor=s.time+def.interval;return {ok:true,hits,text:hits?'충격 · '+hits+'체 밀어냄':'충격 방출'};
}
export function pilotPull(s,c,id,dt){
 const i=pilotInventory(s);if(i.tool!=='tractor'||i.debris>=6||!Number.isFinite(dt)||dt<=0||dt>.05)return {ok:false};
 const d=s.debris.find(d=>'debris:'+d.id===id);if(!d)return {ok:false};
 const pose=pilotPose(s),p={...groundPoint(c),y:pose.eye},q={...groundPoint(d),y:.12},world=pilotWorld(s.layout,pose.theme),distance=Math.hypot(q.x-p.x,q.z-p.z,p.y-q.y);
 if(distance>10||!world.clear(p,q))return {ok:false};
 const horizontal=Math.hypot(p.x-q.x,p.z-q.z),amount=Math.min(Math.max(0,horizontal-.8),5.5*dt);
 if(horizontal>.001)world.move(q,(p.x-q.x)/horizontal*amount,(p.z-q.z)/horizontal*amount,'neutrophil');
 Object.assign(d,groundCoordinate(q));return {ok:true,collect:Math.hypot(p.x-q.x,p.z-q.z)<=1.1,target:{...q}};
}
