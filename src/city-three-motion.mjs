import {groundPoint} from './city-three-layout.mjs';

// Presentation-only snapshots: no cloning of the city, path search or save data.
export function createCityMotion(profile){
 const previous=new Map();let run=null,layout=null,time=0,alpha=1,visualTime=0,generation=0,valid=false;
 function remember(unit,id){
  const p=groundPoint(unit);let record=previous.get(id);
  if(!record){record={};previous.set(id,record);}
  record.unit=unit;record.x=p.x;record.z=p.z;record.generation=generation;
 }
 function reset(){previous.clear();run=null;layout=null;valid=false;}
 return {
  capture(s){
   if(run!==s||layout!==s.layout)reset();
   run=s;layout=s.layout;time=s.time;generation++;
   for(let i=0;i<Math.min(profile.maxCells,s.cells.length);i++)remember(s.cells[i],s.cells[i].id);
   for(let i=0;i<Math.min(profile.maxShipments,s.shipments.length);i++)remember(s.shipments[i],'shipment'+s.shipments[i].id);
   let count=0;for(const e of s.enemies)if(!e.dead&&count++<profile.maxEnemies)remember(e,'enemy'+e.id);
   for(const [id,record] of previous)if(record.generation!==generation)previous.delete(id);
  },
  prepare(s,fraction=1,paused=false){
   if(paused||run!==s||layout!==s.layout||s.time<time)reset();
   valid=run===s&&s.time-time<=.2;
   alpha=valid?Math.max(0,Math.min(1,fraction)):1;
   visualTime=valid?time+(s.time-time)*alpha:s.time;
  },
  point(unit,id){
   const p=groundPoint(unit),old=valid&&previous.get(id);
   // Newly spawned actors, layout edits and teleports must never slide across town.
   if(old?.unit===unit&&(p.x-old.x)**2+(p.z-old.z)**2<4){p.x=old.x+(p.x-old.x)*alpha;p.z=old.z+(p.z-old.z)*alpha;}
   return p;
  },
  get time(){return visualTime;},reset
 };
}
