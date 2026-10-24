import {pilotSites} from './city-pilot-sites.mjs';
import {pilotJobs} from './city-pilot-tasks.mjs';
import {pilotTool,PILOT_TOOLS,pilotInventory} from './city-pilot-state.mjs';
import {CELL_JOBS} from './city-data.mjs';

export function pilotObjects(s){
 const objects=new Map(pilotSites(s).map(p=>[p.key,{...p,kind:'station',jobs:[]} ]));
 for(const def of PILOT_TOOLS)for(const job of pilotJobs(s,def.id)){
  const key=job.station||job.id;let object=objects.get(key);
  if(!object){object={key,target:job.target||job,approach:job,height:job.cell?.45:job.shipment?.5:job.enemy?.43:job.debris?.12:.65,radius:job.cell?.3:job.shipment?.6:job.enemy?.43:job.debris?.24:.65,kind:job.cell?'cell':job.shipment?'carrier':job.home?'home':job.enemy?'enemy':job.debris?'debris':'structure',name:job.cell?CELL_JOBS[job.cell.kind].name+' #'+job.cell.id:job.shipment?'운반체 #'+job.shipment.id:job.name.replace(/ · (복구|응급 봉합)$/,''),cell:job.cell,shipment:job.shipment,home:job.home,jobs:[]};objects.set(key,object);}
  object.jobs.push(job);
 }
 return [...objects.values()];
}
export function pilotFocus(s,pose,world,objects=pilotObjects(s)){
 const {position:p,yaw,pitch,eye}=pose,dx=Math.sin(yaw)*Math.cos(pitch),dy=Math.sin(pitch),dz=-Math.cos(yaw)*Math.cos(pitch),inventory=pilotInventory(s);
 let best=null,depth=Infinity;
 for(const object of objects){
  if((object.cell||object.shipment)&&inventory.tool!=='scanner'&&!object.jobs.some(j=>j.action===inventory.tool))continue;
  const x=object.target.x-p.x,z=object.target.z-p.z,y=object.height-eye,t=x*dx+y*dy+z*dz;
  // A small aim tolerance keeps low workbenches usable on touch screens.
  const radius=object.radius+Math.min(inventory.tool==='scanner'&&object.cell?.9:.16,Math.max(0,t)*(inventory.tool==='scanner'&&object.cell?.12:.018));
  if(t<-.15||t>(inventory.tool==='scanner'?12:10)||t>=depth||x*x+y*y+z*z-t*t>radius*radius)continue;
  const stand=object.approach,standDistance=Math.hypot(stand.x-p.x,stand.z-p.z);
  if(!world.clear({...p,y:eye},{...stand,y:object.kind==='station'?.45:object.height}))continue;
  best={...object,distance:Math.hypot(x,z,y),standDistance:Math.hypot(standDistance,object.height-eye)};depth=t;
 }
 if(!best)return null;
 const job=best.jobs.find(j=>j.action===inventory.tool),suggested=job||best.jobs.find(j=>j.action===best.tool)||best.jobs.find(j=>j.action!=='scanner')||best.jobs[0];
 const def=suggested?pilotTool(suggested.action):pilotTool(best.tool||'scanner');
 const matching=!!job,range=matching?pilotTool(inventory.tool).range:def.range,near=best.standDistance<=range&&best.distance<=range+1.2;
 let status='';
 if(best.cell)status=best.cell.task||CELL_JOBS[best.cell.kind].task;
 else if(best.shipment)status=best.shipment.task||'물자 운반 중';
 else if(best.home){const d=s.homeostasis.organs[best.home.id];status='HP '+Math.round(d.hp)+' · O₂ '+Math.round(d.oxygen);}
 else if(best.site){const d=s.districts[best.site];status='HP '+Math.round(d.hp)+' · O₂ '+Math.round(d.oxygen)+' · 영양 '+Math.round(d.food);}
 else{const j=job||suggested;if(j?.enemy)status='HP '+Math.ceil(j.enemy.hp)+' / '+Math.ceil(j.enemy.maxHp||j.enemy.hp);else if(j?.entity)status='HP '+Math.round(j.entity.hp);else if(best.kind==='debris')status='수거 '+inventory.debris+'/6'+(j?.recordId?' · 항원 채집 가능':'');}
 return {...best,job,tool:def,matching,near,status,action:job?.action==='engulf'?'포식':job?.action==='scanner'?'진단':job?.name.split(' · ').at(-1),idle:!suggested};
}
