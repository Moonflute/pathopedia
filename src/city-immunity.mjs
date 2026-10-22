import {CELL_JOBS,cellCap} from './city-data.mjs';
import {populationLimit,travelScale} from './city-world.mjs';
import {cityDistricts,cityDistrict,localPoint,roadPoint,walkablePoint} from './city-tile-layout.mjs';
import {SITES,groundPoint,groundCoordinate,lymphocyteBay} from './city-three-layout.mjs';
import {pathogenDef} from './city-pathogens.mjs';
import {beginActivity,activityProgress,activeActivity} from './city-activity.mjs';
import {approachWorkplace,releaseWorkplace} from './city-workplaces.mjs';
import {cityRule,ruleReady} from './city-rules.mjs';
import {infectionFocus} from './city-infection-focus.mjs';
import {ensureHostResponse,tickHostResponse,viralExposure,killHost,injure,hostEvent,bloodLoad} from './city-host-response.mjs';
import {moveToInflammation,moveDendriticToNode,leaveNode} from './city-immune-traffic.mjs';

// Accelerated teaching compartments, not quantitative human physiology.
export const IMMUNE_CHALLENGES=Object.freeze({
 virus:{id:'IMM-VIRUS',name:'바이러스 · 상피 감염',type:'virus',site:'lung',color:0x9c85bd},
 helminth:{id:'IMM-HELMINTH',name:'연충 · 2형 면역',type:'helminth',site:'gut',color:0xd2ad7f},
 allergen:{id:'IMM-ALLERGEN',name:'알레르겐 감작·재노출',type:'allergen',site:'lung',color:0xd5ad79}
});
export const IMMUNE_SIGNALS=Object.freeze({tnf:'TNF·IL-1',cxcl8:'CXCL8',ccl2:'CCL2',ccl11:'CCL11·eotaxin',mcsf:'M-CSF',ifn1:'I형 IFN',il12:'IL-12',il4:'IL-4',il5:'IL-5',il13:'IL-13',il17:'IL-17',ifng:'IFN-γ',il2:'IL-2',il21:'IL-21',il10:'IL-10',tgfb:'TGF-β',histamine:'히스타민',complement:'보체 활성',c5a:'C5a · 유인'});
export const IMMUNE_ROSTER=Object.freeze({eosinophil:5,basophil:3,monocyte:8,mast:3,nk:6,bcell:10,cd8:8,treg:4});
const dedicated=new Set(['eosinophil','basophil','monocyte','mast','nk','bcell','helperT','cd8','treg','dendritic','plasma']);
const clamp=(n,max=100)=>Math.max(0,Math.min(max,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const at=(s,id)=>{const d=cityDistrict(s,id);return {x:d.x,y:d.y};};
const nearest=(s,p)=>cityDistricts(s).reduce((a,b)=>distance(a,p)<distance(b,p)?a:b).id;
const emptySignals=()=>Object.fromEntries(Object.keys(IMMUNE_SIGNALS).map(id=>[id,0]));
export const immuneAntigen=id=>Object.values(IMMUNE_CHALLENGES).find(c=>c.id===id)|| (pathogenDef(id)?{id,name:pathogenDef(id).name,type:'bacteria'}:null);
const type2=id=>['helminth','allergen'].includes(immuneAntigen(id)?.type);
export function ensureImmunity(s){
 if(!s.specialists)return;ensureHostResponse(s);if(s.immunity)return s.immunity;
 s.immunity={version:1,roster:0,sites:Object.fromEntries(cityDistricts(s).map(d=>[d.id,{signals:emptySignals(),danger:0,alarmin:0,regulation:0}])),antigens:{},presentations:{},antibodies:{},infected:[],parasites:[],exposures:[],nets:[],viralClock:0,events:[],stats:{presented:0,primed:0,clones:0,differentiated:0,nkKills:0,cd8Kills:0,parasites:0,degranulations:0,regulation:0,nets:0}};
 for(const [id,value]of Object.entries(s.antibodies))if(immuneAntigen(id))s.immunity.antibodies[id]={IgM:0,IgG:value,IgA:0,IgE:0};
 for(const c of s.cells){
  if(c.kind==='plasma'&&!c.recordId&&!c.activity){c.kind='bcell';c.task=CELL_JOBS.bcell.task;c.life=CELL_JOBS.bcell.life;releaseWorkplace(c);}
  else if(c.kind==='plasma'&&c.recordId){c.licensed=true;c.isotype='IgG';}
  if(c.kind==='dendritic'&&c.recordId){c.immuneState='migrating';c.immuneSite=c.target||nearest(s,c);c.costimAtPickup=1;c.immuneMove=null;}
  if(c.kind==='helperT'&&c.recordId){c.immuneState='memory';c.memory=true;c.lineage='Tfh';c.cd40l=true;c.immuneSite=s.rally;c.activity=null;c.immuneMove=null;}
 }
 return s.immunity;
}
export function immuneEvent(s,kind,actor,recordId,site){
 const i=s.immunity;i.events.push({time:s.time,kind,actor:actor?.id??null,recordId:recordId??null,site:site||'lymph'});i.events=i.events.slice(-28);
}
function register(s,id,site,amount){
 if(!immuneAntigen(id))return;const i=s.immunity,a=i.antigens[id]??={sites:{},lymph:0,lastSeen:s.time};a.sites[site]=clamp((a.sites[site]||0)+amount);if(amount>.1)a.lastSeen=s.time;
}
const emit=(s,site,id,amount)=>{const d=s.immunity.sites[site];d.signals[id]=clamp(d.signals[id]+amount);};
const signal=(s,site,id)=>s.immunity.sites[site].signals[id];
export const immuneBurden=(s,site)=>Object.values(s.immunity?.antigens||{}).reduce((n,a)=>n+(a.sites[site]||0),0);
export function antibodyLevel(s,id,isotype){return s.immunity?.antibodies[id]?.[isotype]||0;}
export function humoralSupport(s,id,site){
 if(!s.immunity)return null;
 const a=s.immunity.antibodies[id];if(!a)return clamp(s.antibodies[id]||0)/100;
 return clamp((pathogenDef(id)?.lumen?a.IgA:a.IgG+a.IgM*.45+a.IgA*.15))/100*Math.min(1,s.districts[site].oxygen/45);
}
export function immuneClearance(s,site){
 const d=s.immunity?.sites[site];if(!d)return 1;
 return (1+d.signals.ifng*.006+d.signals.il13*.002)*(1-d.regulation*.003);
}
export function immuneEfferocytosis(s,debris){if(!s.immunity||!debris.cellKind)return;const site=nearest(s,debris);emit(s,site,'il10',2);emit(s,site,'tgfb',1.5);immuneEvent(s,'efferocytosis',null,debris.antigenId,site);}
export function immuneCommand(s,action,payload,api){
 if(action!=='immune-challenge')return null;
 if(!s.immunity||s.scenario!=='simulation')return {ok:false,text:'시뮬레이션에서 사용'};
 const challenge=IMMUNE_CHALLENGES[payload?.type],site=payload?.site,amount=Number(payload?.amount);
 if(!challenge||!cityDistrict(s,site)||![3,6,12,24,32].includes(amount))return {ok:false,text:'면역 자극 조건 확인'};
 if(payload.type==='virus'){
  const exposed=viralExposure(s,{...payload,amount});if(!exposed)return {ok:false,text:'바이러스 유입 한도·경로 확인'};
  immuneEvent(s,'exposure',null,challenge.id,exposed.site);api.log(s,'바이러스 · '+({airway:'호흡기',gut:'소화기',skin:'피부'}[exposed.front])+' 노출');return {ok:true,text:'바이러스 유입 시작'};
 }
 const i=s.immunity,list=payload.type==='helminth'?i.parasites:i.exposures,limit=32;
 const count=payload.type==='allergen'?1:amount;if(list.length+count>limit)return {ok:false,text:'진행 중인 면역 자극 한도'};
 for(let n=0;n<count;n++){
  const p=hostPoint(s,site,n+list.length);
  if(payload.type==='helminth')list.push({id:++s.serial,recordId:challenge.id,site,...p,hp:50,maxHp:50});
  else list.push({id:++s.serial,recordId:challenge.id,site,...p,amount,remaining:8});
 }
 immuneEvent(s,'exposure',null,challenge.id,site);api.log(s,challenge.name+' · '+cityDistrict(s,site).short);return {ok:true,text:challenge.name+' · 자극 추가'};
}
function hostPoint(s,site,n){const p=SITES[site],a=n*2.39996,r=1.9+n%3*.45,q=localPoint(s,site,{x:p.x+Math.cos(a)*r,z:p.z+1+Math.sin(a)*r});return s.layout?groundCoordinate(walkablePoint(s.layout,groundPoint(q))):q;}
const indexes=new WeakMap();
function index(s){let v=indexes.get(s);if(v?.time===s.time&&v.length===s.cells.length)return v;v={time:s.time,length:s.cells.length,groups:{},local:{}};for(const d of cityDistricts(s))v.local[d.id]=[];for(const c of s.cells){(v.groups[c.kind]??=[]).push(c);v.local[nearest(s,c)].push(c);}indexes.set(s,v);return v;}
const cells=(s,kind)=>index(s).groups[kind]||[];
function clone(s,parent,kind,api,extra={}){
 if(s.cells.length+s.recruits.length>=populationLimit(s)||cells(s,kind).length>=cellCap(s,kind)||s.resources.food<2)return null;
 s.resources.food-=2;const c=api.cell(s,kind,parent.x,parent.y);Object.assign(c,{cloneOf:parent.id,recordId:parent.recordId,immuneState:parent.immuneState,lineage:parent.lineage,cd40l:parent.cd40l,isotype:parent.isotype,activatedAt:s.time,...extra});s.immunity.stats.clones++;return c;
}
function go(s,c,p,key,dt,api,speed=65){
 if(!key.startsWith('lymph:'))return moveToInflammation(s,c,p,key,dt,api,speed*travelScale(s));
 c.travelMode=null;c.trafficStage=null;
 if(c.immuneMove!==key||c.step>=c.path.length&&distance(c,p)>18){c.immuneMove=key;releaseWorkplace(c);api.route(c,[p]);}
 return api.move(c,speed*travelScale(s),dt);
}
function node(s,c,dt,api){
 if(c.immuneSeat==null){const used=new Set(s.cells.filter(a=>['helperT','cd8','bcell','dendritic'].includes(a.kind)).map(a=>a.immuneSeat));let slot=0;while(slot<48&&used.has(slot))slot++;c.immuneSeat=slot<48?slot:c.id%48;}
 const p=localPoint(s,'lymph',lymphocyteBay(c.immuneSeat)),q=s.layout?groundCoordinate(walkablePoint(s.layout,groundPoint(p))):p;return go(s,c,q,'lymph:'+c.immuneSeat,dt,api);
}
function patrol(s,c,dt,api,site='heart'){
 c.travelMode=null;c.transit=null;c.trafficStage=null;
 if(c.step>=c.path.length||c.immuneMove!==site+':patrol'){
  const p=at(s,site),a=c.id*2.4+s.time*.15,q={x:p.x+Math.cos(a)*65,y:p.y+Math.sin(a)*45};c.immuneMove=site+':patrol';api.route(c,[s.layout?groundCoordinate(roadPoint(s.layout,groundPoint(q))):q]);
 }api.move(c,42*travelScale(s),dt);
}
function bestSite(s,score){return cityDistricts(s).map(d=>({id:d.id,score:score(d.id)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))[0];}
function alert(s,c,kind='threat'){c.alertKind=kind;c.alertUntil=s.time+2.5;}
function matchingHelp(s,id,site='lymph',lineage=null){const p=groundPoint(at(s,site));return cells(s,'helperT').filter(c=>{const q=groundPoint(c);return c.recordId===id&&c.immuneState==='effector'&&(!lineage||c.lineage===lineage)&&(lineage!=='Tfh'||c.cd40l!==false)&&Math.hypot(q.x-p.x,q.z-p.z)<6.5;});}
function presentation(s,id,mhc){const p=s.immunity.presentations[id];return p&&p.expires>s.time&&p[mhc]&&p.costimulation>.2&&s.cells.some(c=>c.id===p.presenter&&c.kind==='dendritic'&&c.immuneState==='presenting')?p:null;}

export function tickImmunity(s,dt,api){
 const i=s.immunity;if(!i)return;ensureHostResponse(s);index(s);
 for(const a of Object.values(i.antigens))a.sites={};
 for(const [site,d]of Object.entries(s.biology.sites))for(const [id,load]of Object.entries(d.strains))register(s,id,site,load);
 for(const e of s.enemies)if(e.entered&&!e.dead)register(s,e.recordId,e.site||'heart',2);
 for(const h of i.infected)register(s,h.recordId,h.site,h.burden);
 for(const v of s.physiology.virions)if(v.entered)register(s,v.recordId,v.site,1);
 for(const [id,load]of Object.entries(s.physiology.blood.strains))register(s,id,'heart',load);
 for(const w of i.parasites)register(s,w.recordId,w.site,8*w.hp/w.maxHp);
 for(const e of i.exposures){register(s,e.recordId,e.site,e.amount);e.remaining-=dt;}
 i.exposures=i.exposures.filter(e=>e.remaining>0);
 for(const def of cityDistricts(s)){
  const site=def.id,d=i.sites[site],signals=d.signals,local=index(s).local[site],b=s.biology.sites[site];
  signals.c5a??=0;
  for(const id of Object.keys(signals))signals[id]*=Math.exp(-dt*(id==='histamine'?.3:id==='complement'?.09:.12));
  const bacteria=Object.entries(i.antigens).filter(([id])=>immuneAntigen(id).type==='bacteria').reduce((n,[,a])=>n+(a.sites[site]||0),0),viral=i.infected.filter(h=>h.site===site).reduce((n,h)=>n+h.burden,0),two=Object.entries(i.antigens).filter(([id])=>type2(id)).reduce((n,[,a])=>n+(a.sites[site]||0),0);
  const damage=100-s.districts[site].hp;d.danger=clamp(bacteria+viral+damage*.3);d.alarmin=clamp(two);
  d.regulation=clamp(signals.il10*.6+signals.tgfb*.4);
  // Epithelium supplies early danger/antiviral and type-2 alarmin signals.
  emit(s,site,'cxcl8',dt*(bacteria*.012+signals.il17*.15));emit(s,site,'ifn1',dt*viral*.045);emit(s,site,'il12',dt*(bacteria+viral)*.008);emit(s,site,'mcsf',dt*.6*api.output(s,site));emit(s,site,'ccl11',dt*(two*.02+signals.il13*.12));
  for(const c of local)if(['macrophage','dendritic'].includes(c.kind)&&d.danger>1){emit(s,site,'tnf',dt*Math.min(2,d.danger*.04));emit(s,site,'cxcl8',dt*Math.min(3,d.danger*.07));emit(s,site,'ccl2',dt*Math.min(2,d.danger*.04));}
  emit(s,site,'complement',dt*bacteria*(.015+Object.entries(i.antibodies).filter(([id])=>i.antigens[id]?.sites[site]>0).reduce((n,[,a])=>n+(a.IgM*.025+a.IgG*.012),0)*.01));
  b.inflammation=clamp(b.inflammation+dt*(signals.tnf*.012+signals.histamine*.025-signals.il10*.018-signals.tgfb*.012));
  if(b.inflammation>45)injure(s,site,'immune',dt*(b.inflammation-45)*.002);
  for(const c of local)if(c.kind==='neutrophil'&&!c.recovering&&bacteria>30&&(c.netAt??-100)+12<s.time&&(c.energy??100)>35){
   c.netAt=s.time;c.energy=clamp((c.energy??100)-12);i.nets.push({id:++s.serial,site,x:c.x,y:c.y,until:s.time+5});i.nets=i.nets.slice(-12);i.stats.nets++;beginActivity(s,c,'net',.8,c,site);alert(s,c);b.inflammation=clamp(b.inflammation+.7);
  }
 }
 for(const n of i.nets){const b=s.biology.sites[n.site];for(const id of Object.keys(b.strains))if(!pathogenDef(id)?.lumen)b.strains[id]=Math.max(0,b.strains[id]-dt*.1);for(const e of s.enemies)if(e.entered&&e.compartment!=='lumen'&&!e.dead&&distance(e,n)<55)api.damage(s,e,dt*.7,n,'#e5dcb6');injure(s,n.site,'immune',dt*.025,n);}
 i.nets=i.nets.filter(n=>n.until>s.time);
 for(const w of i.parasites){const sig=i.sites[w.site].signals;w.hp=Math.max(0,w.hp-dt*sig.il13*.012);s.districts[w.site].hp=clamp(s.districts[w.site].hp-dt*.025);}
 const expelled=i.parasites.filter(w=>w.hp<=0);i.stats.parasites+=expelled.length;i.parasites=i.parasites.filter(w=>w.hp>0);
 tickHostResponse(s,dt,api);
 for(const [id,a]of Object.entries(i.antibodies)){for(const iso of ['IgM','IgG','IgA','IgE'])a[iso]*=Math.exp(-dt*(iso==='IgE'?.0015:.0008));s.antibodies[id]=clamp(a.IgG+a.IgM*.45+a.IgA*.4);}
 for(const [id,p]of Object.entries(i.presentations)){p.costimulation=p.baseCostimulation*clamp(1-i.sites.lymph.regulation*.009,1);if(p.expires<s.time||!s.cells.some(c=>c.id===p.presenter))delete i.presentations[id];}
}

function dendritic(s,c,dt,api){
 if(c.immuneState==='presenting'){
  c.task='MHC-II 항원 제시'+(immuneAntigen(c.recordId)?.type==='virus'?' · 교차제시 MHC-I':'');c.nextTask='미경험 T세포 활성화';
  if(s.time<c.presentUntil)return;
  c.recordId=null;c.immuneState='survey';c.immuneMove=null;c.cooldown=5;
 }
 if(c.recordId&&c.immuneState==='migrating'){
  if(!moveDendriticToNode(s,c,dt,api))return;c.travelMode=null;c.trafficStage=null;
  c.immuneState='presenting';c.presentUntil=s.time+35;beginActivity(s,c,'present',2,at(s,'lymph'),'lymph');
  const p={presenter:c.id,site:c.immuneSite,mhcII:true,mhcI:immuneAntigen(c.recordId).type==='virus',baseCostimulation:c.costimAtPickup,costimulation:c.costimAtPickup,expires:c.presentUntil};
  s.immunity.presentations[c.recordId]=p;s.antigens[c.recordId]=true;s.immunity.stats.presented++;immuneEvent(s,'presentation',c,c.recordId,c.immuneSite);alert(s,c);return;
 }
 let choice=null;
 for(const [id,a]of Object.entries(s.immunity.antigens))for(const [site,amount]of Object.entries(a.sites))if(amount>1&&(!presentation(s,id,'mhcII')||s.immunity.presentations[id].expires<s.time+8)){
  const score=distance(c,at(s,site))+cells(s,'dendritic').filter(d=>d!==c&&d.recordId===id).length*120;if(!choice||score<choice.score)choice={id,site,score};
 }
 if(!choice||c.cooldown>0){c.task='항원 감시';patrol(s,c,dt,api,c.target||'lung');return;}
 c.task='항원 포획 · 성숙';const sample=infectionFocus(s,choice.site,choice.id,c);if(!go(s,c,sample,'sample:'+choice.id+':'+choice.site+':'+(sample.key||''),dt,api))return;
 c.recordId=choice.id;c.immuneSite=choice.site;c.immuneState='migrating';c.costimAtPickup=s.immunity.sites[choice.site].danger+s.immunity.sites[choice.site].alarmin>1?clamp(1-s.immunity.sites[choice.site].regulation*.009,1):0;c.immuneMove=null;alert(s,c);beginActivity(s,c,'collect',.6,c,choice.site);
}
function primeT(s,c,dt,api){
 if(!node(s,c,dt,api)){c.task='림프절 · 항원 탐색';return;}
 const mhc=c.kind==='cd8'?'mhcI':'mhcII';
 if(!c.recordId){
  const p=Object.entries(s.immunity.presentations).filter(([id])=>presentation(s,id,mhc)&&cells(s,c.kind).filter(x=>x.recordId===id).length<4).sort(([a],[b])=>cells(s,c.kind).filter(x=>x.recordId===a).length-cells(s,c.kind).filter(x=>x.recordId===b).length)[0];
  if(!p){c.task=mhc==='mhcI'?'MHC-I 교차제시 대기':'MHC-II·공동자극 대기';return;}c.recordId=p[0];c.immuneSite=p[1].site;
 }
 const p=presentation(s,c.recordId,mhc),help=c.kind!=='cd8'||matchingHelp(s,c.recordId).length>0&&signal(s,'lymph','il2')>.3;
 if(!p||!help){c.task='항원 일치 · 활성화 대기';c.waitReason=!p?'일치하는 '+mhc+'·CD80/86 필요':'CD4 도움·IL-2 필요';return;}
 if(c.immuneState!=='priming'){c.immuneTimer=c.memory?2.5:7;c.immuneState='priming';}
 c.task=mhc==='mhcI'?'CD8 클론 선택·증식':'CD4 클론 선택·분화';
 if(!activeActivity(c,s.time))beginActivity(s,c,'prime',2,at(s,'lymph'),'lymph');
 c.immuneTimer=Math.max(0,c.immuneTimer-dt*p.costimulation*Math.max(.2,api.output(s,'lymph')));if(c.immuneTimer>0)return;
 c.immuneState='effector';c.activatedAt=s.time;c.memory=false;c.immuneMove=null;c.activity=null;s.immunity.stats.primed++;
 if(c.kind==='helperT'){
  const peers=cells(s,'helperT').filter(x=>x!==c&&x.recordId===c.recordId&&x.immuneState==='effector'),program=immuneAntigen(c.recordId).type;
  c.lineage=peers.some(x=>x.lineage==='Tfh')?(type2(c.recordId)?'Th2':program==='virus'?'Th1':'Th17'):'Tfh';c.cd40l=c.lineage==='Tfh';
 }
 clone(s,c,c.kind,api,{immuneSite:c.immuneSite});immuneEvent(s,'priming',c,c.recordId,c.immuneSite);alert(s,c);
 if(c.kind==='cd8'||c.lineage!=='Tfh')leaveNode(s,c);
}
function contract(s,c,dt,api){
 const a=s.immunity.antigens[c.recordId];
 if(s.time-(a?.lastSeen??0)<20||s.time-(c.activatedAt??s.time)<25)return false;
 if((c.kind==='cd8'||c.lineage!=='Tfh')&&(!c.extravascular||c.tissueSite!==c.immuneSite)){
  c.task='감염 조직 · 기억세포 정착';go(s,c,infectionFocus(s,c.immuneSite,c.recordId),'memory:'+c.immuneSite,dt,api);return true;
 }
 c.immuneState='memory';c.memory=true;c.activity=null;c.immuneMove=null;
 if(c.kind==='cd8'||c.lineage!=='Tfh'){
  c.tissueResident=true;c.residentSite=c.immuneSite;c.extravascular=true;c.tissueSite=c.immuneSite;c.trafficStage='resident';c.path=[];c.step=0;c.task='조직상주 기억 · 항원 감시';hostEvent(s,'resident-memory',c.immuneSite,c,c.recordId);return true;
 }
 c.task='기억 CD4 · 림프절 회귀';
 if(c.cloneOf&&c.id%3===0){c.lost=true;immuneEvent(s,'contraction',c,c.recordId,c.immuneSite);}else node(s,c,dt,api);return true;
}
function helper(s,c,dt,api){
 if(residentRecall(s,c,dt,api))return;
 if(c.immuneState!=='effector'){
  if(c.memory&&s.time-(s.immunity.antigens[c.recordId]?.lastSeen??0)>8){c.task='기억 CD4 감시';node(s,c,dt,api);return;}
  primeT(s,c,dt,api);return;
 }
 if(contract(s,c,dt,api))return;
 const site=c.lineage==='Tfh'?'lymph':c.immuneSite;
 c.task=c.lineage+' · '+(c.lineage==='Tfh'?'동일 항원 B세포 도움':c.lineage==='Th1'?'대식세포 활성화':c.lineage==='Th2'?'IL-4/5/13 분비':'IL-17 · 호중구 유도');
 if(!(c.lineage==='Tfh'?node(s,c,dt,api):go(s,c,at(s,site),'helper:'+site,dt,api)))return;
 if(c.lineage!=='Tfh'&&!(s.immunity.antigens[c.recordId]?.sites[site]>0)){c.waitReason='조직에서 일치 항원 재인식 대기';return;}
 const strength=dt*(1-s.immunity.sites[site].regulation*.006);emit(s,site,'il2',strength*1.1);
 if(c.lineage==='Tfh'){emit(s,site,'il21',strength*2);if(type2(c.recordId))emit(s,site,'il4',strength*1.2);}
 else if(c.lineage==='Th1')emit(s,site,'ifng',strength*2.2);
 else if(c.lineage==='Th2')for(const id of ['il4','il5','il13'])emit(s,site,id,strength*1.8);
 else emit(s,site,'il17',strength*2.3);
 if(!activeActivity(c,s.time)){beginActivity(s,c,'signal',1,c,site);s.stats.signals++;}
}
function bcell(s,c,dt,api){
 if(!node(s,c,dt,api)){c.task='림프절 · BCR 항원 탐색';return;}
 if(!c.recordId){const a=Object.entries(s.immunity.antigens).filter(([id,a])=>a.lymph>1&&cells(s,'bcell').filter(x=>x.recordId===id).length<6).sort(([a],[b])=>cells(s,'bcell').filter(x=>x.recordId===a).length-cells(s,'bcell').filter(x=>x.recordId===b).length)[0];if(!a){c.task='BCR · 미경험 B세포';return;}c.recordId=a[0];c.immuneSite=Object.entries(a[1].sites).sort((a,b)=>b[1]-a[1])[0]?.[0]||'lung';}
 const a=s.immunity.antigens[c.recordId],help=matchingHelp(s,c.recordId,'lymph','Tfh');
 c.mhcII??=true;
 if(c.memory&&(a?.lymph<1||s.time-a.lastSeen>8||c.cooldown>0)){c.task='기억 B세포 · 재노출 감시';return;}
 if(!a||a.lymph<1||!help.length||!c.mhcII){c.task='BCR 포획 · MHC-II 제시';c.waitReason='동일 항원 MHC-II·Tfh·CD40L 도움 필요';return;}
 if(c.immuneState!=='germinal'){
  c.immuneState='germinal';c.immuneTimer=c.memory?3:10;clone(s,c,'plasma',api,{licensed:true,isotype:'IgM',immuneState:'secreting',life:180,immuneExpires:s.time+90});immuneEvent(s,'b-help',c,c.recordId,'lymph');
 }
 c.task='배중심 · 동형 전환·친화도 성숙';if(!activeActivity(c,s.time))beginActivity(s,c,'prime',2,c,'lymph');
 if(s.districts.lymph.food<=.01){c.waitReason='림프절 영양 부족';return;}
 s.districts.lymph.food=Math.max(0,s.districts.lymph.food-dt*.02);c.immuneTimer=Math.max(0,c.immuneTimer-dt*api.output(s,'lymph'));if(c.immuneTimer>0)return;
 const isotype=type2(c.recordId)?'IgE':pathogenDef(c.recordId)?.lumen||immuneAntigen(c.recordId).type==='virus'&&['lung','gut'].includes(c.immuneSite)?'IgA':'IgG';
 if(isotype==='IgE'&&signal(s,'lymph','il4')<.5){c.waitReason='IgE 전환 · IL-4 신호 필요';return;}
 if(cells(s,'plasma').length>=cellCap(s,'plasma')){c.waitReason='형질세포 수용 한도';return;}
 if(c.memory){clone(s,c,'plasma',api,{licensed:true,isotype,immuneState:'secreting',affinity:.9,immuneExpires:s.time+300});c.immuneState='memory';c.cooldown=20;}
 else{clone(s,c,'bcell',api,{memory:true,immuneState:'memory',affinity:.8});c.kind='plasma';c.licensed=true;c.isotype=isotype;c.affinity=.8;c.immuneState='secreting';c.life=CELL_JOBS.plasma.life;c.age=0;c.immuneExpires=s.time+600;}
 c.activity=null;c.immuneMove=null;releaseWorkplace(c);s.immunity.stats.differentiated++;immuneEvent(s,'class-switch',c,c.recordId,'lymph');alert(s,c);
}
function plasma(s,c,dt,api){
 if(!c.licensed||!immuneAntigen(c.recordId)){c.task='B세포 분화 이력 필요';return;}
 const rule=cityRule(s,'antibody'),p=rule.params;
 if(c.activity?.kind!=='produce'&&!ruleReady(s,'antibody','lymph')){c.waitReason='항체 생산 규칙·산소 확인';return;}
 const bench=approachWorkplace(s,c,'lymph','produce',dt,api.move,api.route);c.workSlot=bench.slot;c.task=(c.isotype||'IgG')+' · 항체 분비';if(!bench.arrived)return;
 if(c.activity?.kind==='produce'){
  if(activityProgress(c.activity,s.time)<1)return;
  const a=s.immunity.antibodies[c.recordId]??={IgM:0,IgG:0,IgA:0,IgE:0},iso=c.isotype||'IgG';a[iso]=clamp(a[iso]+(c.activity.ruleYield??p.amount));s.antibodies[c.recordId]=clamp(a.IgG+a.IgM*.45+a.IgA*.4);c.cooldown=c.activity.ruleInterval??p.interval;c.activity=null;s.stats.antibodyBatches++;releaseWorkplace(c);
 }
 if(c.cooldown>0||s.districts.lymph.food<p.cost){c.waitReason=c.cooldown>0?'분비 주기':'림프절 영양 부족';return;}
  s.districts.lymph.food-=p.cost;beginActivity(s,c,'produce',p.duration,bench.target,'lymph');c.activity.ruleYield=p.amount*(1+.4*(s.districts.lymph.level-1))*api.output(s,'lymph')*1.8*(.7+(c.affinity||.5));c.activity.ruleInterval=p.interval;
}
function monocyte(s,c,dt,api){
 const best=bestSite(s,id=>signal(s,id,'ccl2')+s.immunity.sites[id].danger*.05);
 if(best.score<1){c.task='혈류 · 단핵구 순찰';patrol(s,c,dt,api);return;}
 c.target=best.id;c.task='CCL2 유주 · 조직 진입';const focus=infectionFocus(s,best.id,null,c);if(!go(s,c,focus,'monocyte:'+best.id+':'+(focus.key||''),dt,api))return;
 if(signal(s,best.id,'mcsf')<1){c.waitReason='조직 M-CSF 환경 대기';return;}
 if(c.immuneState!=='differentiating'){c.immuneState='differentiating';c.immuneTimer=4;beginActivity(s,c,'differentiate',3.5,c,best.id);}
 c.task='M-CSF 환경 · 대식세포 분화';c.immuneTimer-=dt;if(c.immuneTimer>0)return;
 c.kind='macrophage';c.origin='monocyte';c.differentiatedAt=s.time;c.life=CELL_JOBS.macrophage.life;c.age=0;c.immuneTimer=0;c.activity=null;c.immuneMove=null;c.immuneState='resident';s.immunity.stats.differentiated++;immuneEvent(s,'monocyte-macrophage',c,null,best.id);alert(s,c);
}
function cytotoxic(s,c,dt,api){
 if(residentRecall(s,c,dt,api))return;
 const nk=c.kind==='nk';if(!nk&&c.immuneState!=='effector'){
  if(c.memory&&s.time-(s.immunity.antigens[c.recordId]?.lastSeen??0)>8){c.task='기억 CD8 감시';node(s,c,dt,api);return;}primeT(s,c,dt,api);return;
 }
 if(!nk&&contract(s,c,dt,api))return;
 const targets=s.immunity.infected.filter(h=>h.hp>0&&(s.biology.order.mode!=='hold'||s.biology.order.site===h.site)&&(nk?h.stress>.5&&(h.mhcI<.5||antibodyLevel(s,h.recordId,'IgG')>25):h.recordId===c.recordId&&h.mhcI>=.3));
 const target=targets.sort((a,b)=>distance(c,a)-distance(c,b))[0];
 if(!target){c.task=nk?'NK · 스트레스·MHC-I 감시':'CD8 · 일치 항원 탐색';patrol(s,c,dt,api,c.immuneSite||'lung');return;}
 c.task=nk?(target.mhcI<.5?'NK · missing-self 인식':'NK · CD16·IgG ADCC'):'CD8 · TCR–peptide/MHC-I 인식';c.target=target.site;c.immuneSite=target.site;
 if(!go(s,c,target,'kill:'+target.id,dt,api,nk?76:72))return;
 if(c.cooldown>0)return;
 const amount=(nk?9:15)*(1-s.immunity.sites[target.site].regulation*.004)*Math.max(.3,(c.energy??100)/100);target.hp=Math.max(0,target.hp-amount);c.energy=clamp((c.energy??100)-3);c.cooldown=nk?1.5:1.2;beginActivity(s,c,'cytotoxic',.75,target,target.site);alert(s,c);
 if(target.hp===0){
  s.immunity.stats[nk?'nkKills':'cd8Kills']++;immuneEvent(s,nk?'nk-apoptosis':'cd8-apoptosis',c,target.recordId,target.site);killHost(s,target);s.immunity.infected=s.immunity.infected.filter(h=>h.id!==target.id);
 }
}
function granulocyte(s,c,dt,api){
 const mast=c.kind==='mast',eos=c.kind==='eosinophil';let site;
 if(mast){c.residentSite??=['lung','gut','marrow'][c.id%3];site=c.residentSite;c.task='조직 상주 · 비만세포 감시';}
 else{const best=bestSite(s,id=>s.immunity.sites[id].alarmin+signal(s,id,eos?'ccl11':'il4')+signal(s,id,'il5')*2);if(best.score<1){c.task=eos?'호산구 · IL-5·연충 감시':'호염기구 · 혈류 순찰';patrol(s,c,dt,api);return;}site=best.id;c.task=eos?'IL-5·eotaxin · 조직 유주':'호염기구 · 2형 염증 유주';}
 c.target=site;const home=at(s,site),p=s.layout?groundCoordinate(roadPoint(s.layout,groundPoint({x:home.x+(c.id%3-1)*28,y:home.y+30}))):home;
 const worm=eos?s.immunity.parasites.filter(w=>w.site===site).sort((a,b)=>distance(c,a)-distance(c,b))[0]:null;
 if(!worm&&!go(s,c,p,'granule:'+site,dt,api))return;
 if(c.mastPrecursor){c.immuneTimer=Math.max(0,(c.immuneTimer??4)-dt);c.task='조직 · 비만세포 성숙';if(c.immuneTimer>0)return;c.mastPrecursor=false;}
 const entries=Object.entries(s.immunity.antigens).filter(([id,a])=>type2(id)&&(a.sites[site]||0)>0);
 if(mast&&s.immunity.sites[site].danger>1)emit(s,site,'tnf',dt*.3);
 if(!mast&&!eos&&s.immunity.sites[site].alarmin>0)emit(s,site,'il4',dt*.9);
 if(eos){
  if(worm){if(distance(c,worm)>38){go(s,c,worm,'worm:'+worm.id,dt,api,64);return;}c.task='호산구 · 연충 표면 과립 방출';if(c.cooldown>0)return;const rate=.4+signal(s,site,'il5')*.08;worm.hp=Math.max(0,worm.hp-5*Math.min(2,rate));c.cooldown=1.5;beginActivity(s,c,'degranulate',.8,worm,site);s.biology.sites[site].inflammation=clamp(s.biology.sites[site].inflammation+.15);alert(s,c);return;}
  if(entries.some(([id])=>antibodyLevel(s,id,'IgE')>5)&&signal(s,site,'il5')>2){c.task='호산구 · 알레르기 후기 반응';emit(s,site,'tnf',dt*.8);s.districts[site].hp=clamp(s.districts[site].hp-dt*.015);}return;
 }
 c.boundIgE??={};for(const [id,a]of Object.entries(s.immunity.antibodies))if(a.IgE>0)c.boundIgE[id]=clamp((c.boundIgE[id]||0)+dt*a.IgE*.08);
 const crosslinked=entries.find(([id])=>(c.boundIgE[id]||0)>5);
 if(crosslinked&&c.cooldown===0){emit(s,site,'histamine',mast?12:6);emit(s,site,'il4',mast?.3:2);c.cooldown=mast?8:7;beginActivity(s,c,'degranulate',1,c,site);c.task='FcεRI–IgE 교차결합 · 탈과립';s.immunity.stats.degranulations++;immuneEvent(s,'ige-degranulation',c,crosslinked[0],site);alert(s,c);}
}
function regulatory(s,c,dt,api){
 const lymph=c.id%3===0&&Object.keys(s.immunity.presentations).length>0,best=lymph?{id:'lymph',score:signal(s,'lymph','il2')*2}:bestSite(s,id=>s.biology.sites[id].inflammation+signal(s,id,'il2')*.8);c.target=best.id;
 if(best.score<1){c.task='Treg · 면역 항상성 감시';patrol(s,c,dt,api,'lymph');return;}
 c.task='Treg · 염증 구역 유주';if(!go(s,c,at(s,best.id),'treg:'+best.id,dt,api))return;
 if(signal(s,best.id,'il2')<.15){c.waitReason='효과 T세포 IL-2 신호 대기';return;}
 c.task='Treg · CTLA-4·IL-10·TGF-β';emit(s,best.id,'il10',dt*1.6);emit(s,best.id,'tgfb',dt*1.2);s.immunity.sites[best.id].signals.il2=Math.max(0,signal(s,best.id,'il2')-dt*.15);s.immunity.stats.regulation+=dt;
 if(!activeActivity(c,s.time))beginActivity(s,c,'regulate',1,c,best.id);
}
function residentRecall(s,c,dt,api){
 if(!c.tissueResident||c.immuneState==='effector')return false;
 const site=c.residentSite,amount=s.immunity.antigens[c.recordId]?.sites[site]||0;c.task='조직상주 기억 · 항원 감시';c.trafficStage='resident';
 if(amount<=.1)return true;
 c.immuneState='effector';c.memory=false;c.activatedAt=s.time;c.immuneSite=site;c.immuneMove=null;c.recallUntil=s.time+7;
 emit(s,site,'ifng',8);emit(s,site,'cxcl8',10);emit(s,site,'ifn1',8);s.physiology.stats.recalls++;hostEvent(s,'memory-recall',site,c,c.recordId);alert(s,c);return false;
}
export function immuneCell(s,c,dt,api){
 if(!s.immunity||!dedicated.has(c.kind))return false;
 if(c.immuneExpires!=null&&s.time>=c.immuneExpires){c.lost=true;return true;}
 c.energy??=100;c.integrity??=100;c.immuneState??='naive';
 if(['nk','eosinophil','basophil','cd8'].includes(c.kind)){
  const here=nearest(s,c);c.integrity=clamp(c.integrity-dt*s.biology.sites[here].inflammation*.002);c.energy=clamp(c.energy+dt*.2);
  if(c.integrity<=0){c.lost=true;return true;}
  if(c.energy<20||s.biology.order.mode==='recover'||c.recovering){c.recovering=true;const bed=approachWorkplace(s,c,'heart','rest',dt,api.move,api.route,52);c.task='후방 · 면역세포 회복';if(bed.arrived&&s.districts.heart.food>.02&&s.districts.heart.oxygen>=20){c.energy=clamp(c.energy+dt*3);c.integrity=clamp(c.integrity+dt);if(c.energy>=85&&c.integrity>=85&&s.biology.order.mode!=='recover'){c.recovering=false;c.immuneMove=null;releaseWorkplace(c);}}return true;}
 }
 const running=activeActivity(c,s.time);if(running&&['cytotoxic','degranulate','differentiate','prime','present'].includes(running.kind)&&!['priming','germinal','differentiating','presenting'].includes(c.immuneState))return true;
 if(c.kind==='dendritic')dendritic(s,c,dt,api);else if(c.kind==='helperT')helper(s,c,dt,api);else if(c.kind==='bcell')bcell(s,c,dt,api);else if(c.kind==='plasma')plasma(s,c,dt,api);else if(c.kind==='monocyte')monocyte(s,c,dt,api);else if(c.kind==='nk'||c.kind==='cd8')cytotoxic(s,c,dt,api);else if(c.kind==='treg')regulatory(s,c,dt,api);else granulocyte(s,c,dt,api);
 return true;
}

export function validateImmunity(s){
 const i=s.immunity;if(!i)return true;const n=(x,max=100)=>Number.isFinite(x)&&x>=0&&x<=max,site=id=>!!cityDistrict(s,id),record=id=>!!immuneAntigen(id),point=p=>Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!s.specialists||i.version!==1||![0,1].includes(i.roster)||!n(i.viralClock,11)||!i.stats||['presented','primed','clones','differentiated','nkKills','cd8Kills','parasites','degranulations','regulation','nets'].some(k=>!n(i.stats[k],1e8)))return false;
 if(!i.sites||cityDistricts(s).some(d=>{const a=i.sites[d.id];return !a||!n(a.danger)||!n(a.alarmin)||!n(a.regulation)||!a.signals||Object.keys(IMMUNE_SIGNALS).some(k=>!n(a.signals[k]??(k==='c5a'?0:NaN)));}))return false;
 if(!i.antigens||Object.keys(i.antigens).length>32||Object.entries(i.antigens).some(([id,a])=>!record(id)||!n(a.lymph)||!n(a.lastSeen,s.time)||!a.sites||Object.entries(a.sites).some(([id,x])=>!site(id)||!n(x))))return false;
 if(!i.antibodies||Object.keys(i.antibodies).length>32||Object.entries(i.antibodies).some(([id,a])=>!record(id)||['IgM','IgG','IgA','IgE'].some(k=>!n(a[k]))))return false;
 if(!i.presentations||Object.keys(i.presentations).length>32||Object.entries(i.presentations).some(([id,p])=>!record(id)||!site(p.site)||!n(p.presenter,1e8)||!n(p.expires,1e9)||typeof p.mhcI!=='boolean'||typeof p.mhcII!=='boolean'||!n(p.costimulation,1)||!n(p.baseCostimulation,1)))return false;
 if(!Array.isArray(i.infected)||i.infected.length>96||i.infected.some(h=>!point(h)||!record(h.recordId)||immuneAntigen(h.recordId).type!=='virus'||!site(h.site)||!n(h.hp,30)||!n(h.burden,20)||!n(h.mhcI,1)||!n(h.stress,1)))return false;
 if(!Array.isArray(i.parasites)||i.parasites.length>32||i.parasites.some(w=>!point(w)||immuneAntigen(w.recordId)?.type!=='helminth'||!site(w.site)||!n(w.hp,w.maxHp)||w.maxHp!==50))return false;
 if(!Array.isArray(i.exposures)||i.exposures.length>32||i.exposures.some(e=>!point(e)||immuneAntigen(e.recordId)?.type!=='allergen'||!site(e.site)||!n(e.amount,32)||!n(e.remaining,8)))return false;
 if(!Array.isArray(i.nets)||i.nets.length>12||i.nets.some(e=>!point(e)||!site(e.site)||!n(e.until,1e9))||!Array.isArray(i.events)||i.events.length>28||i.events.some(e=>!n(e.time,s.time)||!site(e.site)||e.recordId!=null&&!record(e.recordId)))return false;
 if(s.cells.some(c=>c.immuneExpires!=null&&!n(c.immuneExpires,1e9)||c.mhcII!=null&&typeof c.mhcII!=='boolean'||c.immuneSeat!=null&&(!Number.isInteger(c.immuneSeat)||!n(c.immuneSeat,47))))return false;
 return !s.cells.some(c=>c.recordId!=null&&dedicated.has(c.kind)&&!record(c.recordId)||c.immuneSite!=null&&!site(c.immuneSite)||c.residentSite!=null&&!site(c.residentSite)||c.immuneTimer!=null&&!n(c.immuneTimer,20)||c.affinity!=null&&!n(c.affinity,1)||c.memory!=null&&typeof c.memory!=='boolean'||c.licensed!=null&&typeof c.licensed!=='boolean'||c.cd40l!=null&&typeof c.cd40l!=='boolean'||c.immuneState!=null&&!['naive','effector','memory','priming','germinal','secreting','survey','migrating','presenting','differentiating','resident'].includes(c.immuneState)||c.isotype!=null&&!['IgM','IgG','IgA','IgE'].includes(c.isotype)||c.boundIgE&&Object.entries(c.boundIgE).some(([id,x])=>!record(id)||!n(x)));
}
