import {MAPS,HOSTS,PADS,PATH,SCHEDULES,WAVE_COUNT} from './defense-data.mjs';
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const lengths=PATH.slice(1).map((point,index)=>Math.hypot(point[0]-PATH[index][0],point[1]-PATH[index][1]));
export const PATH_LENGTH=lengths.reduce((a,b)=>a+b,0);
export function pathPosition(distance) {
 let remaining=Math.max(0,distance);
 for(let i=0;i<lengths.length;i++){
  if(remaining<=lengths[i]){const t=remaining/lengths[i];return {x:PATH[i][0]+(PATH[i+1][0]-PATH[i][0])*t,y:PATH[i][1]+(PATH[i+1][1]-PATH[i][1])*t};}
  remaining-=lengths[i];
 }
 return {x:PATH.at(-1)[0],y:PATH.at(-1)[1]};
}
function seeded(seed){let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
export function newDefenseRun(catalog,{mapId='lung',hostId='normal',seed=Math.floor(Math.random()*4294967295)}={}) {
 return {mapId:MAPS.some(m=>m.id===mapId)?mapId:'lung',hostId:HOSTS.some(h=>h.id===hostId)?hostId:'normal',seed:seed>>>0,status:'prep',wave:0,health:100,credits:225,pressure:0,microbiome:0,lab:0,unlocked:catalog.drugs.filter(d=>!d.unlock).map(d=>d.id),towers:[],enemies:[],effects:[],plan:null,elapsed:0,spawned:0,kills:0,totalKills:0,leaks:0,totalLeaks:0,sourceControlled:false,serial:0,notice:'약제를 고르고 빈 배치 지점을 누르세요.',lastReport:null,bestWave:0};
}
export function wavePlan(run,index=run.wave) {
 if(index<0||index>=WAVE_COUNT)return null;
 const random=seeded(run.seed+Math.imul(index+1,7919));
 const ids=[...SCHEDULES[run.mapId][index]];
 if(run.mapId==='lung'&&index===11){ids[1]=random()<0.5?'visa':'lzdr';}
 const reserve=index>=9?'kpc':index>=4?(run.mapId==='lung'?'mrsa':'esbl'):null;
 const selected=reserve&&run.pressure>=30;
 const count=8+index+(selected?2:0);
 const source=run.mapId==='abdomen'?[3,7,11].includes(index):run.mapId==='urinary'?[3,7].includes(index):[7,10].includes(index);
 const units=Array.from({length:count},(_,n)=>({pathogenId:selected&&n>=count-2?reserve:ids[Math.floor(random()*ids.length)],sourceBound:source&&n%3===0}));
 // Every scheduled profile appears at least once, preventing random omission of the learning objective.
 ids.forEach((id,i)=>{units[i].pathogenId=id;});
 return {number:index+1,units,source,selected:Boolean(selected),pathogenIds:[...new Set(units.map(u=>u.pathogenId))],reward:80+(index+1)*5};
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
export function towerCoverage(run,catalog,tower,pathogenId) {
 const drug=catalog.drugById[tower.drugId];
 const result=getCoverage(catalog,tower.drugId,pathogenId,{mapId:run.mapId,wave:Math.max(1,run.wave+(run.status==='prep'?1:0)),source:(run.status==='prep'?wavePlan(run)?.source:run.plan?.source)||false,exposure:tower.exposure});
 const blocked=drugBlocked(run,drug);
 if(blocked)return {...result,factor:0,reason:blocked};
 if(run.hostId==='renal'&&drug.renal&&!tower.renalAdjusted)return {...result,factor:0,reason:'신기능 맞춤 투여가 필요합니다. 투여 보류.'};
 return result;
}
export function upkeep(run,catalog) {return run.towers.reduce((sum,t)=>sum+catalog.drugById[t.drugId].upkeep,0)+run.lab*4;}
function spend(run,cost) {if(run.credits<cost){run.notice='자원이 부족합니다. 필요한 자원: '+cost;return false;}run.credits-=cost;return true;}
function editable(run){return !['won','lost'].includes(run.status);}
export function unlockDrug(run,catalog,id) {
 const drug=catalog.drugById[id];
 if(!editable(run)||!drug||run.unlocked.includes(id))return false;
 if(drugBlocked(run,drug)){run.notice=drugBlocked(run,drug);return false;}
 if(!spend(run,drug.unlock))return false;
 run.unlocked.push(id);run.notice=drug.name+' 해금. Coverage는 기존 자료의 조건을 따릅니다.';return true;
}
export function deployDrug(run,catalog,id,padId) {
 const drug=catalog.drugById[id];
 if(!editable(run)||!drug||!PADS.some(p=>p.id===padId)||run.towers.some(t=>t.padId===padId))return false;
 if(!run.unlocked.includes(id)){run.notice='먼저 약제를 해금하세요.';return false;}
 if(drugBlocked(run,drug)){run.notice=drugBlocked(run,drug);return false;}
 if(!spend(run,drug.cost))return false;
 run.towers.push({id:++run.serial,padId,drugId:id,potency:0,exposure:0,renalAdjusted:run.hostId!=='renal'||!drug.renal,cooldown:0,spent:drug.cost,shots:0});
 run.notice=drug.name+' 배치'+(run.hostId==='renal'&&drug.renal?' · 신기능 맞춤 투여를 적용하세요.':'.');return true;
}
export function upgradeCost(tower,kind){return kind==='potency'?35+tower.potency*25:kind==='exposure'?45:kind==='renal'?20:Infinity;}
export function upgradeTower(run,catalog,id,kind) {
 const tower=run.towers.find(t=>t.id===id);if(!editable(run)||!tower)return false;
 if(kind==='potency'&&tower.potency>=2||kind==='exposure'&&tower.exposure>=1||kind==='renal'&&(tower.renalAdjusted||run.hostId!=='renal'))return false;
 if(!['potency','exposure','renal'].includes(kind))return false;
 if(kind==='exposure'&&run.hostId==='renal'&&!tower.renalAdjusted){run.notice='먼저 신기능 맞춤 투여를 적용하세요.';return false;}
 const cost=upgradeCost(tower,kind);if(!spend(run,cost))return false;
 tower.spent+=cost;
 if(kind==='potency')tower.potency++;
 if(kind==='exposure')tower.exposure=1;
 if(kind==='renal')tower.renalAdjusted=true;
 run.notice=kind==='exposure'?catalog.drugById[tower.drugId].optimize+' 적용. I 대응 가능; R은 그대로입니다.':kind==='renal'?'신기능 맞춤 투여 적용. 목표 노출을 유지합니다.':'투여 효율 개선. 기존 coverage 안에서만 강화됩니다.';return true;
}
export function sellTower(run,id) {
 const index=run.towers.findIndex(t=>t.id===id);if(!editable(run)||index<0)return false;
 const refund=Math.floor(run.towers[index].spent*0.7);run.towers.splice(index,1);run.credits+=refund;run.notice='약제 철수 · '+refund+' 자원 회수.';return true;
}
export function improveLab(run) {
 if(!editable(run)||run.lab>=2)return false;
 const cost=run.lab===0?45:65;if(!spend(run,cost))return false;
 run.lab++;run.notice=run.lab===1?'배양실 가동. 다음 wave의 병원체를 준비 단계에서 확인합니다.':'AST 가동. 다음 wave 감수성과 한 wave 앞의 균 정보를 미리 확인합니다.';return true;
}
export function controlSource(run) {
 if(run.status!=='running'&&run.status!=='paused'||!run.plan?.source||run.sourceControlled)return false;
 if(!spend(run,70))return false;
 run.sourceControlled=true;run.notice=MAPS.find(m=>m.id===run.mapId).sourceAction+' 완료. 감염원 보호가 해제됩니다.';return true;
}
export function beginWave(run,catalog) {
 if(run.status!=='prep'||run.wave>=WAVE_COUNT)return false;
 const cost=upkeep(run,catalog);if(!spend(run,cost))return false;
 run.plan=wavePlan(run);run.wave++;run.status='running';run.elapsed=0;run.spawned=0;run.kills=0;run.leaks=0;run.sourceControlled=false;run.enemies=[];run.effects=[];
 run.notice=run.plan.source?'감염원 보호가 있는 wave. '+MAPS.find(m=>m.id===run.mapId).sourceAction+'을 준비하세요.':'Wave '+run.wave+' 시작 · 원본 AST에 맞는 약제만 공격합니다.';return true;
}
export function pauseRun(run){if(run.status==='running'){run.status='paused';run.notice='일시정지 · 배치와 전략을 조정할 수 있습니다.';return true;}return false;}
export function resumeRun(run){if(run.status==='paused'){run.status='running';run.notice='방어를 재개합니다.';return true;}return false;}
export function defenseScore(run){return Math.max(0,run.bestWave*250+run.totalKills*8+Math.round(run.health*5)-Math.round(run.microbiome*2+run.pressure));}
export function tickDefense(run,catalog,dt) {
 if(run.status!=='running'||!Number.isFinite(dt)||dt<=0)return false;
 dt=Math.min(dt,0.1);run.elapsed+=dt;
 while(run.spawned<run.plan.units.length&&run.elapsed>=0.5+run.spawned*1.05){
  const unit=run.plan.units[run.spawned++],profile=catalog.pathogenById[unit.pathogenId];
  const maxHp=profile.hp*(1+(run.wave-1)*0.07);
  run.enemies.push({...unit,id:++run.serial,hp:maxHp,maxHp,distance:0,x:PATH[0][0],y:PATH[0][1],speed:profile.speed*(1+(run.wave-1)*0.012)});
 }
 const immune=HOSTS.find(h=>h.id===run.hostId).immune;
 for(const enemy of run.enemies){
  enemy.distance+=enemy.speed*dt;Object.assign(enemy,pathPosition(enemy.distance));
  const floor=enemy.sourceBound&&!run.sourceControlled?enemy.maxHp*0.22:0;
  enemy.hp=Math.max(floor,enemy.hp-immune*dt);
 }
 for(const tower of run.towers){
  tower.cooldown=Math.max(0,tower.cooldown-dt);if(tower.cooldown>0)continue;
  const drug=catalog.drugById[tower.drugId],pad=PADS[tower.padId];
  const target=run.enemies.filter(e=>e.hp>0&&e.distance<PATH_LENGTH&&Math.hypot(e.x-pad.x,e.y-pad.y)<=drug.range&&towerCoverage(run,catalog,tower,e.pathogenId).factor>0).sort((a,b)=>b.distance-a.distance)[0];
  if(!target)continue;
  const factor=towerCoverage(run,catalog,tower,target.pathogenId).factor;
  const floor=target.sourceBound&&!run.sourceControlled?target.maxHp*0.22:0;
  target.hp=Math.max(floor,target.hp-drug.damage*(1+tower.potency*0.3)*factor);
  tower.cooldown=drug.interval/(1+tower.potency*0.12+(tower.exposure?0.12:0));tower.shots++;
  run.effects.push({x:pad.x,y:pad.y,toX:target.x,toY:target.y,color:drug.color,ttl:0.19});
  run.pressure=clamp(run.pressure+drug.upkeep*0.012,0,100);
  run.microbiome=clamp(run.microbiome+drug.upkeep*0.009,0,100);
 }
 run.effects=run.effects.map(e=>({...e,ttl:e.ttl-dt})).filter(e=>e.ttl>0);
 run.enemies=run.enemies.filter(enemy=>{
  if(enemy.hp<=0){run.kills++;run.totalKills++;run.credits+=4;return false;}
  if(enemy.distance>=PATH_LENGTH){run.leaks++;run.totalLeaks++;run.health=Math.max(0,run.health-(enemy.sourceBound&&!run.sourceControlled?10:7));return false;}
  return true;
 });
 if(run.health<=0){run.status='lost';run.notice='방어선이 무너졌습니다. 감수성·노출·감염원을 다시 확인하세요.';return true;}
 if(run.spawned===run.plan.units.length&&!run.enemies.length){
  const reward=Math.max(30,run.plan.reward-Math.floor(run.microbiome*0.35));run.credits+=reward;
  run.bestWave=run.wave;run.lastReport={wave:run.wave,kills:run.kills,leaks:run.leaks,reward,sourceMissed:run.plan.source&&!run.sourceControlled};
  run.pressure=Math.max(0,run.pressure-3);run.microbiome=Math.max(0,run.microbiome-4);
  run.status=run.wave===WAVE_COUNT?'won':'prep';run.notice=run.status==='won'?'12개 wave 방어 완료. 상황에 맞는 약제 운용으로 방어선을 지켰습니다.':'Wave '+run.wave+' 완료 · 보급 +'+reward+' · 돌파 '+run.leaks;
  return true;
 }
 return false;
}