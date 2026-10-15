import {floorAt,ceilingAt,eyeAt,enemyHeight,canTraverse,clearHeightRay,STEP_HEIGHT} from './play-world.mjs';
export {floorAt,enemyHeight,canTraverse} from './play-world.mjs';
import { createMap, STAGES, THEME_STAGES, COMPANIONS, stageFor, REWARDS, AUGMENTS, SURVIVAL_CASES, createSurvivalMap, roomAt, normalizeSeed, seededRandom } from './play-data.mjs';

export const MAX_ENEMIES=24,MAX_SURVIVAL_ENEMIES=40,MAX_ORBS=64,MAX_GRENADES=4,MAX_FIELDS=6,MAX_PARTICLES=80,MAX_PROJECTILES=24,MAX_HAZARDS=12,BASE_AMMO=200;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const angleDelta=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const viewFov=run=>(run.scoped?.34:.72)*Math.max(1,Math.min(1.4,(run.viewAspect||16/9)/(16/9)));
export {seededRandom} from './play-data.mjs';
export function tileAt(map,x,y){const ix=Math.floor(x),iy=Math.floor(y);return ix<0||iy<0||ix>=map.width||iy>=map.height?1:map.cells[iy*map.width+ix];}
export function canStand(map,x,y,r=.22){return !tileAt(map,x-r,y-r)&&!tileAt(map,x+r,y-r)&&!tileAt(map,x-r,y+r)&&!tileAt(map,x+r,y+r);}
export function moveBody(map,body,dx,dy,r=.22){
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.12));
 const step=(x,y)=>{const old=floorAt(map,body.x,body.y),foot=old+(body.z||0);
  if(!canStand(map,x,y,r)||[[x-r,y-r],[x+r,y-r],[x-r,y+r],[x+r,y+r]].some(([xx,yy])=>floorAt(map,xx,yy)-foot>STEP_HEIGHT))return;
  body.x=x;body.y=y;const next=floorAt(map,x,y);
  if(body.z!==undefined&&old-next>STEP_HEIGHT)body.z+=old-next;
 };
 for(let i=0;i<steps;i++){step(body.x+dx/steps,body.y);step(body.x,body.y+dy/steps);}
}
export function castRay(map,x,y,dx,dy,max=40){
  let mx=Math.floor(x),my=Math.floor(y),side=0,dist=0;
  const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9)),sx=dx<0?-1:1,sy=dy<0?-1:1;
  let tx=(dx<0?x-mx:mx+1-x)*ddx,ty=(dy<0?y-my:my+1-y)*ddy;
  for(let i=0;i<120;i++){if(tx<ty){dist=tx;tx+=ddx;mx+=sx;side=0;}else{dist=ty;ty+=ddy;my+=sy;side=1;}const tile=tileAt(map,mx,my);if(tile||dist>=max){const hit=side?x+dist*dx:y+dist*dy;return {distance:Math.min(max,dist),side,tile,u:hit-Math.floor(hit),x:mx,y:my};}}
  return {distance:max,side:0,tile:0,u:0};
}
export function lineOfSight(map,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);return d<.01||(castRay(map,a.x,a.y,dx/d,dy/d,d+.1).distance>=d-.08&&clearHeightRay(map,a,b));}
export function coverage(catalog,weaponId,enemyId,{site='community',exposure=false,host='normal',scenarios=[]}={}){
  const weapon=catalog.weaponById[weaponId],profile=catalog.enemyById[enemyId],entry=profile?.ast[weaponId];
  if(!weapon||!entry)return {factor:0,category:'?',reason:'확인된 coverage 없음'};
  if(host==='allergy'&&weaponId==='ampicillin')return {factor:0,category:entry.category,reason:'숙주 제한 · Aminopenicillin allergy'};
  if(entry.category==='R'||entry.category==='INACTIVE')return {factor:0,category:entry.category,reason:'RESISTANT · 약제를 바꾸세요'};
  if(entry.applicability==='infections-originating-from-urinary-tract'&&site!=='urinary')return {factor:0,category:entry.category,reason:'요로 기원 감염에만 적용되는 결과'};
  if(entry.category==='I')return {factor:weapon.exposure||exposure?1:0,category:'I',reason:weapon.exposure||exposure?'I · 증가 노출 충족':'I · 노출 최적화 필요'};
  if(entry.category==='S')return {factor:1,category:'S',reason:'S · 감수성'};
  if(entry.category==='ACTIVE')return {factor:.75,category:'ACTIVE',reason:'문헌상 활성 · S/I 판정 아님'};
  if(entry.category==='REGIMEN'&&(profile.regimenScenarios?profile.regimenScenarios.some(s=>scenarios.includes(s)):profile.regimenSites?.includes(site)))return {factor:1,category:'REGIMEN',reason:(profile.scenarioLabel||'해당 감염부위')+' 요법 · S/I 판정 아님'};
  return {factor:0,category:entry.category,reason:entry.category==='OUTSIDE_REGIMEN'?'해당 요법 외 · R과 구분':'감염부위·투여 조건 미충족'};
}
export const maxAmmo=run=>BASE_AMMO+(run.upgrades.reserve||0)*60;
export const shotCost=(run,w)=>w.cost*Math.pow(.8,run.upgrades.efficiency||0);
export const magazineCapacity=(run,index)=>run.catalog.weapons[index].magazine*run.catalog.weapons[index].cost;
export const magazineSize=(run,index)=>Math.floor((magazineCapacity(run,index)+.0001)/shotCost(run,run.catalog.weapons[index]));
export const ammoCount=(run,index)=>Math.floor((run.magazines[index]+.0001)/shotCost(run,run.catalog.weapons[index]));
export const reserveCount=(run,index)=>Math.floor((run.energy[index]+.0001)/shotCost(run,run.catalog.weapons[index]));
export function reload(run){
  const i=run.weapon,w=run.catalog.weapons[i],needed=magazineCapacity(run,i)-run.magazines[i];
  if(run.status!=='running'||run.scannerActive||run.reloadTime>0||!isWeaponReady(run,i)||needed<.01)return false;
  if(run.energy[i]+run.magazines[i]<shotCost(run,w)){announce(run,'예비 탄약 보급 중 · Q / 휠로 전환',1);return false;}
  if(run.energy[i]<=0)return false;
  cancelVolley(run);run.chargeTime=0;run.reloadDuration=w.reload*.8*Math.pow(.86,run.upgrades.fastReload||0);run.reloadTime=run.reloadDuration;run.reloadLatch=false;run.reloadWeapon=i;run.lastShot=0;run.events.push('reload');return true;
}
export function equipWeapon(run,slot,index){
  if(run.status!=='paused'||slot<0||slot>=9||!run.unlocked[index]||!run.catalog.weapons[index])return false;
  const other=run.slots.indexOf(index),old=run.slots[slot];run.slots[slot]=index;if(other>=0)run.slots[other]=old;
  if(!run.slots.includes(run.weapon))run.weapon=index;run.reloadTime=0;run.hintTime=0;return true;
}
export function scanHints(run){
  if(run.hard||!run.hints)return [];
  const e=targetEnemy(run,.12,18);if(!e?.scanned||e.state==='Dormant')return [];
  return run.slots.filter(i=>isWeaponReady(run,i)&&combatCoverage(run,run.catalog.weapons[i],e.kind).factor>0);
}
export const isWeaponReady=(run,index)=>Boolean(run.unlocked[index])&&run.slots.includes(index)&&!(run.host==='allergy'&&run.catalog.weapons[index]?.id==='ampicillin');
export const combatCoverage=(run,w,kind)=>coverage(run.catalog,w.id,kind,{site:run.map.site,host:run.host,scenarios:run.map.scenarios,...(run.mission==='survival'?SURVIVAL_CASES[kind]:{}),exposure:Boolean(run.upgrades.exposure||(w.beta&&run.upgrades.infusion))});
export function newRun(catalog,{hard=false,hints=false,information=null,aimAssist=false,seed=Date.now(),host='normal',stage=0,mission='campaign',mapMode='explore',themeId='virology',companion='none'}={}){
  information=['guided','open','identify','blind'].includes(information)?information:hard?'blind':hints?'guided':'open';hard=['identify','blind'].includes(information);hints=information==='guided';seed=normalizeSeed(seed);const themeStage=mission==='theme'?(THEME_STAGES.find(s=>s.id===themeId)||THEME_STAGES[0]):null;
  const index=mission==='survival'||themeStage?0:clamp(Math.floor(Number(stage)||0),0,STAGES.length-1),map=mission==='survival'?createSurvivalMap(seed):createMap(themeStage?.mapStyle??index,seed,themeStage);
  const ally=COMPANIONS.find(c=>c.id===(companion==='auto'?(themeStage?.companion||'neutrophil'):companion));
  const run={catalog,map,information,aimAssist,chargeTime:0,volley:null,shotSerial:0,tracers:[],hitKind:'effective',huntPulse:0,huntTimer:0,guide:null,showMap:false,pressureAdded:0,pressureReplacements:0,pressureElites:0,pressureNotice:0,roomNotice:0,meleeGrace:0,bossKills:0,miniKills:0,stageBossKills:0,stageMiniKills:0,director:{phase:'build',restUntil:0,nextBoss:120,bossNumber:0},clearedRooms:new Set(),themeId:themeStage?.id||null,companion:ally?.id||'none',companions:ally?[ally.id]:[],pet:{...map.spawn,cooldown:.7,flash:0,target:null,shots:0},mapMode:mapMode==='full'?'full':'explore',discovered:new Uint8Array(map.cells.length),discoveryTime:0,scannerActive:false,scoped:false,scanFocus:0,scanTarget:null,exitOpen:false,bossDefeated:!STAGES[index].boss,random:seededRandom(seed),seed,hard,hints:hints&&!hard,host,status:'ready',mission,startStage:index,time:0,wave:index,spawned:0,spawnTimer:0,
    player:{...map.spawn,hp:100,z:0,vz:0,pitch:0},weapon:host==='allergy'?1:0,previousWeapon:1,slots:Array.from({length:9},(_,i)=>index>=5&&i===0?9:index>=6&&i===1?10:i),magazines:catalog.weapons.map(w=>w.magazine*w.cost),reloadTime:0,reloadDuration:1,reloadWeapon:null,jumpHeld:false,land:0,energy:catalog.weapons.map(()=>BASE_AMMO),unlocked:catalog.weapons.map(w=>w.stage<=index),cooldown:0,cooldowns:catalog.weapons.map(()=>0),switchTime:0,pressure:0,
    kills:0,stageKills:0,shots:0,effective:0,combo:0,comboTime:0,bestCombo:0,score:0,dash:0,dashCooldown:0,scannerCooldown:0,sourceCooldown:0,completedStages:0,
    intel:Object.fromEntries(catalog.enemies.map(e=>[e.id,information==='blind'?0:information==='identify'?2:3])),seen:new Set(),visited:new Set([0]),upgrades:{},rewards:[],immuneTime:host==='neutropenia'?24:10,
    enemies:Array.from({length:mission==='survival'?MAX_SURVIVAL_ENEMIES:MAX_ENEMIES},(_,id)=>({id,active:false})),particles:Array.from({length:MAX_PARTICLES},()=>({life:0})),projectiles:Array.from({length:MAX_PROJECTILES},()=>({active:false})),hazards:Array.from({length:MAX_HAZARDS},(_,id)=>({id,active:false})),
    flow:new Int16Array(map.cells.length).fill(-1),queue:new Int16Array(map.cells.length),navCache:new Map(),flowTime:0,
    level:1,xp:0,xpNeeded:18,augmentChoices:[],pulseTime:2,recoveryTime:8,spawnCursor:0,grenades:3,grenadeCooldown:0,throwHeld:false,throwTime:0,isolationPulse:0,stageStart:0,stageShots:0,stageMisses:0,kindReports:{},lastReport:null,
    orbs:Array.from({length:MAX_ORBS},()=>({active:false})),thrown:Array.from({length:MAX_GRENADES},()=>({active:false})),fields:Array.from({length:MAX_FIELDS},()=>({active:false})),
    aim:null,hintTarget:null,hintTime:0,ricochet:0,lastShot:0,hurt:0,hit:0,scanPulse:0,walk:0,message:'WASD 이동 · 1–9 / 휠 전환 · Q 이전 무기',messageTime:6,events:[],extracted:false};
  if(themeStage){run.slots=themeStage.loadout.map(id=>catalog.weapons.findIndex(w=>w.id===id));run.unlocked=catalog.weapons.map((_,i)=>run.slots.includes(i));run.weapon=run.slots[0];}
  if(!isWeaponReady(run,run.weapon))run.weapon=run.slots.find(i=>isWeaponReady(run,i));prepareEncounters(run);revealMap(run);return run;
}
function prepareEncounters(run){
  run.pressureTier=run.pressure>=70?2:run.pressure>=40?1:0;
  if(run.mission==='survival'){run.pending=[];run.spawnTimer=2;return;}
  const stage=stageFor(run),map=run.map,rooms=map.rooms.filter(r=>r.encounter!==false&&r.id!==roomAt(map,map.spawn.x,map.spawn.y));run.pending=[];
  const occupied=new Set([map.boss,map.miniboss].filter(Boolean).map(p=>p.x+','+p.y)),spots=new Map(rooms.map(r=>{const list=[];
    for(let y=1;y<map.height-1;y++)for(let x=1;x<map.width-1;x++){const p={x:x+.5,y:y+.5};if(p.x>r.bounds.x&&p.x<r.bounds.x+r.bounds.w&&p.y>r.bounds.y&&p.y<r.bounds.y+r.bounds.h&&roomAt(map,p.x,p.y)===r.id&&canStand(map,p.x,p.y,.22)&&Math.hypot(p.x-map.spawn.x,p.y-map.spawn.y)>=6&&!lineOfSight(map,map.spawn,p))list.push(p);}
    for(let i=list.length-1;i>0;i--){const j=Math.floor(run.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return [r.id,list];}));
  const populated=rooms.filter(r=>spots.get(r.id).length);for(let i=populated.length-1;i>0;i--){const j=Math.floor(run.random()*(i+1));[populated[i],populated[j]]=[populated[j],populated[i]];}
  if(!populated.length)throw Error('No safe encounter rooms');
  const bossRoom=map.boss?populated.find(r=>r.id===roomAt(map,map.boss.x,map.boss.y)):null,approach=bossRoom?populated.filter(r=>r!==bossRoom):populated;
  for(let i=0;i<stage.count;i++){
    const escort=Boolean(bossRoom&&i>=stage.count-3&&i<stage.count-1),r=bossRoom&&i>=stage.count-3?bossRoom:approach[i%approach.length],options=spots.get(r.id),p=options.find(p=>!occupied.has(p.x+','+p.y))||options[0],boss=Boolean(map.boss&&i===stage.count-1),miniboss=i===Math.floor(stage.count/2),position=boss?map.boss:miniboss?map.miniboss:p;
    const basic=stage.pool.filter(kind=>!run.catalog.enemyById[kind].resistant&&!run.catalog.enemyById[kind].regimenScenarios),baseline=escort||i<(run.mission==='theme'?2:Math.ceil(stage.count*.3));
    const themed=run.mission==='theme'?stage.pool.filter(kind=>run.catalog.enemyById[kind].regimenScenarios):null;
    const kind=boss?(stage.bossKind||'kpc'):miniboss?(stage.pool.find(k=>run.catalog.enemyById[k].shield||run.catalog.enemyById[k].biofilm)||stage.pool[0]):baseline?basic[i%basic.length]:themed?themed[(i-2)%themed.length]:stage.pool[(i-Math.ceil(stage.count*.3))%stage.pool.length];
    occupied.add(position.x+','+position.y);run.pending.push({...position,room:roomAt(map,position.x,position.y),kind,boss,miniboss,baseline:baseline||miniboss,escort});
  }
}
export function announce(run,text,seconds=2.5){run.message=text;run.messageTime=seconds;}
export function resistanceChance(pressure){return pressure>=70?.55:pressure>=40?.28:0;}
export function selectScanner(run){
  if(run.scannerActive)return false;cancelVolley(run);run.chargeTime=0;run.scannerActive=true;run.scoped=false;run.scanFocus=0;run.scanTarget=null;run.reloadTime=0;run.reloadWeapon=null;run.switchTime=.1;run.lastShot=0;run.events.push('switch');return true;
}
export function releaseScanner(run){if(!run.scannerActive)return;run.scannerActive=false;run.scoped=false;run.scanFocus=0;run.scanTarget=null;run.switchTime=.06;}
export function switchWeapon(run,index){if(!isWeaponReady(run,index)||(!run.scannerActive&&run.weapon===index))return false;cancelVolley(run);run.chargeTime=0;run.scannerActive=false;run.scoped=false;run.scanFocus=0;run.scanTarget=null;run.reloadTime=0;run.reloadWeapon=null;if(run.weapon!==index)run.previousWeapon=run.weapon;run.weapon=index;run.cooldown=run.cooldowns[index];run.switchTime=.1;run.events.push('switch');return true;}
export function cycleWeapon(run,direction=1){if(run.scannerActive)return switchWeapon(run,run.weapon);const slot=run.slots.indexOf(run.weapon);for(let n=1;n<=run.slots.length;n++){const i=run.slots[(slot+direction*n+run.slots.length*2)%run.slots.length];if(isWeaponReady(run,i))return switchWeapon(run,i);}return false;}
export function visibleLabel(run,e,{compact=false}={}){
  const p=run.catalog.enemyById[e.kind],level=run.intel[e.kind];if(level===0)return '???';if(level===1)return p.gram;
  // Catalog entries share learned intel; live targets need their own completed scan.
  if(level<3||e.scanComplete===false)return p.short;
  if(p.resistant)return p.trait+' · '+p.short;
  return p.short+(compact?'':' · '+p.phenotype);
}
export function inVerticalAim(run,e,cone=.025){
 const d=Math.hypot(e.x-run.player.x,e.y-run.player.y),camera=eyeAt(run.map,run.player),ground=floorAt(run.map,e.x,e.y),body=enemyHeight(e),pitch=run.player.pitch||0;
 return pitch>=Math.atan2(ground+.04-camera,d)-cone&&pitch<=Math.atan2(ground+body-camera,d)+cone;
}
export function shotLineOfSight(run,e){
 const p=run.player,d=Math.hypot(e.x-p.x,e.y-p.y),ground=floorAt(run.map,e.x,e.y),z=clamp(eyeAt(run.map,p)+Math.tan(p.pitch||0)*d,ground+.04,ground+enemyHeight(e));
 return lineOfSight(run.map,p,{x:e.x,y:e.y,eyeZ:z});
}
export function targetEnemy(run,cone=.1,range=24){
  let best=null,bestDistance=range;
  for(const e of run.enemies){if(!e.active||e.state==='Dead'||!inVerticalAim(run,e))continue;const dx=e.x-run.player.x,dy=e.y-run.player.y,d=Math.hypot(dx,dy);if(d>bestDistance||Math.abs(angleDelta(Math.atan2(dy,dx)-run.player.angle))>Math.max(cone,Math.atan2(e.boss?.42:e.miniboss?.32:.25,d)))continue;if(shotLineOfSight(run,e)){best=e;bestDistance=d;}}
  return best;
}
export function scan(run){
  if(run.status!=='running'||run.scannerCooldown>0)return false;const e=targetEnemy(run,.18,18);if(!e){announce(run,'우클릭 유지 · 보조 스캐너로 표적 검사');return false;}
  run.intel[e.kind]=Math.min(3,run.intel[e.kind]+(run.upgrades.scanner?2:1));run.seen.add(e.kind);run.scannerCooldown=.55;run.scanPulse=.8;run.hintTarget=e.id;run.hintTime=8;e.scanned=true;e.scanComplete=run.intel[e.kind]>=3;
  const p=run.catalog.enemyById[e.kind];announce(run,['???','SCANNER · '+p.gram,(p.viral||p.parasite?'IDENTIFY · ':'CULTURE · ')+p.short,(p.viral||p.parasite?'REGIMEN · ':'AST · ')+p.phenotype+' / '+p.trait][run.intel[e.kind]]);run.events.push('scan');return true;
}
function burst(run,x,y,color,count=8){for(let i=0;i<count;i++){const p=run.particles.find(p=>p.life<=0);if(!p)break;const a=run.random()*Math.PI*2;Object.assign(p,{x,y,z:floorAt(run.map,x,y)+.15+run.random()*.4,vx:Math.cos(a)*.8,vy:Math.sin(a)*.8,vz:1,color,ricochet:false,life:.3+run.random()*.35});}}
function ricochet(run,e,result){
  run.ricochet=.22;run.hit=0;const color=['R','INACTIVE'].includes(result.category)?'#ffca79':'#b9d8eb',a=Math.atan2(run.player.y-e.y,run.player.x-e.x);
  for(let i=0;i<7;i++){const p=run.particles.find(p=>p.life<=0);if(!p)break;const angle=a+(run.random()-.5)*1.8,x=e.x+Math.cos(a)*.22,y=e.y+Math.sin(a)*.22;Object.assign(p,{x,y,px:x,py:y,z:eyeAt(run.map,e),pz:eyeAt(run.map,e),vx:Math.cos(angle)*(2+run.random()*2),vy:Math.sin(angle)*(2+run.random()*2),vz:1+run.random(),color,life:.32,ricochet:true});}
}
function refill(run,amount=Infinity){for(let i=0;i<run.energy.length;i++)run.energy[i]=Math.min(maxAmmo(run),run.energy[i]+amount);}
export function protectedBySource(run,e){
  return run.enemies.some(b=>b.active&&b.state!=='Dead'&&b.biofilm&&Math.hypot(e.x-b.x,e.y-b.y)<2.7&&lineOfSight(run.map,e,b));
}
export function controlSource(run){
  if(run.status!=='running'||run.sourceCooldown>0)return false;
  const near=s=>Math.hypot(s.x-run.player.x,s.y-run.player.y)<(run.upgrades.source?3.6:2.3)&&lineOfSight(run.map,run.player,s);
  let changed=false;
  for(const e of run.enemies){if(!e.active||e.state==='Dead'||!near(e))continue;if(e.state==='Dormant'){kill(run,e,'source');changed=true;announce(run,'SOURCE CONTROL · 휴면 포자 오염원 제거');}else if(e.biofilm){e.biofilm=false;changed=true;announce(run,'BIOFILM DISRUPTED · 주변 보호 해제');}}
  for(const h of run.hazards)if(h.active&&near(h)){h.active=false;changed=true;announce(run,'SOURCE CONTROL · 오염 구역 제거');}
  if(!changed){announce(run,'biofilm / 휴면 포자 / 오염 구역 가까이에서 F',1.5);return false;}
  run.sourceCooldown=run.upgrades.source?1:2.8;run.events.push('source');return true;
}
export function spawnEnemy(run,kind,position,elite=false,{boss=false,slot=null}={}){
  const e=slot||run.enemies.find(e=>!e.active),p=run.catalog.enemyById[kind];if(!e||!p||!canStand(run.map,position.x,position.y,.18))return null;
  const miniboss=Boolean(position.miniboss),hp=boss?(kind==='kpc'?460:Math.max(220,p.hp*2.8)):p.hp*(miniboss?1.9:elite?1.35:1);if(boss)run.bossDefeated=false;
  Object.assign(e,{...position,active:true,kind,elite,boss,miniboss,hp,maxHp:hp,shield:p.shield+(p.shield&&(boss||miniboss)?25:0),state:p.spore?'Dormant':'Idle',biofilm:Boolean(p.biofilm),timer:0,attackCooldown:.8,flash:0,age:0,dot:0,dotWeapon:null,death:0,knock:0,memory:0,lastSeen:null,navTime:0,waypoint:null,revealed:false,cell:p.intracellular?45:0,slow:0,telegraph:0,replicationSuppressed:0,replication:6,scanned:false,scanComplete:false,introduced:false,phase:1,attackPoint:null,encounteredAt:null,firstAttempt:null,firstEffective:null,lastWrongAt:null,lastContact:-1,pressureSpawn:false,baseline:Boolean(position.baseline)});reportFor(run,kind).spawned++;return e;
}
function leaveToxin(run,e){const h=run.hazards.find(h=>!h.active);if(h)Object.assign(h,{active:true,x:e.x,y:e.y,life:7,radius:1.25,hitCooldown:.4});}
function reportFor(run,kind){return run.kindReports[kind] ||= {kind,spawned:0,kills:0,shots:0,effective:0,blocked:0,automaticKills:0,environmentKills:0,supportKills:0,firstAttempts:0,firstCorrect:0,responseTotal:0,responseCount:0,switchTotal:0,switchCount:0,broad:0,alternatives:{},weapons:{}};}
export function stageReport(run){return {seconds:run.time-run.stageStart,shots:run.stageShots,misses:run.stageMisses+(run.volley&&!run.volley.hit?1:0),pressureAdded:run.pressureAdded,pressureReplacements:run.pressureReplacements,pressureElites:run.pressureElites,bossKills:run.stageBossKills,miniKills:run.stageMiniKills,rows:Object.values(run.kindReports).filter(r=>r.spawned||r.kills||r.shots).map(r=>({...r,alternatives:{...r.alternatives},weapons:Object.fromEntries(Object.entries(r.weapons).map(([id,value])=>[id,{...value}]))}))};}
function kill(run,e,weaponId,method='weapon'){
  if(e.state==='Dead')return;const dormant=e.state==='Dormant';if(e.boss)run.bossDefeated=true;
  if(e.miniboss||e.boss){run.player.hp=Math.min(100,run.player.hp+(e.boss?24:14));refill(run,80);run.grenades=Math.min(5,run.grenades+1);run.bossKills+=e.boss?1:0;run.miniKills+=e.miniboss?1:0;run.stageBossKills+=e.boss?1:0;run.stageMiniKills+=e.miniboss?1:0;if(run.mission==='survival'){run.director.restUntil=run.time+12;run.director.nextBoss=Math.max(run.director.nextBoss,run.time+90);}
   for(const gate of run.map.shortcuts||[])if(!gate.open&&(e.miniboss||e.boss)){gate.open=true;for(const i of gate.cells)run.map.cells[i]=0;run.navCache.clear();run.events.push('source');}
   announce(run,(e.boss?'BOSS CLEAR':'중간보스 제압')+' · 체력 / 보급 회수'+(run.mission==='survival'?' · 잠시 재정비':' · 지름길 개방'),5);
  }
  const report=reportFor(run,e.kind);report.kills++;if(method==='automatic')report.automaticKills++;if(method==='environment')report.environmentKills++;if(['source','immune','companion'].includes(weaponId))report.supportKills++;if(run.mission==='survival')dropExperience(run,e);
  e.state='Dead';e.death=.45;e.dot=0;e.biofilm=false;run.kills++;run.stageKills++;run.combo=run.comboTime>0?run.combo+1:1;run.comboTime=5;run.bestCombo=Math.max(run.bestCombo,run.combo);run.score+=100+Math.min(run.combo,10)*15+(e.elite?80:0)+(e.boss?1200:0);
  if(['ampicillin','cefazolin','metronidazole'].includes(weaponId))run.pressure=Math.max(0,run.pressure-(run.upgrades.stewardship?3:1.3));
  if(run.catalog.enemyById[e.kind].toxin&&!dormant)leaveToxin(run,e);
  refill(run,10);burst(run,e.x,e.y,run.catalog.enemyById[e.kind].color,12);run.events.push('kill');
}
export function applyHit(run,e,weapon,damage=weapon.damage,{dot=false,automatic=false}={}){
  if(!e.active||e.state==='Dead')return {factor:0};
  if(!dot&&e.state!=='Dormant'){e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};e.revealed=true;}
  const result=combatCoverage(run,weapon,e.kind);
  // Clinical gate always precedes every damage multiplier, shield, DOT and upgrade.
  if(!result.factor){if(!dot){announce(run,result.reason,1.5);run.events.push('resist');ricochet(run,e,result);}return result;}
  if(e.state==='Dormant'){if(!dot){announce(run,'휴면 포자 · 항생제 피해 없음 / F 오염원 제거 또는 발아 후 대응');ricochet(run,e,{category:'DORMANT'});}return {...result,factor:0};}
  const barrier=e.shield>0||e.cell>0||protectedBySource(run,e);let amount=damage*result.factor*(protectedBySource(run,e)?run.upgrades.penetration?.72:.42:1);e.flash=.13;if(!dot&&!automatic){run.hit=.16;run.ricochet=0;run.hitKind=barrier?'shield':'effective';run.events.push(barrier?'shield-hit':'effective-hit');}
  if(e.cell>0){if(weapon.intracellular){e.cell=0;e.slow=1.6;}else{const absorbed=Math.min(e.cell,amount);e.cell-=absorbed;amount-=absorbed;}}
  if(e.shield>0){const absorbed=Math.min(e.shield,amount);e.shield-=absorbed;amount-=absorbed;}e.hp-=amount;
  if(weapon.id==='ivermectin'&&run.catalog.enemyById[e.kind].parasite)e.slow=2;
  if(['ganciclovir','acyclovir'].includes(weapon.id)&&run.catalog.enemyById[e.kind].viral)e.replicationSuppressed=5;
  if(!dot){e.knock=.07;burst(run,e.x,e.y,weapon.color,4);if(run.upgrades.infusion&&weapon.beta){e.dot=1.6;e.dotWeapon=weapon.id;}}
  if(e.hp<=0)kill(run,e,weapon.id,automatic?'automatic':'weapon');return result;
}
// Loadout-specific opportunities, separate from conditional clinical first-line advice.
export function narrowerOptions(run,w,e){
 const kind=typeof e==='string'?e:e.kind;if(w.pressure<1||run.intel[kind]<3||!combatCoverage(run,w,kind).factor)return [];
 const choices={pneumo:['ampicillin'],mssa:['cefazolin'],ecoli:run.map.site==='urinary'?['cefazolin','ceftriaxone']:['ceftriaxone'],klebs:run.map.site==='urinary'?['cefazolin','ceftriaxone']:['ceftriaxone']};
 return (choices[kind]||[]).filter(id=>{const i=run.catalog.weapons.findIndex(a=>a.id===id),a=run.catalog.weapons[i];
  return a&&a.pressure<w.pressure-.4&&isWeaponReady(run,i)&&ammoCount(run,i)>0&&run.cooldowns[i]<=0&&combatCoverage(run,a,kind).factor>0&&(typeof e==='string'||Math.hypot(e.x-run.player.x,e.y-run.player.y)<=a.range);
 });
}
function recordContact(run,e,w,result,serial,alternatives){
 const row=reportFor(run,e.kind);if(e.lastContact===serial)return;e.lastContact=serial;
 const use=row.weapons[w.id] ||= {shots:0,effective:0,broad:0};row.shots++;use.shots++;
 if(e.encounteredAt===null)e.encounteredAt=run.time;
 if(e.firstAttempt===null){e.firstAttempt=run.time;row.firstAttempts++;if(result.factor>0)row.firstCorrect++;}
 if(result.factor>0){
  run.effective++;row.effective++;use.effective++;
  if(e.firstEffective===null){e.firstEffective=run.time;row.responseTotal+=run.time-e.encounteredAt;row.responseCount++;
   if(e.lastWrongAt!==null){row.switchTotal+=run.time-e.lastWrongAt;row.switchCount++;}}
  if(alternatives.length){row.broad++;use.broad++;for(const id of alternatives)row.alternatives[id]=(row.alternatives[id]||0)+1;}
 }else{row.blocked++;if(e.lastWrongAt===null)e.lastWrongAt=run.time;}
}
function traceShot(run,w,angle,end=null){
 const p=run.player,ray=castRay(run.map,p.x,p.y,Math.cos(angle),Math.sin(angle),w.range),d=end?Math.hypot(end.x-p.x,end.y-p.y):ray.distance;
 if(run.tracers.length>=12)run.tracers.shift();
 run.tracers.push({x:p.x,y:p.y,ex:p.x+Math.cos(angle)*d,ey:p.y+Math.sin(angle)*d,z:eyeAt(run.map,p)-.06,ez:end?eyeAt(run.map,end):eyeAt(run.map,p)+Math.tan(p.pitch||0)*d,color:w.color,life:w.mode==='beam'?.15:.1,mode:w.mode});
}
function discharge(run,w,serial,damage=w.damage){
 const original=run.player.angle,hitMap=new Map(),cone=w.spread+(run.aimAssist&&run.touchInput?.035:0);
 if(w.mode==='scatter'){
  for(const offset of [-.1,-.05,0,.05,.1]){run.player.angle=original+offset;const e=targetEnemy(run,.025+(run.aimAssist&&run.touchInput?.02:0),w.range);traceShot(run,w,run.player.angle,e);
   if(e)hitMap.set(e,(hitMap.get(e)||0)+damage/3);}
 }else if(w.mode==='rail'){
  const targets=run.enemies.filter(e=>e.active&&e.state!=='Dead'&&inVerticalAim(run,e)&&Math.hypot(e.x-run.player.x,e.y-run.player.y)<=w.range&&Math.abs(angleDelta(Math.atan2(e.y-run.player.y,e.x-run.player.x)-original))<Math.max(cone,Math.atan2(.25,Math.hypot(e.x-run.player.x,e.y-run.player.y)))&&shotLineOfSight(run,e)).sort((a,b)=>Math.hypot(a.x-run.player.x,a.y-run.player.y)-Math.hypot(b.x-run.player.x,b.y-run.player.y)).slice(0,3);
  targets.forEach((e,i)=>hitMap.set(e,damage*Math.pow(.8,i)));traceShot(run,w,original);
 }else{const e=targetEnemy(run,cone,w.range);if(e)hitMap.set(e,damage);traceShot(run,w,original,e);}
 run.player.angle=original;
 for(const [e,amount] of hitMap){run.seen.add(e.kind);const alternatives=narrowerOptions(run,w,e),result=applyHit(run,e,w,Math.min(damage,amount));recordContact(run,e,w,result,serial,alternatives);}
 return hitMap.size>0;
}
export function cancelVolley(run){if(run.volley&&!run.volley.hit)run.stageMisses++;run.volley=null;}
export function fire(run){
 if(run.status!=='running'||run.scannerActive||!isWeaponReady(run,run.weapon)||run.cooldowns[run.weapon]>0||run.switchTime>0||run.reloadTime>0)return false;
 const w=run.catalog.weapons[run.weapon],cost=shotCost(run,w);if(run.magazines[run.weapon]+.0001<cost){reload(run);return false;}
 cancelVolley(run);run.magazines[run.weapon]=Math.max(0,run.magazines[run.weapon]-cost);run.cooldown=Math.max(.06,w.interval*Math.pow(.86,run.upgrades.rate||0)-(w.mode==='charge'?w.charge:0));run.cooldowns[run.weapon]=run.cooldown;run.lastShot=.18;run.shots++;run.pressure=clamp(run.pressure+w.pressure,0,100);run.pressureAdded+=w.pressure;run.events.push('shot-'+w.mode);
 run.stageShots++;const serial=++run.shotSerial,hit=discharge(run,w,serial,w.mode==='burst'?w.damage/3:w.damage);
 if(w.mode==='burst')run.volley={weapon:run.weapon,serial,left:2,timer:.05,hit};
 else if(!hit)run.stageMisses++;
 return true;
}
function updateTrigger(run,input,dt){
 const w=run.catalog.weapons[run.weapon];
 if(run.volley){const v=run.volley;v.timer-=dt;if(v.weapon!==run.weapon||run.scannerActive)cancelVolley(run);
  else if(v.timer<=0){v.hit=discharge(run,w,v.serial,w.damage/3)||v.hit;run.lastShot=.12;run.events.push('shot-burst');v.timer=.05;if(--v.left===0)cancelVolley(run);}}
 if(!input.fire||run.scannerActive||run.reloadTime>0){run.chargeTime=0;return;}
 if(w.mode==='charge'&&run.cooldowns[run.weapon]<=0&&run.switchTime<=0){
  if(ammoCount(run,run.weapon)<=0){reload(run);return;}
  if(run.chargeTime===0)run.events.push('charge');run.chargeTime+=dt;if(run.chargeTime>=w.charge){fire(run);run.chargeTime=0;}
 }else if(w.mode!=='charge')fire(run);
}
export function assistAim(run,dt){
 if(!run.aimAssist)return;const e=targetEnemy(run,.18,11);if(!e||!e.revealed)return;
 const delta=angleDelta(Math.atan2(e.y-run.player.y,e.x-run.player.x)-run.player.angle);
 run.player.angle=angleDelta(run.player.angle+clamp(delta,-dt*.55,dt*.55));
}
export function updateHuntGuide(run,dt){
 if(run.mission==='survival'){run.guide=null;return;}
 const remaining=remainingEnemies(run);run.huntTimer-=dt;
 if(remaining>3){run.guide=null;return;}if(run.huntTimer>0)return;run.huntTimer=.2;
 const targets=remaining?run.enemies.filter(e=>e.active&&e.state!=='Dead'):[run.map.exit];
 let nearest=null,best=Infinity;const here=Math.floor(run.player.y)*run.map.width+Math.floor(run.player.x);
 for(const e of targets){pathStep(run,run.player,e);const cell=Math.floor(e.y)*run.map.width+Math.floor(e.x),distance=run.navCache.get(cell)?.[here]??-1;if(distance>=0&&distance<best){nearest=e;best=distance;}}
 if(nearest){run.guide={...pathStep(run,run.player,nearest),targetX:nearest.x,targetY:nearest.y,distance:best,remaining};if(run.time%3<.2)run.huntPulse=1.1;}
 else run.guide=null;
}
function updateRoomPacing(run){
 if(run.mission==='survival'||Math.hypot(run.player.x-run.map.exit.x,run.player.y-run.map.exit.y)<1.5)return;const id=roomAt(run.map,run.player.x,run.player.y),room=run.map.rooms[id];
 if(id!==run.activeRoom){run.activeRoom=id;run.roomNotice=3;if(id>0&&run.messageTime<=1)announce(run,room.label+' / '+room.name+(room.rest?' · 보급 구역':' · 접촉 시 교전'),2.5);}
 if(!room.encounter||run.clearedRooms.has(id)||run.spawned<stageFor(run).count)return;
 if(!run.enemies.some(e=>e.active&&e.state!=='Dead'&&e.room===id)){run.clearedRooms.add(id);run.roomNotice=4;announce(run,'SECTOR '+room.label+' 확보 · 다음 구역으로',3);run.events.push('clear');}
}
export function canDetect(run,e){
  const dx=e.x-run.player.x,dy=e.y-run.player.y,d=Math.hypot(dx,dy);
  return d<=7.5&&inVerticalAim(run,e,Math.atan(viewFov(run)/(run.viewAspect||16/9)))&&roomAt(run.map,e.x,e.y)===roomAt(run.map,run.player.x,run.player.y)&&Math.abs(angleDelta(Math.atan2(dy,dx)-run.player.angle))<=Math.atan(viewFov(run))&&lineOfSight(run.map,run.player,e);
}
function nextSpawn(run){
  // Every encounter is placed outside the entry room and entry sightline before exploration.
  // The bounded pool fits the entire stage, so no enemy needs to pop into an explored room.
  const idx=run.pending.length?0:-1;
  if(idx<0)return false;
  const plan=run.pending[idx],stage=stageFor(run),chance=resistanceChance(run.pressure);
  let kind=plan.kind;const resistant=run.wave>=6?['mrsa','esbl','kpc','mdr','vre']:run.wave>=5?['mrsa','esbl','vre']:['mrsa','esbl'];
  if(run.mission!=='theme'&&!plan.boss&&!plan.baseline&&!run.catalog.enemyById[kind].resistant&&!run.catalog.enemyById[kind].regimenScenarios&&run.random()<chance)kind=resistant[Math.floor(run.random()*resistant.length)];
  const roll=run.random(),elite=!plan.boss&&!plan.miniboss&&!plan.escort&&roll<Math.max(stage.elite,chance*.5),e=spawnEnemy(run,kind,plan,elite,{boss:plan.boss});
  if(!e)return false;if(kind!==plan.kind){e.pressureSpawn=true;run.pressureReplacements++;run.pressureNotice=5;}if(elite&&roll>=stage.elite){run.pressureElites++;run.pressureNotice=5;}run.pending.splice(idx,1);return true;
}
function escalateUnseenEncounters(run){
  if(run.mission==='theme')return;
  const tier=run.pressure>=70?2:run.pressure>=40?1:0;if(tier<=run.pressureTier)return;run.pressureTier=tier;
  const pool=run.wave>=6?['mrsa','esbl','kpc','mdr','vre']:run.wave>=5?['mrsa','esbl','vre']:['mrsa','esbl'];
  for(const e of run.enemies){if(!e.active||e.state!=='Idle'||e.revealed||e.boss||e.baseline||run.catalog.enemyById[e.kind].resistant||run.catalog.enemyById[e.kind].regimenScenarios||lineOfSight(run.map,run.player,e))continue;
    if(run.random()<resistanceChance(run.pressure)){const kind=pool[Math.floor(run.random()*pool.length)];reportFor(run,e.kind).spawned--;const changed=spawnEnemy(run,kind,{x:e.x,y:e.y,room:e.room},e.elite,{slot:e});if(changed){changed.pressureSpawn=true;run.pressureReplacements++;run.pressureNotice=5;}}
  }
}
function pathStep(run,body,goal){
  const {map}=run,cell=Math.floor(goal.y)*map.width+Math.floor(goal.x);let flow=run.navCache.get(cell);
  if(!flow){flow=new Int16Array(map.cells.length).fill(-1);const queue=run.queue;let head=0,tail=1;queue[0]=cell;flow[cell]=0;while(head<tail){const i=queue[head++];for(const n of [i-1,i+1,i-map.width,i+map.width])if(n>=0&&n<flow.length&&canTraverse(map,n,i)&&flow[n]===-1){flow[n]=flow[i]+1;queue[tail++]=n;}}if(run.navCache.size>=16)run.navCache.clear();run.navCache.set(cell,flow);}
  const i=Math.floor(body.y)*map.width+Math.floor(body.x);if(i===cell)return goal;let best=i;for(const n of [i-1,i+1,i-map.width,i+map.width])if(flow[n]>=0&&canTraverse(map,i,n)&&(flow[best]<0||flow[n]<flow[best]))best=n;
  return {x:best%map.width+.5,y:Math.floor(best/map.width)+.5};
}
function hurt(run,damage){if(run.status!=='running')return;run.player.hp=Math.max(0,run.player.hp-damage);run.hurt=.32;run.combo=0;run.events.push('hurt');if(run.player.hp<=0){run.status='lost';announce(run,'CONTAINMENT FAILED',60);}}
function projectile(run,e,offset=0){const b=run.projectiles.find(b=>!b.active);if(!b)return;const a=Math.atan2(run.player.y-e.y,run.player.x-e.x)+offset,p=run.catalog.enemyById[e.kind],speed=e.boss?2.7:3.1,z=eyeAt(run.map,e),distance=Math.max(.5,Math.hypot(run.player.x-e.x,run.player.y-e.y));Object.assign(b,{active:true,x:e.x,y:e.y,z,vz:(eyeAt(run.map,run.player)-z)*speed/distance,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:5,damage:p.damage,color:p.color});}
function moveEnemy(run,e,goal,p,dt){
  e.navTime-=dt;if(!e.waypoint||e.navTime<=0){e.waypoint=lineOfSight(run.map,e,goal)?goal:pathStep(run,e,goal);e.navTime=.4;}
  let dx=e.waypoint.x-e.x,dy=e.waypoint.y-e.y,len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  for(const other of run.enemies){if(other===e||!other.active||other.state==='Dead'||other.state==='Dormant')continue;const ex=e.x-other.x,ey=e.y-other.y,ed=Math.hypot(ex,ey);if(ed>0&&ed<.75){dx+=ex/ed*(.75-ed)*2.5;dy+=ey/ed*(.75-ed)*2.5;}}
  const speed=p.speed*.78*(p.parasite?1+Math.sin(run.time*4+e.id)*.3:1)*(e.elite?1.1:1)*(e.boss?.8:1)*(e.slow>0?.45:1)*(e.isolated?1-.13*run.upgrades.isolation:1)*(e.knock>0?-.6:1);const norm=Math.max(1,Math.hypot(dx,dy));moveBody(run.map,e,dx/norm*speed*dt,dy/norm*speed*dt,.18);
}
function updateEnemy(run,e,dt){
  if(!e.active)return;e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.attackCooldown-=dt;e.slow=Math.max(0,e.slow-dt);e.replicationSuppressed=Math.max(0,e.replicationSuppressed-dt);
  if(e.state==='Dead'){e.death-=dt;if(e.death<=0)e.active=false;return;}
  e.isolated=Boolean(run.mission==='survival'&&run.upgrades.isolation&&Math.hypot(e.x-run.player.x,e.y-run.player.y)<2.5+run.upgrades.isolation*.45&&lineOfSight(run.map,run.player,e));
  const p=run.catalog.enemyById[e.kind],d=Math.hypot(e.x-run.player.x,e.y-run.player.y),contact=canDetect(run,e),los=d<11&&lineOfSight(run.map,e,run.player);
  if(contact){run.seen.add(e.kind);e.revealed=true;if(e.encounteredAt===null)e.encounteredAt=run.time;if((e.boss||e.miniboss)&&!e.introduced){e.introduced=true;run.roomNotice=5;announce(run,(e.boss?'STAGE BOSS':'MID BOSS')+' · '+visibleLabel(run,e)+' / '+(p.shield?'캡슐 장벽':p.biofilm?'F biofilm 해체':'공격 예고를 보고 회피'),5);}}
  if((e.boss||e.miniboss)&&e.hp<e.maxHp*.5&&e.phase===1){e.phase=2;e.attackCooldown=Math.max(1.5,e.attackCooldown);burst(run,e.x,e.y,p.color,10);}
  if(e.state==='Dormant'){if(contact)e.timer+=dt;if(e.timer>=2){e.state='Detect';e.timer=.3;announce(run,'포자 발아 · 이제 활성 약제로 대응 가능');}return;}
  if(e.state==='Idle'&&run.mission==='survival'){e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};}
  if(e.state==='Idle'&&contact){e.state='Detect';e.timer=.6;}
  if(e.state==='Detect'){
    if(!contact){e.state='Idle';e.timer=0;}else{e.timer-=dt;if(e.timer<=0){e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};}}
  }else if(['Chase','Attack','Search'].includes(e.state)){
    if(los){e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};}else if(run.mission==='survival'){e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};e.state='Chase';}else{e.memory-=dt;e.state='Search';}
    if(e.memory<=0||!e.lastSeen){e.state='Idle';e.lastSeen=null;e.waypoint=null;}
    else if((e.boss||e.miniboss)&&los&&d<9&&e.attackCooldown<=0){
      if(!e.telegraph){e.telegraph=e.boss?1:.85;e.attackCooldown=e.telegraph;e.attackPoint={x:run.player.x,y:run.player.y};announce(run,(e.boss?'BOSS':'중간보스')+' · 공격 예고 / 옆으로 이동',1.2);}
    }else if(d<(e.boss?.83:e.miniboss?.7:.62)&&los){e.state='Attack';if(e.attackCooldown<=0){if(run.player.z<.32&&run.meleeGrace<=0&&Math.abs(floorAt(run.map,e.x,e.y)-floorAt(run.map,run.player.x,run.player.y))<.25){hurt(run,p.damage*(e.elite?1.2:1));run.meleeGrace=.3;}e.attackCooldown=1.4;if(p.toxin)leaveToxin(run,e);}}
    else if(p.ranged&&los&&d>3&&d<8&&e.attackCooldown<=0){projectile(run,e);e.attackCooldown=3;e.state='Attack';}
    else{if(los)e.state='Chase';moveEnemy(run,e,e.lastSeen,p,dt);}
  }
  if(e.telegraph>0){e.telegraph=Math.max(0,e.telegraph-dt);if(e.telegraph===0){if(los){for(const angle of (e.boss&&e.phase===2?[-.32,-.16,0,.16,.32]:e.miniboss?(e.phase===2?[-.2,0,.2]:[-.12,.12]):[-.2,0,.2]))projectile(run,e,angle);if(e.boss&&e.phase===2&&e.attackPoint){const h=run.hazards.find(h=>!h.active);if(h)Object.assign(h,{active:true,...e.attackPoint,life:3,radius:1.05,hitCooldown:.3});}}e.attackPoint=null;e.attackCooldown=e.boss?4.2:5.2;}}
  if(p.viral&&e.replicationSuppressed===0&&['Chase','Attack'].includes(e.state)){e.replication-=dt;if(e.replication<=0){e.hp=Math.min(e.maxHp,e.hp+10);e.replication=6;burst(run,e.x,e.y,p.color,3);}}
  e.knock=Math.max(0,e.knock-dt);if(e.dot>0){e.dot-=dt;applyHit(run,e,run.catalog.weaponById[e.dotWeapon],12*dt,{dot:true});}
}
export function rewardOptions(run){return REWARDS.filter(r=>(!r.max||(run.upgrades[r.id]||0)<r.max)&&(!r.host||r.host===run.host)&&(!r.companion||!run.companions.includes(r.companion))&&(!r.weapon||!run.unlocked[run.catalog.weapons.findIndex(w=>w.id===r.weapon)])).map(r=>({r,roll:run.random()})).sort((a,b)=>a.roll-b.roll).slice(0,3).map(o=>o.r);}
export function chooseReward(run,id){
  if(run.status!=='reward')return false;const reward=run.rewards.find(r=>r.id===id);if(!reward)return false;
  run.upgrades[id]=(run.upgrades[id]||0)+1;if(reward.companion)recruitCompanion(run,reward.companion);if(reward.weapon)run.unlocked[run.catalog.weapons.findIndex(w=>w.id===reward.weapon)]=true;
  if(id==='stewardship')run.pressure=Math.max(0,run.pressure-35);
  run.player.hp=Math.min(100,run.player.hp+(id==='support'?50:id==='source'?35:28));run.wave++;run.map=createMap(run.wave,run.seed);run.discovered=new Uint8Array(run.map.cells.length);run.discoveryTime=0;run.exitOpen=false;run.bossDefeated=!stageFor(run).boss;run.scannerActive=false;run.scoped=false;run.scanFocus=0;run.scanTarget=null;Object.assign(run.player,run.map.spawn,{z:0,vz:0,pitch:0});run.reloadTime=0;run.hintTime=0;run.jumpHeld=false;run.queue=new Int16Array(run.map.cells.length);run.spawned=0;run.stageKills=0;run.spawnTimer=0;run.rewards=[];run.status='paused';run.visited=new Set([0]);run.navCache.clear();
  Object.assign(run.pet,run.map.spawn,{cooldown:.7,flash:0,target:null});cancelVolley(run);run.chargeTime=0;run.tracers.length=0;run.guide=null;run.huntTimer=0;run.clearedRooms.clear();run.pressureAdded=0;run.pressureReplacements=0;run.pressureElites=0;run.stageBossKills=0;run.stageMiniKills=0;run.stageStart=run.time;run.stageShots=0;run.stageMisses=0;run.kindReports={};run.lastReport=null;run.grenades=Math.min(5,run.grenades+2);run.thrown.forEach(p=>p.active=false);run.fields.forEach(p=>p.active=false);run.enemies.forEach(e=>e.active=false);run.projectiles.forEach(p=>p.active=false);run.particles.forEach(p=>p.life=0);run.hazards.forEach(h=>h.active=false);run.cooldowns.fill(0);run.cooldown=0;run.aim=null;run.sourceCooldown=0;
  const issued=[];run.catalog.weapons.forEach((w,i)=>{if(w.stage<=run.wave&&!run.unlocked[i]){run.unlocked[i]=true;issued.push(w.short);}});if(run.wave===5)run.slots[0]=9;if(run.wave===6)run.slots[1]=10;if(!isWeaponReady(run,run.weapon))run.weapon=run.slots.find(i=>isWeaponReady(run,i));run.magazines=run.catalog.weapons.map((w,i)=>magazineCapacity(run,i));refill(run);prepareEncounters(run);revealMap(run);
  announce(run,'STAGE '+(run.wave+1)+' · '+stageFor(run).label+(issued.length?' / '+issued.join(' + ')+' 보급':''),7);return true;
}
// Reveal only rays actually seen by the player, including the first occluding wall.
// This is a small 10 Hz job, independent of frame rate and DOM rendering.
export function revealMap(run){
  const {map,player:p,discovered}=run,spread=Math.atan(viewFov(run));
  discovered[Math.floor(p.y)*map.width+Math.floor(p.x)]=1;
  for(let n=0;n<=72;n++){const a=p.angle-spread+spread*2*n/72,dx=Math.cos(a),dy=Math.sin(a);let previous=-1;
    for(let d=.1;d<14;d+=.16){const x=Math.floor(p.x+dx*d),y=Math.floor(p.y+dy*d);if(x<0||y<0||x>=map.width||y>=map.height)break;const i=y*map.width+x;if(i===previous)continue;previous=i;discovered[i]=1;if(map.cells[i])break;}
  }
}
export function remainingEnemies(run){return Math.max(0,stageFor(run).count-run.spawned)+run.enemies.filter(e=>e.active&&e.state!=='Dead').length;}
export function canExtract(run){return run.mission==='survival'?run.time>=90:remainingEnemies(run)===0&&run.bossDefeated;}
function updateScanner(run,input,dt){
  if(input.scope){if(!run.scannerActive)selectScanner(run);run.scoped=true;}else releaseScanner(run);
  const e=run.scoped?targetEnemy(run,.06,18):null;
  if(!e||e.id!==run.scanTarget){run.scanTarget=e?.id??null;run.scanFocus=0;}
  if(!e)return;run.scanFocus=Math.min(1,run.scanFocus+dt/.35);
  if(run.scanFocus>=1&&run.scannerCooldown<=0&&(run.intel[e.kind]<3||!e.scanComplete))scan(run);
}
export function tick(run,input={},dt=1/60){
  if(run.status!=='running')return;dt=clamp(dt,0,.05);run.time+=dt;run.touchInput=Boolean(input.touchAim);
  for(const k of ['cooldown','switchTime','dashCooldown','scannerCooldown','sourceCooldown','lastShot','hurt','hit','scanPulse','comboTime','messageTime','hintTime','ricochet','land','grenadeCooldown','throwTime','isolationPulse','huntPulse','pressureNotice','roomNotice','meleeGrace'])run[k]=Math.max(0,run[k]-dt);
  for(let i=0;i<run.cooldowns.length;i++){
    run.cooldowns[i]=Math.max(0,run.cooldowns[i]-dt);const renal=(run.host==='renal'&&run.catalog.weapons[i].renal&&!run.upgrades.renal)? .75 : 1;
    run.energy[i]=Math.min(maxAmmo(run),run.energy[i]+dt*(i===run.weapon?8:26)*renal);
  }
  if(run.reloadTime>0){run.reloadTime=Math.max(0,run.reloadTime-dt);if(!run.reloadLatch&&run.reloadTime<run.reloadDuration*.35){run.reloadLatch=true;run.events.push('reload-in');}if(run.reloadTime===0){const i=run.reloadWeapon,amount=Math.min(magazineCapacity(run,i)-run.magazines[i],run.energy[i]);run.magazines[i]+=amount;run.energy[i]-=amount;run.reloadWeapon=null;run.events.push('loaded');}}
  run.cooldown=run.cooldowns[run.weapon];run.pressure=Math.max(0,run.pressure-dt*.12);
  run.player.angle=angleDelta(run.player.angle+(input.turn||0)*dt*2.1);run.player.pitch=clamp((run.player.pitch||0)+(input.look||0)*dt, -.55,.55);
  if(input.jump&&!run.jumpHeld&&run.player.z===0){run.player.vz=3.65;run.events.push('jump');}run.jumpHeld=Boolean(input.jump);
  if(run.player.z>0||run.player.vz>0){run.player.vz-=14*dt;run.player.z+=run.player.vz*dt;const headroom=ceilingAt(run.map,run.player.x,run.player.y)-floorAt(run.map,run.player.x,run.player.y)-.65;if(run.player.z>headroom){run.player.z=headroom;run.player.vz=Math.min(0,run.player.vz);}if(run.player.z<=0){run.player.z=0;run.player.vz=0;run.land=.14;run.events.push('land');}}
  if(input.dash&&run.dashCooldown<=0){if(run.upgrades.isolationTrail){const field=run.fields.find(f=>!f.active)||run.fields.reduce((a,b)=>a.life<b.life?a:b);Object.assign(field,{active:true,kind:'isolation',x:run.player.x,y:run.player.y,life:3,radius:1.4+run.upgrades.isolationTrail*.3});}run.dash=.18;run.dashCooldown=run.upgrades.mobility?1.3:2.2;run.events.push('dash');}
  let f=input.forward||0,s=input.strafe||0;const norm=Math.max(1,Math.hypot(f,s)),speed=run.dash>0?8.5:run.scoped?2.7:3.9;f/=norm;s/=norm;
  moveBody(run.map,run.player,(Math.cos(run.player.angle)*f-Math.sin(run.player.angle)*s)*speed*dt,(Math.sin(run.player.angle)*f+Math.cos(run.player.angle)*s)*speed*dt);
  run.dash=Math.max(0,run.dash-dt);run.walk+=Math.hypot(f,s)*dt*10;run.visited.add(roomAt(run.map,run.player.x,run.player.y));
  updateScanner(run,input,dt);if(input.throw&&!run.throwHeld)throwGrenade(run);run.throwHeld=Boolean(input.throw);if(input.reload)reload(run);if(input.source)controlSource(run);if(input.touchAim)assistAim(run,dt);updateTrigger(run,input,dt);
  run.discoveryTime-=dt;if(run.discoveryTime<=0){revealMap(run);run.discoveryTime=.1;}
  const stage=stageFor(run);run.spawnTimer-=dt;
  if(run.mission==='survival'){updateSurvival(run,dt);if(run.status!=='running')return;}
  else if(run.spawned<stage.count&&run.spawnTimer<=0){while(run.spawned<stage.count&&nextSpawn(run))run.spawned++;run.spawnTimer=.2;}
  if(run.mission!=='survival')escalateUnseenEncounters(run);updateThrowables(run,dt);for(const e of run.enemies)updateEnemy(run,e,dt);if(run.status==='running')updateCompanion(run,dt);
  for(const b of run.projectiles){if(!b.active)continue;b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z=(b.z??.4)+(b.vz||0)*dt;if(tileAt(run.map,b.x,b.y)||b.life<=0||b.z<floorAt(run.map,b.x,b.y)||b.z>ceilingAt(run.map,b.x,b.y))b.active=false;else if(Math.abs(b.z-eyeAt(run.map,run.player))<.32&&Math.hypot(b.x-run.player.x,b.y-run.player.y)<.3){b.active=false;hurt(run,b.damage);}}
  for(const h of run.hazards){if(!h.active)continue;h.life-=dt;h.hitCooldown-=dt;if(h.life<=0){h.active=false;continue;}if(run.player.z<.14&&h.hitCooldown<=0&&Math.hypot(h.x-run.player.x,h.y-run.player.y)<h.radius&&lineOfSight(run.map,run.player,h)){hurt(run,5);h.hitCooldown=1;}}
  for(const p of run.particles){if(p.life<=0)continue;p.life-=dt;p.px=p.x;p.py=p.y;p.pz=p.z;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=4*dt;}
  for(const p of run.map.pickups){
    if(!p.active){if(p.kind==='companion')continue;p.cooldown-=dt;if(p.cooldown<=0)p.active=true;continue;}if(Math.hypot(p.x-run.player.x,p.y-run.player.y)>.6)continue;
    if(p.kind==='health'&&run.player.hp>=100)continue;
    if(p.kind==='supply'&&run.grenades>=5&&run.energy.every(n=>n>=maxAmmo(run)-1))continue;
    p.active=false;p.cooldown=p.kind==='supply'?25:40;
    if(p.kind==='companion'){const remaining=COMPANIONS.filter(c=>!run.companions.includes(c.id));if(remaining.length){const c=remaining[Math.floor(run.random()*remaining.length)];recruitCompanion(run,c.id);announce(run,c.name+' 합류 · 자동 보조 시작 / 메뉴에서 교체',4);}else{run.upgrades.immuneBoost=Math.min(3,(run.upgrades.immuneBoost||0)+1);announce(run,'면역 동료 활성화 · 사거리 / 공격 빈도 증가');}}
    else if(p.kind==='health'){run.player.hp=Math.min(100,run.player.hp+32);announce(run,'HOST SUPPORT · 체력 +32');}
    else if(p.kind==='supply'){refill(run);run.grenades=Math.min(5,run.grenades+1);announce(run,'SUPPLY · 약제 보급 / 소독탄 +1');}
    else{const target=targetEnemy(run,.6,16);if(target){run.intel[target.kind]=3;target.scanned=true;target.scanComplete=true;run.seen.add(target.kind);announce(run,'AST KIT · '+run.catalog.enemyById[target.kind].phenotype);}else{run.upgrades.scanner=1;announce(run,'CULTURE KIT · 검사 속도 향상');}}run.events.push('pickup');
  }
  if(run.upgrades.immune){run.immuneTime-=dt;if(run.immuneTime<=0){run.immuneTime=(run.host==='neutropenia'?24:10)*(stage.immuneDelay||1);const e=run.enemies.find(e=>e.active&&!['Dead','Dormant','Idle'].includes(e.state)&&!e.elite&&!e.boss&&!run.catalog.enemyById[e.kind].resistant&&!run.catalog.enemyById[e.kind].viral&&!run.catalog.enemyById[e.kind].parasite&&e.hp<=35&&e.shield<=0&&!protectedBySource(run,e)&&Math.hypot(e.x-run.player.x,e.y-run.player.y)<5&&lineOfSight(run.map,e,run.player));if(e){kill(run,e,'immune');announce(run,'IMMUNE CLEARANCE · 약한 병원체 제거');}}}
  updateRoomPacing(run);updateHuntGuide(run,dt);for(const t of run.tracers)t.life-=dt;while(run.tracers.length&&run.tracers[0].life<=0)run.tracers.shift();run.aim=targetEnemy(run,.1,22)?.id??null;if(run.status!=='running')return;
  const exitReady=canExtract(run);
  if(exitReady&&!run.exitOpen){run.exitOpen=true;announce(run,run.mission==='survival'?'EXIT OPEN · 계속 생존하거나 출구에서 철수하세요':'소탕 완료 · 출구로 탈출하세요',5);}
  if(exitReady&&Math.hypot(run.player.x-run.map.exit.x,run.player.y-run.map.exit.y)<1.1&&lineOfSight(run.map,run.player,run.map.exit)){
    run.lastReport=stageReport(run);if(run.mission!=='survival')run.completedStages++;run.score+=250+Math.round(run.player.hp)*2;
    if(run.mission==='survival'||run.mission==='single'||run.mission==='theme'||run.wave===STAGES.length-1){run.status='won';run.extracted=true;announce(run,'EXTRACTION COMPLETE',60);}else{run.status='reward';run.rewards=rewardOptions(run);}
  }else if(!exitReady&&Math.hypot(run.player.x-run.map.exit.x,run.player.y-run.map.exit.y)<1.5&&run.messageTime<=0)announce(run,run.mission==='survival'?'철수 출구 준비 중 · '+Math.ceil(90-run.time)+'초':'적이 남아 있습니다 · '+remainingEnemies(run)+'마리',3);
}



