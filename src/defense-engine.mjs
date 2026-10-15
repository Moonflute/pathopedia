import {STAGES,HOSTS,DECK_SLOTS,DECK_BUDGET} from './defense-data.mjs';
export const FIELD={width:1000,height:430,ground:325,enemyBase:76,hostBase:924};
export const SOURCE_COST=80;
export const MAX_UNITS=18;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const stageById=id=>STAGES.find(s=>s.id===id)||STAGES[0];
export function normalizeDeck(catalog,value=[]){
 const result=[];
 for(const item of Array.isArray(value)?value:[]){
  if(!item||!catalog.drugById[item.drugId]||result.some(d=>d.drugId===item.drugId))continue;
  result.push({drugId:item.drugId,exposure:item.exposure===1?1:0});if(result.length===DECK_SLOTS)break;
 }
 return result;
}
export function deckCost(catalog,deck){return deck.reduce((sum,d)=>sum+(catalog.drugById[d.drugId]?.points||0)+(d.exposure?1:0),0);}
export function stageCoverage(catalog,stage,slot,pathogenId,{renalAdjusted=false}={}){
 const drug=catalog.drugById[slot?.drugId];
 if(!drug)return {factor:0,category:'—',reason:'빈 슬롯'};
 const result=getCoverage(catalog,drug.id,pathogenId,{mapId:stage.mapId,wave:stage.number,source:!!stage.source,exposure:slot.exposure});
 const blocked=drugBlocked(stage,drug);if(blocked)return {...result,factor:0,reason:blocked};
 if(stage.hostId==='renal'&&drug.renal&&!renalAdjusted)return {...result,factor:0,reason:'신기능 맞춤 투여를 준비하세요.'};
 return result;
}
export function deckReadiness(catalog,stage,deck,options={}){
 const normalized=normalizeDeck(catalog,deck),points=deckCost(catalog,normalized);
 const profiles=stage.enemies.map(id=>({id,covered:normalized.some(slot=>stageCoverage(catalog,stage,slot,id,options).factor>0)}));
 const blocked=normalized.some(slot=>drugBlocked(stage,catalog.drugById[slot.drugId]));
 return {points,budget:stage.budget||DECK_BUDGET,profiles,missing:profiles.filter(p=>!p.covered).length,ok:normalized.length>0&&points<=(stage.budget||DECK_BUDGET)&&!blocked&&profiles.every(p=>p.covered)};
}
export function getCoverage(catalog,drugId,pathogenId,{mapId='lung',wave=1,source=false,exposure=0}={}) {
 const pathogen=catalog.pathogenById[pathogenId],entry=pathogen?.ast[drugId];
 const category=entry?.category||'—';
 const result=(factor,reason)=>({factor,category,reason,entry});
 if(!entry)return result(0,'이 조합의 기록이 없습니다. 내성으로 추정하지 않습니다.');
 if(entry.applicability==='infections-originating-from-urinary-tract'&&mapId!=='urinary')return result(0,'이 판정은 요로 유래 감염에만 적용됩니다.');
 if(category==='R')return result(0,'R · 노출 강화로 해결할 수 없습니다. 약제·기전을 바꾸세요.');
 if(category==='INACTIVE')return result(0,'문헌상 비활성. 강화로 coverage가 늘지 않습니다.');
 if(category==='I')return result(exposure>=1?1:0,exposure>=1?'I · 증가 노출 조건 충족':'I · 노출 최적화가 필요합니다.');
 if(category==='S')return result(1,'S · 이 고정 교육 분리주의 감수성.');
 if(category==='REGIMEN'&&pathogenId==='anaerobe'&&mapId==='abdomen'){
  if(drugId==='amoxclav'&&(wave>3||source))return result(0,'기존 자료의 경증·경구 단계 조건에 한정됩니다.');
  if(['metronidazole','meropenem','amoxclav'].includes(drugId))return result(1,'이 복강 감염 맥락의 요법 구성 약제. S 판정은 아닙니다.');
 }
 if(category==='OUTSIDE_REGIMEN')return result(0,'이 시나리오의 요법 목록에 없습니다. R·비활성을 의미하지 않습니다.');
 return result(0,'문헌 활성·조건부 기록만으로 이 게임의 투여 조건을 확정하지 않습니다. 원본 조건을 확인하세요.');
}
export function drugBlocked(run,drug) {
 if(run.hostId==='allergy'&&['ampicillin','amoxclav'].includes(drug.id))return '확인된 aminopenicillin 알레르기';
 return '';
}

