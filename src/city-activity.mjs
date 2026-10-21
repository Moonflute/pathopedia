import {transformPoint,stationOwner,placeable} from './city-tile-layout.mjs';
import {workStationPoints,groundCoordinate} from './city-three-layout.mjs';

// Shared ground anchors keep the simulation's hands, cargo and facility props
// together. These coordinates are transformed by the 3D layout only when drawn.
export function workStation(id,role,slot=0,layout=null){
 const owner=stationOwner(layout,id,role,slot),p=workStationPoints(id,role,slot,owner!==id?placeable(owner).origin:null);
 return {...(owner!==id?{owner}:{}),target:groundCoordinate(transformPoint(layout,owner,p.target)),stand:groundCoordinate(transformPoint(layout,owner,p.stand))};
}
export const ACTIVITY_KINDS=Object.freeze(['load','unload','build','repair','fabricate','produce','shoot','engulf','collect','signal','patch','present','prime','differentiate','degranulate','cytotoxic','regulate','net']);
export function beginActivity(s,actor,kind,duration,target,site=null){
 actor.activity={kind,started:s.time,duration,x:target.x,y:target.y,site};return actor.activity;
}
export const activityProgress=(a,time)=>a?Math.max(0,Math.min(1,(time-a.started)/a.duration)):1;
export const activeActivity=(actor,time)=>actor.activity&&activityProgress(actor.activity,time)<1?actor.activity:null;
