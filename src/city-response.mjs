import {immuneAntigen} from './city-immunity.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {WALLS,TISSUES} from './city-frontier-data.mjs';
import {CITY_ENTRIES} from './city-world.mjs';
import {siteAt,tissuePresent} from './city-tile-layout.mjs';
import {groundPoint} from './city-three-layout.mjs';
import {infectionFocus} from './city-infection-focus.mjs';

export const RESPONSE_STEPS=['진입','선천 방어','항원 전달','후천 반응','제거','복구'];
const fronts={skin:'피부',airway:'호흡기',gut:'소화기',blood:'혈류'};
const innate=new Set(['neutrophil','macrophage','monocyte','nk','eosinophil','mast','basophil']);
function health(s,e){const values=[s.districts[e.site].hp,...TISSUES.filter(t=>t.district===e.site&&tissuePresent(s,t)).map(t=>s.frontier.tissues[t.id]?.hp??100)];if(e.wall!=null)values.push(s.frontier.walls[e.wall].hp);return Math.min(...values);}
export function tickResponse(s){
 if(!s.immunity||!s.layout)return;const i=s.immunity,r=i.response??={version:1,episodes:[]},records=new Map();
 for(const p of [...s.spawn,...s.enemies.filter(p=>!p.dead),...i.infected,...i.parasites,...i.exposures]){
  const old=records.get(p.recordId);if(!old||p.entered||p.site)records.set(p.recordId,p);
 }
 for(const [site,bio] of Object.entries(s.biology.sites))for(const [recordId,n] of Object.entries(bio.strains))if(n>.25&&!records.has(recordId))records.set(recordId,{recordId,site,entered:true});
 for(const [id,p] of records){if(r.episodes.some(e=>e.recordId===id&&e.closedAt==null))continue;
  const front=p.front||(p.site==='gut'?'gut':p.site==='lung'?'airway':'blood'),focus=pathogenDef(id)?.focus[front],site=p.site||(focus&&focus!=='tissue'?focus:front==='skin'?WALLS[p.wall??11].district:front==='gut'?'gut':'lung');
  const e={recordId:id,site,front,wall:front==='skin'?p.wall??11:null,started:s.time,seen:[s.time,null,null,null,null,null],minHp:100};e.initialHp=e.minHp=health(s,e);r.episodes.unshift(e);
 }
 r.episodes=r.episodes.slice(0,8);
 for(const e of r.episodes){
  if(e.closedAt!=null)continue;const matching=s.cells.filter(c=>c.recordId===e.recordId),incoming=s.spawn.filter(p=>p.recordId===e.recordId).length+s.enemies.filter(p=>!p.dead&&p.recordId===e.recordId).length;
  const burden=Object.values(s.biology.sites).reduce((n,b)=>n+(b.strains[e.recordId]||0),0),hosts=i.infected.filter(p=>p.recordId===e.recordId).length+i.parasites.filter(p=>p.recordId===e.recordId).length+i.exposures.filter(p=>p.recordId===e.recordId).length;
  const local=s.cells.filter(c=>innate.has(c.kind)&&c.target===e.site&&(c.alertUntil>s.time||['engulf','cytotoxic','degranulate'].includes(c.activity?.kind)));
  const dc=matching.filter(c=>c.kind==='dendritic'&&['migrating','presenting'].includes(c.immuneState)),adaptive=matching.filter(c=>['helperT','cd8','bcell','plasma'].includes(c.kind)&&['priming','effector','germinal','secreting'].includes(c.immuneState));
  const antibodies=Object.values(i.antibodies[e.recordId]||{}).reduce((a,b)=>a+b,0),hp=health(s,e);e.minHp=Math.min(e.minHp,hp);
  const barrier=s.enemies.filter(p=>!p.dead&&p.recordId===e.recordId&&['trapped','expelled'].includes(p.action)).length;
  const contact=hosts>0||burden>.25||s.enemies.some(p=>!p.dead&&p.recordId===e.recordId&&p.entered);
  if(barrier||contact&&(local.length||i.sites[e.site].danger>1))e.seen[1]??=s.time;
  if(dc.length||i.presentations[e.recordId])e.seen[2]??=s.time;
  if(adaptive.length||antibodies>.5)e.seen[3]??=s.time;
  const clear=incoming===0&&hosts===0&&burden<.25&&s.time-e.started>2;
  if(clear)e.seen[4]??=s.time;
  // Healing may overlap combat; completion waits for clearance and actual HP.
  const repairing=s.cells.filter(c=>c.kind==='fibroblast'&&(c.frontJob===e.wall&&e.wall!=null||c.target===e.site&&['조직 블록 복구','복구 준비','조직 복구'].includes(c.task)));
  if(e.seen[4]!=null&&(repairing.length||hp>e.minHp+.5||e.minHp>=98))e.seen[5]??=s.time;
  e.active=[incoming>0,local.length>0,dc.length>0,adaptive.length>0||antibodies>.5,clear,repairing.length>0];
  e.counts={incoming,innate:contact?local.length:0,barrier,dc:dc.length,adaptive:adaptive.length,antibodies:Math.round(antibodies),repair:repairing.length,hp:Math.round(hp)};
  if(clear&&hp>=95){e.seen[5]??=s.time;e.closedAt=s.time;}
 }
}
export function responseView(s,selected=null){
 const list=s.immunity?.response?.episodes||[],e=list.find(e=>e.recordId+'@'+e.started===selected)||list.find(e=>e.closedAt==null)||list[0];if(!e)return null;
 const c=e.counts||{},name=immuneAntigen(e.recordId)?.name||e.recordId,dc=s.cells.find(c=>c.kind==='dendritic'&&c.recordId===e.recordId&&c.immuneState==='migrating');
 const site=groundPoint(infectionFocus(s,e.site,e.recordId)),entry=e.front==='skin'?WALLS[e.wall??11]:CITY_ENTRIES[e.front]?.mouth||CITY_ENTRIES[e.front]?.portal||site;
 const cleared=e.closedAt!=null||e.active?.[4],stage=cleared?5:e.seen[3]!=null?3:e.seen[2]!=null?2:e.seen[1]!=null?1:0;
 const detail=[`${c.incoming||0}개 접근`,`${c.innate||0}세포 반응${c.barrier?' · 점액 포획 '+c.barrier:''}`,`수지상세포 ${c.dc||0}`,`T·B·형질 ${c.adaptive||0} · 항체 ${c.antibodies||0}`,cleared?'감염 제거':'감염 진행',e.closedAt!=null?'조직 안정':`복구 ${c.repair||0} · 조직 ${c.hp??100}%`];
 return {episode:e,name,route:fronts[e.front]||'조직',stage,steps:RESPONSE_STEPS.map((name,n)=>({name,detail:detail[n],state:e.closedAt!=null&&e.seen[n]==null?'skipped':n>=4&&!cleared?'waiting':n===stage?'active':e.seen[n]!=null?'done':'waiting',point:n===0?entry:n===2?(dc?groundPoint(dc):siteAt(s.layout,'lymph')):n===3?siteAt(s.layout,'lymph'):n===5&&e.wall!=null?WALLS[e.wall]:site}))};
}
export function validateResponse(s){const r=s.immunity?.response;if(!r)return true;return r.version===1&&Array.isArray(r.episodes)&&r.episodes.length<=8&&r.episodes.every(e=>immuneAntigen(e.recordId)&&s.districts[e.site]&&fronts[e.front]&&(e.wall==null||WALLS[e.wall])&&Number.isFinite(e.started)&&e.started>=0&&e.started<=s.time&&Array.isArray(e.seen)&&e.seen.length===6&&e.seen.every(t=>t==null||Number.isFinite(t)&&t>=0&&t<=s.time)&&Number.isFinite(e.minHp)&&e.minHp>=0&&e.minHp<=100&&Number.isFinite(e.initialHp)&&e.initialHp>=0&&e.initialHp<=100);}
