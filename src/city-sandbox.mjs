import {groundPoint} from './city-three-layout.mjs';
import {cityDistricts,cityDistrict} from './city-tile-layout.mjs';
import {pilotedCell} from './city-pilot-state.mjs';
import {activeActivity,beginActivity} from './city-activity.mjs';
import {rememberCell} from './city-cell-memory.mjs';

const orders=new WeakMap(),claims=new WeakMap(),selections=new WeakMap(),reservations=new WeakMap();
export function selectSandboxCell(s,c){if(c)selections.set(s,c);else selections.delete(s);}
export function reserveSandboxCell(s,c){reservations.set(c,s.time+.35);}
export const sandboxReserved=(s,c)=>(reservations.get(c)||0)>s.time&&!!pilotedCell(s);
export const sandboxOrder=(s,c)=>{const o=orders.get(c);return o&&o.until>s.time?o:null;};
export function sandboxCellJobs(s,tool){
 const player=pilotedCell(s),p=player?groundPoint(player):null;if(!p)return [];
 const jobs=[];
 for(const c of s.cells){
  if(c===player||c.lost||Math.hypot(groundPoint(c).x-p.x,groundPoint(c).z-p.z)>12)continue;
  if(tool!=='scanner'&&tool!=='repair'&&c!==selections.get(s))continue;
  let action='';
  if(tool==='scanner')action='관찰';
  if(tool==='oxygen'&&c.kind==='rbc'&&c.cargo<120)action='산소 전달';
  if(tool==='nutrient'&&(c.energy??100)<96)action='영양 지원';
  if(tool==='repair'){if((c.integrity??100)<99.9)action='세포 복구';else if(c.kind==='fibroblast'&&['repair','build'].includes(activeActivity(c,s.time)?.kind))action='공동 작업';}
  if(action)jobs.push({id:'cell:'+c.id,...groundPoint(c),cell:c,name:action,action:tool,height:.45});
 }
 return jobs;
}
export function sandboxCellWork(s,c,job,api){
 const other=job.cell;if(!s.cells.includes(other)||other.lost)return {ok:false};
 let amount=0,kind='signal',text=job.name;
 if(job.action==='oxygen'){
  amount=Math.min(8,120-other.cargo);other.cargo+=amount;text='산소 '+Math.round(amount)+' 전달';
  kind='unload';
 }else if(job.action==='nutrient'){
  amount=Math.min(3,Math.ceil((100-(other.energy??100))/8));if(amount>0){other.energy=Math.min(100,(other.energy??100)+amount*8);text='영양 '+amount+' 전달';}kind='unload';
 }else if(job.action==='repair'){
  const work=activeActivity(other,s.time),site=work?.site||other.buildSite||other.target,d=s.districts[site],building=d?.building;
  if((other.integrity??100)<99.9){amount=Math.min(8,100-other.integrity);other.integrity+=amount;kind='repair';text='세포 복구 +'+Math.round(amount);}
  else{
  if(!work)return {ok:false,text:'복구할 곳 없음'};
  const wall=other.frontJob!=null?s.frontier?.walls[other.frontJob]:null,tissue=other.tissueJob!=null?s.frontier?.tissues[other.tissueJob]:null;
  if(work.kind==='build'&&building?.remaining!=null){amount=Math.min(2,Math.max(0,building.remaining-.05));building.remaining-=amount;}
  else if(work.kind==='repair'&&wall?.repair?.delivered){amount=Math.min(1.2,Math.max(0,wall.repair.remaining-.05));wall.repair.remaining-=amount;}
  else if(work.kind==='repair'&&!wall){const entity=tissue||d;if(entity){amount=Math.min(6,100-entity.hp);entity.hp+=amount;}}
  if(amount>0){kind=work.kind;text=work.kind==='build'?'공동 건설':wall?'장벽 공동 보수':'공동 복구 +'+Math.round(amount);}
  }

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
