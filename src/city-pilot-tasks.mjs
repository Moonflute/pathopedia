import {pilotInventory,pilotTool} from './city-pilot-state.mjs';
import {cityDistricts,siteAt,tissueAt,tissuePresent} from './city-tile-layout.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {TISSUES,WALLS,supportCount} from './city-frontier-data.mjs';
import {ruleTarget} from './city-rules.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {pilotSite,pilotFieldSite} from './city-pilot-sites.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const pilotHostile=e=>!e.dead&&e.entered&&e.compartment!=='lumen';
export const pilotFoodCapacity=(s,id)=>40+supportCount(s,id,'supply')*8;
export function pilotJobs(s,tool){
 const inventory=pilotInventory(s),districts=cityDistricts(s);
 const organ=(id,label,action=tool)=>{const station=pilotSite(s,id,tool);return {id,...(station?.approach||siteAt(s.layout,id)),target:station?.target,station:station?.key,site:id,name:districts.find(d=>d.id===id).short+' · '+label,action};};
 const enemy=e=>({id:'enemy:'+e.id,...groundPoint(e),enemy:e,name:pathogenDef(e.recordId)?.name||'병원체',action:tool});
 if(tool==='engulf')return s.enemies.filter(pilotHostile).map(enemy);
 if(tool==='oxygen')return inventory.oxygen?districts.filter(d=>d.id!=='lung'&&ruleTarget(s,'oxygen',d.id)&&s.districts[d.id].oxygen<99.9).map(d=>organ(d.id,'산소 하역')):[organ('lung','산소 적재')];
 if(tool==='nutrient')return inventory.nutrient?districts.filter(d=>d.id!=='gut'&&s.districts[d.id].food<pilotFoodCapacity(s,d.id)-.1).map(d=>organ(d.id,'영양 하역')):[organ('gut','영양 적재')];
 if(tool==='repair')return [
  ...districts.filter(d=>s.districts[d.id].hp<99.9).map(d=>({...organ(d.id,'장기 복구'),entity:s.districts[d.id]})),
  ...TISSUES.filter(t=>s.frontier?.tissues[t.id]?.hp<99.9&&tissuePresent(s,t)).map(t=>({id:'tissue:'+t.id,...pilotFieldSite(s,groundPoint(tissueAt(s,t).point)),site:t.district,name:t.name+' · 복구',entity:s.frontier.tissues[t.id],action:tool}))
 ];
 if(tool==='cleanup')return inventory.debris>=6?[organ('kidney','잔해 하역')]:[...s.debris.map(d=>({id:'debris:'+d.id,...groundPoint(d),debris:d,name:'잔해 수거',action:tool})),...(inventory.debris?[organ('kidney','잔해 하역')]:[])];
 if(tool==='patch'){
  const walls=WALLS.filter(w=>s.frontier?.walls[w.id]?.hp<25&&!s.frontier.walls[w.id].repair?.delivered).map(w=>({id:'wall:'+w.id,...groundPoint(w.inside),site:w.district,name:w.name+' · 응급 봉합',entity:s.frontier.walls[w.id],action:tool}));
  return [...walls,...(s.barrier<99.9?[organ('lung','폐 장벽 보호')]:[])];
 }
 if(tool==='antigen'){
  if(inventory.antigen)return [organ('lymph','항원 전달')];
  const fresh=id=>id&&!s.antigens[id]&&!s.frontier?.inbox.some(x=>x.recordId===id);
  return [...s.debris.filter(d=>fresh(d.recordId)).map(d=>({id:'debris:'+d.id,...groundPoint(d),debris:d,recordId:d.recordId,name:'잔해 · 항원 채집',action:tool})),...s.enemies.filter(e=>pilotHostile(e)&&fresh(e.recordId)).map(e=>({...enemy(e),recordId:e.recordId}))];
 }
 if(tool==='signal')return districts.map(d=>organ(d.id,'방어 지원'));
 if(tool==='scanner')return [...s.enemies.filter(pilotHostile).map(enemy),...districts.map(d=>({...organ(d.id,'진단'),entity:s.districts[d.id]}))];
 return [];
}
export function pilotObjective(s,tool,p){
 const jobs=pilotJobs(s,tool),inventory=pilotInventory(s),def=pilotTool(tool);
 jobs.sort((a,b)=>distance(p,a)-distance(p,b));
 const local=jobs.find(j=>distance(p,j)<=def.range);
 const selected=['oxygen','nutrient'].includes(tool)&&jobs.find(j=>j.id===inventory.target);
 return local||selected||jobs[0]||{id:'idle:'+tool,...siteAt(s.layout,'heart'),name:({engulf:'감염 없음 · 도시 순찰',repair:'복구할 곳 없음',cleanup:'수거할 잔해 없음',patch:'장벽 정상',antigen:'새 항원 탐색',oxygen:'산소 충분',nutrient:'영양 충분'})[tool]||'도시 순찰',idle:true,action:tool};
}
export function pilotStock(s,id){
 const i=pilotInventory(s);
 return ({engulf:'∞',oxygen:Math.ceil(i.oxygen),nutrient:Math.ceil(i.nutrient),repair:Math.floor(s.resources.materials),cleanup:i.debris+'/6',patch:'∞',antigen:i.antigen?'1':'0',signal:'∞',scanner:'∞'})[id];
}
