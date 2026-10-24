import {groundPoint} from './city-three-layout.mjs';
import {cityDistricts,cityDistrict} from './city-tile-layout.mjs';
import {pilotInventory,pilotedCell} from './city-pilot-state.mjs';
import {activeActivity,beginActivity} from './city-activity.mjs';
import {rememberCell} from './city-cell-memory.mjs';

const orders=new WeakMap(),claims=new WeakMap(),selections=new WeakMap(),reservations=new WeakMap();
export function selectSandboxCell(s,c){if(c)selections.set(s,c);else selections.delete(s);}
export function reserveSandboxCell(s,c){reservations.set(c,s.time+.35);}
export const sandboxReserved=(s,c)=>(reservations.get(c)||0)>s.time&&!!pilotedCell(s);
export const sandboxOrder=(s,c)=>{const o=orders.get(c);return o&&o.until>s.time?o:null;};
export function sandboxCellJobs(s,tool){
 const i=pilotInventory(s),player=pilotedCell(s),p=player?groundPoint(player):null;if(!p)return [];
 const jobs=[];
 for(const c of s.cells){
  if(c===player||c.lost||Math.hypot(groundPoint(c).x-p.x,groundPoint(c).z-p.z)>12)continue;
  if(tool!=='scanner'&&c!==selections.get(s))continue;
  let action='';
  if(tool==='scanner')action='관찰';
  if(tool==='oxygen'&&c.kind==='rbc'&&c.cargo>1&&(i.oxygen<200||i.oxygen>0&&c.cargo<120))action=i.oxygen>0&&c.cargo<120?'산소 전달':'산소 받기';
  if(tool==='nutrient'&&i.nutrient>=1&&(c.energy??100)<96)action='영양 지원';
  if(tool==='cleanup'&&c.kind==='macrophage'&&c.debrisCargo>0&&i.debris<6)action='잔해 인계';
  if(tool==='repair'&&c.kind==='fibroblast'&&['repair','build'].includes(activeActivity(c,s.time)?.kind))action='공동 작업';
  if(tool==='signal'&&['neutrophil','macrophage'].includes(c.kind))action='협동 방어';
  if(action)jobs.push({id:'cell:'+c.id,...groundPoint(c),cell:c,name:action,action:tool,height:.45});
 }
 return jobs;
}
export function sandboxCellWork(s,c,job,api){
 const other=job.cell,i=pilotInventory(s);if(!s.cells.includes(other)||other.lost)return {ok:false};
 let amount=0,kind='signal',text=job.name;
 if(job.action==='oxygen'){
  if(i.oxygen>0&&other.cargo>0&&other.cargo<120){amount=Math.min(8,i.oxygen,120-other.cargo);i.oxygen-=amount;other.cargo+=amount;text='산소 '+Math.round(amount)+' 전달';}
  else{amount=Math.min(8,Math.max(0,other.cargo-1),200-i.oxygen);other.cargo-=amount;i.oxygen+=amount;text='산소 '+Math.round(amount)+' 인계';}
  kind='unload';
 }else if(job.action==='nutrient'){
  amount=Math.min(3,i.nutrient,Math.ceil((100-(other.energy??100))/8));if(amount>0){i.nutrient-=amount;other.energy=Math.min(100,(other.energy??100)+amount*8);text='영양 '+amount+' 전달';}kind='unload';
 }else if(job.action==='cleanup'){
  amount=Math.min(6-i.debris,other.debrisCargo||0);i.debris+=amount;other.debrisCargo-=amount;kind='collect';text='잔해 '+amount+' 인계';
 }else if(job.action==='repair'){
  const work=activeActivity(other,s.time),site=work?.site||other.buildSite||other.target,d=s.districts[site],building=d?.building;
  if(!work||s.resources.materials<1||c.energy<2)return {ok:false,text:'재료 또는 작업 확인'};
  const wall=other.frontJob!=null?s.frontier?.walls[other.frontJob]:null,tissue=other.tissueJob!=null?s.frontier?.tissues[other.tissueJob]:null;
  if(work.kind==='build'&&building?.remaining!=null){amount=Math.min(2,Math.max(0,building.remaining-.05));building.remaining-=amount;}
  else if(work.kind==='repair'&&wall?.repair?.delivered){amount=Math.min(1.2,Math.max(0,wall.repair.remaining-.05));wall.repair.remaining-=amount;}
  else if(work.kind==='repair'&&!wall){const entity=tissue||d;if(entity){amount=Math.min(6,100-entity.hp);entity.hp+=amount;}}
  if(amount>0){s.resources.materials--;c.energy-=2;kind=work.kind;text=work.kind==='build'?'공동 건설':wall?'장벽 공동 보수':'공동 복구 +'+Math.round(amount);}
 }else if(job.action==='signal'){
  if(c.energy<10)return {ok:false,text:'에너지 부족'};c.energy-=10;amount=1;
  const site=cityDistricts(s).reduce((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)<Math.hypot(b.x-c.x,b.y-c.y)?a:b).id;
  orders.set(other,{site,until:s.time+18});s.districts[site].supportUntil=s.time+15;s.stats.signals++;text='협동 방어 · 18초';
 }
 if(amount<=0)return {ok:false,text:'이미 처리됨'};
 rememberCell(s,other,text);rememberCell(s,c,text);beginActivity(s,c,kind,.6,other);
 return {ok:true,text,amount};
}

// Split nearby combatants between threats while preserving rally/hold rules.
export function coordinatedTarget(s,c,eligible,assigned,hold){
 let ledger=claims.get(s);if(!ledger||ledger.time!==s.time){ledger={time:s.time,targets:new Map()};claims.set(s,ledger);}
 const order=sandboxOrder(s,c),origin=order?cityDistrict(s,order.site):assigned;
 let best=null,score=Infinity;
 for(const e of s.enemies){
  if(!eligible(e)||hold&&Math.hypot(e.x-origin.x,e.y-origin.y)>=180)continue;
  const distance=Math.hypot(e.x-c.x,e.y-c.y),committed=ledger.targets.get(e.id)||0;
  const n=distance+(s.specialists?committed*62-(e.action==='attack'?24:0)-(order&&Math.hypot(e.x-origin.x,e.y-origin.y)<160?40:0):0);
  if(n<score){score=n;best=e;}
 }
 if(best)ledger.targets.set(best.id,(ledger.targets.get(best.id)||0)+1);return best;
}

export function sandboxIncidents(s){
 const events=[];
 for(const d of cityDistricts(s)){
  const state=s.districts[d.id],p=groundPoint(d),bio=s.biology?.sites[d.id];
  const enemies=s.enemies.filter(e=>!e.dead&&e.entered&&(e.site===d.id||Math.hypot(e.x-d.x,e.y-d.y)<120));
  const debris=s.debris.filter(e=>Math.hypot(e.x-d.x,e.y-d.y)<160).length;
  let phase='',color=0xe0c17e;
  if(enemies.length){phase='감염 · 방어 '+enemies.length;color=0xee957d;}
  else if((bio?.inflammation||0)>12){phase='염증 조절';color=0xd6a5e6;}
  else if(debris){phase='잔해 수거 '+debris;color=0xb4d18e;}
  else if(state.hp<90){phase='조직 복구';color=0x97d5bd;}
  else if(state.oxygen<25||state.food<5){phase=state.oxygen<25?'산소 보급':'영양 보급';color=0x8bd5e4;}
  if(phase)events.push({id:d.id,name:d.short,phase,color,...p,hp:state.hp,oxygen:state.oxygen,food:state.food});
 }
 return events;
}
