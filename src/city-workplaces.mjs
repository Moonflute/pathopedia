import {CITY_CAPS,expansionCount,travelScale} from './city-world.mjs';
import {cityDistricts,cityDistrict,cityRoute,rotateOffset,extensionRoute,walkablePoint,roadPoint} from './city-tile-layout.mjs';
import {workStation} from './city-activity.mjs';
import {groundCoordinate,groundPoint} from './city-three-layout.mjs';

export const workplaceCapacity=(s,site,role)=>role==='dock'?1+expansionCount(s,site,'depot'):role==='waste'?1:role==='rest'?3:Math.min(s.layout?.version===2?CITY_CAPS.workSlots:6,3+s.districts[site].level-1+expansionCount(s,site,'production')*3+(s.frontier?.plots[site]?.filter(p=>p==='production').length||0));
export const releaseWorkplace=c=>{c.workplace=null;c.queueMove=null;};
const workplaceIndex=new WeakMap();
function occupantsAt(s,key){
 let index=workplaceIndex.get(s);
 if(!index||index.time!==s.time||index.cells!==s.cells||index.shipments!==s.shipments||index.cellCount!==s.cells.length||index.shipmentCount!==s.shipments.length){
  index={time:s.time,cells:s.cells,shipments:s.shipments,cellCount:s.cells.length,shipmentCount:s.shipments.length,groups:new Map()};
  for(const a of [...s.cells,...s.shipments])if(a.workplace){const k=a.workplace.key;if(!index.groups.has(k))index.groups.set(k,[]);index.groups.get(k).push(a);}
  workplaceIndex.set(s,index);
 }
 if(!index.groups.has(key))index.groups.set(key,[]);
 const group=index.groups.get(key);for(let i=group.length-1;i>=0;i--)if(group[i].workplace?.key!==key)group.splice(i,1);
 return group;
}
// Tickets and reserved slots live on the actors, so retirement and completed
// deliveries release reservations without a second registry or a path search.
export function requestWorkplace(s,c,site,role,anchor=null){
 const key=site+':'+role,capacity=workplaceCapacity(s,site,role);
 if(c.workplace?.key!==key){s.workTicket=(s.workTicket||0)+1;c.workplace={key,site,role,ticket:s.workTicket,slot:null};c.queueMove=null;}
 const occupants=occupantsAt(s,key);if(!occupants.includes(c))occupants.push(c);occupants.sort((a,b)=>a.workplace.ticket-b.workplace.ticket);for(const a of occupants)if(a.workplace.slot>=capacity)a.workplace.slot=null;
 const used=new Set(occupants.filter(a=>a.workplace.slot!=null).map(a=>a.workplace.slot));
 for(const a of occupants){if(a.workplace.slot!=null)continue;let slot=role==='oxygen'?a.id%3:a.workSlot??0;if(slot>=capacity||used.has(slot)){slot=0;while(used.has(slot)&&slot<capacity)slot++;}if(slot>=capacity)break;a.workplace.slot=slot;used.add(slot);}
 const slot=c.workplace.slot,queue=occupants.filter(a=>a.workplace.slot==null),index=queue.indexOf(c),bay=anchor?{target:anchor,stand:groundCoordinate({x:groundPoint(anchor).x-1.15,z:groundPoint(anchor).z})}:workStation(site,role,slot??0,s.layout);
 const p=groundPoint(bay.stand);
 const offset=rotateOffset({x:-2.3-(Math.max(0,index)%3)*1.25,z:1.2+Math.floor(Math.max(0,index)/3)*1.25},s.layout?.items[bay.owner||site]?.rot||0),wait=groundCoordinate({x:p.x+offset.x,z:p.z+offset.z});
 c.waitReason=slot==null?'자리 사용 중 · 대기 '+(index+1):'';
 const stand=walkablePoint(s.layout,groundPoint(slot==null?wait:bay.stand));
 return {owner:bay.owner||site,slot,index,ready:slot!=null,target:bay.target,stand:groundCoordinate(slot==null?roadPoint(s.layout,stand):stand)};
}
export function approachWorkplace(s,c,site,role,dt,move,route,speed=58,anchor=null){
 const bay=requestWorkplace(s,c,site,role,anchor),key=site+':'+role+':'+(bay.slot??'q'+bay.index);
 if(c.queueMove!==key){c.queueMove=key;const d=cityDistrict(s,site),from=cityDistricts(s).reduce((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)<Math.hypot(c.x-b.x,c.y-b.y)?a:b);const approach=bay.owner!==site?extensionRoute(s.layout,bay.owner):[];route(c,Math.hypot(c.x-d.x,c.y-d.y)>125&&!anchor?[{x:from.x,y:from.y},...cityRoute(s,from.id,site),...approach,bay.stand]:bay.owner!==site&&Math.hypot(c.x-bay.stand.x,c.y-bay.stand.y)>100?[{x:d.x,y:d.y},...approach,bay.stand]:[bay.stand]);}
 const arrived=move(c,speed*travelScale(s),dt);
 return {...bay,arrived:arrived&&bay.ready};
}
export function workplacePressure(s,id){return ['oxygen','dock','produce','fabricate','waste','rest','repair'].reduce((n,role)=>n+occupantsAt(s,id+':'+role).filter(c=>c.workplace.slot==null).length,0);}
export function facilityState(s,id){
 const d=s.districts[id];if(d.hp<55)return {id:'damage',name:'손상',speed:.35,color:0xc67d6a};
 if(d.food<.3||d.oxygen<20)return {id:'shortage',name:d.food<.3?'영양 부족':'산소 부족',speed:.15,color:0x929aaa};
 if(workplacePressure(s,id)>2)return {id:'overload',name:'적체',speed:.7,color:0xdfac64};
 return {id:'normal',name:'정상',speed:1,color:0x8db8a3};
}