export function recruitCompanion(run,id){
 if(!COMPANIONS.some(c=>c.id===id))return false;
 if(!run.companions.includes(id))run.companions.push(id);
 run.companion=id;Object.assign(run.pet,run.player,{cooldown:.65,flash:0,target:null});return true;
}
export function equipCompanion(run,id){
 if(!['ready','paused'].includes(run.status)||!(id==='none'||run.companions.includes(id)))return false;
 run.companion=id;Object.assign(run.pet,run.player,{cooldown:.65,flash:0,target:null});return true;
}
export function companionAccepts(id,profile){
 if(id==='nk')return Boolean(profile.viral);
 if(id==='eosinophil')return Boolean(profile.helminth);
 return ['neutrophil','macrophage'].includes(id)&&!profile.viral&&!profile.parasite;
}
function updateCompanion(run,dt){
 const c=COMPANIONS.find(c=>c.id===run.companion),pet=run.pet,p=run.player;if(!c)return;
 pet.flash=Math.max(0,pet.flash-dt);pet.cooldown=Math.max(0,pet.cooldown-dt);
 const x=p.x+Math.cos(p.angle)*1.9+Math.sin(p.angle)*.7,y=p.y+Math.sin(p.angle)*1.9-Math.cos(p.angle)*.7;
 const goal=canStand(run.map,x,y,.12)&&lineOfSight(run.map,p,{x,y})?{x,y}:p;
 if(Math.hypot(pet.x-p.x,pet.y-p.y)>3.5||!lineOfSight(run.map,p,pet)){pet.x=p.x;pet.y=p.y;}
 const dx=goal.x-pet.x,dy=goal.y-pet.y,d=Math.hypot(dx,dy);
 if(d>.04)moveBody(run.map,pet,dx*Math.min(1,dt*8),dy*Math.min(1,dt*8),.12);
 if(pet.cooldown>0)return;
 const level=run.upgrades.immuneBoost||0,range=c.range+level*.35;
 let target=null,score=Infinity;
 for(const e of run.enemies){
  if(!e.active||!e.revealed||!['Detect','Chase','Attack','Search'].includes(e.state)||!companionAccepts(c.id,run.catalog.enemyById[e.kind]))continue;
  const distance=Math.hypot(e.x-pet.x,e.y-pet.y);
  if(distance>range||!lineOfSight(run.map,pet,e)||!lineOfSight(run.map,p,e))continue;
  const rank=c.id==='macrophage'?e.hp/e.maxHp+distance*.025:distance;
  if(rank<score){target=e;score=rank;}
 }
 if(!target){pet.cooldown=.15;return;}
 // Host effects use their own target group; drug susceptibility is never modified.
 const hit=(e,scale=1)=>{
  let damage=c.damage*scale*(protectedBySource(run,e)?.4:1)*(e.cell>0&&c.id!=='nk'?.35:1);
  if(e.shield>0){const absorbed=Math.min(e.shield,damage);e.shield-=absorbed;damage-=absorbed;}
  e.hp-=damage;e.flash=.12;pet.shots++;
  if(c.id==='nk')e.replicationSuppressed=Math.max(e.replicationSuppressed,2.5);
  if(c.id==='eosinophil')e.slow=Math.max(e.slow,1);
  burst(run,e.x,e.y,c.color,3);if(e.hp<=0)kill(run,e,'companion');
 };
 hit(target);pet.flash=.18;pet.target={x:target.x,y:target.y};pet.echoTarget=null;
 if(run.upgrades.immuneEcho){const second=run.enemies.find(e=>e!==target&&e.active&&e.revealed&&['Detect','Chase','Attack','Search'].includes(e.state)&&companionAccepts(c.id,run.catalog.enemyById[e.kind])&&Math.hypot(e.x-pet.x,e.y-pet.y)<=range&&lineOfSight(run.map,pet,e)&&lineOfSight(run.map,p,e));
  if(second){hit(second,.45+.15*run.upgrades.immuneEcho);pet.echoTarget={x:second.x,y:second.y};}
 }
 pet.cooldown=c.interval*Math.pow(.88,level)*(c.id==='neutrophil'&&run.host==='neutropenia'?2.4:1);run.events.push('ally');
}

