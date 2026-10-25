import {DISTRICTS} from './city-data.mjs';
import {compileLayout,siteAt,tissueAt,tissuePresent} from './city-tile-layout.mjs';
import {homeSites,homeFootprint} from './city-homeostasis-data.mjs';
import {compileCanalLayout} from './city-canal-layout.mjs';
import {groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {TISSUES} from './city-frontier-data.mjs';

export const RESIDENT_LIMIT=192;
const cache=new WeakMap();
const types={lung:['폐포세포','기도 상피세포'],heart:['심근세포','혈관 내피세포'],gut:['장 상피세포','배상세포'],kidney:['세뇨관 세포','사구체 세포'],marrow:['골수 기질세포','골수 간질세포'],lymph:['망상 기질세포','림프관 내피세포'],brain:['신경세포','성상세포'],thyroid:['갑상선 여포세포','부갑상선 주세포'],pancreas:['췌장 선방세포','췌장 베타세포'],liver:['간세포','담관 상피세포'],spleen:['비장 기질세포','혈관 내피세포'],bone:['골세포','조골세포'],adrenal:['부신 피질세포','부신 수질세포'],muscle:['골격근 세포','근육 위성세포'],fat:['지방세포','지방 기질세포']};
export const RESIDENT_ACTIVITIES=['동네 산책','공방 작업','영양 섭취','이웃과 휴식','주변 정돈','시설 점검'];
function position(plan,time){const phase=(time+plan.variant*2.7)%28,t=phase<6?phase/6:phase<18?1:phase<24?1-(phase-18)/6:0;return {x:plan.anchor.x+(plan.end.x-plan.anchor.x)*t,z:plan.anchor.z+(plan.end.z-plan.anchor.z)*t};}
function plans(layout){
 if(!layout)return [];if(cache.has(layout))return cache.get(layout);
 const network=compileLayout(layout),town=compileCanalLayout(layout),b=town.blocks,homes=homeSites(layout),reserved=[];
 for(const h of homes)reserved.push(homeFootprint(h));
 for(const p of [...b.frontages,...b.tissues.map(p=>({...p,w:1.35,d:1.35})),...b.lung.map(p=>({...p,w:2.6,d:2.8}))]){
  const turn=Math.abs(Math.sin(p.angle||0))>.5,hx=(turn?p.d:p.w)/2+.28,hz=(turn?p.w:p.d)/2+.28;reserved.push({left:p.x-hx,right:p.x+hx,top:p.z-hz,bottom:p.z+hz});
 }
 const clear=p=>[[0,0],[.28,0],[-.28,0],[0,.28],[0,-.28]].every(([x,z])=>{const q={x:p.x+x,z:p.z+z};return !town.isWater(q)&&!network.occupied.has(Math.round(q.x)+','+Math.round(q.z))&&!reserved.some(r=>q.x>r.left&&q.x<r.right&&q.z>r.top&&q.z<r.bottom);});
 const pathClear=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*5));for(let i=0;i<=n;i++)if(!clear({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;};
 const areas=[...DISTRICTS.map(d=>({id:d.id,site:d.id,name:d.short,color:d.color,...siteAt(layout,d.id),count:6})),...homes.map(h=>({...h,site:h.host,count:6})),...TISSUES.filter(t=>tissuePresent({layout},t)).map(t=>({id:'tissue-'+t.id,site:t.district,tissue:t.id,name:'조직 마을',color:'#baad92',...groundPoint(tissueAt({layout},t).point),count:2}))],result=[];
 for(const area of areas){
  const candidates=[];
  for(let z=-7;z<=7;z+=.7)for(let x=-7;x<=7;x+=.7){const p={x:area.x+x,z:area.z+z};if(clear(p))candidates.push({...p,score:Math.hypot(x,z)+(z<0?1:0)});}
  candidates.sort((a,b)=>a.score-b.score);const used=[];
  for(let n=0;n<area.count&&result.length<RESIDENT_LIMIT;n++){
   const anchor=candidates.find(p=>used.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>.85));if(!anchor)break;used.push(anchor);
   const ends=[[1,0],[0,1],[-1,0],[0,-1]].map(([x,z])=>({x:anchor.x+x*(1.05+n%2*.35),z:anchor.z+z*(1.05+n%2*.35)})).filter(p=>pathClear(anchor,p));
   const end=ends[n%Math.max(1,ends.length)]||anchor;
   result.push({id:'resident:'+area.id+':'+n,organ:area.id,site:area.site,tissue:area.tissue,name:(types[area.id]||['상피세포','기질세포'])[n%2],area:area.name,color:area.color,anchor:{x:anchor.x,z:anchor.z},end,variant:n+result.length});
  }
 }
 cache.set(layout,result);return result;
}
export function ensureResidents(s){
 if(!s.specialists||!s.layout)return null;
 const catalog=plans(s.layout);
 if(s.somatic&&s.somatic.revision===(s.layout.revision||0)&&s.somatic.people.length===catalog.length)return s.somatic;
 const old=new Map((s.somatic?.people||[]).map(p=>[p.id,p]));
 return s.somatic={version:1,revision:s.layout.revision||0,people:catalog.map(p=>old.get(p.id)||{id:p.id,health:s.districts[p.site]?.hp??100,hitAt:-100,dead:false})};
}
export function residentView(s){
 const state=new Map((s.somatic?.people||[]).map(p=>[p.id,p])),infectedAt=new Map();
 for(const h of s.immunity?.infected||[]){if(!infectedAt.has(h.site))infectedAt.set(h.site,[]);infectedAt.get(h.site).push(groundPoint(h));}
 return plans(s.layout).map(plan=>{
  const health=state.get(plan.id),phase=(s.time+plan.variant*2.7)%28,move=phase<6?phase/6:phase<18?1:phase<24?1-(phase-18)/6:0,damaged=health?.health??s.districts[plan.site]?.hp??100,infected=infectedAt.get(plan.site)?.some(p=>Math.hypot(p.x-plan.anchor.x,p.z-plan.anchor.z)<3);
  const p={x:plan.anchor.x+(plan.end.x-plan.anchor.x)*move,z:plan.anchor.z+(plan.end.z-plan.anchor.z)*move};
  return {...plan,...groundCoordinate(p),point:p,somatic:true,health:damaged,dead:health?.dead||damaged<=0,hitAt:health?.hitAt??-100,growUntil:health?.growUntil,infected,phase,task:health?.growUntil?'세포 재생 중':damaged<=0?'조직 재생 대기':infected?'감염 반응':damaged<35?'손상 · 회복 중':phase<6||phase>=18&&phase<24?'동네 산책':RESIDENT_ACTIVITIES[1+plan.variant%5]};
 });
}
export function injureResidents(s,site,amount,point,tissue){
 const state=ensureResidents(s);if(!state||amount<=0)return;
 const at=point?groundPoint(point):siteAt(s.layout,site),catalog=plans(s.layout),distance=plan=>{const p=position(plan,s.time);return Math.hypot(p.x-at.x,p.z-at.z);},options=catalog.filter(p=>p.site===site&&(tissue==null||p.tissue===tissue)).sort((a,b)=>distance(a)-distance(b));
 const plan=options.find(p=>!state.people.find(q=>q.id===p.id)?.dead);if(!plan)return;
 const p=state.people.find(q=>q.id===plan.id);p.health=Math.max(0,p.health-amount*4);p.hitAt=s.time;p.dead=p.health<=0;
}
export function tickResidents(s,dt){
 const state=ensureResidents(s);if(!state)return;const catalog=plans(s.layout),repairSites=new Set(s.cells.filter(c=>c.kind==='fibroblast').map(c=>c.target));
 for(let n=0;n<state.people.length;n++){
  const p=state.people[n],plan=catalog[n],organ=plan.organ in (s.homeostasis?.organs||{})?s.homeostasis.organs[plan.organ]:s.districts[plan.site],tissue=plan.tissue!=null?s.frontier.tissues[plan.tissue]:null;
  if(p.growUntil<=s.time&&organ.hp>45&&organ.oxygen>25){p.health=50;p.dead=false;p.hitAt=s.time;delete p.growUntil;}
  if(organ.hp<35&&p.health>organ.hp){p.health=Math.max(0,p.health-dt*.2);p.dead=p.health<=0;}
  if(s.time-p.hitAt>8&&organ.hp>50&&organ.oxygen>25&&(!tissue||tissue.hp>50)&&s.physiology?.injury[plan.site]?.phase!=='fighting'){
   p.health=Math.min(100,p.health+dt*(repairSites.has(plan.site)?1.2:.2));if(p.health>25)p.dead=false;
  }
 }
}
export function orderResidentGrowth(s){const state=ensureResidents(s),p=state?.people.find(p=>(p.dead||p.health<25)&&!p.growUntil);if(!p)return {ok:false,text:'재생할 체세포 없음'};if(s.resources.food<20)return {ok:false,text:'영양분 부족'};s.resources.food-=20;p.growUntil=s.time+8;return {ok:true,text:'체세포 재생 시작'};}
export function validateResidents(s){return !s.somatic||s.somatic.version===1&&Array.isArray(s.somatic.people)&&s.somatic.people.length<=RESIDENT_LIMIT&&new Set(s.somatic.people.map(p=>p.id)).size===s.somatic.people.length&&s.somatic.people.every(p=>typeof p.id==='string'&&p.id.startsWith('resident:')&&Number.isFinite(p.health)&&p.health>=0&&p.health<=100&&Number.isFinite(p.hitAt)&&typeof p.dead==='boolean'&&(p.growUntil==null||Number.isFinite(p.growUntil)&&p.growUntil>=0));}
