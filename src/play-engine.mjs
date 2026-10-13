import { createMap, WAVES, REWARDS } from './play-data.mjs';

export const MAX_ENEMIES=24, MAX_PARTICLES=80, MAX_PROJECTILES=24;
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const angleDelta=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function seededRandom(seed=Date.now()) {let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=Math.imul(s^s>>>15,1|s);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function tileAt(map,x,y) {const ix=Math.floor(x),iy=Math.floor(y);return ix<0||iy<0||ix>=map.width||iy>=map.height?1:map.cells[iy*map.width+ix];}
export function canStand(map,x,y,r=.22) {return !tileAt(map,x-r,y-r)&&!tileAt(map,x+r,y-r)&&!tileAt(map,x-r,y+r)&&!tileAt(map,x+r,y+r);}
export function moveBody(map,body,dx,dy,r=.22) {
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.15));
  for(let i=0;i<steps;i++){if(canStand(map,body.x+dx/steps,body.y,r))body.x+=dx/steps;if(canStand(map,body.x,body.y+dy/steps,r))body.y+=dy/steps;}
}
export function castRay(map,x,y,dx,dy,max=40) {
  let mx=Math.floor(x),my=Math.floor(y),side=0,dist=0;
  const ddx=Math.abs(1/(dx||1e-9)),ddy=Math.abs(1/(dy||1e-9)),sx=dx<0?-1:1,sy=dy<0?-1:1;
  let tx=(dx<0?x-mx:mx+1-x)*ddx,ty=(dy<0?y-my:my+1-y)*ddy;
  for(let i=0;i<120;i++){
    if(tx<ty){dist=tx;tx+=ddx;mx+=sx;side=0;}else{dist=ty;ty+=ddy;my+=sy;side=1;}
    const tile=tileAt(map,mx,my);
    if(tile||dist>=max){const hit=side?x+dist*dx:y+dist*dy;return {distance:Math.min(max,dist),side,tile,u:hit-Math.floor(hit)};}
  }
  return {distance:max,side:0,tile:0,u:0};
}
export function lineOfSight(map,a,b) {const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);return d<.01||castRay(map,a.x,a.y,dx/d,dy/d,d+.1).distance>=d-.08;}

