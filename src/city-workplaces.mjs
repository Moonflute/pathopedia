import {DISTRICTS,districtDef} from './city-data.mjs';
import {vascularRoute} from './city-map.mjs';
import {workStation} from './city-activity.mjs';
import {groundCoordinate,groundPoint} from './city-three-layout.mjs';

export const workplaceCapacity=(s,site,role)=>role==='dock'||role==='waste'?1:role==='rest'?3:Math.min(6,3+s.districts[site].level-1+(s.frontier?.plots[site]?.filter(p=>p==='production').length||0));
export const releaseWorkplace=c=>{c.workplace=null;c.queueMove=null;};
// Tickets and reserved slots live on the actors, so retirement and completed
// deliveries release reservations without a second registry or a path search.
export function requestWorkplace(s,c,site,role,anchor=null){
 const key=site+':'+role,capacity=workplaceCapacity(s,site,role);
 if(c.workplace?.key!==key){s.workTicket=(s.workTicket||0)+1;c.workplace={key,site,role,ticket:s.workTicket,slot:null};c.queueMove=null;}
 const occupants=[...s.cells,...s.shipments].filter(a=>a.workplace?.key===key).sort((a,b)=>a.workplace.ticket-b.workplace.ticket);
 const used=new Set(occupants.filter(a=>a.workplace.slot!=null).map(a=>a.workplace.slot));
 for(const a of occupants){if(a.workplace.slot!=null)continue;let slot=role==='oxygen'?a.id%3:a.workSlot??0;if(slot>=capacity||used.has(slot)){slot=0;while(used.has(slot)&&slot<capacity)slot++;}if(slot>=capacity)break;a.workplace.slot=slot;used.add(slot);}
 const slot=c.workplace.slot,queue=occupants.filter(a=>a.workplace.slot==null),index=queue.indexOf(c),bay=anchor?{target:anchor,stand:groundCoordinate({x:groundPoint(anchor).x-1.15,z:groundPoint(anchor).z})}:workStation(site,role,slot??0);
 const p=groundPoint(bay.stand);
 const wait=groundCoordinate({x:p.x-2.3-(Math.max(0,index)%3)*1.25,z:p.z+1.2+Math.floor(Math.max(0,index)/3)*1.25});
 c.waitReason=slot==null?'자리 사용 중 · 대기 '+(index+1):'';
 return {slot,index,ready:slot!=null,target:bay.target,stand:slot==null?wait:bay.stand};
}
export function approachWorkplace(s,c,site,role,dt,move,route,speed=58,anchor=null){
 const bay=requestWorkplace(s,c,site,role,anchor),key=site+':'+role+':'+(bay.slot??'q'+bay.index);
 if(c.queueMove!==key){c.queueMove=key;const d=districtDef(site),from=DISTRICTS.reduce((a,b)=>Math.hypot(c.x-a.x,c.y-a.y)<Math.hypot(c.x-b.x,c.y-b.y)?a:b);route(c,Math.hypot(c.x-d.x,c.y-d.y)>125&&!anchor?[{x:from.x,y:from.y},...vascularRoute(from.id,site),bay.stand]:[bay.stand]);}
 const arrived=move(c,speed,dt);
 return {...bay,arrived:arrived&&bay.ready};
}
export function workplacePressure(s,id){return [...s.cells,...s.shipments].filter(c=>c.workplace?.site===id&&c.workplace.slot==null).length;}
export function facilityState(s,id){
 const d=s.districts[id];if(d.hp<55)return {id:'damage',name:'손상',speed:.35,color:0xc67d6a};
 if(d.food<.3||d.oxygen<20)return {id:'shortage',name:d.food<.3?'영양 부족':'산소 부족',speed:.15,color:0x929aaa};
 if(workplacePressure(s,id)>2)return {id:'overload',name:'적체',speed:.7,color:0xdfac64};
 return {id:'normal',name:'정상',speed:1,color:0x8db8a3};
}
