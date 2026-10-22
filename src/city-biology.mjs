import {shipmentLimit,pathogenLimit} from './city-world.mjs';
import {cityDistricts,cityDistrict} from './city-tile-layout.mjs';
import {DRUGS} from './city-data.mjs';
import {WALLS} from './city-frontier-data.mjs';
import {approachWorkplace,releaseWorkplace} from './city-workplaces.mjs';
import {pathogenDef,EXPOSURE_COUNTS} from './city-pathogens.mjs';
import {humoralSupport,immuneClearance,immuneEfferocytosis} from './city-immunity.mjs';
import {infectionFoci} from './city-infection-focus.mjs';
import {injure,microbiomeProtection,macSusceptibility,seedBlood,bloodLoad,recordEfferocytosis} from './city-host-response.mjs';
export {PATHOGENS,pathogenDef,EXPOSURE_COUNTS} from './city-pathogens.mjs';

// Relative teaching units and accelerated time, never clinical doses or PK estimates.
// Route/compartment distinctions and sources are documented in cell-city-3d.md.
export const EXPOSURE_ROUTES=Object.freeze({airway:'호흡기',skin:'피부 상처',gut:'소화기',blood:'혈류'});
export const MEDICINE_ROUTES=Object.freeze({iv:'정맥',oral:'경구'});
export const RESPONSE_ORDERS=Object.freeze({auto:'자동 대응',hold:'구역 방어',support:'전선 지원',recover:'후방 회복'});
export const STAGES=Object.freeze({clear:'안정',exposed:'노출',established:'감염 정착',spreading:'확산 위험',suppressed:'억제 중',recovering:'회복 중'});
const clamp=(v,max=100)=>Math.max(0,Math.min(max,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const drugs=()=>Object.fromEntries(DRUGS.map(d=>[d.id,0]));
const fighter=c=>c.kind==='neutrophil'||c.kind==='macrophage';
const nearest=(s,p)=>cityDistricts(s).reduce((a,b)=>distance(p,a)<distance(p,b)?a:b).id;
export const infectionLoad=d=>Object.values(d?.strains||{}).reduce((n,v)=>n+v,0);
export const localInfection=s=>s.biology?Object.values(s.biology.sites).reduce((n,d)=>n+infectionLoad(d),0)+bloodLoad(s):0;

export function ensureBiology(s){
 if(!s.specialists||s.biology)return;
 s.biology={version:1,clock:0,sites:Object.fromEntries(cityDistricts(s).map(d=>[d.id,{strains:{},inflammation:0,toxin:0,stage:'clear',quiet:0,spreadClock:0,isolated:false,drugs:drugs()}])),blood:drugs(),lumen:drugs(),transfers:[],order:{mode:'auto',site:s.rally},autoMedicine:s.scenario!=='simulation',stats:{introduced:0,medicine:0,losses:0,resolved:0}};
 // Old weapon stocks become IV supply; they no longer belong to immune cells.
 for(const id of DRUGS.map(d=>d.id)){
  let stock=0;for(const d of Object.values(s.districts)){stock+=d.ammo[id];d.ammo[id]=0;}
  for(const d of Object.values(s.frontier.depots)){stock+=d.ammo[id];d.ammo[id]=0;}
  if(s.scenario!=='simulation')s.districts.heart.ammo[id]=Math.min(200,stock);
 }
 if(s.scenario==='simulation'){s.nextWave=Infinity;s.frontier.woundDone=true;s.frontier.warned=false;}
 for(const e of s.enemies){if(!e.front){e.front='airway';e.entered=distance(e,cityDistrict(s,'lung'))<120;}if(e.entered&&!e.focusSeeded)seedInfection(s,e,infectionSite(e),0);}
 for(const c of s.cells)if(fighter(c)){c.integrity=100;c.energy=100;c.recovering=false;}
}
export function infectionSite(e){return e.site|| (e.front==='blood'?'heart':e.front==='gut'?'gut':e.front==='skin'?WALLS[e.wall??11].district:'lung');}
export function exposeSite(s,id,recordId,amount){
 const d=s.biology?.sites[id];if(!d||!pathogenDef(recordId)||!Number.isFinite(amount)||amount<=0)return;
 d.strains[recordId]=clamp((d.strains[recordId]||0)+amount,100);d.quiet=0;
}
export function seedInfection(s,e,site,dt){
 if(!s.biology||e.expelled||e.dead)return;
 if(e.compartment==='blood'){seedBlood(s,e.recordId,e.focusSeeded?dt*.04:6);e.focusSeeded=true;return;}
 e.site=site;
 exposeSite(s,site,e.recordId,e.focusSeeded?dt*.13:6);e.focusSeeded=true;
}
export function antigenEvidence(s){
 if(!s.biology)return null;
 for(const def of cityDistricts(s)){const id=Object.keys(s.biology.sites[def.id].strains).find(id=>!s.antigens[id]);if(id)return {x:def.x,y:def.y,recordId:id};}
 return null;
}
export function antibodySupport(s,recordId,site){
 return humoralSupport(s,recordId,site)??clamp(s.antibodies[recordId]||0)/100*Math.min(1,s.districts[site].oxygen/45);
}
export function medicationActivity(data,recordId,drugId,route='iv',site='lung'){
 const r=data?.records?.find(r=>r.id===recordId)?.susceptibility?.[drugId];
 // REGIMEN is not susceptibility. Only this explicitly sourced lumen scenario
 // supports it, and IV vancomycin must never substitute for the oral route.
 const localRegimen=recordId==='CDF-121'&&drugId==='vancomycin'&&route==='oral'&&site==='gut'&&r?.category==='REGIMEN';
 return {category:r?.category||'—',active:localRegimen||r?.category==='S'&&!r.applicability};
}
export function medicineEffect(s,id,recordId,data){
 const lumen=pathogenDef(recordId)?.lumen;
 let effect=0;
 for(const drug of DRUGS){
  const level=lumen&&id==='gut'?s.biology.lumen[drug.id]:s.biology.sites[id].drugs[drug.id];
  if(medicationActivity(data,recordId,drug.id,lumen?'oral':'iv',id).active)effect+=level/100;
 }
 return Math.min(1.5,effect);
}
export function medicineOrder(s,drugId,route,packs,api,free=false){
 if(!DRUGS.some(d=>d.id===drugId)||!MEDICINE_ROUTES[route]||route==='oral'&&drugId==='oxacillin'||![1,2,3].includes(packs))return {ok:false,text:'이 제형·경로는 지원하지 않음'};
 if(s.shipments.length>=shipmentLimit(s))return {ok:false,text:'물류 대기열 포화'};
 const to=route==='oral'?'gut':'heart',amount=packs*18;
 const pending=s.shipments.filter(sh=>sh.kind==='drug'&&sh.to===to&&sh.drugId===drugId&&sh.phase!=='leaving').reduce((n,sh)=>n+sh.amount,0);
 if(s.districts[to].ammo[drugId]+pending+amount>200)return {ok:false,text:'투여대 비축 한도'};
 const cost=DRUGS.find(d=>d.id===drugId).cost*packs;
 if(!free&&s.resources.food<cost)return {ok:false,text:'보급 영양분 부족'};
 if(!free)s.resources.food-=cost;
 api.shipment(s,'drug',to,amount,{administration:route,drugId});
 api.log(s,DRUGS.find(d=>d.id===drugId).short+' · '+MEDICINE_ROUTES[route]+' 보급 출고');
 return {ok:true,text:'약품 '+packs+'상자 · '+MEDICINE_ROUTES[route]+' 투여대로 배송'};
}
export function biologyCommand(s,action,id,data,api){
 if(!s.biology)return null;
 if(action==='response'){
  const [mode,site]=String(id).split(':');if(!RESPONSE_ORDERS[mode]||!cityDistrict(s,site))return {ok:false};
  s.biology.order={mode,site};s.rally=site;
  for(const c of s.cells)if(fighter(c)){c.path=[];releaseWorkplace(c);}
  api.log(s,cityDistrict(s,site).short+' · '+RESPONSE_ORDERS[mode]);return {ok:true};
 }
 if(action==='isolate'&&s.biology.sites[id]){const d=s.biology.sites[id];d.isolated=!d.isolated;return {ok:true,text:d.isolated?'구역 격리 · 확산·가동량 감소':'구역 격리 해제'};}
 if(action==='auto-medicine'){s.biology.autoMedicine=!s.biology.autoMedicine;return {ok:true};}
 if(action==='microbiome'&&s.scenario==='simulation'&&s.physiology&&[25,100].includes(Number(id))){s.physiology.microbiome=Number(id);return {ok:true,text:'정상균총 '+id+'%'};}
 if(action==='medicine')return medicineOrder(s,id?.drugId,id?.route,Number(id?.packs),api,s.scenario==='simulation');
 if(action==='lab-wound'&&s.scenario==='simulation'&&WALLS[Number(id)]){
  const w=s.frontier.walls[Number(id)];if(w.repair)return {ok:false,text:'보수 진행 중'};w.hp=0;w.warningUntil=s.time+20;api.log(s,WALLS[Number(id)].name+' · 실험 상처');return {ok:true,text:'피부 상처 개방'};
 }
 if(action==='expose'&&s.scenario==='simulation'){
  const p=pathogenDef(id?.recordId),amount=Number(id?.amount),wall=Number(id?.wall??11);
  if(!p||!data?.records?.some(r=>r.id===p.recordId)||!p.routes.includes(id?.front)||!EXPOSURE_COUNTS.includes(amount)||id.front==='skin'&&!WALLS[wall])return {ok:false,text:'지원하지 않는 실험 조건'};
  if(s.enemies.filter(e=>!e.dead).length+s.spawn.length+amount>pathogenLimit(s))return {ok:false,text:'병원체 표시 한도 · 현재 유입 정리 후 추가'};
  for(let i=0;i<amount;i++)s.spawn.push({recordId:p.recordId,hp:p.hp,maxHp:p.hp,color:p.color,tag:p.tag,front:id.front,...(amount>=64?{releaseBatch:amount/32}:{}),...(id.front==='skin'?{wall}:{}),...(id.front==='blood'?{site:'heart',entered:true,compartment:'blood'}:{})});
  s.biology.stats.introduced+=amount;s.spawnClock=0;
  api.log(s,p.name+' · '+EXPOSURE_ROUTES[id.front]+' 유입 '+amount);return {ok:true,text:EXPOSURE_ROUTES[id.front]+' 노출 시작'};
 }
 return null;
}
function tickMedicine(s,dt,api){
 const b=s.biology;
 for(const drug of DRUGS){
  const id=drug.id,iv=s.districts.heart.ammo,oral=s.districts.gut.ammo;
  const infused=Math.min(iv[id],dt*1.6*api.output(s,'heart'));iv[id]-=infused;b.blood[id]=clamp(b.blood[id]+infused*3);
  const absorbed=Math.min(oral[id],dt*1.1*api.output(s,'gut'));oral[id]-=absorbed;
  if(id==='vancomycin')b.lumen[id]=clamp(b.lumen[id]+absorbed*3);
  else if(id==='ampicillin')b.blood[id]=clamp(b.blood[id]+absorbed*2.1);
  // Oxacillin uses mixed clearance; renal function modulates the other two.
  const clearance=id==='oxacillin'?.035:.012+.022*api.output(s,'kidney');
  b.blood[id]*=Math.exp(-dt*clearance);b.lumen[id]*=Math.exp(-dt*.035);
  for(const def of cityDistricts(s)){const d=b.sites[def.id],flow=api.output(s,'heart')*Math.max(.15,s.districts[def.id].oxygen/100);d.drugs[id]+=(b.blood[id]-d.drugs[id])*(1-Math.exp(-dt*.2*flow));}
 }
}
function advanceBiology(s,dt,data,api){
 const b=s.biology;
 tickMedicine(s,dt,api);
 const groups=Object.fromEntries(cityDistricts(s).map(d=>[d.id,[]]));
 for(const c of s.cells)if(fighter(c)&&!c.recovering&&!c.transit)groups[nearest(s,c)].push(c);
 const transfers=[];
 for(const def of cityDistricts(s)){
  const id=def.id,d=b.sites[id],before=infectionLoad(d),organ=s.districts[id];
  for(const [recordId,load] of Object.entries(d.strains)){
   const profile=pathogenDef(recordId),mark=antibodySupport(s,recordId,id);
   const local=groups[id].reduce((n,c)=>n+(c.energy??100)/100*(c.integrity??100)/100,0);
   const capsule=1-(profile?.capsule||0)*(1-mark);
   const complement=s.immunity?.sites[id].signals.complement||0,opsonin=profile?.lumen?0:complement*.006;
   const immune=(profile?.lumen?.08+mark*.6:(.08+local*.26*(1+mark+opsonin))*capsule*immuneClearance(s,id))*Math.min(1,organ.oxygen/45)*(organ.food>0?1:.4);
   const colonization=id==='gut'?(profile?.lumen?1-microbiomeProtection(s)*.92:1-microbiomeProtection(s)*.25):1;
   const growth=load*(profile?.growth||.042)*(profile?.anaerobic&&organ.oxygen<40?1.6:1)*(1-load/100)*colonization,antibiotic=medicineEffect(s,id,recordId,data)*load*.09+(profile?.lumen?0:complement*.0008*macSusceptibility(recordId));
   const next=clamp(load+dt*(growth-immune-antibiotic),100);
   if(next<.12){delete d.strains[recordId];b.stats.resolved++;}else d.strains[recordId]=next;
   if(profile?.toxin)d.toxin=clamp(d.toxin+dt*(next*profile.toxinRate));
   if(profile?.spread&&next>profile.spread&&!d.isolated&&d.spreadClock>=18){
    if(id!=='heart')transfers.push({from:id,to:'heart',recordId,amount:2.5});
   }
  }
  d.spreadClock+=dt;if(d.spreadClock>=18)d.spreadClock=transfers.some(x=>x.from===id)?0:18;
  const total=infectionLoad(d),debris=s.debris.filter(x=>distance(x,def)<150).length;
  const inflammatoryLoad=Object.entries(d.strains).reduce((n,[recordId,load])=>n+load*(pathogenDef(recordId)?.inflammation||1),0);
  d.inflammation=clamp(d.inflammation+dt*(Math.min(150,inflammatoryLoad)*.013+debris*.035-.28-(s.frontier.waste.stock>0?.04:0)));
  d.toxin=Math.max(0,d.toxin-dt*.16);d.quiet=total===0?Math.min(600,d.quiet+dt):0;
  const old=d.stage;
  d.stage=total===0?(d.inflammation>5||d.toxin>2||debris||d.quiet<15&&old!=='clear'?'recovering':'clear'):before-total>.025?'suppressed':total>=48?'spreading':total>=12?'established':'exposed';
  if(d.stage!==old)api.log(s,def.short+' · '+STAGES[d.stage]);
  injure(s,id,'pathogen',dt*Math.min(100,total)*.0015);injure(s,id,'immune',dt*d.inflammation*.002);injure(s,id,'toxin',dt*d.toxin*.005);organ.oxygen=clamp(organ.oxygen-dt*(Math.min(100,total)*.003));
 }
 b.transfers=b.transfers.filter(t=>s.time-t.started<6);
 for(const t of transfers){seedBlood(s,t.recordId,t.amount,t.from);b.transfers.push({...t,started:s.time});api.log(s,cityDistrict(s,t.from).short+' → 혈류 · 균혈증');}b.transfers=b.transfers.slice(-12);
 s.inflammation=clamp(Math.max(s.inflammation,Object.values(b.sites).reduce((n,d)=>n+d.inflammation,0)/6));
 for(const e of s.enemies){
  if(e.dead||!e.entered)continue;const site=infectionSite(e);
  e.opsonized=antibodySupport(s,e.recordId,site);
  const drug=medicineEffect(s,site,e.recordId,data);
  if(drug>0)api.damage(s,e,dt*drug*2.4,e,'#9bc8c1');
 }
}
export function tickBiology(s,dt,data,api){
 if(!s.biology)return;
 for(const [id,load] of Object.entries(s.physiology?.blood.strains||{}))s.physiology.blood.strains[id]=Math.max(0,load-dt*medicineEffect(s,'heart',id,data)*load*.09);
 s.biology.clock+=dt;
 if(s.biology.clock>=.5){const elapsed=s.biology.clock;s.biology.clock=0;advanceBiology(s,elapsed,data,api);}
}
export function combatDestination(s,c){
 if(!s.biology)return cityDistrict(s,s.rally);
 const order=s.biology.order;
 if(order.mode!=='auto')return cityDistrict(s,order.mode==='recover'?'heart':order.site);
 const target=s.rules?.entries?.[c.kind]?.target;
 if(target&&target!=='pathogens')return cityDistrict(s,{skinThreat:'gut',airwayThreat:'lung',gutThreat:'gut',bloodThreat:'heart'}[target]||s.rally);
 const foci=infectionFoci(s);
 if(foci.length){
  const focus=[...foci].sort((a,b)=>(distance(c,a)/(1+Math.sqrt(a.count)))-(distance(c,b)/(1+Math.sqrt(b.count))))[0];
  return {...cityDistrict(s,focus.site),x:focus.x,y:focus.y,focusKey:focus.key};
 }
 let cached=threatCache.get(s);
 if(!cached||cached.time!==s.time||cached.enemies!==s.enemies){
  const counts={};for(const e of s.enemies)if(!e.dead){const id=infectionSite(e);counts[id]=(counts[id]||0)+1;}
   const threats=cityDistricts(s).map(d=>({d,score:infectionLoad(s.biology.sites[d.id])+(counts[d.id]||0)*7+(s.immunity?.sites[d.id].signals.cxcl8||0)*.6+(s.immunity?.sites[d.id].signals.ccl2||0)*.3+(s.immunity?.sites[d.id].signals.c5a||0)*.8})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  cached={time:s.time,enemies:s.enemies,threats};threatCache.set(s,cached);
 }
 const {threats}=cached;
 const chosen=threats[c.id%Math.min(2,threats.length)]?.d;
 return chosen?{...chosen,focusKey:'site:'+chosen.id}:cityDistrict(s,s.rally);
}
const threatCache=new WeakMap();
export function updateCombatCondition(s,c,dt,api){
 if(!s.biology||!fighter(c))return false;
 c.integrity??=100;c.energy??=100;c.recovering??=false;
 const here=nearest(s,c),d=s.districts[here],hazards=s.enemies.filter(e=>!e.dead&&e.entered&&distance(e,c)<65).length;
 c.integrity=clamp(c.integrity-dt*(hazards*.65+s.biology.sites[here].inflammation*.002));
 if(c.integrity===0){c.lost=true;return true;}
 c.energy=clamp(c.energy+dt*(hazards?-.38:d.oxygen>=25&&d.food>0?.45:-.12));
 if(c.energy<20||c.integrity<30||s.biology.order.mode==='recover'){
  if(!c.recovering){c.path=[];releaseWorkplace(c);c.activity=null;}
  c.recovering=true;
 }
 if(!c.recovering)return false;
 const bed=approachWorkplace(s,c,'heart','rest',dt,api.move,api.route,52);
 c.target='heart';c.task=bed.arrived?'후방 회복':'후방으로 이동';c.nextTask=s.biology.order.mode==='recover'?'회복 · 명령 대기':'회복 → 방어 복귀';
 if(!bed.arrived)return true;
 const heart=s.districts.heart;
 if(heart.food<.02||heart.oxygen<20){c.waitReason='회복 구역 영양·산소 부족';return true;}
 heart.food=Math.max(0,heart.food-dt*.015);c.integrity=clamp(c.integrity+dt*1.25);c.energy=clamp(c.energy+dt*3);
 if(c.integrity>=85&&c.energy>=85&&s.biology.order.mode!=='recover'){c.recovering=false;releaseWorkplace(c);c.path=[];c.activity=null;}
 return true;
}
export function combatEffort(c){if(c.energy!=null)c.energy=clamp(c.energy-(c.kind==='macrophage'?3:2));}
export function cleanLocalDebris(s,debris){
 if(!s.biology)return;const d=s.biology.sites[nearest(s,debris)];d.inflammation=clamp(d.inflammation-(debris.cellKind?3:1.3));
 immuneEfferocytosis(s,debris);
 recordEfferocytosis(s,debris);
}
export function validateBiology(s){
 const b=s.biology;if(!b)return true;
 const n=(v,max=100)=>Number.isFinite(v)&&v>=0&&v<=max,validDrugs=d=>d&&DRUGS.every(x=>n(d[x.id]));
 if(!s.specialists||b.version!==1||!n(b.clock,.75)||!validDrugs(b.blood)||!validDrugs(b.lumen)||!RESPONSE_ORDERS[b.order?.mode]||!cityDistrict(s,b.order?.site)||typeof b.autoMedicine!=='boolean'||!b.stats||['introduced','medicine','losses','resolved'].some(k=>!n(b.stats[k],1e8)))return false;
 if(!Array.isArray(b.transfers)||b.transfers.length>12||b.transfers.some(t=>!cityDistrict(s,t.from)||!cityDistrict(s,t.to)||!pathogenDef(t.recordId)||!n(t.started,s.time)||!n(t.amount)))return false;
 for(const def of cityDistricts(s)){const d=b.sites?.[def.id];if(!d||!d.strains||Object.entries(d.strains).some(([id,v])=>!pathogenDef(id)||!n(v))||!n(d.inflammation)||!n(d.toxin)||!STAGES[d.stage]||!n(d.quiet,600)||!n(d.spreadClock,19)||typeof d.isolated!=='boolean'||!validDrugs(d.drugs))return false;}
 if(s.cells.some(c=>fighter(c)&&(c.integrity!=null&&!n(c.integrity)||c.energy!=null&&!n(c.energy)||c.recovering!=null&&typeof c.recovering!=='boolean')))return false;
 return !s.shipments.some(sh=>sh.administration!=null&&(!MEDICINE_ROUTES[sh.administration]||sh.kind!=='drug'||sh.administration==='oral'&&sh.drugId==='oxacillin'||sh.to!==(sh.administration==='oral'?'gut':'heart')));
}