export function throwGrenade(run){
 if(run.status!=='running'||run.grenadeCooldown>0||run.grenades<=0)return false;
 const g=run.thrown.find(g=>!g.active);if(!g)return false;
 const p=run.player;Object.assign(g,{active:true,x:p.x,y:p.y,z:eyeAt(run.map,p),vx:Math.cos(p.angle)*6,vy:Math.sin(p.angle)*6,vz:2.2+(p.pitch||0)*3,fuse:1.1});
 run.grenades--;run.grenadeCooldown=.65;run.throwTime=.35;run.events.push('throw');return true;
}
function updateThrowables(run,dt){
 for(const g of run.thrown){if(!g.active)continue;g.fuse-=dt;const x=g.x+g.vx*dt,y=g.y+g.vy*dt;
  if(canStand(run.map,x,y,.08)&&g.z>floorAt(run.map,x,y)+.06){g.x=x;g.y=y;}else{g.vx=0;g.vy=0;g.fuse=Math.min(g.fuse,.15);}
  g.vz-=8*dt;g.z+=g.vz*dt;
  if(g.z<=floorAt(run.map,g.x,g.y)+.06||g.fuse<=0){g.active=false;const field=run.fields.find(f=>!f.active)||run.fields.reduce((a,b)=>a.life<b.life?a:b);Object.assign(field,{active:true,kind:'disinfectant',x:g.x,y:g.y,life:4.5+(run.upgrades.grenadier||0),radius:2.3+(run.upgrades.grenadier||0)*.2});burst(run,g.x,g.y,'#99eadb',16);run.events.push('disinfect');}
 }
 for(const field of run.fields){if(!field.active)continue;field.life-=dt;if(field.life<=0){field.active=false;continue;}
  for(const e of run.enemies){if(!e.active||['Dead','Dormant'].includes(e.state)||(field.kind!=='isolation'&&run.catalog.enemyById[e.kind].parasite)||Math.hypot(e.x-field.x,e.y-field.y)>field.radius||!lineOfSight(run.map,field,e))continue;
   if(field.kind==='isolation'){e.slow=Math.max(e.slow,.25);continue;}
   // Environmental decontamination is a separate arcade action, never an AST override.
   e.hp-=18*dt*(protectedBySource(run,e)?.45:1);e.flash=Math.max(e.flash,.04);e.revealed=true;e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};
   if(e.hp<=0)kill(run,e,'disinfectant','environment');
  }
 }
}
function dropExperience(run,e){
 const value=e.boss?45:e.miniboss?24:e.elite?9:5,orb=run.orbs.find(o=>!o.active);
 if(orb)Object.assign(orb,{active:true,x:e.x,y:e.y,value});
 else{const nearest=run.orbs.reduce((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)<Math.hypot(b.x-e.x,b.y-e.y)?a:b);nearest.value+=value;}
}
export function augmentOptions(run){return AUGMENTS.filter(a=>(!a.max||(run.upgrades[a.id]||0)<a.max)&&(!a.companion||!run.companions.includes(a.companion))&&(!a.requiresCompanion||run.companions.length>0)).map(a=>({a,roll:run.random()})).sort((a,b)=>a.roll-b.roll).slice(0,3).map(o=>o.a);}
export function chooseAugment(run,id){
 if(run.status!=='augment')return false;const choice=run.augmentChoices.find(a=>a.id===id);if(!choice)return false;
 run.upgrades[id]=(run.upgrades[id]||0)+1;if(choice.companion)recruitCompanion(run,choice.companion);if(id==='stewardship'){run.pressure=Math.max(0,run.pressure-35);run.player.hp=Math.min(100,run.player.hp+20);}
 if(id==='grenadier')run.grenades=Math.min(5,run.grenades+2);if(id==='support')run.player.hp=Math.min(100,run.player.hp+50);if(id==='reserve'){refill(run);run.grenades=Math.min(5,run.grenades+1);}
 run.augmentChoices=[];run.status='paused';announce(run,'LV '+run.level+' · '+choice.title+' 장착',3);return true;
}
function updateSurvival(run,dt){
 const tier=Math.min(STAGES.length-1,Math.floor(run.time/70));
 if(tier>run.wave){const previousTier=run.wave;run.wave=tier;const issued=[];run.catalog.weapons.forEach((w,i)=>{if(w.stage<=tier&&!run.unlocked[i]){run.unlocked[i]=true;issued.push(w.short);run.energy[i]=maxAmmo(run);run.magazines[i]=magazineCapacity(run,i);}});
  if(previousTier<5&&tier>=5)run.slots[0]=9;if(previousTier<6&&tier>=6)run.slots[1]=10;if(!isWeaponReady(run,run.weapon))run.weapon=run.slots.find(i=>isWeaponReady(run,i));
  announce(run,'위협 단계 '+(tier+1)+' / '+(issued.length?issued.join(' · ')+' 보급':'새 병원체 유입'),4);
 }
 const director=run.director,cycle=run.time%75,nextPhase=run.time<director.restUntil?'recover':cycle<30?'build':cycle<48?'surge':cycle<60?'fade':'recover';
 if(director.phase!==nextPhase){director.phase=nextPhase;announce(run,{build:'유입 증가 · 검체와 보급을 확보하세요',surge:'집중 교전 · 병원체를 보고 약제 전환',fade:'유입 감소 · 남은 표적 정리',recover:'재정비 · 보급과 증강 회수'}[nextPhase],3);}
 const active=run.enemies.filter(e=>e.active&&e.state!=='Dead').length,baseCap=Math.min(MAX_SURVIVAL_ENEMIES,8+Math.floor(run.time/20)),cap=nextPhase==='recover'?Math.min(8,baseCap):nextPhase==='fade'?Math.ceil(baseCap*.65):baseCap;
 if(run.spawnTimer<=0&&active<cap){
  const spots=run.map.spawnSpots;let position;
  for(let n=0;n<spots.length;n++){const candidate=spots[run.spawnCursor++%spots.length],d=Math.hypot(candidate.x-run.player.x,candidate.y-run.player.y);
   if(d<6||d>22||run.enemies.some(e=>e.active&&Math.hypot(e.x-candidate.x,e.y-candidate.y)<.7))continue;
   const facing=Math.abs(angleDelta(Math.atan2(candidate.y-run.player.y,candidate.x-run.player.x)-run.player.angle));
   if(lineOfSight(run.map,run.player,candidate)&&facing<1.15)continue;position=candidate;break;
  }
  if(position){
   const pool=[...new Set(STAGES.slice(0,tier+1).flatMap(s=>s.pool))],basic=['pneumo','mssa','ecoli','klebs'],baseline=run.spawned%3!==2;
   const kinds=baseline?basic:pool.filter(kind=>!run.catalog.enemyById[kind].resistant||run.random()<.35),resistant=pool.filter(kind=>run.catalog.enemyById[kind].resistant);
   let kind=kinds[Math.floor(run.random()*kinds.length)],pressureSpawn=false;
   if(!baseline&&!run.catalog.enemyById[kind].resistant&&!run.catalog.enemyById[kind].regimenScenarios&&resistant.length&&run.random()<resistanceChance(run.pressure)){kind=resistant[Math.floor(run.random()*resistant.length)];pressureSpawn=true;}
   const bossDue=run.time>=director.nextBoss&&!run.enemies.some(e=>e.active&&e.state!=='Dead'&&(e.boss||e.miniboss)),boss=bossDue&&director.bossNumber%2===1,miniboss=bossDue&&!boss;
    if(bossDue){kind=run.time>=440?'kpc':run.time>=300?'pseudo':boss?'mssa':'pneumo';director.bossNumber++;director.nextBoss=run.time+120;director.restUntil=0;}
    const baseElite=.05+Math.min(.2,run.time/2000),eliteRoll=run.random(),elite=!bossDue&&run.time>40&&eliteRoll<baseElite+resistanceChance(run.pressure)*.3,e=spawnEnemy(run,kind,{...position,baseline:baseline||bossDue,miniboss},elite,{boss});
   if(e&&pressureSpawn){e.pressureSpawn=true;run.pressureReplacements++;run.pressureNotice=5;}if(e&&elite&&eliteRoll>=baseElite){run.pressureElites++;run.pressureNotice=5;}
   if(e){const scale=1+Math.min(2,Math.max(0,run.time-280)/1200);e.hp*=scale;e.maxHp=e.hp;if(e.state!=='Dormant'){e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};}run.spawned++;}
  }
  run.spawnTimer=Math.max(.55,1.9-run.time/480)*(nextPhase==='surge'?.7:nextPhase==='recover'?3:nextPhase==='fade'?1.6:1);
 }
 run.pulseTime-=dt;
 if(run.upgrades.cephaPulse&&run.pulseTime<=0){
  const level=run.upgrades.cephaPulse,w=run.catalog.weaponById.ceftriaxone,range=3+level*.45;let hits=0;
  for(const e of run.enemies)if(e.active&&!['Dead','Dormant'].includes(e.state)&&Math.hypot(e.x-run.player.x,e.y-run.player.y)<range&&lineOfSight(run.map,run.player,e)&&combatCoverage(run,w,e.kind).factor){applyHit(run,e,w,30+level*12,{dot:true,automatic:true});if(hits<4){if(run.tracers.length>=12)run.tracers.shift();run.tracers.push({x:run.player.x,y:run.player.y,z:eyeAt(run.map,run.player),ex:e.x,ey:e.y,ez:eyeAt(run.map,e),mode:'beam',color:w.color,life:.3});}hits++;}
  if(hits){run.pressure=clamp(run.pressure+.7,0,100);run.pressureAdded+=.7;run.isolationPulse=.35;burst(run,run.player.x,run.player.y,w.color,8);run.events.push('pulse');}
  run.pulseTime=Math.max(1.6,3.8-level*.4);
 }
 run.recoveryTime-=dt;if(run.upgrades.recovery&&run.recoveryTime<=0){run.player.hp=Math.min(100,run.player.hp+2+run.upgrades.recovery*2);run.recoveryTime=run.host==='neutropenia'?12:6;}
 const radius=1.5+(run.upgrades.magnet||0)*1.1;
 for(const orb of run.orbs){if(!orb.active)continue;const dx=run.player.x-orb.x,dy=run.player.y-orb.y,d=Math.hypot(dx,dy);if(d>radius||!lineOfSight(run.map,run.player,orb))continue;
  if(d<.55){orb.active=false;run.xp+=orb.value;run.score+=orb.value*2;run.events.push('xp');}else moveBody(run.map,orb,dx/d*Math.min(d,6*dt),dy/d*Math.min(d,6*dt),.05);
 }
 if(run.xp>=run.xpNeeded&&run.status==='running'){run.xp-=run.xpNeeded;run.level++;run.xpNeeded=12+run.level*6;run.augmentChoices=augmentOptions(run);run.status='augment';run.events.push('level');}
}
