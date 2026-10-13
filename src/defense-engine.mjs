import {MAPS,HOSTS,PADS,PATH,SCHEDULES,WAVE_COUNT} from './defense-data.mjs';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const lengths=PATH.slice(1).map((p,i)=>Math.hypot(p[0]-PATH[i][0],p[1]-PATH[i][1]));
export const PATH_LENGTH=lengths.reduce((a,b)=>a+b,0);
export function pathPosition(distance){let d=Math.max(0,distance);for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const t=d/lengths[i];return{x:PATH[i][0]+(PATH[i+1][0]-PATH[i][0])*t,y:PATH[i][1]+(PATH[i+1][1]-PATH[i][1])*t};}d-=lengths[i];}return{x:PATH.at(-1)[0],y:PATH.at(-1)[1]};}
function seeded(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
export function newDefenseRun(catalog,{mapId='lung',hostId='normal',seed=Math.floor(Math.random()*4294967295)}={}){
 return{mapId:MAPS.some(m=>m.id===mapId)?mapId:'lung',hostId:HOSTS.some(h=>h.id===hostId)?hostId:'normal',seed:seed>>>0,status:'prep',wave:0,health:100,credits:300,pressure:0,microbiome:0,lab:0,unlocked:catalog.drugs.filter(d=>!d.unlock).map(d=>d.id),towers:[],enemies:[],projectiles:[],effects:[],plan:null,elapsed:0,spawned:0,kills:0,totalKills:0,leaks:0,totalLeaks:0,sourceControlled:false,serial:0,fxSerial:0,combo:0,comboTimer:0,bestCombo:0,freeUnits:{},kits:0,draft:[],draftRerolled:false,notice:'약제를 고른 뒤 길 옆에 자유롭게 배치하세요.',lastReport:null,bestWave:0};
}
export function wavePlan(run,index=run.wave){
 if(index<0||index>=WAVE_COUNT)return null;
 const random=seeded(run.seed+Math.imul(index+1,7919)),ids=[...SCHEDULES[run.mapId][index]];
 if(run.mapId==='lung'&&index===11)ids[1]=random()<0.5?'visa':'lzdr';
 const reserve=index>=9?'kpc':index>=4?(run.mapId==='lung'?'mrsa':'esbl'):null,selected=Boolean(reserve&&run.pressure>=30);
 const count=14+index*3+(selected?2:0),source=run.mapId==='abdomen'?[3,7,11].includes(index):run.mapId==='urinary'?[3,7].includes(index):[7,10].includes(index);
 const boss=[3,7,11].includes(index),rush=index%3===2;
 const units=Array.from({length:count},(_,n)=>({pathogenId:selected&&n>=count-2?reserve:ids[Math.floor(random()*ids.length)],sourceBound:source&&n%3===0,elite:boss&&n===Math.floor(count*.65),scout:rush&&n%3===1}));
 ids.forEach((id,i)=>{units[i].pathogenId=id;});
 return{number:index+1,units,source,selected,boss,rush,pathogenIds:[...new Set(units.map(u=>u.pathogenId))],reward:65+(index+1)*5,interval:rush?.26:.4,title:boss?'고균량 개체 출현':rush?'빠른 집단 유입':ids.length>1?'복합 감염 방어':'방어선 구축'};
}
export function placementCheck(run,point,ignoreId=null){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<24||point.x>876||point.y<30||point.y>492)return{ok:false,reason:'지도 안에 배치하세요.'};
 for(let i=0;i<PATH.length-1;i++){const a=PATH[i],b=PATH[i+1],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((point.x-a[0])*dx+(point.y-a[1])*dy)/(dx*dx+dy*dy),0,1);if(Math.hypot(point.x-a[0]-dx*t,point.y-a[1]-dy*t)<42)return{ok:false,reason:'병원체가 지나는 길은 비워 두세요.'};}
 if(run.towers.some(t=>t.id!==ignoreId&&Math.hypot(t.x-point.x,t.y-point.y)<47))return{ok:false,reason:'다른 설비와 조금 더 거리를 두세요.'};
 return{ok:true,reason:'배치 가능'};
}
function emit(run,kind,data={}){run.effects.push({id:++run.fxSerial,kind,ttl:1,...data});if(run.effects.length>180)run.effects.splice(0,run.effects.length-180);}
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
export function upkeep(run,catalog){return run.towers.reduce((n,t)=>n+catalog.drugById[t.drugId].upkeep,0)+run.lab*4;}
function spend(run,cost){if(run.credits<cost){run.notice='자원 부족 · '+cost+' 필요';return false;}run.credits-=cost;return true;}
function editable(run){return !['won','lost'].includes(run.status);}
export function unlockDrug(run,catalog,id){const d=catalog.drugById[id];if(!editable(run)||!d||run.unlocked.includes(id))return false;if(drugBlocked(run,d)){run.notice=drugBlocked(run,d);return false;}if(!spend(run,d.unlock))return false;run.unlocked.push(id);run.notice=d.name+' 해금';return true;}
export function deployDrug(run,catalog,id,position){
 const drug=catalog.drugById[id],point=typeof position==='number'?PADS.find(p=>p.id===position):position;
 if(!editable(run)||!drug)return false;
 const check=placementCheck(run,point);if(!check.ok){run.notice=check.reason;return false;}
 if(!run.unlocked.includes(id)){run.notice='먼저 약제를 해금하세요.';return false;}
 if(drugBlocked(run,drug)){run.notice=drugBlocked(run,drug);return false;}
 const supplied=(run.freeUnits[id]||0)>0;if(supplied)run.freeUnits[id]--;else if(!spend(run,drug.cost))return false;
 const tower={id:++run.serial,padId:typeof position==='number'?position:null,x:point.x,y:point.y,drugId:id,potency:0,exposure:0,renalAdjusted:run.hostId!=='renal'||!drug.renal,cooldown:0,spent:supplied?0:drug.cost,shots:0,kills:0,damage:0,target:'first',angle:-Math.PI/2,recoil:0};
 run.towers.push(tower);emit(run,'build',{x:tower.x,y:tower.y,color:drug.color});run.notice=drug.name+' 배치'+(!tower.renalAdjusted?' · 신기능 조정 필요':' · 클릭해서 강화 / 드래그해서 이동');return true;
}
export function moveTower(run,id,point){const t=run.towers.find(t=>t.id===id);if(!editable(run)||!t)return false;const check=placementCheck(run,point,id);if(!check.ok){run.notice=check.reason;return false;}const cost=run.status==='running'?12:0;if(!spend(run,cost))return false;Object.assign(t,{x:point.x,y:point.y,padId:null,cooldown:Math.max(.5,t.cooldown)});emit(run,'build',{x:t.x,y:t.y,color:'#8ef5d2'});run.notice='설비 이동'+(cost?' · 자원 −12':' · 준비 / 일시정지 중 무료');return true;}
export function upgradeCost(tower,kind){return kind==='potency'?35+tower.potency*35:kind==='exposure'?45:kind==='renal'?20:Infinity;}
export function upgradeTower(run,catalog,id,kind){
 const t=run.towers.find(t=>t.id===id);if(!editable(run)||!t||!['potency','exposure','renal'].includes(kind))return false;
 if(kind==='potency'&&t.potency>=2||kind==='exposure'&&t.exposure>=1||kind==='renal'&&(t.renalAdjusted||run.hostId!=='renal'))return false;
 if(kind==='exposure'&&run.hostId==='renal'&&!t.renalAdjusted){run.notice='먼저 신기능 맞춤 투여를 적용하세요.';return false;}
 const cost=upgradeCost(t,kind);if(run.kits>0&&kind!=='renal')run.kits--;else if(!spend(run,cost))return false;
 t.spent+=cost;if(kind==='potency')t.potency++;if(kind==='exposure')t.exposure=1;if(kind==='renal')t.renalAdjusted=true;
 emit(run,'upgrade',{x:t.x,y:t.y,color:catalog.drugById[t.drugId].color});run.notice=kind==='exposure'?'증가 노출 적용 · I 대응 가능':kind==='renal'?'신기능 맞춤 투여 완료':'투여 효율 '+t.potency+'단계 · 기존 coverage 유지';return true;
}
export function mergeCandidate(run,id){const t=run.towers.find(t=>t.id===id);if(!t||t.potency>=3)return null;return run.towers.filter(o=>o.id!==id&&o.drugId===t.drugId&&o.potency===t.potency).sort((a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y))[0]||null;}
export function mergeTowers(run,catalog,id){
 const t=run.towers.find(t=>t.id===id),other=mergeCandidate(run,id);if(!editable(run)||!other)return false;
 emit(run,'merge',{x:other.x,y:other.y,toX:t.x,toY:t.y,color:catalog.drugById[t.drugId].color});
 t.potency++;t.exposure=Math.max(t.exposure,other.exposure);t.renalAdjusted=t.renalAdjusted&&other.renalAdjusted;t.spent+=other.spent;t.shots+=other.shots;t.kills+=other.kills;t.damage+=other.damage;
 run.towers.splice(run.towers.indexOf(other),1);emit(run,'upgrade',{x:t.x,y:t.y,color:catalog.drugById[t.drugId].color});run.notice='동일 약제 설비 통합 · 효율 '+t.potency+'단계. 약제·감수성은 그대로.';return true;
}
export function setTarget(run,id,target){const t=run.towers.find(t=>t.id===id);if(!editable(run)||!t||!['first','strong','near'].includes(target))return false;t.target=target;return true;}
export function sellTower(run,id){const i=run.towers.findIndex(t=>t.id===id);if(!editable(run)||i<0)return false;const refund=Math.floor(run.towers[i].spent*.7);run.towers.splice(i,1);run.credits+=refund;run.notice='설비 철수 · +'+refund;return true;}
export function improveLab(run){if(!editable(run)||run.lab>=2)return false;if(!spend(run,run.lab===0?45:65))return false;run.lab++;run.notice=run.lab===1?'배양실 가동 · 다음 집단 사전 확인':'AST 가동 · 감수성과 다음다음 집단까지 공개';return true;}
export function controlSource(run){if(!['running','paused'].includes(run.status)||!run.plan?.source||run.sourceControlled)return false;if(!spend(run,70))return false;run.sourceControlled=true;for(const e of run.enemies.filter(e=>e.sourceBound))emit(run,'source',{x:e.x,y:e.y,color:'#69eddb'});run.notice=MAPS.find(m=>m.id===run.mapId).sourceAction+' 완료 · 감염원 보호 해제';return true;}
export function supplyChoices(run,catalog,salt=0){
 const random=seeded(run.seed+Math.imul(run.wave+1,8191)+salt),plan=wavePlan(run);
 const candidates=catalog.drugs.filter(d=>!drugBlocked(run,d)&&plan?.pathogenIds.some(id=>getCoverage(catalog,d.id,id,{mapId:run.mapId,wave:plan.number,source:plan.source,exposure:1}).factor>0));
 const locked=candidates.filter(d=>!run.unlocked.includes(d.id)),pool=locked.length&&random()<.75?locked:candidates;
 const drug=pool[Math.floor(random()*pool.length)]||catalog.drugs.find(d=>!drugBlocked(run,d));
 return[{id:'unit',kind:'unit',drugId:drug.id,title:drug.short+' 보급',detail:drug.name+' · 해금 + 무료 배치 1기'},{id:'funds',kind:'funds',amount:70+run.wave*3,title:'추가 예산',detail:'자원 +'+(70+run.wave*3)+' · 지금 필요한 곳에 투자'},{id:'kit',kind:'kit',title:'투여 장비',detail:'효율 또는 노출 강화 1회 무료'}];
}
export function chooseSupply(run,catalog,id){if(run.status!=='prep'||!run.draft.length)return false;const card=run.draft.find(c=>c.id===id);if(!card)return false;if(card.kind==='unit'){if(!run.unlocked.includes(card.drugId))run.unlocked.push(card.drugId);run.freeUnits[card.drugId]=(run.freeUnits[card.drugId]||0)+1;}if(card.kind==='funds')run.credits+=card.amount;if(card.kind==='kit')run.kits++;run.draft=[];run.notice=card.title+' 획득 · 다음 wave를 준비하세요.';return true;}
export function rerollSupply(run,catalog){if(run.status!=='prep'||!run.draft.length||run.draftRerolled||!spend(run,15))return false;run.draft=supplyChoices(run,catalog,104729);run.draftRerolled=true;run.notice='보급 후보 갱신';return true;}
export function beginWave(run,catalog){
 if(run.status!=='prep'||run.wave>=WAVE_COUNT)return false;if(run.draft.length){run.notice='먼저 보급 1개를 선택하세요.';return false;}
 if(!spend(run,upkeep(run,catalog)))return false;
 run.plan=wavePlan(run);run.wave++;run.status='running';run.elapsed=0;run.spawned=0;run.kills=0;run.leaks=0;run.combo=0;run.comboTimer=0;run.sourceControlled=false;run.enemies=[];run.projectiles=[];
 emit(run,'wave',{text:'WAVE '+String(run.wave).padStart(2,'0'),boss:run.plan.boss});run.notice=run.plan.source?MAPS.find(m=>m.id===run.mapId).sourceAction+' 필요 · 감염원 보호 개체 출현':run.plan.title;return true;
}
export function pauseRun(run){if(run.status==='running'){run.status='paused';run.notice='일시정지 · 배치와 설비를 조정하세요.';return true;}return false;}
export function resumeRun(run){if(run.status==='paused'){run.status='running';run.notice='방어 재개';return true;}return false;}
export function defenseScore(run){return Math.max(0,run.bestWave*250+run.totalKills*8+Math.round(run.health*5)+run.bestCombo*10-Math.round(run.microbiome*2+run.pressure));}
export function tickDefense(run,catalog,dt){
 if(run.status!=='running'||!Number.isFinite(dt)||dt<=0)return false;
 dt=Math.min(dt,.1);run.elapsed+=dt;run.comboTimer=Math.max(0,run.comboTimer-dt);if(!run.comboTimer)run.combo=0;
 run.effects=run.effects.filter(e=>(e.ttl-=dt)>0);
 while(run.spawned<run.plan.units.length&&run.elapsed>=.3+run.spawned*run.plan.interval){
  const unit=run.plan.units[run.spawned++],p=catalog.pathogenById[unit.pathogenId],maxHp=p.hp*(1+(run.wave-1)*.09)*(unit.elite?4.6:unit.scout?.65:1);
  run.enemies.push({...unit,id:++run.serial,hp:maxHp,maxHp,distance:0,x:PATH[0][0],y:PATH[0][1],speed:p.speed*(unit.elite?.66:unit.scout?1.35:1),flash:0});
 }
 const immune=HOSTS.find(h=>h.id===run.hostId).immune;
 for(const e of run.enemies){e.distance+=e.speed*dt;Object.assign(e,pathPosition(e.distance));e.flash=Math.max(0,e.flash-dt);const floor=e.sourceBound&&!run.sourceControlled?e.maxHp*.22:0;e.hp=Math.max(floor,e.hp-immune*dt);}
 for(const t of run.towers){
  t.cooldown=Math.max(0,t.cooldown-dt);t.recoil=Math.max(0,t.recoil-dt*5);if(t.cooldown>0)continue;
  const d=catalog.drugById[t.drugId],targets=run.enemies.filter(e=>e.hp>0&&e.distance<PATH_LENGTH&&Math.hypot(e.x-t.x,e.y-t.y)<=d.range&&towerCoverage(run,catalog,t,e.pathogenId).factor>0);
  targets.sort(t.target==='strong'?(a,b)=>b.hp-a.hp:t.target==='near'?(a,b)=>Math.hypot(a.x-t.x,a.y-t.y)-Math.hypot(b.x-t.x,b.y-t.y):(a,b)=>b.distance-a.distance);
  const target=targets[0];if(!target)continue;
  t.angle=Math.atan2(target.y-t.y,target.x-t.x);t.recoil=1;t.shots++;t.cooldown=d.interval/(1+t.potency*.18+(t.exposure?.12:0));
  run.projectiles.push({id:++run.serial,towerId:t.id,drugId:d.id,targetId:target.id,x:t.x+Math.cos(t.angle)*18,y:t.y+Math.sin(t.angle)*18,damage:d.damage*([1,1.65,2.3,4.6][t.potency]||1),speed:d.shape==='beam'?1100:660,color:d.color,shape:d.shape,life:2});
  emit(run,'shot',{x:t.x,y:t.y,color:d.color});run.pressure=clamp(run.pressure+d.upkeep*.012,0,100);run.microbiome=clamp(run.microbiome+d.upkeep*.009,0,100);
 }
 run.projectiles=run.projectiles.filter(p=>{
  p.life-=dt;const e=run.enemies.find(e=>e.id===p.targetId&&e.hp>0);if(!e||p.life<=0)return false;
  const distance=Math.hypot(e.x-p.x,e.y-p.y),step=p.speed*dt;
  if(distance>step+7){p.x+=(e.x-p.x)/distance*step;p.y+=(e.y-p.y)/distance*step;return true;}
  const t=run.towers.find(t=>t.id===p.towerId);if(!t||towerCoverage(run,catalog,t,e.pathogenId).factor<=0)return false;
  const floor=e.sourceBound&&!run.sourceControlled?e.maxHp*.22:0,damage=Math.min(p.damage,Math.max(0,e.hp-floor));e.hp-=damage;e.flash=.12;t.damage+=damage;if(e.hp<=0)t.kills++;
  emit(run,damage?'hit':'shield',{x:e.x,y:e.y,color:p.color,text:damage?String(Math.ceil(damage)):'배액',big:e.elite});return false;
 });
 run.enemies=run.enemies.filter(e=>{
  if(e.hp<=0){run.kills++;run.totalKills++;run.combo++;run.comboTimer=2.5;run.bestCombo=Math.max(run.bestCombo,run.combo);const bounty=e.elite?30:4,bonus=run.combo%5===0?Math.min(8,run.combo/5):0;run.credits+=bounty+bonus;emit(run,'kill',{x:e.x,y:e.y,color:catalog.pathogenById[e.pathogenId].color,big:e.elite,text:'+'+(bounty+bonus)});return false;}
  if(e.distance>=PATH_LENGTH){run.leaks++;run.totalLeaks++;run.combo=0;run.health=Math.max(0,run.health-(e.elite?18:e.sourceBound&&!run.sourceControlled?9:5));emit(run,'leak',{x:862,y:465,color:'#ff6e80'});return false;}return true;
 });
 if(run.health<=0){run.status='lost';run.notice='방어 종료 · 감수성과 감염원 대응을 바꿔 다시 도전하세요.';return true;}
 if(run.spawned===run.plan.units.length&&!run.enemies.length){
  const perfect=run.leaks===0?25:0,reward=Math.max(30,run.plan.reward-Math.floor(run.microbiome*.35))+perfect;run.credits+=reward;run.bestWave=run.wave;run.lastReport={wave:run.wave,kills:run.kills,leaks:run.leaks,reward,perfect,sourceMissed:run.plan.source&&!run.sourceControlled};
  run.pressure=Math.max(0,run.pressure-3);run.microbiome=Math.max(0,run.microbiome-4);run.status=run.wave===WAVE_COUNT?'won':'prep';run.projectiles=[];run.draft=run.status==='prep'?supplyChoices(run,catalog):[];run.draftRerolled=false;run.notice=run.status==='won'?'12 WAVE 방어 성공!':'WAVE CLEAR · 보급 +'+reward+(perfect?' · 무손실 +25 포함':'');emit(run,'clear',{text:perfect?'PERFECT DEFENSE':'WAVE CLEAR'});return true;
 }
 return false;
}
