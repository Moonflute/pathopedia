import {cityDistricts,cityDistrict,localPoint,compileLayout,walkablePoint} from './city-tile-layout.mjs';
import {SITES,groundPoint,groundCoordinate} from './city-three-layout.mjs';
import {WALLS,SKIN_TISSUES} from './city-frontier-data.mjs';
import {CITY_ENTRIES} from './city-world.mjs';
import {pathogenDef,spreadDestination} from './city-pathogens.mjs';
import {infectionFocus} from './city-infection-focus.mjs';
import {lymphPath} from './city-immune-traffic.mjs';

// Accelerated, bounded teaching states. No clinical concentrations or timings.
const clamp=(n,max=100)=>Math.max(0,Math.min(max,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const HEALING_LABELS=Object.freeze({stable:'조직 안정',fighting:'손상 진행',clearing:'잔해 청소',resolving:'염증 해소',rebuilding:'상피 재생',remodeling:'조직 재건'});
export const VIRAL_ID='IMM-VIRUS';
const gramNegative=new Set(['ECO-009','GNX-220','PAE-013','KPN-011','GNX-225','GNX-221']);
export const macSusceptibility=id=>gramNegative.has(id)?1-(pathogenDef(id)?.capsule||0):0;
export const microbiomeProtection=s=>(s.physiology?.microbiome??100)/100;
export function hostEvent(s,kind,site,point,recordId=null){
 const p=s.physiology;if(!p)return;const at=point||cityDistrict(s,site);p.events.push({time:s.time,kind,site,recordId,x:at.x,y:at.y});p.events=p.events.slice(-48);
}
export function ensureHostResponse(s){
 if(!s.specialists||s.physiology)return s.physiology;
 const p=s.physiology={version:1,clock:0,microbiome:100,epithelium:[],virions:[],lymphPackets:[],lymphClock:0,blood:{strains:{},inflammation:0,perfusion:100,sepsis:false,spreadClock:0},injury:{},events:[],stats:{extravasations:0,lymphDelivered:0,viralEntries:0,viralProduced:0,neutralized:0,opsonized:0,macKills:0,efferocytosis:0,recalls:0}};
 for(const d of cityDistricts(s))p.injury[d.id]={pathogen:0,toxin:0,immune:0,ischemia:0,phase:'stable',lastHit:-1,cleaned:0};
 for(const site of ['lung','gut'])for(let n=0;n<18;n++){
  const a=SITES[site],q=localPoint(s,site,{x:a.x-2.5+(n%6)*1.05,z:a.z+2.6+Math.floor(n/6)*1.05}),at=s.layout?groundCoordinate(walkablePoint(s.layout,groundPoint(q))):q;
  p.epithelium.push({id:site+':'+n,site,...at,health:100,antiviral:0,state:'healthy',cleared:false});
 }
 for(const t of SKIN_TISSUES){const w=WALLS[t.skinWall];p.epithelium.push({id:'skin:'+w.id,site:w.district,wall:w.id,x:t.point.x,y:t.point.y,health:100,antiviral:0,state:'healthy',cleared:false});}
 return p;
}
export function injure(s,site,cause,amount,point=null,tissueId=null){
 if(!(amount>0)||!s.districts[site])return;
 const target=tissueId==null?s.districts[site]:s.frontier.tissues[tissueId],loss=Math.min(target.hp,amount);target.hp=clamp(target.hp-loss);
 const state=s.physiology?.injury[site];if(!state)return;state[cause]=clamp(state[cause]+loss,1e7);state.lastHit=s.time;
 if(point){state.x=point.x;state.y=point.y;}
}
export function recordEfferocytosis(s,debris){
 const p=s.physiology;if(!p)return;
 const site=debris.site||cityDistricts(s).reduce((a,b)=>distance(a,debris)<distance(b,debris)?a:b).id;
 p.injury[site].cleaned++;p.stats.efferocytosis++;hostEvent(s,'cleanup',site,debris,debris.antigenId);
 const ep=p.epithelium.find(h=>h.id===debris.epithelialId);if(ep)ep.cleared=true;
}
export function killHost(s,h){
 const ep=s.physiology?.epithelium.find(p=>p.id===h.epithelialId);if(ep){ep.state='dead';ep.health=0;ep.cleared=false;}
 injure(s,h.site,'immune',.6,h);s.debris.push({id:++s.serial,x:h.x,y:h.y,site:h.site,recordId:null,cellKind:'epithelial',epithelialId:h.epithelialId,antigenId:h.recordId});
}
function walk(actor,point,speed,dt){const d=distance(actor,point);if(d<=speed*dt){actor.x=point.x;actor.y=point.y;return true;}actor.x+=(point.x-actor.x)*speed*dt/d;actor.y+=(point.y-actor.y)*speed*dt/d;return false;}
function walkPath(actor,speed,dt){let budget=speed*dt;while(actor.step<actor.path.length){const p=actor.path[actor.step],d=distance(actor,p);if(d>budget)return walk(actor,p,budget/dt,dt);actor.x=p.x;actor.y=p.y;actor.step++;budget-=d;if(!budget)break;}return actor.step>=actor.path.length;}
export function viralExposure(s,payload){
 const p=ensureHostResponse(s),front=payload.front||(payload.site==='gut'?'gut':payload.site==='lung'?'airway':'skin'),wall=Number(payload.wall??11);
 if(!['airway','gut','skin'].includes(front)||front==='skin'&&!WALLS[wall])return false;
 const site=front==='airway'?'lung':front==='gut'?'gut':WALLS[wall].district;
 if(p.virions.length+payload.amount>192)return false;
 const targets=p.epithelium.filter(h=>front==='skin'?h.wall===wall:h.site===site&&h.wall==null);
 const path=front==='skin'?[WALLS[wall].outside,WALLS[wall].inside]:(s.layout?compileLayout(s.layout).entries[front].map(groundCoordinate):[groundCoordinate(CITY_ENTRIES[front].start),cityDistrict(s,site)]);
 for(let n=0;n<payload.amount;n++){const target=targets[(n+p.stats.viralEntries)%targets.length];p.virions.push({id:++s.serial,recordId:VIRAL_ID,site,front,wall:front==='skin'?wall:null,...path[0],path:[...path.slice(1),{x:target.x,y:target.y}],step:0,targetId:target.id,phase:'entry',born:s.time,until:s.time+100,entered:false});}
 hostEvent(s,'exposure',site,path[0],VIRAL_ID);return {site,front};
}
export function establishHost(s,ep,recordId=VIRAL_ID){
 if(ep.state!=='healthy'||ep.health<60||s.immunity.infected.length>=96)return null;
 ep.state='infected';ep.cleared=false;
 const h={id:++s.serial,recordId,site:ep.site,x:ep.x,y:ep.y,epithelialId:ep.id,hp:30,burden:3,mhcI:s.serial%2?.95:.15,stress:.85,phase:'eclipse',infectedAt:s.time,shedAt:s.time+9};
 s.immunity.infected.push(h);s.physiology.stats.viralEntries++;hostEvent(s,'viral-entry',ep.site,ep,recordId);return h;
}
function tickVirus(s,dt){
 const p=s.physiology,i=s.immunity,alive=[];
 for(const v of p.virions){
  const target=p.epithelium.find(e=>e.id===v.targetId),ab=i.antibodies[v.recordId],neutralizing=(v.entered?ab?.IgG:ab?.IgA)||0;
  if(v.until<=s.time||!target||neutralizing>25&&(v.id%5<Math.min(5,neutralizing/20))){p.stats.neutralized++;hostEvent(s,'neutralized',v.site,v,v.recordId);continue;}
  if(v.front==='skin'&&!v.entered&&s.frontier.walls[v.wall].hp>0){v.phase='barrier';alive.push(v);continue;}
  if(v.phase==='entry'||v.phase==='barrier'){
   if(!walkPath(v,85,dt)){alive.push(v);continue;}
   if(v.front==='airway'&&v.id%4===0&&s.barrier>40){v.phase='expelled';v.path=[groundCoordinate(CITY_ENTRIES.airway.start)];v.step=0;alive.push(v);continue;}
   v.entered=true;v.phase='attachment';v.attachedAt=s.time;hostEvent(s,'attachment',v.site,v,v.recordId);
  }
  if(v.phase==='expelled'){if(!walkPath(v,125,dt))alive.push(v);else p.stats.neutralized++;continue;}
  if(v.phase==='spread'){if(!walkPath(v,55,dt)){alive.push(v);continue;}v.phase='attachment';v.attachedAt=s.time;}
  if(v.phase==='attachment'){
   if(s.time-v.attachedAt<2){alive.push(v);continue;}
   if(target.antiviral<50){establishHost(s,target,v.recordId);}else{p.stats.neutralized++;hostEvent(s,'antiviral',v.site,target,v.recordId);}continue;
  }
 }
 p.virions=alive;
 for(const h of [...i.infected]){
  const ep=p.epithelium.find(e=>e.id===h.epithelialId);h.infectedAt??=s.time;h.shedAt??=s.time+9;h.phase??='productive';
  const sig=i.sites[h.site].signals;
  if(h.phase==='eclipse'&&s.time-h.infectedAt>=5){h.phase='productive';hostEvent(s,'viral-production',h.site,h,h.recordId);}
  if(h.phase==='productive'){
   h.burden=clamp(h.burden+dt*h.burden*(.09-sig.ifn1*.0018),20);injure(s,h.site,'pathogen',dt*h.burden*.004,h);
   if(ep)ep.health=clamp(ep.health-dt*.4);
   if(s.time>=h.shedAt&&h.burden>4){
    h.shedAt=s.time+7;const targets=p.epithelium.filter(e=>e.site===h.site&&e.state==='healthy'&&distance(e,h)<180&&!p.virions.some(v=>v.targetId===e.id)).sort((a,b)=>distance(a,h)-distance(b,h)).slice(0,2);
    for(const e of targets)if(p.virions.length<192){p.virions.push({id:++s.serial,recordId:h.recordId,site:h.site,front:h.site==='gut'?'gut':'airway',wall:null,x:h.x,y:h.y,path:[{x:e.x,y:e.y}],step:0,targetId:e.id,phase:'spread',born:s.time,until:s.time+18,entered:true});p.stats.viralProduced++;}
   }
  }
  for(const e of p.epithelium)if(e.site===h.site&&distance(e,h)<160&&e.state==='healthy')e.antiviral=clamp(e.antiviral+dt*(3+sig.ifn1*.12));
  if(s.time-h.infectedAt>110||ep&&ep.health===0){
   if(ep){ep.health=0;ep.state='dead';ep.cleared=false;}
   injure(s,h.site,'pathogen',1,h);s.debris.push({id:++s.serial,x:h.x,y:h.y,site:h.site,recordId:null,cellKind:'epithelial',epithelialId:h.epithelialId,antigenId:h.recordId});i.infected=i.infected.filter(a=>a!==h);
  }
 }
}
export function surfaceColonization(s,e,dt){
 const profile=pathogenDef(e.recordId);e.colonization??=0;e.entryStage='colonizing';e.action='colonize';
 const protection=e.front==='gut'?microbiomeProtection(s):e.front==='airway'?s.barrier/100:0;
 const duration=e.front==='skin'?2.4:e.front==='gut'?4+protection*4:3.5;
 e.colonization+=dt*(1-(s.immunity?.antibodies[e.recordId]?.IgA||0)/140);
 if(e.colonization<duration)return false;
 e.entryStage=profile?.lumen?'luminal':'invasive';e.compartment=profile?.lumen?'lumen':'tissue';e.entered=true;e.action='approach';
 hostEvent(s,profile?.lumen?'colonized':'barrier-crossed',e.front==='skin'?WALLS[e.wall].district:e.front==='gut'?'gut':'lung',e,e.recordId);return true;
}
export function seedBlood(s,id,amount,from='heart'){
 const b=s.physiology?.blood;if(!b||!pathogenDef(id))return;const first=!b.strains[id];b.strains[id]=clamp((b.strains[id]||0)+amount);
 if(first)hostEvent(s,'bacteremia',from,cityDistrict(s,from),id);
}
export function bloodLoad(s){return Object.values(s.physiology?.blood.strains||{}).reduce((a,b)=>a+b,0);}
export function tickHostResponse(s,dt,api){
 const p=ensureHostResponse(s);if(!p||!s.immunity)return;
 tickVirus(s,dt);p.clock+=dt;if(p.clock<.25)return;dt=p.clock;p.clock=0;
 // Soluble antigen has a transport delay independently of dendritic migration.
 p.lymphClock+=dt;
 if(p.lymphClock>=5){p.lymphClock=0;for(const [id,a] of Object.entries(s.immunity.antigens)){
  const source=Object.entries(a.sites).sort((a,b)=>b[1]-a[1])[0];if(!source||source[1]<1||p.lymphPackets.length>=24||p.lymphPackets.some(q=>q.recordId===id&&q.site===source[0]))continue;
  const at=infectionFocus(s,source[0],id);p.lymphPackets.push({id:++s.serial,recordId:id,site:source[0],x:at.x,y:at.y,path:lymphPath(s,source[0],at),step:0,amount:Math.min(12,source[1]*.5)});
 }}
 p.lymphPackets=p.lymphPackets.filter(q=>{if(q.reroute){q.path=lymphPath(s,q.site,q);q.step=0;delete q.reroute;}if(!walkPath(q,115,dt))return true;const a=s.immunity.antigens[q.recordId];if(a)a.lymph=clamp(a.lymph+q.amount);p.stats.lymphDelivered++;hostEvent(s,'lymph-arrival','lymph',q,q.recordId);return false;});
 for(const a of Object.values(s.immunity.antigens))a.lymph*=Math.exp(-dt*.008);
 const drugs=s.biology.sites.gut.drugs,oral=s.biology.lumen;
 const antibiotic=Object.keys(drugs).reduce((n,id)=>n+(drugs[id]+oral[id])*.007,0);
 p.microbiome=clamp(p.microbiome+dt*((100-p.microbiome)*.004-antibiotic));
 for(const e of s.enemies){
  if(e.dead||!e.entered||e.compartment==='lumen')continue;const site=e.site||'heart',sig=s.immunity.sites[site].signals,antibody=s.immunity.antibodies[e.recordId];
  const c3=(sig.complement*.012+(antibody?.IgM||0)*.008+(antibody?.IgG||0)*.005)*(1-(pathogenDef(e.recordId)?.capsule||0));
  const before=e.c3b||0;e.c3b=clamp(before+dt*c3,1);if(before<.2&&e.c3b>=.2)p.stats.opsonized++;
  e.mac=clamp((e.mac||0)+dt*e.c3b*macSusceptibility(e.recordId)*.08,1);
  if(e.mac>.5){api.damage(s,e,dt*(e.mac-.5)*3,e,'#87dcdb');if(e.dead){p.stats.macKills++;hostEvent(s,'mac',site,e,e.recordId);}}
  if(e.c3b>.1)s.immunity.sites[site].signals.c5a=clamp((s.immunity.sites[site].signals.c5a||0)+dt*e.c3b*.35);
 }
 const blood=p.blood;
 for(const [id,load] of Object.entries(blood.strains)){
  const phagocytes=s.cells.filter(c=>['neutrophil','monocyte'].includes(c.kind)&&!c.extravascular).length,antibody=s.antibodies[id]||0;
  const next=clamp(load+dt*(load*.012-.25-phagocytes*.035-antibody*.007));if(next<.1)delete blood.strains[id];else blood.strains[id]=next;
 }
 blood.spreadClock+=dt;
 if(blood.spreadClock>=18){blood.spreadClock=0;for(const [id,load] of Object.entries(blood.strains))if(load>8){
  const target=spreadDestination(s,pathogenDef(id),'blood');
  if(target){const b=s.biology.sites[target];b.strains[id]=clamp((b.strains[id]||0)+2.5);hostEvent(s,'dissemination',target,cityDistrict(s,target),id);}
 }}
 const inflammation=Object.values(s.biology.sites).reduce((n,b)=>n+Math.max(0,b.inflammation-25),0)/6;
 blood.inflammation=clamp(blood.inflammation+dt*(inflammation*.028+bloodLoad(s)*.006-.22));
 const targetFlow=clamp(100-Math.max(0,blood.inflammation-15)*1.1),alpha=1-Math.exp(-dt*.07);blood.perfusion+=(targetFlow-blood.perfusion)*alpha;
 const dysfunction=Object.entries(s.districts).filter(([id,d])=>id!=='heart'&&(d.hp<60||d.oxygen<25)).length;
 const sepsis=blood.inflammation>30&&dysfunction>0;if(sepsis&&!blood.sepsis)hostEvent(s,'organ-dysfunction','heart',cityDistrict(s,'heart'));blood.sepsis=sepsis;
 for(const [site,d] of Object.entries(s.districts)){
  if(blood.perfusion<70){d.oxygen=clamp(d.oxygen-dt*(70-blood.perfusion)*.012);injure(s,site,'ischemia',dt*Math.max(0,45-blood.perfusion)*.003);}
  const state=p.injury[site],debris=s.debris.filter(a=>a.site===site||distance(a,cityDistrict(s,site))<130),load=Object.values(s.biology.sites[site].strains).reduce((a,b)=>a+b,0)+s.immunity.infected.filter(h=>h.site===site).length*3;
  const skinDamaged=SKIN_TISSUES.some(t=>t.district===site&&(s.frontier.tissues[t.id]?.hp<95||s.frontier.walls[t.skinWall]?.hp<95));
  const prior=state.phase;state.phase=load>1&&s.time-state.lastHit<4?'fighting':debris.length?'clearing':s.biology.sites[site].inflammation>5?'resolving':p.epithelium.some(e=>e.site===site&&e.health<95)?'rebuilding':d.hp<95||skinDamaged?'remodeling':'stable';
  if(prior!==state.phase&&['resolving','rebuilding','remodeling','stable'].includes(state.phase))hostEvent(s,state.phase,site,state.x!=null?state:null);
 }
 for(const ep of p.epithelium){
  ep.antiviral=clamp(ep.antiviral-dt*.6);
  if(ep.state==='infected')continue;
  if(ep.state==='dead'&&!ep.cleared)continue;
  const d=s.districts[ep.site],workers=s.cells.filter(c=>c.kind==='fibroblast'&&c.target===ep.site).length;
  if(ep.health<100&&d.oxygen>25&&d.food>.1){const damaged=ep.state!=='healthy';if(damaged)ep.state='repairing';ep.health=clamp(ep.health+dt*(.6+workers*.25)/(1+s.biology.sites[ep.site].inflammation*.025));if(damaged&&ep.health>=95){ep.state='healthy';ep.cleared=false;hostEvent(s,'epithelial-repair',ep.site,ep);}}
 }
}

export function validateHostResponse(s){
 const p=s.physiology;if(!p)return true;const number=(v,max=100)=>Number.isFinite(v)&&v>=0&&v<=max,point=v=>Number.isFinite(v.x)&&Number.isFinite(v.y),site=id=>!!s.districts[id],path=a=>Array.isArray(a.path)&&a.path.length<=900&&a.path.every(point)&&Number.isInteger(a.step)&&a.step>=0&&a.step<=a.path.length;
 if(p.version!==1||!number(p.clock,.6)||!number(p.microbiome)||!number(p.lymphClock,6)||!p.blood||!number(p.blood.inflammation)||!number(p.blood.perfusion)||typeof p.blood.sepsis!=='boolean'||!number(p.blood.spreadClock,19)||!p.blood.strains||Object.entries(p.blood.strains).some(([id,n])=>!pathogenDef(id)||!number(n)))return false;
 if(!Array.isArray(p.epithelium)||p.epithelium.length>100||p.epithelium.some(e=>!point(e)||!site(e.site)||typeof e.id!=='string'||!number(e.health)||!number(e.antiviral)||!['healthy','infected','dead','repairing'].includes(e.state)||typeof e.cleared!=='boolean'))return false;
 if(!Array.isArray(p.virions)||p.virions.length>192||p.virions.some(v=>!point(v)||!path(v)||!site(v.site)||v.recordId!==VIRAL_ID||!p.epithelium.some(e=>e.id===v.targetId)||!['entry','barrier','attachment','spread','expelled'].includes(v.phase)||!number(v.until,1e9)||!number(v.born,s.time)))return false;
 if(!Array.isArray(p.lymphPackets)||p.lymphPackets.length>24||p.lymphPackets.some(v=>!point(v)||!path(v)||!site(v.site)||!s.immunity.antigens[v.recordId]||!number(v.amount)))return false;
 if(!p.stats||Object.values(p.stats).some(n=>!number(n,1e9))||!p.injury||cityDistricts(s).some(d=>{const v=p.injury[d.id];return !v||!HEALING_LABELS[v.phase]||['pathogen','toxin','immune','ischemia','cleaned'].some(k=>!number(v[k],1e7));}))return false;
 if(!Array.isArray(p.events)||p.events.length>48||p.events.some(e=>!point(e)||!site(e.site)||!number(e.time,s.time)||typeof e.kind!=='string'))return false;
 return !s.cells.some(c=>c.transit&&(!site(c.transit.site)||!point(c.transit.gate)||!point(c.transit.roll)||!point(c.transit.exit)||!['circulating','rolling','adhering','crossing'].includes(c.transit.stage)||!number(c.transit.since,s.time))||c.travelMode!=null&&!['blood','tissue','lymph'].includes(c.travelMode)||c.tissueSite!=null&&!site(c.tissueSite));
}