export function coverage(catalog,weaponId,enemyId,{site='community',exposure=false}={}) {
  const weapon=catalog.weaponById[weaponId],entry=catalog.enemyById[enemyId]?.ast[weaponId];
  if(!weapon||!entry)return {factor:0,category:'?',reason:'확인된 coverage 없음'};
  if(entry.category==='R'||entry.category==='INACTIVE')return {factor:0,category:entry.category,reason:'RESISTANT · 약제를 바꾸세요'};
  if(entry.applicability==='infections-originating-from-urinary-tract'&&site!=='urinary')return {factor:0,category:entry.category,reason:'요로 기원 감염에만 적용되는 결과'};
  if(entry.category==='I')return {factor:weapon.exposure||exposure?1:0,category:'I',reason:weapon.exposure||exposure?'I · 증가 노출 충족':'I · 노출 최적화 필요'};
  if(entry.category==='S')return {factor:1,category:'S',reason:'S · 감수성'};
  if(entry.category==='ACTIVE')return {factor:.75,category:'ACTIVE',reason:'문헌상 활성 · S/I 판정 아님'};
  return {factor:0,category:entry.category,reason:'이 프로토타입에서 투여 조건 미충족'};
}
export function newRun(catalog,{hard=false,seed=Date.now(),host='normal'}={}) {
  const map=createMap();
  return {catalog,map,random:seededRandom(seed),seed,hard,host,status:'ready',time:0,wave:0,spawned:0,spawnTimer:1.2,
    player:{...map.spawn,hp:100},weapon:0,energy:catalog.weapons.map(()=>100),cooldown:0,cooldowns:catalog.weapons.map(()=>0),switchTime:0,pressure:0,
    kills:0,shots:0,effective:0,combo:0,comboTime:0,bestCombo:0,score:0,dash:0,dashCooldown:0,scannerCooldown:0,sourceCooldown:0,
    intel:Object.fromEntries(catalog.enemies.map(e=>[e.id,hard?0:3])),seen:new Set(),upgrades:{},rewards:[],immuneTime:host==='neutropenia'?24:10,
    enemies:Array.from({length:MAX_ENEMIES},(_,id)=>({id,active:false})),particles:Array.from({length:MAX_PARTICLES},()=>({life:0})),projectiles:Array.from({length:MAX_PROJECTILES},()=>({active:false})),
    flow:new Int16Array(map.cells.length).fill(-1),queue:new Int16Array(map.cells.length),flowTime:0,
    aim:null,lastShot:0,hurt:0,hit:0,scanPulse:0,walk:0,message:'WASD 이동 · 마우스 조준 · 1–5 약제 전환',messageTime:6,events:[],extracted:false};
}
export function announce(run,text,seconds=2.5){run.message=text;run.messageTime=seconds;}
export function resistanceChance(pressure) {return pressure>=70?.55:pressure>=40?.28:0;}
export function switchWeapon(run,index) {if(index<0||index>=run.catalog.weapons.length||run.weapon===index)return;run.weapon=index;run.cooldown=run.cooldowns[index];run.switchTime=.13;run.events.push('switch');}
export function visibleLabel(run,e) {
  const profile=run.catalog.enemyById[e.kind],level=run.intel[e.kind];
  if(level===0)return '???';if(level===1)return profile.gram;
  return profile.short+(level>=3?' · '+profile.phenotype:'');
}
export function targetEnemy(run,cone=.1,range=24) {
  let best=null,bestDistance=range;
  for(const e of run.enemies){if(!e.active||e.state==='Dead')continue;const dx=e.x-run.player.x,dy=e.y-run.player.y,d=Math.hypot(dx,dy);
    if(d>bestDistance||Math.abs(angleDelta(Math.atan2(dy,dx)-run.player.angle))>Math.max(cone,Math.atan2(.3,d)))continue;
    if(lineOfSight(run.map,run.player,e)){best=e;bestDistance=d;}}
  return best;
}
export function scan(run) {
  if(run.status!=='running'||run.scannerCooldown>0)return false;
  const target=targetEnemy(run,.18,18);if(!target){announce(run,'적을 조준하고 E · 스캔 중에도 이동/사격 가능');return false;}
  run.intel[target.kind]=Math.min(3,run.intel[target.kind]+(run.upgrades.scanner?2:1));run.seen.add(target.kind);run.scannerCooldown=.65;run.scanPulse=.8;
  announce(run,['???','SCANNER · '+run.catalog.enemyById[target.kind].gram,'CULTURE · '+run.catalog.enemyById[target.kind].short,'AST · '+run.catalog.enemyById[target.kind].phenotype][run.intel[target.kind]]);run.events.push('scan');return true;
}
export function controlSource(run) {
  if(run.status!=='running'||run.sourceCooldown>0)return false;
  const source=run.map.sources.find(s=>s.active&&Math.hypot(s.x-run.player.x,s.y-run.player.y)<(run.upgrades.source?3.8:2.3)&&lineOfSight(run.map,run.player,s));
  if(!source){announce(run,'청록색 감염원 가까이에서 F · SOURCE CONTROL');return false;}
  source.active=false;run.sourceCooldown=run.upgrades.source?2:6;run.pressure=Math.max(0,run.pressure-8);run.score+=150;
  announce(run,source.label+' 제거 · 주변 biofilm 보호 해제',4);burst(run,source.x,source.y,'#82e5d4',16);run.events.push('source');return true;
}
export function protectedBySource(run,e) {return run.map.sources.some(s=>s.active&&Math.hypot(e.x-s.x,e.y-s.y)<4&&lineOfSight(run.map,e,s));}
function burst(run,x,y,color,count=8) {for(let i=0;i<count;i++){const p=run.particles.find(p=>p.life<=0);if(!p)break;const a=run.random()*Math.PI*2;Object.assign(p,{x,y,z:.3+run.random()*.5,vx:Math.cos(a)*.8,vy:Math.sin(a)*.8,vz:1,color,life:.3+run.random()*.35});}}
export function spawnEnemy(run,kind,position,elite=false) {
  const e=run.enemies.find(e=>!e.active);if(!e||!run.catalog.enemyById[kind]||!canStand(run.map,position.x,position.y))return null;
  const p=run.catalog.enemyById[kind];Object.assign(e,{...position,active:true,kind,elite,hp:p.hp*(elite?1.4:1),maxHp:p.hp*(elite?1.4:1),shield:p.shield,state:'Idle',timer:0,attackCooldown:.8,flash:0,age:0,dot:0,dotWeapon:null,death:0,knock:0});return e;
}
function kill(run,e,weaponId) {
  e.state='Dead';e.death=.45;e.dot=0;run.kills++;run.combo=run.comboTime>0?run.combo+1:1;run.comboTime=4;run.bestCombo=Math.max(run.bestCombo,run.combo);run.score+=100+Math.min(run.combo,10)*15+(e.elite?80:0);
  if(['ampicillin','cefazolin'].includes(weaponId))run.pressure=Math.max(0,run.pressure-(run.upgrades.stewardship?3:1.3));
  for(let i=0;i<run.energy.length;i++)run.energy[i]=Math.min(100,run.energy[i]+6);
  burst(run,e.x,e.y,run.catalog.enemyById[e.kind].color,12);run.events.push('kill');
}
export function applyHit(run,e,weapon,damage=weapon.damage,{dot=false}={}) {
  if(!e.active||e.state==='Dead')return {factor:0};
  const result=coverage(run.catalog,weapon.id,e.kind,{site:run.map.site,exposure:Boolean(run.upgrades.infusion)});
  // Gate every hit before shields, source-control effects and all damage multipliers.
  if(!result.factor){if(!dot){announce(run,result.reason,1.5);run.events.push('resist');}return result;}
  let amount=damage*result.factor*(protectedBySource(run,e)?.42:1);e.flash=.13;e.state='Chase';run.hit=.12;
  if(e.shield>0){const absorbed=Math.min(e.shield,amount);e.shield-=absorbed;amount-=absorbed;}
  e.hp-=amount;
  if(!dot){run.effective++;e.knock=.07;burst(run,e.x,e.y,weapon.color,4);
    if(run.upgrades.infusion&&weapon.id!=='vancomycin'){e.dot=1.6;e.dotWeapon=weapon.id;}}
  if(e.hp<=0)kill(run,e,weapon.id);return result;
}
export function fire(run) {
  if(run.status!=='running'||run.cooldowns[run.weapon]>0||run.switchTime>0)return false;
  const w=run.catalog.weapons[run.weapon],cost=w.cost*Math.pow(.8,run.upgrades.efficiency||0);
  if(run.energy[run.weapon]<cost){announce(run,'에너지 회복 중 · 다른 약제로 전환',1);return false;}
  run.energy[run.weapon]-=cost;run.cooldown=w.interval;run.cooldowns[run.weapon]=w.interval;run.lastShot=.18;run.shots++;run.pressure=clamp(run.pressure+w.pressure,0,100);run.events.push('shot');
  const e=targetEnemy(run,w.spread,w.range);if(e){run.seen.add(e.kind);applyHit(run,e,w);}return true;
}
function updateFlow(run) {
  const {map,flow,queue}=run;flow.fill(-1);let head=0,tail=1;const start=Math.floor(run.player.y)*map.width+Math.floor(run.player.x);queue[0]=start;flow[start]=0;
  while(head<tail){const i=queue[head++];for(const n of [i-1,i+1,i-map.width,i+map.width])if(n>=0&&n<flow.length&&!map.cells[n]&&flow[n]===-1){flow[n]=flow[i]+1;queue[tail++]=n;}}
}
function hurt(run,damage) {run.player.hp=Math.max(0,run.player.hp-damage);run.hurt=.32;run.combo=0;run.events.push('hurt');if(run.player.hp<=0){run.status='lost';announce(run,'CONTAINMENT FAILED',60);}}
function nextSpawn(run) {
  const wave=WAVES[run.wave];let kind=wave.pool[run.spawned%wave.pool.length];const roll=run.random(),chance=resistanceChance(run.pressure);
  if(chance&&roll<chance)kind=run.random()<.5?'mrsa':'esbl';
  const candidates=run.map.portals.filter(p=>Math.hypot(p.x-run.player.x,p.y-run.player.y)>4&&!run.enemies.some(e=>e.active&&e.state!=='Dead'&&Math.hypot(e.x-p.x,e.y-p.y)<.55));
  if(!candidates.length)return false;
  const pos=candidates[Math.floor(run.random()*candidates.length)],elite=run.pressure>=40&&run.random()<chance;
  return Boolean(spawnEnemy(run,kind,pos,elite));
}
export function chooseReward(run,id) {
  if(run.status!=='reward'||!run.rewards.some(r=>r.id===id))return false;
  run.upgrades[id]=(run.upgrades[id]||0)+1;
  if(id==='stewardship')run.pressure=Math.max(0,run.pressure-35);
  run.player.hp=Math.min(100,run.player.hp+(id==='source'?25:20));run.energy.fill(100);run.wave++;run.spawned=0;run.spawnTimer=2;run.rewards=[];run.status='paused';run.projectiles.forEach(p=>p.active=false);
  announce(run,'WAVE '+(run.wave+1)+' · '+WAVES[run.wave].label,4);return true;
}
export function tick(run,input={},dt=1/60) {
  if(run.status!=='running')return;dt=clamp(dt,0,.05);run.time+=dt;
  for(const k of ['cooldown','switchTime','dashCooldown','scannerCooldown','sourceCooldown','lastShot','hurt','hit','scanPulse','comboTime','messageTime'])run[k]=Math.max(0,run[k]-dt);
  for(let i=0;i<run.cooldowns.length;i++)run.cooldowns[i]=Math.max(0,run.cooldowns[i]-dt);run.cooldown=run.cooldowns[run.weapon];
  run.pressure=Math.max(0,run.pressure-dt*.14);for(let i=0;i<run.energy.length;i++)run.energy[i]=Math.min(100,run.energy[i]+dt*(i===run.weapon?4:17));
  run.player.angle=angleDelta(run.player.angle+(input.turn||0)*dt*2.1);
  if(input.dash&&run.dashCooldown<=0){run.dash=.18;run.dashCooldown=2.2;run.events.push('dash');}
  let f=input.forward||0,s=input.strafe||0;const norm=Math.max(1,Math.hypot(f,s)),speed=run.dash>0?8.5:3.7;f/=norm;s/=norm;
  moveBody(run.map,run.player,(Math.cos(run.player.angle)*f-Math.sin(run.player.angle)*s)*speed*dt,(Math.sin(run.player.angle)*f+Math.cos(run.player.angle)*s)*speed*dt);
  run.dash=Math.max(0,run.dash-dt);run.walk+=Math.hypot(f,s)*dt*10;
  if(input.scan)scan(run);if(input.source)controlSource(run);if(input.fire)fire(run);
  run.flowTime-=dt;if(run.flowTime<=0){updateFlow(run);run.flowTime=.4;}
  const wave=WAVES[run.wave];run.spawnTimer-=dt;
  if(run.spawned<wave.count&&run.spawnTimer<=0&&run.enemies.filter(e=>e.active&&e.state!=='Dead').length<14){if(nextSpawn(run)){run.spawned++;run.spawnTimer=wave.interval;}else run.spawnTimer=.3;}
  for(const e of run.enemies){if(!e.active)continue;e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.attackCooldown-=dt;
    if(e.state==='Dead'){e.death-=dt;if(e.death<=0)e.active=false;continue;}
    const p=run.catalog.enemyById[e.kind],d=Math.hypot(e.x-run.player.x,e.y-run.player.y),los=d<18&&lineOfSight(run.map,e,run.player);
    if(los&&d<16)run.seen.add(e.kind);
    if(e.state==='Idle'&&(los||e.age>3)){e.state='Detect';e.timer=.25;}
    if(e.state==='Detect'){e.timer-=dt;if(e.timer<=0)e.state='Chase';}
    else if(e.state==='Chase'||e.state==='Attack'){
      if(d<.85&&los){e.state='Attack';if(e.attackCooldown<=0){hurt(run,p.damage*(e.elite?1.2:1));e.attackCooldown=1.15;}}
      else if(p.ranged&&los&&d>3&&d<8&&e.attackCooldown<=0){const b=run.projectiles.find(b=>!b.active);if(b)Object.assign(b,{active:true,x:e.x,y:e.y,vx:(run.player.x-e.x)/d*3.5,vy:(run.player.y-e.y)/d*3.5,life:5,damage:p.damage});e.attackCooldown=2.8;e.state='Attack';}
      else{e.state='Chase';let tx=run.player.x,ty=run.player.y;
        if(!los){const ix=Math.floor(e.x),iy=Math.floor(e.y),i=iy*run.map.width+ix;let best=i;for(const n of [i-1,i+1,i-run.map.width,i+run.map.width])if(run.flow[n]>=0&&(run.flow[best]<0||run.flow[n]<run.flow[best]))best=n;tx=best%run.map.width+.5;ty=Math.floor(best/run.map.width)+.5;}
        let dx=tx-e.x,dy=ty-e.y,len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
        for(const other of run.enemies){if(other===e||!other.active||other.state==='Dead')continue;const ex=e.x-other.x,ey=e.y-other.y,ed=Math.hypot(ex,ey);if(ed>0&&ed<.65){dx+=ex/ed*(.65-ed)*2;dy+=ey/ed*(.65-ed)*2;}}
        const speed=p.speed*(e.elite?1.1:1)*(e.knock>0?-.6:1);moveBody(run.map,e,dx*speed*dt,dy*speed*dt,.18);e.knock=Math.max(0,e.knock-dt);
      }
    }
    if(e.dot>0){e.dot-=dt;applyHit(run,e,run.catalog.weaponById[e.dotWeapon],12*dt,{dot:true});}
  }
  for(const b of run.projectiles){if(!b.active)continue;b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(tileAt(run.map,b.x,b.y)||b.life<=0)b.active=false;else if(Math.hypot(b.x-run.player.x,b.y-run.player.y)<.3){b.active=false;hurt(run,b.damage);}}
  for(const p of run.particles){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=4*dt;}
  for(const p of run.map.pickups){if(!p.active){p.cooldown-=dt;if(p.cooldown<=0)p.active=true;continue;}if(Math.hypot(p.x-run.player.x,p.y-run.player.y)>.55)continue;
    if(p.kind==='health'&&run.player.hp>=100)continue;p.active=false;p.cooldown=50;
    if(p.kind==='health'){run.player.hp=Math.min(100,run.player.hp+28);announce(run,'HOST SUPPORT · 체력 +28');}
    else if(p.kind==='supply'){run.energy.fill(100);announce(run,'SUPPLY · 모든 약제 에너지 회복');}
    else{const target=targetEnemy(run,.6,16);if(target){run.intel[target.kind]=3;run.seen.add(target.kind);announce(run,'AST KIT · '+run.catalog.enemyById[target.kind].phenotype);}else{run.upgrades.scanner=1;announce(run,'CULTURE KIT · 스캔 속도 향상');}}
    run.events.push('pickup');
  }
  if(run.upgrades.immune){run.immuneTime-=dt;if(run.immuneTime<=0){run.immuneTime=run.host==='neutropenia'?24:10;const e=run.enemies.find(e=>e.active&&e.state!=='Dead'&&!e.elite&&!run.catalog.enemyById[e.kind].resistant&&e.hp<=35&&e.shield<=0&&!protectedBySource(run,e)&&Math.hypot(e.x-run.player.x,e.y-run.player.y)<5&&lineOfSight(run.map,e,run.player));if(e){kill(run,e,'immune');announce(run,'IMMUNE CLEARANCE · 약한 병원체 제거');}}}
  run.aim=targetEnemy(run,.1,22)?.id??null;
  if(run.status!=='running')return;
  if(run.spawned>=wave.count&&!run.enemies.some(e=>e.active&&e.state!=='Dead')){
    if(run.wave<WAVES.length-1){run.status='reward';const pool=REWARDS.filter(r=>!run.upgrades[r.id]||['stewardship','source','efficiency'].includes(r.id));run.rewards=pool.map(r=>({r,roll:run.random()})).sort((a,b)=>a.roll-b.roll).slice(0,3).map(o=>o.r);}
    else if(run.map.sources.every(s=>!s.active)){
      if(Math.hypot(run.player.x-run.map.exit.x,run.player.y-run.map.exit.y)<1.3){run.status='won';run.extracted=true;announce(run,'CONTAINMENT COMPLETE',60);}
      else announce(run,'봉쇄 완료 · 미니맵의 EXIT로 돌아가세요',1);
    }else announce(run,'잔여 감염원을 제거하세요 · 청록색 표식 가까이에서 F',1);
  }
}
