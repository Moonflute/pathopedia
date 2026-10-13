import { createMap, STAGES, REWARDS, roomAt } from './play-data.mjs';

export const MAX_ENEMIES=24,MAX_PARTICLES=80,MAX_PROJECTILES=24,MAX_HAZARDS=12,BASE_AMMO=200;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const angleDelta=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function seededRandom(seed=Date.now()){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function tileAt(map,x,y){const ix=Math.floor(x),iy=Math.floor(y);return ix<0||iy<0||ix>=map.width||iy>=map.height?1:map.cells[iy*map.width+ix];}
export function canStand(map,x,y,r=.22){return !tileAt(map,x-r,y-r)&&!tileAt(map,x+r,y-r)&&!tileAt(map,x-r,y+r)&&!tileAt(map,x+r,y+r);}
export function moveBody(map,body,dx,dy,r=.22){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.15));for(let i=0;i<steps;i++){if(canStand(map,body.x+dx/steps,body.y,r))body.x+=dx/steps;if(canStand(map,body.x,body.y+dy/steps,r))body.y+=dy/steps;}}
export function castRay(map,x,y,dx,dy,max=40){
  let mx=Math.floor(x),my=Math.floor(y),side=0,dist=0;
  const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9)),sx=dx<0?-1:1,sy=dy<0?-1:1;
  let tx=(dx<0?x-mx:mx+1-x)*ddx,ty=(dy<0?y-my:my+1-y)*ddy;
  for(let i=0;i<120;i++){if(tx<ty){dist=tx;tx+=ddx;mx+=sx;side=0;}else{dist=ty;ty+=ddy;my+=sy;side=1;}const tile=tileAt(map,mx,my);if(tile||dist>=max){const hit=side?x+dist*dx:y+dist*dy;return {distance:Math.min(max,dist),side,tile,u:hit-Math.floor(hit)};}}
  return {distance:max,side:0,tile:0,u:0};
}
export function lineOfSight(map,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);return d<.01||castRay(map,a.x,a.y,dx/d,dy/d,d+.1).distance>=d-.08;}
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
  if(run.status!=='running'||run.reloadTime>0||!isWeaponReady(run,i)||needed<.01)return false;
  if(run.energy[i]+run.magazines[i]<shotCost(run,w)){announce(run,'예비 탄약 보급 중 · Q / 휠로 전환',1);return false;}
  if(run.energy[i]<=0)return false;
  run.reloadDuration=w.reload;run.reloadTime=w.reload;run.reloadWeapon=i;run.lastShot=0;run.events.push('reload');return true;
}
export function equipWeapon(run,slot,index){
  if(run.status!=='paused'||slot<0||slot>=9||!run.unlocked[index]||!run.catalog.weapons[index])return false;
  const other=run.slots.indexOf(index),old=run.slots[slot];run.slots[slot]=index;if(other>=0)run.slots[other]=old;
  if(!run.slots.includes(run.weapon))run.weapon=index;run.reloadTime=0;run.hintTime=0;return true;
}
export function scanHints(run){
  if(run.hard||!run.hints||run.hintTime<=0)return [];
  const e=run.enemies.find(e=>e.active&&e.id===run.hintTarget&&e.state!=='Dead');
  if(!e||e.state==='Dormant'||targetEnemy(run,.18,18)!==e)return [];
  return run.slots.filter(i=>isWeaponReady(run,i)&&combatCoverage(run,run.catalog.weapons[i],e.kind).factor>0);
}
export const isWeaponReady=(run,index)=>Boolean(run.unlocked[index])&&run.slots.includes(index)&&!(run.host==='allergy'&&run.catalog.weapons[index]?.id==='ampicillin');
export const combatCoverage=(run,w,kind)=>coverage(run.catalog,w.id,kind,{site:run.map.site,host:run.host,scenarios:run.map.scenarios,exposure:Boolean(run.upgrades.exposure||(w.beta&&run.upgrades.infusion))});
export function newRun(catalog,{hard=false,hints=false,seed=Date.now(),host='normal',stage=0,mission='campaign'}={}){
  const index=clamp(Math.floor(Number(stage)||0),0,STAGES.length-1),map=createMap(index);
  const run={catalog,map,random:seededRandom(seed),seed,hard,hints:hints&&!hard,host,status:'ready',mission,startStage:index,time:0,wave:index,spawned:0,spawnTimer:0,
    player:{...map.spawn,hp:100,z:0,vz:0},weapon:host==='allergy'?1:0,previousWeapon:1,slots:Array.from({length:9},(_,i)=>index>=5&&i===0?9:index>=6&&i===1?10:i),magazines:catalog.weapons.map(w=>w.magazine*w.cost),reloadTime:0,reloadDuration:1,reloadWeapon:null,jumpHeld:false,land:0,energy:catalog.weapons.map(()=>BASE_AMMO),unlocked:catalog.weapons.map(w=>w.stage<=index),cooldown:0,cooldowns:catalog.weapons.map(()=>0),switchTime:0,pressure:0,
    kills:0,stageKills:0,shots:0,effective:0,combo:0,comboTime:0,bestCombo:0,score:0,dash:0,dashCooldown:0,scannerCooldown:0,sourceCooldown:0,totalSources:0,completedStages:0,
    intel:Object.fromEntries(catalog.enemies.map(e=>[e.id,hard?0:3])),seen:new Set(),visited:new Set([0]),upgrades:{},rewards:[],immuneTime:host==='neutropenia'?24:10,
    enemies:Array.from({length:MAX_ENEMIES},(_,id)=>({id,active:false})),particles:Array.from({length:MAX_PARTICLES},()=>({life:0})),projectiles:Array.from({length:MAX_PROJECTILES},()=>({active:false})),hazards:Array.from({length:MAX_HAZARDS},(_,id)=>({id,active:false})),
    flow:new Int16Array(map.cells.length).fill(-1),queue:new Int16Array(map.cells.length),navCache:new Map(),flowTime:0,
    aim:null,hintTarget:null,hintTime:0,ricochet:0,lastShot:0,hurt:0,hit:0,scanPulse:0,walk:0,message:'WASD 이동 · 1–9 / 휠 전환 · Q 이전 무기',messageTime:6,events:[],extracted:false};
  if(!isWeaponReady(run,run.weapon))run.weapon=run.slots.find(i=>isWeaponReady(run,i));prepareEncounters(run);return run;
}
function prepareEncounters(run){
  run.pressureTier=run.pressure>=70?2:run.pressure>=40?1:0;
  const stage=STAGES[run.wave],map=run.map,rooms=map.rooms.filter(r=>r.id!==roomAt(map,map.spawn.x,map.spawn.y));run.pending=[];
  const occupied=new Set(),spots=new Map(rooms.map(r=>{const list=[];
    for(let y=1;y<map.height-1;y++)for(let x=1;x<map.width-1;x++){const p={x:x+.5,y:y+.5};if(roomAt(map,p.x,p.y)===r.id&&canStand(map,p.x,p.y,.22)&&Math.hypot(p.x-map.spawn.x,p.y-map.spawn.y)>=6&&!lineOfSight(map,map.spawn,p))list.push(p);}
    list.sort((a,b)=>Math.hypot(a.x-r.x,a.y-r.y)-Math.hypot(b.x-r.x,b.y-r.y));return [r.id,list];}));
  const populated=rooms.filter(r=>spots.get(r.id).length);
  for(let i=0;i<stage.count;i++){
    const r=populated[i%populated.length],options=spots.get(r.id),p=options.find(p=>!occupied.has(p.x+','+p.y))||options[0],boss=Boolean(stage.boss&&i===stage.count-1),position=boss?map.boss:p;
    occupied.add(position.x+','+position.y);run.pending.push({...position,room:roomAt(map,position.x,position.y),kind:boss?'kpc':stage.pool[i%stage.pool.length],boss});
  }
}
export function announce(run,text,seconds=2.5){run.message=text;run.messageTime=seconds;}
export function resistanceChance(pressure){return pressure>=70?.55:pressure>=40?.28:0;}
export function switchWeapon(run,index){if(!isWeaponReady(run,index)||run.weapon===index)return false;run.reloadTime=0;run.reloadWeapon=null;run.previousWeapon=run.weapon;run.weapon=index;run.cooldown=run.cooldowns[index];run.switchTime=.1;run.events.push('switch');return true;}
export function cycleWeapon(run,direction=1){const slot=run.slots.indexOf(run.weapon);for(let n=1;n<=run.slots.length;n++){const i=run.slots[(slot+direction*n+run.slots.length*2)%run.slots.length];if(isWeaponReady(run,i))return switchWeapon(run,i);}return false;}
export function visibleLabel(run,e){const p=run.catalog.enemyById[e.kind],level=run.intel[e.kind];if(level===0)return '???';if(level===1)return p.gram;return p.short+(level>=3?' · '+p.phenotype:'');}
export function targetEnemy(run,cone=.1,range=24){
  let best=null,bestDistance=range;
  for(const e of run.enemies){if(!e.active||e.state==='Dead')continue;const dx=e.x-run.player.x,dy=e.y-run.player.y,d=Math.hypot(dx,dy);if(d>bestDistance||Math.abs(angleDelta(Math.atan2(dy,dx)-run.player.angle))>Math.max(cone,Math.atan2(e.boss?.6:.3,d)))continue;if(lineOfSight(run.map,run.player,e)){best=e;bestDistance=d;}}
  return best;
}
export function scan(run){
  if(run.status!=='running'||run.scannerCooldown>0)return false;const e=targetEnemy(run,.18,18);if(!e){announce(run,'적을 조준하고 E · 검사 중에도 이동/사격 가능');return false;}
  run.intel[e.kind]=Math.min(3,run.intel[e.kind]+(run.upgrades.scanner?2:1));run.seen.add(e.kind);run.scannerCooldown=.55;run.scanPulse=.8;run.hintTarget=e.id;run.hintTime=8;
  const p=run.catalog.enemyById[e.kind];announce(run,['???','SCANNER · '+p.gram,(p.viral||p.parasite?'IDENTIFY · ':'CULTURE · ')+p.short,(p.viral||p.parasite?'REGIMEN · ':'AST · ')+p.phenotype+' / '+p.trait][run.intel[e.kind]]);run.events.push('scan');return true;
}
function burst(run,x,y,color,count=8){for(let i=0;i<count;i++){const p=run.particles.find(p=>p.life<=0);if(!p)break;const a=run.random()*Math.PI*2;Object.assign(p,{x,y,z:.3+run.random()*.5,vx:Math.cos(a)*.8,vy:Math.sin(a)*.8,vz:1,color,ricochet:false,life:.3+run.random()*.35});}}
function ricochet(run,e,result){
  run.ricochet=.22;const color=['R','INACTIVE'].includes(result.category)?'#ffca79':'#b9d8eb',a=Math.atan2(run.player.y-e.y,run.player.x-e.x);
  for(let i=0;i<7;i++){const p=run.particles.find(p=>p.life<=0);if(!p)break;const angle=a+(run.random()-.5)*1.8,x=e.x+Math.cos(a)*.22,y=e.y+Math.sin(a)*.22;Object.assign(p,{x,y,px:x,py:y,z:.5,pz:.5,vx:Math.cos(angle)*(2+run.random()*2),vy:Math.sin(angle)*(2+run.random()*2),vz:1+run.random(),color,life:.32,ricochet:true});}
}
function refill(run,amount=Infinity){for(let i=0;i<run.energy.length;i++)run.energy[i]=Math.min(maxAmmo(run),run.energy[i]+amount);}
export function protectedBySource(run,e){
  return run.map.sources.some(s=>s.active&&Math.hypot(e.x-s.x,e.y-s.y)<4&&lineOfSight(run.map,e,s))||run.enemies.some(b=>b.active&&b.state!=='Dead'&&b.biofilm&&Math.hypot(e.x-b.x,e.y-b.y)<2.7&&lineOfSight(run.map,e,b));
}
export function controlSource(run){
  if(run.status!=='running'||run.sourceCooldown>0)return false;
  const near=s=>Math.hypot(s.x-run.player.x,s.y-run.player.y)<(run.upgrades.source?3.6:2.3)&&lineOfSight(run.map,run.player,s);
  const source=run.map.sources.find(s=>s.active&&near(s));let changed=false;
  if(source){source.active=false;run.totalSources++;run.pressure=Math.max(0,run.pressure-8);run.score+=150;run.player.hp=Math.min(100,run.player.hp+8);refill(run,35);announce(run,source.label+' 제거 · biofilm 해제 / 보급 +35',3.5);burst(run,source.x,source.y,'#82e5d4',16);changed=true;}
  for(const e of run.enemies){if(!e.active||e.state==='Dead'||!near(e))continue;if(e.state==='Dormant'){kill(run,e,'source');changed=true;announce(run,'SOURCE CONTROL · 휴면 포자 오염원 제거');}else if(e.biofilm){e.biofilm=false;changed=true;announce(run,'BIOFILM DISRUPTED · 주변 보호 해제');}}
  for(const h of run.hazards)if(h.active&&near(h)){h.active=false;changed=true;announce(run,'SOURCE CONTROL · 오염 구역 제거');}
  if(!changed){announce(run,'감염원 / biofilm / 오염 구역 가까이에서 F',1.5);return false;}
  run.sourceCooldown=run.upgrades.source?1:2.8;run.events.push('source');return true;
}
export function spawnEnemy(run,kind,position,elite=false,{boss=false,slot=null}={}){
  const e=slot||run.enemies.find(e=>!e.active),p=run.catalog.enemyById[kind];if(!e||!p||!canStand(run.map,position.x,position.y,.18))return null;
  const hp=boss?460:p.hp*(elite?1.35:1);
  Object.assign(e,{...position,active:true,kind,elite,boss,hp,maxHp:hp,shield:p.shield+(boss?50:0),state:p.spore?'Dormant':'Idle',biofilm:Boolean(p.biofilm),timer:0,attackCooldown:.8,flash:0,age:0,dot:0,dotWeapon:null,death:0,knock:0,memory:0,lastSeen:null,navTime:0,waypoint:null,revealed:false,cell:p.intracellular?45:0,slow:0,telegraph:0,replicationSuppressed:0,replication:6});return e;
}
function leaveToxin(run,e){const h=run.hazards.find(h=>!h.active);if(h)Object.assign(h,{active:true,x:e.x,y:e.y,life:7,radius:1.25,hitCooldown:.4});}
function kill(run,e,weaponId){
  if(e.state==='Dead')return;const dormant=e.state==='Dormant';
  e.state='Dead';e.death=.45;e.dot=0;e.biofilm=false;run.kills++;run.stageKills++;run.combo=run.comboTime>0?run.combo+1:1;run.comboTime=5;run.bestCombo=Math.max(run.bestCombo,run.combo);run.score+=100+Math.min(run.combo,10)*15+(e.elite?80:0)+(e.boss?1200:0);
  if(['ampicillin','cefazolin','metronidazole'].includes(weaponId))run.pressure=Math.max(0,run.pressure-(run.upgrades.stewardship?3:1.3));
  if(run.catalog.enemyById[e.kind].toxin&&!dormant)leaveToxin(run,e);
  refill(run,10);burst(run,e.x,e.y,run.catalog.enemyById[e.kind].color,12);run.events.push('kill');
}
export function applyHit(run,e,weapon,damage=weapon.damage,{dot=false}={}){
  if(!e.active||e.state==='Dead')return {factor:0};
  if(!dot&&e.state!=='Dormant'){e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};e.revealed=true;}
  const result=combatCoverage(run,weapon,e.kind);
  // Clinical gate always precedes every damage multiplier, shield, DOT and upgrade.
  if(!result.factor){if(!dot){announce(run,result.reason,1.5);run.events.push('resist');ricochet(run,e,result);}return result;}
  if(e.state==='Dormant'){if(!dot){announce(run,'휴면 포자 · 항생제 피해 없음 / F 오염원 제거 또는 발아 후 대응');ricochet(run,e,{category:'DORMANT'});}return {...result,factor:0};}
  let amount=damage*result.factor*(protectedBySource(run,e)?run.upgrades.penetration?.72:.42:1);e.flash=.13;run.hit=.12;
  if(e.cell>0){if(weapon.intracellular){e.cell=0;e.slow=1.6;}else{const absorbed=Math.min(e.cell,amount);e.cell-=absorbed;amount-=absorbed;}}
  if(e.shield>0){const absorbed=Math.min(e.shield,amount);e.shield-=absorbed;amount-=absorbed;}e.hp-=amount;
  if(weapon.id==='ivermectin'&&run.catalog.enemyById[e.kind].parasite)e.slow=2;
  if(weapon.id==='ganciclovir'&&run.catalog.enemyById[e.kind].viral)e.replicationSuppressed=5;
  if(!dot){run.effective++;e.knock=.07;burst(run,e.x,e.y,weapon.color,4);if(run.upgrades.infusion&&weapon.beta){e.dot=1.6;e.dotWeapon=weapon.id;}}
  if(e.hp<=0)kill(run,e,weapon.id);return result;
}
export function fire(run){
  if(run.status!=='running'||!isWeaponReady(run,run.weapon)||run.cooldowns[run.weapon]>0||run.switchTime>0||run.reloadTime>0)return false;
  const w=run.catalog.weapons[run.weapon],cost=shotCost(run,w);if(run.magazines[run.weapon]+.0001<cost){reload(run);return false;}
  run.magazines[run.weapon]=Math.max(0,run.magazines[run.weapon]-cost);run.cooldown=w.interval*Math.pow(.86,run.upgrades.rate||0);run.cooldowns[run.weapon]=run.cooldown;run.lastShot=.18;run.shots++;run.pressure=clamp(run.pressure+w.pressure,0,100);run.events.push('shot');
  const e=targetEnemy(run,w.spread,w.range);if(e){run.seen.add(e.kind);applyHit(run,e,w);}return true;
}
export function canDetect(run,e){
  const dx=e.x-run.player.x,dy=e.y-run.player.y,d=Math.hypot(dx,dy);
  return d<=7.5&&roomAt(run.map,e.x,e.y)===roomAt(run.map,run.player.x,run.player.y)&&Math.abs(angleDelta(Math.atan2(dy,dx)-run.player.angle))<=Math.atan(.72)&&lineOfSight(run.map,run.player,e);
}
function nextSpawn(run){
  // Every encounter is placed outside the entry room and entry sightline before exploration.
  // The bounded pool fits the entire stage, so no enemy needs to pop into an explored room.
  const idx=run.pending.length?0:-1;
  if(idx<0)return false;
  const plan=run.pending[idx],stage=STAGES[run.wave],chance=resistanceChance(run.pressure);
  let kind=plan.kind;const resistant=run.wave>=6?['mrsa','esbl','kpc','mdr','vre']:run.wave>=5?['mrsa','esbl','vre']:['mrsa','esbl'];
  if(!plan.boss&&!run.catalog.enemyById[kind].regimenScenarios&&run.random()<chance)kind=resistant[Math.floor(run.random()*resistant.length)];
  const e=spawnEnemy(run,kind,plan,!plan.boss&&run.random()<Math.max(stage.elite,chance*.5),{boss:plan.boss});
  if(!e)return false;run.pending.splice(idx,1);return true;
}
function escalateUnseenEncounters(run){
  const tier=run.pressure>=70?2:run.pressure>=40?1:0;if(tier<=run.pressureTier)return;run.pressureTier=tier;
  const pool=run.wave>=6?['mrsa','esbl','kpc','mdr','vre']:run.wave>=5?['mrsa','esbl','vre']:['mrsa','esbl'];
  for(const e of run.enemies){if(!e.active||e.state!=='Idle'||e.revealed||e.boss||run.catalog.enemyById[e.kind].regimenScenarios||lineOfSight(run.map,run.player,e))continue;
    if(run.random()<resistanceChance(run.pressure)){const kind=pool[Math.floor(run.random()*pool.length)];spawnEnemy(run,kind,{x:e.x,y:e.y,room:e.room},run.random()<.35,{slot:e});}
  }
}
function pathStep(run,body,goal){
  const {map}=run,cell=Math.floor(goal.y)*map.width+Math.floor(goal.x);let flow=run.navCache.get(cell);
  if(!flow){flow=new Int16Array(map.cells.length).fill(-1);const queue=run.queue;let head=0,tail=1;queue[0]=cell;flow[cell]=0;while(head<tail){const i=queue[head++];for(const n of [i-1,i+1,i-map.width,i+map.width])if(n>=0&&n<flow.length&&!map.cells[n]&&flow[n]===-1){flow[n]=flow[i]+1;queue[tail++]=n;}}if(run.navCache.size>=16)run.navCache.clear();run.navCache.set(cell,flow);}
  const i=Math.floor(body.y)*map.width+Math.floor(body.x);if(i===cell)return goal;let best=i;for(const n of [i-1,i+1,i-map.width,i+map.width])if(flow[n]>=0&&(flow[best]<0||flow[n]<flow[best]))best=n;
  return {x:best%map.width+.5,y:Math.floor(best/map.width)+.5};
}
function hurt(run,damage){if(run.status!=='running')return;run.player.hp=Math.max(0,run.player.hp-damage);run.hurt=.32;run.combo=0;run.events.push('hurt');if(run.player.hp<=0){run.status='lost';announce(run,'CONTAINMENT FAILED',60);}}
function projectile(run,e,offset=0){const b=run.projectiles.find(b=>!b.active);if(!b)return;const a=Math.atan2(run.player.y-e.y,run.player.x-e.x)+offset,p=run.catalog.enemyById[e.kind];Object.assign(b,{active:true,x:e.x,y:e.y,vx:Math.cos(a)*(e.boss?3.2:3.5),vy:Math.sin(a)*(e.boss?3.2:3.5),life:5,damage:p.damage,color:p.color});}
function moveEnemy(run,e,goal,p,dt){
  e.navTime-=dt;if(!e.waypoint||e.navTime<=0){e.waypoint=lineOfSight(run.map,e,goal)?goal:pathStep(run,e,goal);e.navTime=.4;}
  let dx=e.waypoint.x-e.x,dy=e.waypoint.y-e.y,len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  for(const other of run.enemies){if(other===e||!other.active||other.state==='Dead'||other.state==='Dormant')continue;const ex=e.x-other.x,ey=e.y-other.y,ed=Math.hypot(ex,ey);if(ed>0&&ed<.6){dx+=ex/ed*(.6-ed)*2;dy+=ey/ed*(.6-ed)*2;}}
  const speed=p.speed*(p.parasite?1+Math.sin(run.time*4+e.id)*.3:1)*(e.elite?1.1:1)*(e.boss?.8:1)*(e.slow>0?.45:1)*(e.knock>0?-.6:1);moveBody(run.map,e,dx*speed*dt,dy*speed*dt,.18);
}
function updateEnemy(run,e,dt){
  if(!e.active)return;e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.attackCooldown-=dt;e.slow=Math.max(0,e.slow-dt);e.replicationSuppressed=Math.max(0,e.replicationSuppressed-dt);
  if(e.state==='Dead'){e.death-=dt;if(e.death<=0)e.active=false;return;}
  const p=run.catalog.enemyById[e.kind],d=Math.hypot(e.x-run.player.x,e.y-run.player.y),contact=canDetect(run,e),los=d<11&&lineOfSight(run.map,e,run.player);
  if(contact){run.seen.add(e.kind);e.revealed=true;}
  if(e.state==='Dormant'){if(contact)e.timer+=dt;if(e.timer>=2){e.state='Detect';e.timer=.3;announce(run,'포자 발아 · 이제 활성 약제로 대응 가능');}return;}
  if(e.state==='Idle'&&contact){e.state='Detect';e.timer=.3;}
  if(e.state==='Detect'){
    if(!contact){e.state='Idle';e.timer=0;}else{e.timer-=dt;if(e.timer<=0){e.state='Chase';e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};}}
  }else if(['Chase','Attack','Search'].includes(e.state)){
    if(los){e.memory=5;e.lastSeen={x:run.player.x,y:run.player.y};}else{e.memory-=dt;e.state='Search';}
    if(e.memory<=0||!e.lastSeen){e.state='Idle';e.lastSeen=null;e.waypoint=null;}
    else if(e.boss&&los&&d<9&&e.attackCooldown<=0){
      if(!e.telegraph){e.telegraph=.7;e.attackCooldown=.7;announce(run,'KPC 군체 · 탄막 준비 / 옆으로 피하세요',1.2);}
    }else if(d<.85&&los){e.state='Attack';if(e.attackCooldown<=0){if(run.player.z<.32)hurt(run,p.damage*(e.elite?1.2:1));e.attackCooldown=1.25;if(p.toxin)leaveToxin(run,e);}}
    else if(p.ranged&&los&&d>3&&d<8&&e.attackCooldown<=0){projectile(run,e);e.attackCooldown=3;e.state='Attack';}
    else{if(los)e.state='Chase';moveEnemy(run,e,e.lastSeen,p,dt);}
  }
  if(e.telegraph>0){e.telegraph=Math.max(0,e.telegraph-dt);if(e.telegraph===0){if(los){for(const angle of (e.hp<e.maxHp*.5?[-.35,-.18,0,.18,.35]:[-.2,0,.2]))projectile(run,e,angle);}e.attackCooldown=3.5;}}
  if(p.viral&&e.replicationSuppressed===0&&['Chase','Attack'].includes(e.state)){e.replication-=dt;if(e.replication<=0){e.hp=Math.min(e.maxHp,e.hp+10);e.replication=6;burst(run,e.x,e.y,p.color,3);}}
  e.knock=Math.max(0,e.knock-dt);if(e.dot>0){e.dot-=dt;applyHit(run,e,run.catalog.weaponById[e.dotWeapon],12*dt,{dot:true});}
}
export function rewardOptions(run){return REWARDS.filter(r=>(!r.max||(run.upgrades[r.id]||0)<r.max)&&(!r.host||r.host===run.host)&&(!r.weapon||!run.unlocked[run.catalog.weapons.findIndex(w=>w.id===r.weapon)])).map(r=>({r,roll:run.random()})).sort((a,b)=>a.roll-b.roll).slice(0,3).map(o=>o.r);}
export function chooseReward(run,id){
  if(run.status!=='reward')return false;const reward=run.rewards.find(r=>r.id===id);if(!reward)return false;
  run.upgrades[id]=(run.upgrades[id]||0)+1;if(reward.weapon)run.unlocked[run.catalog.weapons.findIndex(w=>w.id===reward.weapon)]=true;
  if(id==='stewardship')run.pressure=Math.max(0,run.pressure-35);
  run.player.hp=Math.min(100,run.player.hp+(id==='support'?50:id==='source'?35:28));run.wave++;run.map=createMap(run.wave);Object.assign(run.player,run.map.spawn,{z:0,vz:0});run.reloadTime=0;run.hintTime=0;run.jumpHeld=false;run.queue=new Int16Array(run.map.cells.length);run.spawned=0;run.stageKills=0;run.spawnTimer=0;run.rewards=[];run.status='paused';run.visited=new Set([0]);run.navCache.clear();
  run.enemies.forEach(e=>e.active=false);run.projectiles.forEach(p=>p.active=false);run.particles.forEach(p=>p.life=0);run.hazards.forEach(h=>h.active=false);run.cooldowns.fill(0);run.cooldown=0;run.aim=null;run.sourceCooldown=0;
  const issued=[];run.catalog.weapons.forEach((w,i)=>{if(w.stage<=run.wave&&!run.unlocked[i]){run.unlocked[i]=true;issued.push(w.short);}});if(run.wave===5)run.slots[0]=9;if(run.wave===6)run.slots[1]=10;if(!isWeaponReady(run,run.weapon))run.weapon=run.slots.find(i=>isWeaponReady(run,i));run.magazines=run.catalog.weapons.map((w,i)=>magazineCapacity(run,i));refill(run);prepareEncounters(run);
  announce(run,'STAGE '+(run.wave+1)+' · '+STAGES[run.wave].label+(issued.length?' / '+issued.join(' + ')+' 보급':''),7);return true;
}
export function tick(run,input={},dt=1/60){
  if(run.status!=='running')return;dt=clamp(dt,0,.05);run.time+=dt;
  for(const k of ['cooldown','switchTime','dashCooldown','scannerCooldown','sourceCooldown','lastShot','hurt','hit','scanPulse','comboTime','messageTime','hintTime','ricochet','land'])run[k]=Math.max(0,run[k]-dt);
  for(let i=0;i<run.cooldowns.length;i++){
    run.cooldowns[i]=Math.max(0,run.cooldowns[i]-dt);const renal=(run.host==='renal'&&run.catalog.weapons[i].renal&&!run.upgrades.renal)? .75 : 1;
    run.energy[i]=Math.min(maxAmmo(run),run.energy[i]+dt*(i===run.weapon?8:26)*renal);
  }
  if(run.reloadTime>0){run.reloadTime=Math.max(0,run.reloadTime-dt);if(run.reloadTime===0){const i=run.reloadWeapon,amount=Math.min(magazineCapacity(run,i)-run.magazines[i],run.energy[i]);run.magazines[i]+=amount;run.energy[i]-=amount;run.reloadWeapon=null;run.events.push('loaded');}}
  run.cooldown=run.cooldowns[run.weapon];run.pressure=Math.max(0,run.pressure-dt*.12);
  run.player.angle=angleDelta(run.player.angle+(input.turn||0)*dt*2.1);
  if(input.jump&&!run.jumpHeld&&run.player.z===0){run.player.vz=3.65;run.events.push('jump');}run.jumpHeld=Boolean(input.jump);
  if(run.player.z>0||run.player.vz>0){run.player.vz-=14*dt;run.player.z+=run.player.vz*dt;if(run.player.z<=0){run.player.z=0;run.player.vz=0;run.land=.14;run.events.push('land');}}
  if(input.dash&&run.dashCooldown<=0){run.dash=.18;run.dashCooldown=run.upgrades.mobility?1.3:2.2;run.events.push('dash');}
  let f=input.forward||0,s=input.strafe||0;const norm=Math.max(1,Math.hypot(f,s)),speed=run.dash>0?8.5:3.9;f/=norm;s/=norm;
  moveBody(run.map,run.player,(Math.cos(run.player.angle)*f-Math.sin(run.player.angle)*s)*speed*dt,(Math.sin(run.player.angle)*f+Math.cos(run.player.angle)*s)*speed*dt);
  run.dash=Math.max(0,run.dash-dt);run.walk+=Math.hypot(f,s)*dt*10;run.visited.add(roomAt(run.map,run.player.x,run.player.y));
  if(input.reload)reload(run);if(input.scan)scan(run);if(input.source)controlSource(run);if(input.fire)fire(run);
  const stage=STAGES[run.wave];run.spawnTimer-=dt;
  if(run.spawned<stage.count&&run.spawnTimer<=0){while(run.spawned<stage.count&&nextSpawn(run))run.spawned++;run.spawnTimer=.2;}
  escalateUnseenEncounters(run);for(const e of run.enemies)updateEnemy(run,e,dt);
  for(const b of run.projectiles){if(!b.active)continue;b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(tileAt(run.map,b.x,b.y)||b.life<=0)b.active=false;else if(run.player.z<.3&&Math.hypot(b.x-run.player.x,b.y-run.player.y)<.3){b.active=false;hurt(run,b.damage);}}
  for(const h of run.hazards){if(!h.active)continue;h.life-=dt;h.hitCooldown-=dt;if(h.life<=0){h.active=false;continue;}if(run.player.z<.14&&h.hitCooldown<=0&&Math.hypot(h.x-run.player.x,h.y-run.player.y)<h.radius&&lineOfSight(run.map,run.player,h)){hurt(run,5);h.hitCooldown=1;}}
  for(const p of run.particles){if(p.life<=0)continue;p.life-=dt;p.px=p.x;p.py=p.y;p.pz=p.z;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=4*dt;}
  for(const p of run.map.pickups){
    if(!p.active){p.cooldown-=dt;if(p.cooldown<=0)p.active=true;continue;}if(Math.hypot(p.x-run.player.x,p.y-run.player.y)>.6)continue;
    if(p.kind==='health'&&run.player.hp>=100)continue;
    if(p.kind==='supply'&&run.energy.every(n=>n>=maxAmmo(run)-1))continue;
    p.active=false;p.cooldown=p.kind==='supply'?25:40;
    if(p.kind==='health'){run.player.hp=Math.min(100,run.player.hp+32);announce(run,'HOST SUPPORT · 체력 +32');}
    else if(p.kind==='supply'){refill(run);announce(run,'SUPPLY · 모든 약제 전량 보급');}
    else{const target=targetEnemy(run,.6,16);if(target){run.intel[target.kind]=3;run.seen.add(target.kind);announce(run,'AST KIT · '+run.catalog.enemyById[target.kind].phenotype);}else{run.upgrades.scanner=1;announce(run,'CULTURE KIT · 검사 속도 향상');}}run.events.push('pickup');
  }
  if(run.upgrades.immune){run.immuneTime-=dt;if(run.immuneTime<=0){run.immuneTime=(run.host==='neutropenia'?24:10)*(stage.immuneDelay||1);const e=run.enemies.find(e=>e.active&&!['Dead','Dormant','Idle'].includes(e.state)&&!e.elite&&!e.boss&&!run.catalog.enemyById[e.kind].resistant&&e.hp<=35&&e.shield<=0&&!protectedBySource(run,e)&&Math.hypot(e.x-run.player.x,e.y-run.player.y)<5&&lineOfSight(run.map,e,run.player));if(e){kill(run,e,'immune');announce(run,'IMMUNE CLEARANCE · 약한 병원체 제거');}}}
  run.aim=targetEnemy(run,.1,22)?.id??null;if(run.status!=='running')return;
  if(run.spawned>=stage.count&&!run.enemies.some(e=>e.active&&e.state!=='Dead')){
    if(run.map.sources.some(s=>s.active))announce(run,'적 확보 · 남은 감염원을 제거하세요 / F',1);
    else if(Math.hypot(run.player.x-run.map.exit.x,run.player.y-run.map.exit.y)>=1.3)announce(run,'구역 확보 · EXIT로 복귀하세요',1);
    else{run.completedStages++;if(run.mission==='single'||run.wave===STAGES.length-1){run.status='won';run.extracted=true;announce(run,'CONTAINMENT COMPLETE',60);}else{run.status='reward';run.rewards=rewardOptions(run);}}
  }else if(!run.enemies.some(e=>e.active&&!['Dead','Idle','Dormant'].includes(e.state))&&run.messageTime<=0)announce(run,'다음 방을 탐색하세요 · 접촉은 시야 안에서 시작됩니다',3);
}