// Each roster has deterministic reinforcements; selection pressure never invents new resistance.
export function stageSchedule(stage){
 return stage.waves.flatMap((count,wave)=>Array.from({length:count},(_,i)=>({
  at:5+wave*27+i*stage.interval,pathogenId:stage.enemies[(i+wave)%stage.enemies.length],
  elite:wave===2&&i===Math.floor(count/2),wave:wave+1
 })));
}
export function newDefenseRun(catalog,{stageId=STAGES[0].id,deck=[],renalAdjusted=false,scouted=false}={}){
 const stage=stageById(stageId),loadout=normalizeDeck(catalog,deck);
 return {stageId:stage.id,mapId:stage.mapId,hostId:stage.hostId,deck:loadout,renalAdjusted:!!renalAdjusted,scouted:!!scouted,
 status:'prep',health:100,credits:260-(scouted?45:0),wallet:400,income:15,supplyLevel:0,potency:0,pressure:0,microbiome:0,
 elapsed:0,spawned:0,kills:0,deployments:0,sourceControlled:!stage.source,sourceReadyAt:null,sourceHold:0,
 units:[],enemies:[],projectiles:[],effects:[],serial:0,fxSerial:0,cooldowns:{},schedule:stageSchedule(stage),
 cores:stage.enemies.map((id,i)=>({id:'core-'+i,pathogenId:id,x:FIELD.enemyBase+24+i*14,hp:130+stage.number*10,maxHp:130+stage.number*10,flash:0})),
 wave:0,notice:'편성을 확정하고 출전하세요.',lastDamage:0};
}
export function startDefense(run,catalog){
 if(run.status!=='prep')return false;
 const ready=deckReadiness(catalog,stageById(run.stageId),run.deck,run);
 if(!ready.ok){run.notice=ready.points>ready.budget?'편성 비용 초과':'적 전원에 대응할 덱을 준비하세요.';return false;}
 // A battle owns an immutable copy of its preparation, including exposure and renal plan.
 run.deck=Object.freeze(run.deck.map(slot=>Object.freeze({...slot})));run.status='running';emit(run,'start',{text:'작전 개시'});return true;
}
function emit(run,kind,data={}){run.effects.push({id:++run.fxSerial,kind,ttl:1,...data});if(run.effects.length>120)run.effects.splice(0,run.effects.length-120);}
export function deploymentCost(run,catalog,slot){const drug=catalog.drugById[slot.drugId];return Math.ceil(drug.cost*(slot.exposure?1.2:1)*(1+run.pressure*.002));}
export function deployDrug(run,catalog,drugId){
 if(run.status!=='running')return false;
 const slot=run.deck.find(d=>d.drugId===drugId),drug=catalog.drugById[drugId];
 if(!slot||!drug)return false;
 const cost=deploymentCost(run,catalog,slot);
 if(run.cooldowns[drugId]>0||run.credits<cost||run.units.length>=MAX_UNITS)return false;
 run.credits-=cost;run.cooldowns[drugId]=drug.cooldown;run.deployments++;
 run.pressure=clamp(run.pressure+drug.upkeep*.19,0,100);run.microbiome=clamp(run.microbiome+drug.upkeep*.14,0,100);
 run.units.push({id:++run.serial,drugId,exposure:slot.exposure,x:FIELD.hostBase-46,lane:(run.serial%3)-1,
 life:drug.lifetime,maxLife:drug.lifetime,cooldown:.15,attack:0,facing:-1,moving:true});
 emit(run,'deploy',{x:FIELD.hostBase-46,color:drug.color});return true;
}
export function upgradeSupply(run){
 const cost=80+run.supplyLevel*70;
 if(run.status!=='running'||run.supplyLevel>=3||run.credits<cost)return false;
 run.credits-=cost;run.supplyLevel++;run.income+=4;run.wallet+=140;emit(run,'upgrade',{text:'보급 +'+run.income+'/초'});return true;
}
export function improvePotency(run){
 const cost=120+run.potency*90;
 if(run.status!=='running'||run.potency>=2||run.credits<cost)return false;
 run.credits-=cost;run.potency++;emit(run,'upgrade',{text:'투여 효율 +'+run.potency});return true;
}
export function controlSource(run){
 if(run.status!=='running'||run.sourceControlled||run.sourceReadyAt!==null||run.credits<SOURCE_COST)return false;
 run.credits-=SOURCE_COST;run.sourceReadyAt=run.elapsed+4;emit(run,'source',{text:'Source control · 4초'});return true;
}
export function pauseRun(run){if(run.status==='running'){run.status='paused';return true;}return false;}
export function resumeRun(run){if(run.status==='paused'){run.status='running';return true;}return false;}
function hit(run,target,damage,color,source){
 const floor=source?target.maxHp*.2:0,actual=Math.min(damage,Math.max(0,target.hp-floor));
 if(actual<=0)return;
 target.hp-=actual;target.flash=.13;
 emit(run,'hit',{x:target.x,color,amount:Math.round(actual),core:String(target.id).startsWith('core')});
 if(target.hp<=.001){target.hp=0;run.kills++;run.credits=Math.min(run.wallet,run.credits+(target.elite?22:7));emit(run,'kill',{x:target.x,color:target.color||color,big:!!target.elite});}
}
export function tickDefense(run,catalog,dt){
 if(run.status!=='running')return false;
 dt=clamp(Number(dt)||0,0,.1);run.elapsed+=dt;run.credits=Math.min(run.wallet,run.credits+run.income*dt);
 run.effects=run.effects.filter(e=>(e.ttl-=dt)>0);
 for(const id of Object.keys(run.cooldowns))run.cooldowns[id]=Math.max(0,run.cooldowns[id]-dt);
 const stage=stageById(run.stageId),immune=HOSTS.find(h=>h.id===stage.hostId).immune;
 if(run.sourceReadyAt!==null&&run.elapsed>=run.sourceReadyAt){run.sourceControlled=true;run.sourceReadyAt=null;emit(run,'source',{text:'감염원 제거 완료'});}
 while(run.spawned<run.schedule.length&&run.schedule[run.spawned].at<=run.elapsed){
  const item=run.schedule[run.spawned++],p=catalog.pathogenById[item.pathogenId];
  const hp=p.hp*stage.hp*(item.elite?2.5:1);
  run.enemies.push({id:++run.serial,pathogenId:p.id,color:p.color,x:FIELD.enemyBase+40,lane:run.serial%3-1,hp,maxHp:hp,
   speed:(p.id==='pseudo'?31:25)*(item.elite?.85:1),elite:item.elite,flash:0,attackCooldown:0});
  if(item.wave>run.wave){run.wave=item.wave;emit(run,'wave',{text:item.wave===3?'최종 공세':'증원 '+item.wave+'/3'});}
 }
 for(const e of run.enemies){
  e.flash=Math.max(0,e.flash-dt);if(e.hp<=0)continue;
  // No antibiotic collision, tanking, stun or knockback: inactive units cannot delay an isolate.
  e.x=Math.min(FIELD.hostBase-18,e.x+e.speed*dt);
  if(e.x>=FIELD.hostBase-18){e.attackCooldown-=dt;if(e.attackCooldown<=0){e.attackCooldown=1.25;run.health=Math.max(0,run.health-(e.elite?6:3));run.lastDamage=run.elapsed;emit(run,'leak',{x:FIELD.hostBase,color:e.color});}}
  if(immune&&e.hp>1)e.hp=Math.max(1,e.hp-immune*dt);
 }
 for(const core of run.cores)core.flash=Math.max(0,core.flash-dt);
 for(const unit of run.units){
  const drug=catalog.drugById[unit.drugId];unit.life-=dt;unit.attack=Math.max(0,unit.attack-dt);unit.cooldown-=dt;
  if(unit.life<=0)continue;
  const effective=t=>stageCoverage(catalog,stage,unit,t.pathogenId,run).factor>0;
  const targets=run.enemies.filter(e=>e.hp>0&&Math.abs(e.x-unit.x)<=drug.range&&effective(e));
  // Reserve impact damage so an entire formation does not waste attacks on one doomed target.
  const incoming=id=>run.projectiles.reduce((n,p)=>n+(p.targetId===id?p.damage:0),0);
  const target=targets.sort((a,b)=>b.x-a.x).find(e=>e.hp>incoming(e))||
   run.cores.find(c=>c.hp>Math.max(0,incoming(c.id))&&Math.abs(c.x-unit.x)<=drug.range&&effective(c)&&(!stage.source||run.sourceControlled||c.hp>c.maxHp*.2+.1));
  unit.moving=!target;
  if(target){
   unit.facing=target.x<unit.x?-1:1;
   if(unit.cooldown<=0){unit.cooldown+=drug.interval;unit.attack=.2;
    run.projectiles.push({id:++run.serial,from:unit.x,x:unit.x,targetId:target.id,damage:drug.damage*(1+run.potency*.22)*(unit.exposure?1.12:1),color:drug.color,drugId:drug.id,speed:680});
    emit(run,'shot',{x:unit.x,color:drug.color});
   }
  }else{unit.x=Math.max(FIELD.enemyBase+40,unit.x-drug.speed*dt);unit.facing=-1;unit.cooldown=Math.max(0,unit.cooldown);}
 }
 run.units=run.units.filter(u=>u.life>0);
 for(const projectile of run.projectiles){
  const target=run.enemies.find(e=>e.id===projectile.targetId)||run.cores.find(c=>c.id===projectile.targetId);
  if(!target||target.hp<=0){projectile.done=true;continue;}
  const delta=target.x-projectile.x;
  if(Math.abs(delta)<=projectile.speed*dt){hit(run,target,projectile.damage,projectile.color,!!stage.source&&!run.sourceControlled&&run.cores.includes(target));projectile.done=true;}
  else projectile.x+=Math.sign(delta)*projectile.speed*dt;
 }
 run.projectiles=run.projectiles.filter(p=>!p.done);run.enemies=run.enemies.filter(e=>e.hp>0);
 if(stage.source&&!run.sourceControlled)run.sourceHold+=dt;
 if(run.health<=0){run.status='lost';emit(run,'end',{text:'방어선 붕괴'});return true;}
 if(run.spawned===run.schedule.length&&!run.enemies.length&&run.cores.every(c=>c.hp<=0)&&run.sourceControlled){run.status='won';emit(run,'end',{text:'감염 제어 완료'});return true;}
 return false;
}
export function defenseResult(run){return {stars:run.status==='won'?1+(run.health>=60?1:0)+(run.microbiome<stageById(run.stageId).ecoTarget?1:0):0,seconds:Math.round(run.elapsed),health:Math.round(run.health),pressure:Math.round(run.pressure),microbiome:Math.round(run.microbiome),deployments:run.deployments};}
export function nextReinforcement(run){return run.schedule[run.spawned]||null;}
