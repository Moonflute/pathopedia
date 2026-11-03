import {pilotInventory,pilotPose} from './city-pilot-state.mjs';
import {pilotWorld} from './city-pilot-world.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';

export function pilotPull(s,c,id,dt){
 const i=pilotInventory(s);if(i.tool!=='tractor'||i.debris>=6||!Number.isFinite(dt)||dt<=0||dt>.05)return {ok:false};
 const d=s.debris.find(d=>'debris:'+d.id===id);if(!d)return {ok:false};
 const pose=pilotPose(s),p={...groundPoint(c),y:pose.eye},q={...groundPoint(d),y:.12},world=pilotWorld(s.layout,pose.theme),distance=Math.hypot(q.x-p.x,q.z-p.z,p.y-q.y);
 if(distance>10||!world.clear(p,q))return {ok:false};
 const horizontal=Math.hypot(p.x-q.x,p.z-q.z),amount=Math.min(Math.max(0,horizontal-.8),5.5*dt);
 if(horizontal>.001)world.move(q,(p.x-q.x)/horizontal*amount,(p.z-q.z)/horizontal*amount,'neutrophil');
 Object.assign(d,groundCoordinate(q));return {ok:true,collect:Math.hypot(p.x-q.x,p.z-q.z)<=1.1,target:{...q}};
}
