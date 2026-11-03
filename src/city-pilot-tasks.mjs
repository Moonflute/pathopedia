import {pilotInventory,pilotTool} from './city-pilot-state.mjs';
import {cityDistricts,siteAt,tissueAt,tissuePresent} from './city-tile-layout.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {TISSUES,WALLS,supportCount} from './city-frontier-data.mjs';
import {pilotSite,pilotFieldSite} from './city-pilot-sites.mjs';
import {sandboxCellJobs} from './city-sandbox.mjs';
import {homeSites} from './city-homeostasis-data.mjs';
import {pilotHostile,pilotEnemyBody,pilotEnemyName,pilotEnemies} from './city-pilot-combat.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export {pilotHostile};
export const pilotFoodCapacity=(s,id)=>40+supportCount(s,id,'supply')*8;
export function pilotJobs(s,tool){
 const jobs=facilityJobs(s,tool);
 if(tool==='scanner'){
  for(const sh of s.shipments)if(!(sh.harbourUntil>s.time))jobs.push({id:'shipment:'+sh.id,...groundPoint(sh),shipment:sh,name:'운반체 관찰',action:tool});
  if(s.homeostasis)for(const o of homeSites(s.layout))jobs.push({id:'home:'+o.id,x:o.x,z:o.z,home:o,name:o.name+' · 관찰',action:tool});
 }
 return [...jobs,...sandboxCellJobs(s,tool)];
}
function facilityJobs(s,tool){
 const inventory=pilotInventory(s),districts=cityDistricts(s);
 const organ=(id,label,action=tool)=>{const station=pilotSite(s,id,tool);return {id,...(station?.approach||siteAt(s.layout,id)),target:station?.target,station:station?.key,site:id,name:districts.find(d=>d.id===id).short+' · '+label,action};};
 const enemy=e=>{const b=pilotEnemyBody(s,e);return {id:'enemy:'+e.id,x:b.x,z:b.z,height:b.y,radius:Math.max(b.rx,b.rz),enemy:e,name:pilotEnemyName(e),action:tool};};
 if(tool==='engulf')return pilotEnemies(s).filter(pilotHostile).map(enemy);
 if(tool==='oxygen')return districts.filter(d=>s.districts[d.id].oxygen<99.9).map(d=>organ(d.id,'산소 공급'));
 if(tool==='nutrient')return districts.filter(d=>s.districts[d.id].food<pilotFoodCapacity(s,d.id)-.1).map(d=>organ(d.id,'영양 공급'));
 if(tool==='repair')return [
  ...districts.filter(d=>s.districts[d.id].hp<99.9).map(d=>({...organ(d.id,'장기 복구'),entity:s.districts[d.id]})),
  ...TISSUES.filter(t=>s.frontier?.tissues[t.id]?.hp<99.9&&tissuePresent(s,t)).map(t=>({id:'tissue:'+t.id,...pilotFieldSite(s,groundPoint(tissueAt(s,t).point)),site:t.district,name:t.name+' · 복구',entity:s.frontier.tissues[t.id],action:tool})),
  ...WALLS.filter(w=>s.frontier?.walls[w.id]?.hp<99.9).map(w=>({id:'wall:'+w.id,...pilotFieldSite(s,groundPoint(w.inside)),site:w.district,name:w.name+' · 장벽 복구',entity:s.frontier.walls[w.id],wall:true,action:tool})),
  ...(s.homeostasis?homeSites(s.layout).filter(o=>s.homeostasis.organs[o.id]?.hp<99.9).map(o=>({id:'home:'+o.id,...pilotFieldSite(s,{x:o.x,z:o.z}),home:o,name:o.name+' · 복구',entity:s.homeostasis.organs[o.id],action:tool})):[]),
  ...(s.barrier<99.9?[{...organ('lung','폐 장벽 복구'),id:'barrier:lung',barrier:true}]:[])
 ];
 if(tool==='tractor')return inventory.debris>=6?[organ('kidney','잔해 하역')]:[...s.debris.map(d=>({id:'debris:'+d.id,...groundPoint(d),debris:d,name:'잔해 수거',action:tool})),...(inventory.debris?[organ('kidney','잔해 하역')]:[])];
 if(tool==='scanner')return [...pilotEnemies(s).filter(pilotHostile).map(enemy),...districts.map(d=>({...organ(d.id,'진단'),entity:s.districts[d.id]}))];
 return [];
}
export function pilotObjective(s,tool,p){
 const jobs=pilotJobs(s,tool),inventory=pilotInventory(s),def=pilotTool(tool);
 jobs.sort((a,b)=>distance(p,a)-distance(p,b));
 const local=jobs.find(j=>distance(p,j)<=def.range);
 const selected=['oxygen','nutrient'].includes(tool)&&jobs.find(j=>j.id===inventory.target);
 return local||selected||jobs[0]||{id:'idle:'+tool,...siteAt(s.layout,'heart'),name:({engulf:'감염 없음 · 도시 순찰',repair:'복구할 곳 없음',tractor:'수거할 잔해 없음',oxygen:'산소 충분',nutrient:'영양 충분'})[tool]||'도시 순찰',idle:true,action:tool};
}
export function pilotStock(s,id){
 const i=pilotInventory(s);
 return ({engulf:'∞',oxygen:'∞',nutrient:'∞',repair:'∞',tractor:i.debris+'/6'})[id];
}
