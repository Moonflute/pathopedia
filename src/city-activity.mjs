import {transformPoint,stationOwner,placeable} from './city-tile-layout.mjs';
import {SITES,groundCoordinate} from './city-three-layout.mjs';

// Shared ground anchors keep the simulation's hands, cargo and facility props
// together. These coordinates are transformed by the 3D layout only when drawn.
export function workStation(id,role,slot=0,layout=null){
 const owner=stationOwner(layout,id,role,slot);
 if(owner!==id){
  const d=placeable(owner),n=role==='dock'?0:(slot-3)%3;
  const target=role==='oxygen'?{x:d.origin.x+2.3,z:d.origin.z-1.2+n*.95}:{x:d.origin.x-1+n,z:d.origin.z+1.3},stand=role==='oxygen'?{x:target.x+.75,z:target.z}:{x:target.x,z:target.z+.75};
  return {owner,target:groundCoordinate(transformPoint(layout,owner,target)),stand:groundCoordinate(transformPoint(layout,owner,stand))};
 }
 const d=SITES[id];let x=d.x,z=d.z,dx=0,dz=.65;
 if(role==='oxygen'){x+=-1.05+(slot%3)*1.05;z-=.6+Math.floor(slot/3)*1.1;}
 if(role==='dock'){x+=1.7;z-=.2;dx=-1.15;dz=0;}
 if(role==='rest'){x+=-1.2+(slot%3)*1.1;z+=2.1+Math.floor(slot/3)*1.1;dz=.35;}
 if(role==='build'||role==='repair'){
  [x,z]=BUILD_SITES[id];dx=-.75;dz=0;
  if(role==='repair'){const angle=slot*Math.PI/3;dx=Math.cos(angle)*.75;dz=Math.sin(angle)*.75;}
 }
 if(role==='produce'){x+=-.6+(slot%3)*1.1;z+=1.1+Math.floor(slot/3)*1.4;dz=.65;}
 if(role==='fabricate'){x+=1.1+(slot%3)*.9;z+=Math.floor(slot/3)*1.4;dz=.65;}
 if(role==='waste'){x=7;z=10;dx=-.75;dz=0;}
 if(role==='spawn'){x=-8.2+(slot%3)*.8;z=10.4+Math.floor(slot/3)*1.1;dz=-.65;}
 return {target:groundCoordinate(transformPoint(layout,id,{x,z})),stand:groundCoordinate(transformPoint(layout,id,{x:x+dx,z:z+dz}))};
}
const BUILD_SITES=Object.freeze({heart:[1.25,3.05],lung:[-7,-5.4],gut:[8,-1.2],kidney:[6.7,9.15],marrow:[-5.7,8.65],lymph:[-11.8,3.75]});
export const ACTIVITY_KINDS=Object.freeze(['load','unload','build','repair','fabricate','produce','shoot','engulf','collect','signal','patch']);
export function beginActivity(s,actor,kind,duration,target,site=null){
 actor.activity={kind,started:s.time,duration,x:target.x,y:target.y,site};return actor.activity;
}
export const activityProgress=(a,time)=>a?Math.max(0,Math.min(1,(time-a.started)/a.duration)):1;
export const activeActivity=(actor,time)=>actor.activity&&activityProgress(actor.activity,time)<1?actor.activity:null;
