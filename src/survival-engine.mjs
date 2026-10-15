import { ENEMIES, LIMITS, RUN_DURATION, UPGRADES, UPGRADE_BY_ID, WORLD, RULESET } from './survival-data.mjs';
import { survivalStats, weaponStats, canUpgrade } from './survival-loadout.mjs';
export { survivalStats, weaponStats } from './survival-loadout.mjs';

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y);
function random(run, choices = false) {
  const key = choices ? 'choiceState' : 'randomState';
  run[key] = (run[key] + 0x6D2B79F5) >>> 0;
  let n = Math.imul(run[key] ^ (run[key] >>> 15), 1 | run[key]);
  n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}
export function survivalViewport(width, height) {
  width = Math.max(1, width); height = Math.max(1, height);
  const portrait = width < height;
  const scale = Math.max(Math.min(width/(portrait ? 700 : 1180), height/(portrait ? 900 : 760)), width/WORLD.width, height/WORLD.height);
  return { width: width/scale, height: height/scale, scale };
}
export function survivalCamera(run) {
  return { x: clamp(run.player.x, run.view.width/2, WORLD.width-run.view.width/2), y: clamp(run.player.y, run.view.height/2, WORLD.height-run.view.height/2) };
}
export function setSurvivalViewport(run, width, height) { run.view = survivalViewport(width, height); }
function inView(run, point, margin = 0) {
  const c = survivalCamera(run);
  return Math.abs(point.x-c.x) <= run.view.width/2+margin && Math.abs(point.y-c.y) <= run.view.height/2+margin;
}
export function createSurvivalRun({ seed = Date.now() } = {}) {
  seed = Number(seed) >>> 0;
  const angle = (seed % 360) / 180 * Math.PI;
  const sites = ['supply', 'haven', 'cache'].map((type, i) => {
    const a = angle + i*TAU/3, r = 430 + i*65;
    return { id: i, type, x: WORLD.width/2+Math.cos(a)*r, y: WORLD.height/2+Math.sin(a)*r, radius: type === 'haven' ? 85 : 32, readyAt: 0, activeUntil: 0, visits: 0 };
  });
  return {
    ruleset: RULESET, seed, randomState: seed, choiceState: (seed ^ 0x9e3779b9) >>> 0,
    status: 'menu', time: 0, kills: 0, level: 1, xp: 0, nextXp: 6,
    player: { x: WORLD.width/2, y: WORLD.height/2, hp: 100, radius: 14, invulnerable: 0, angle: -Math.PI/2, moving: false },
    upgrades: Object.fromEntries(UPGRADES.map(u => [u.id, u.id === 'bolt' ? 1 : 0])), branches: {}, history: [],
    timers: { spawn: 0, bolt: 0, nova: 0, chain: 0, density: 1 }, enemies: [], shots: [], pickups: [], effects: [], hazards: [], waves: [], arcs: [], pending: [], sounds: [],
    choices: [], selected: null, confirmRemaining: 0, bossStage: 0, bossDefeated: false, nextId: 1, hurt: 0, hurtAngle: 0,
    banner: '', bannerUntil: 0, view: { width: 1180, height: 760, scale: 1 }, phase: 'influx', cycle: -1, entryAngle: 0,
    priority: null, sites, observed: [], growth: { firstPickupAt: null, firstLevelAt: null, collected: 0 },
  };
}
export function startSurvival(run) {
  if (run.status !== 'menu') return false;
  run.status = 'running';
  // A visible trail teaches collection before the first distant enemy arrives.
  for (let i = 0; i < 3; i++) addSurvivalPickup(run, run.player.x+90+i*160, run.player.y-20-i*55, 2, 'xp', true);
  return true;
}
export function pauseSurvival(run) {
  if (run.status !== 'running') return false;
  run.status = 'paused'; run.player.moving = false; return true;
}
export function resumeSurvival(run) {
  if (run.status !== 'paused') return false;
  run.status = 'running'; run.player.invulnerable = Math.max(.8, run.player.invulnerable); return true;
}
function effect(run, value) {
  if (run.effects.length >= LIMITS.effects) run.effects.shift();
  run.effects.push({ id: run.nextId++, born: run.time, life: .3, ...value });
}
function sound(run, kind) {
  if (!run.sounds.includes(kind) && run.sounds.length < LIMITS.sounds) run.sounds.push(kind);
}
export function drainSurvivalSounds(run) { return run.sounds.splice(0); }
export function addSurvivalPickup(run, x, y, value, type = 'xp', starter = false) {
  if (run.pickups.length >= LIMITS.pickups) {
    let nearest = null, best = Infinity;
    for (const p of run.pickups) if (p.type === type && Math.hypot(p.x-x,p.y-y)<best) { nearest=p; best=Math.hypot(p.x-x,p.y-y); }
    if (nearest) { nearest.value += value; return nearest; }
    const xp = run.pickups.filter(p => p.type === 'xp');
    if (xp.length < 2) return null;
    xp[1].value += xp[0].value; run.pickups.splice(run.pickups.indexOf(xp[0]),1);
  }
  const pickup = { id: run.nextId++, x, y, value, type, starter, born: run.time, attracted: false };
  run.pickups.push(pickup); return pickup;
}
function spawnPoint(run, angle) {
  const c = survivalCamera(run), hw = run.view.width/2+75, hh = run.view.height/2+75;
  for (let attempt = 0; attempt < 32; attempt++) {
    const a = angle == null || attempt > 10 ? random(run)*TAU : angle+(random(run)-.5)*.85;
    const dx = Math.cos(a), dy = Math.sin(a), r = Math.min(hw/Math.max(.001,Math.abs(dx)),hh/Math.max(.001,Math.abs(dy)))+random(run)*50;
    const p = { x:c.x+dx*r, y:c.y+dy*r };
    if (p.x>35 && p.x<WORLD.width-35 && p.y>35 && p.y<WORLD.height-35 && !inView(run,p,45) && distance(p,run.player)>240) return p;
  }
  return null;
}
export function spawnSurvivalEnemy(run, type = 'cocci', position) {
  if (!ENEMIES[type] || run.enemies.length >= LIMITS.enemies) return null;
  const point = position || spawnPoint(run);
  if (!point) return null;
  const model = ENEMIES[type], elite = ['elite','warden','boss'].includes(type);
  const hp = model.hp*(elite ? 1 : 1+run.time/240);
  const enemy = { ...model, ...point, id:run.nextId++, type, hp, maxHp:hp, elite, born:run.time, dead:false, hitUntil:0, orbitUntil:0, attackAt:run.time+2.5, pattern:0, state:'move', stunUntil:0, pushX:0, pushY:0, distantSince:null };
  run.enemies.push(enemy);
  return enemy;
}
function queueEnemy(run, type, point, delay = .9, local = false) {
  if (!point || run.pending.length >= LIMITS.pending) return;
  run.pending.push({ ...point, type, local, at:run.time+delay, id:run.nextId++ });
}
export function setSurvivalPriority(run, id) {
  const enemy = run.enemies.find(e => e.id === id && e.elite && !e.dead);
  if (!enemy) return false;
  run.priority = { id, until:run.time+10 }; effect(run,{type:'target',x:enemy.x,y:enemy.y,radius:enemy.radius+16,color:'#fff0ae',life:.45}); return true;
}
export function damageSurvivalEnemy(run, enemy, damage, kind = 'bolt', origin = run.player, push = 0) {
  if (!enemy || enemy.dead || !Number.isFinite(damage) || damage <= 0) return false;
  enemy.hp = Math.max(0,enemy.hp-damage); enemy.hitUntil=run.time+.1;
  if (push) {
    const d=Math.max(1,distance(enemy,origin)), weight=enemy.elite?.22:1;
    enemy.pushX+=(enemy.x-origin.x)/d*push*weight; enemy.pushY+=(enemy.y-origin.y)/d*push*weight;
  }
  if(kind==='chain') enemy.stunUntil=run.time+(enemy.elite?.04:.14);
  sound(run,kind+'Hit');
  effect(run,{type:'impact',kind,x:enemy.x,y:enemy.y,radius:enemy.radius,color:{bolt:'#caffdd',orbit:'#ffda8d',nova:'#86cfff',chain:'#e1baff'}[kind],life:kind==='bolt'?.14:.23});
  if (enemy.hp>0) return false;
  enemy.dead=true;run.kills++;sound(run,'kill');
  effect(run,{type:'burst',x:enemy.x,y:enemy.y,color:enemy.color,radius:enemy.radius,life:.32});
  addSurvivalPickup(run,enemy.x,enemy.y,enemy.xp);
  if(enemy.type==='splitter') for(let i=0;i<3;i++) {
    const a=i*TAU/3;
    queueEnemy(run,'fragment',{x:enemy.x+Math.cos(a)*22,y:enemy.y+Math.sin(a)*22},.55,true);
  }
  if(enemy.type==='boss'){run.bossDefeated=true;run.banner='군집의 심장 제거';run.bannerUntil=run.time+3;}
  if(enemy.elite || run.kills%26===0) addSurvivalPickup(run,enemy.x+15,enemy.y+15,enemy.elite?35:14,'health');
  if(run.kills%65===0) addSurvivalPickup(run,enemy.x-15,enemy.y,1,'vacuum');
  return true;
}
function hurtPlayer(run, damage, origin) {
  if(run.player.invulnerable>0 || run.sites.some(s=>s.type==='haven'&&s.activeUntil>run.time&&distance(s,run.player)<s.radius)) return;
  run.player.hp=Math.max(0,run.player.hp-damage);run.player.invulnerable=.75;run.hurt=.35;
  run.hurtAngle=Math.atan2(origin.y-run.player.y,origin.x-run.player.x);sound(run,'hurt');
  if(run.player.hp===0)run.status='lost';
}
export function survivalUpgradeChoices(run) {
  const consumables=['repair','vacuum','shield'];
  const pool=UPGRADES.filter(u=>!consumables.includes(u.id)&&canUpgrade(run,u.id)).map(u=>u.id);
  if(run.player.hp<survivalStats(run).maxHp)pool.push('repair');
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random(run,true)*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const guaranteed = pool.find(id=>UPGRADE_BY_ID[id].weapon) || (run.level<=5 ? pool.find(id=>['orbit','nova','chain'].includes(id)&&!run.upgrades[id]):null);
  if(guaranteed){pool.splice(pool.indexOf(guaranteed),1);pool.unshift(guaranteed);}
  for(const id of consumables)if(pool.length<3&&!pool.includes(id))pool.push(id);
  return pool.slice(0,3);
}
function levelUp(run) {
  if(run.xp<run.nextXp || run.status!=='running')return false;
  run.xp-=run.nextXp;run.level++;
  run.nextXp=Math.floor(8+(run.level-1)*5+Math.pow(run.level-1,1.5));
  run.growth.firstLevelAt ??= run.time;
  run.choices=survivalUpgradeChoices(run);run.status='upgrade';run.player.moving=false;
  return true;
}
export function chooseSurvivalUpgrade(run,id) {
  if(run.status!=='upgrade'||!run.choices.includes(id)||!canUpgrade(run,id))return false;
  const u=UPGRADE_BY_ID[id];run.upgrades[id]++;
  if(u.weapon)run.branches[u.weapon]=id;
  if(id==='health'||id==='repair')run.player.hp=Math.min(survivalStats(run).maxHp,run.player.hp+(id==='repair'?45:35));
  if(id==='vacuum')for(const p of run.pickups)if(p.type==='xp')p.attracted=true;
  run.player.invulnerable=Math.max(run.player.invulnerable,id==='shield'?5:1.2);
  if(run.history.length<128)run.history.push({id,level:run.level,time:Math.round(run.time*100)/100});
  run.selected=id;run.confirmRemaining=.48;run.status='confirm';sound(run,'upgrade');
  effect(run,{type:'upgrade',x:run.player.x,y:run.player.y,radius:75,color:u.color,life:.8});
  for(const key of ['bolt','nova','chain'])run.timers[key]=Math.min(run.timers[key],.12);
  return true;
}
export function survivalOrbitPositions(run) {
  const s=weaponStats(run,'orbit');if(!s.count)return [];
  return Array.from({length:s.count},(_,i)=>{const a=run.time*2.4+i*TAU/s.count;return{x:run.player.x+Math.cos(a)*s.radius,y:run.player.y+Math.sin(a)*s.radius};});
}
function nearEnemies(run,origin,radius,priority=false) {
  return run.enemies.filter(e=>!e.dead&&run.time-e.born>=.6&&distance(e,origin)<radius).sort((a,b)=>
    (priority&&run.priority&&run.priority.until>run.time ? Number(b.id===run.priority.id)-Number(a.id===run.priority.id):0)||distance(a,origin)-distance(b,origin));
}
function autoAttack(run) {
  const bolt=weaponStats(run,'bolt'),targets=nearEnemies(run,run.player,bolt.radius,true),target=targets[0];
  if(target&&run.timers.bolt<=0){
    for(let i=0;i<bolt.count&&run.shots.length<LIMITS.shots;i++){
      const aim=run.priority?.id===target.id?target:targets[i%targets.length], spread=run.branches.bolt==='bolt_fan'?(i-(bolt.count-1)/2)*.075:0;
      const a=Math.atan2(aim.y-run.player.y,aim.x-run.player.x)+spread;
      run.player.angle=a;
      run.shots.push({id:run.nextId++,x:run.player.x,y:run.player.y,vx:Math.cos(a)*570,vy:Math.sin(a)*570,life:1.2,damage:bolt.damage,remaining:bolt.pierce+1,push:bolt.knockback,hit:new Set()});
    }
    run.timers.bolt=bolt.cooldown;sound(run,'bolt');
  }
  const orbit=weaponStats(run,'orbit'),positions=survivalOrbitPositions(run);
  for(const e of run.enemies)if(!e.dead&&run.time-e.born>=.6&&e.orbitUntil<=run.time&&positions.some(p=>distance(p,e)<e.radius+10)){
    damageSurvivalEnemy(run,e,orbit.damage,'orbit',run.player,orbit.knockback);e.orbitUntil=run.time+orbit.cooldown;
  }
  const nova=weaponStats(run,'nova');
  if(nova.count&&run.timers.nova<=0&&run.waves.length<LIMITS.waves&&nearEnemies(run,run.player,nova.radius).length){
    run.waves.push({id:run.nextId++,x:run.player.x,y:run.player.y,radius:0,maxRadius:nova.radius,speed:460,damage:nova.damage,push:nova.knockback,hit:new Set(),fade:.14});
    run.timers.nova=nova.cooldown;sound(run,'nova');
  }
  const chain=weaponStats(run,'chain'),first=chain.count&&nearEnemies(run,run.player,chain.radius,true)[0];
  if(first&&run.timers.chain<=0&&run.arcs.length<LIMITS.arcs){
    run.arcs.push({from:{x:run.player.x,y:run.player.y},target:first.id,remaining:chain.count,range:chain.hop,damage:chain.damage,used:new Set(),at:run.time});
    run.timers.chain=chain.cooldown;sound(run,'chain');
  }
}
function segmentDistance(p,a,b) {
  const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/length,0,1):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
function updateWeapons(run,dt) {
  for(const shot of run.shots){
    const previous={x:shot.x,y:shot.y};
    shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
    const hits=run.enemies.filter(e=>!e.dead&&!shot.hit.has(e.id)&&run.time-e.born>=.6&&segmentDistance(e,previous,shot)<e.radius+4).sort((a,b)=>distance(a,previous)-distance(b,previous));
    for(const enemy of hits){
      damageSurvivalEnemy(run,enemy,shot.damage,'bolt',previous,shot.push);shot.hit.add(enemy.id);
      if(--shot.remaining<=0){shot.life=0;break;}
    }
  }
  run.shots=run.shots.filter(s=>s.life>0);
  for(const wave of run.waves){
    const previous=wave.radius;
    wave.radius=Math.min(wave.maxRadius,wave.radius+wave.speed*dt);
    for(const e of run.enemies)if(!e.dead&&!wave.hit.has(e.id)&&run.time-e.born>=.6){
      const d=distance(e,wave);
      if(d-e.radius<=wave.radius&&d+e.radius>=previous){
        damageSurvivalEnemy(run,e,wave.damage,'nova',wave,wave.push);wave.hit.add(e.id);
      }
    }
    if(wave.radius>=wave.maxRadius)wave.fade-=dt;
  }
  run.waves=run.waves.filter(w=>w.fade>0);
  for(const arc of run.arcs){
    if(run.time<arc.at||arc.remaining<=0)continue;
    const target=run.enemies.find(e=>e.id===arc.target&&!e.dead);
    if(!target){arc.remaining=0;continue;}
    const point={x:target.x,y:target.y};
    effect(run,{type:'chain',points:[{...arc.from},point],color:'#d9abff',life:.18});
    damageSurvivalEnemy(run,target,arc.damage,'chain',arc.from);arc.used.add(target.id);arc.remaining--;
    arc.from=point;
    const next=nearEnemies(run,point,arc.range).find(e=>!arc.used.has(e.id));
    if(!next)arc.remaining=0;
    else{arc.target=next.id;arc.at=run.time+.085;}
  }
  run.arcs=run.arcs.filter(a=>a.remaining>0);
}
function collectPickups(run,dt,stats) {
  const retained=[],early=run.level<3?25:0,phaseBonus=run.phase==='collect'?35:0;
  for(const p of run.pickups){
    const d=distance(p,run.player);
    if(d<stats.magnet+early+phaseBonus)p.attracted=true;
    if(d<run.player.radius+9||(p.attracted&&d<520*dt)){
      if(p.type==='xp'){
        run.xp+=p.value;run.growth.collected+=p.value;run.growth.firstPickupAt??=run.time;
        sound(run,'pickup');
        if(p.starter)effect(run,{type:'pickup',x:run.player.x,y:run.player.y,radius:38,color:'#b7f2ce',life:.35});
      }
      if(p.type==='health'){run.player.hp=Math.min(stats.maxHp,run.player.hp+p.value);sound(run,'heal');}
      if(p.type==='vacuum')for(const other of run.pickups)if(other.type==='xp')other.attracted=true;
      continue;
    }
    if(p.attracted&&d){const step=Math.min(d,(520+d*2)*dt);p.x+=(run.player.x-p.x)/d*step;p.y+=(run.player.y-p.y)/d*step;}
    retained.push(p);
  }
  run.pickups=retained;
}
function updateSites(run) {
  for(const site of run.sites){
    if(run.time<site.readyAt||distance(site,run.player)>32)continue;
    site.visits++;site.readyAt=run.time+(site.type==='cache'?100:80);
    if(site.type==='supply'){run.player.hp=Math.min(survivalStats(run).maxHp,run.player.hp+40);sound(run,'heal');}
    if(site.type==='haven'){site.activeUntil=run.time+8;sound(run,'heal');}
    if(site.type==='cache'){
      addSurvivalPickup(run,site.x,site.y,32+site.visits*6);
      for(let i=0;i<4;i++){const a=i*TAU/4;queueEnemy(run,'charger',{x:site.x+Math.cos(a)*145,y:site.y+Math.sin(a)*145},1.4,true);}
      sound(run,'warning');
    }
    effect(run,{type:'upgrade',x:site.x,y:site.y,radius:80,color:site.type==='cache'?'#ffd788':'#b7f2ce',life:.8});
  }
}
function enemyType(run) {
  const r=random(run),t=run.time;
  if(t>95&&r<.14)return 'splitter';
  if(t>70&&r<.28)return 'blocker';
  if(t>45&&r<.42)return 'ranger';
  if(t>25&&r<.57)return 'charger';
  if(t>100&&r>.88)return 'spore';
  if(t>20&&r>.73)return 'virus';
  return t>12&&r>.45?'bacilli':'cocci';
}
function spawnWave(run) {
  const cycle=Math.floor(run.time/30),part=run.time%30;
  run.phase=part<5?'influx':part<19?'clash':part<26?'collect':'rest';
  if(cycle!==run.cycle){
    run.cycle=cycle;run.entryAngle=random(run)*TAU;
    if(cycle>0)sound(run,'warning');
  }
  if(run.timers.density<=0){
    // Only retire ordinary enemies well beyond the camera; no kills or rewards.
    run.enemies=run.enemies.filter(e=>{
      if(e.elite||inView(run,e,240)){e.distantSince=null;return true;}
      e.distantSince??=run.time;
      return run.time-e.distantSince<7;
    });
    run.timers.density=1;
  }
  const nearby=run.enemies.filter(e=>inView(run,e,160)&&!e.dead).length;
  const desired=Math.min(72,8+Math.floor(run.time/5));
  if(run.timers.spawn<=0){
    if(run.phase!=='rest'&&nearby+run.pending.length<desired){
      const count=run.phase==='influx'?Math.min(5,2+Math.floor(run.time/80)):run.phase==='clash'?2:1;
      for(let i=0;i<count;i++)queueEnemy(run,enemyType(run),spawnPoint(run,run.phase==='influx'?run.entryAngle:null),run.phase==='influx'?1.25:.8);
    }
    run.timers.spawn=run.phase==='collect'?2.8:Math.max(.7,1.65-run.time/480);
  }
  const thresholds=[90,180,270];
  if(run.bossStage<3&&run.time>=thresholds[run.bossStage]){
    if(run.enemies.length>=LIMITS.enemies){
      const index=run.enemies.findIndex(e=>!e.elite);
      if(index>=0)run.enemies.splice(index,1);
    }
    const type=['elite','warden','boss'][run.bossStage],boss=spawnSurvivalEnemy(run,type);
    if(boss){run.bossStage++;run.banner=ENEMIES[type].name+' 접근';run.bannerUntil=run.time+3;sound(run,'warning');}
  }
  const pending=[];
  for(const entry of run.pending){
    if(entry.at>run.time){pending.push(entry);continue;}
    if(!entry.local&&(inView(run,entry,45)||distance(entry,run.player)<=240)){
      const next=spawnPoint(run);if(next)pending.push({...entry,...next,at:run.time+.8});continue;
    }
    spawnSurvivalEnemy(run,entry.type,{x:clamp(entry.x,35,WORLD.width-35),y:clamp(entry.y,35,WORLD.height-35)});
  }
  run.pending=pending;
}
function addHazard(run,value) {
  if(run.hazards.length>=LIMITS.hazards)return;
  run.hazards.push({id:run.nextId++,born:run.time,damage:12,...value});
}
function fan(run,e,count=1) {
  const a=Math.atan2(run.player.y-e.y,run.player.x-e.x);
  for(let i=0;i<count;i++){
    const angle=a+(i-(count-1)/2)*.22;
    addHazard(run,{type:'bullet',x:e.x,y:e.y,origin:{x:e.x,y:e.y},vx:Math.cos(angle)*205,vy:Math.sin(angle)*205,at:run.time+.8,until:run.time+3.6,radius:8,damage:e.damage});
  }
}
function ring(run,e) {
  addHazard(run,{type:'ring',x:e.x,y:e.y,radius:0,maxRadius:300,speed:230,at:run.time+1.1,until:run.time+2.55,damage:e.damage});
}
function charge(run,e) {
  const a=Math.atan2(run.player.y-e.y,run.player.x-e.x);
  e.state='windup';e.stateUntil=run.time+.85;e.chargeX=Math.cos(a);e.chargeY=Math.sin(a);
  addHazard(run,{type:'lane',x:e.x,y:e.y,endX:e.x+e.chargeX*310,endY:e.y+e.chargeY*310,radius:e.radius,at:e.stateUntil,until:e.stateUntil+.65,damage:0});
}
function summon(run,e) {
  for(let i=0;i<3;i++){const a=i*TAU/3+e.pattern;queueEnemy(run,i===1?'ranger':'virus',{x:e.x+Math.cos(a)*90,y:e.y+Math.sin(a)*90},1.1,true);}
}
function enemyAttack(run,e) {
  if(e.type==='charger'||e.type==='elite'&&e.pattern%2===0)charge(run,e);
  else if(e.type==='elite')summon(run,e);
  else if(e.type==='ranger')fan(run,e);
  else if(e.type==='blocker')addHazard(run,{type:'zone',x:run.player.x,y:run.player.y,radius:65,at:run.time+1.15,until:run.time+5.2,damage:e.damage});
  else if(e.type==='warden'){if(e.pattern%2)fan(run,e,5);else ring(run,e);}
  else if(e.type==='boss'){
    const pattern=e.pattern%4;
    if(pattern===0)ring(run,e);
    if(pattern===1)fan(run,e,5);
    if(pattern===2)charge(run,e);
    if(pattern===3)summon(run,e);
  }
  e.pattern++;e.attackAt=run.time+(e.type==='boss'?3.8:e.elite?4.6:e.type==='ranger'?3.5:5);
}
function separateEnemies(run,dt) {
  const enemies=run.enemies;
  for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){
    const a=enemies[i],b=enemies[j];if(a.dead||b.dead)continue;
    const dx=b.x-a.x,dy=b.y-a.y,wanted=a.radius+b.radius+5;
    if(Math.abs(dx)>wanted||Math.abs(dy)>wanted)continue;
    const d=Math.hypot(dx,dy);if(d>=wanted)continue;
    const angle=((a.id*13+b.id*7)%360)*Math.PI/180,nx=d?dx/d:Math.cos(angle),ny=d?dy/d:Math.sin(angle);
    const step=Math.min(30*dt,(wanted-d)*.13);
    if(a.state!=='charge'){a.x-=nx*step;a.y-=ny*step;}
    if(b.state!=='charge'){b.x+=nx*step;b.y+=ny*step;}
  }
}
function updateEnemies(run,dt) {
  for(const e of run.enemies){
    if(e.dead||run.time-e.born<.6)continue;
    if(inView(run,e)&&!run.observed.includes(e.shape))run.observed.push(e.shape);
    const d=Math.max(1,distance(e,run.player)),nx=(run.player.x-e.x)/d,ny=(run.player.y-e.y)/d;
    const stunned=e.stunUntil>run.time;
    if(e.state==='windup'&&run.time>=e.stateUntil){e.state='charge';e.stateUntil=run.time+.65;sound(run,'dash');}
    if(e.state==='charge'&&run.time>=e.stateUntil)e.state='move';
    if(e.state==='charge'){
      e.x+=e.chargeX*(e.elite?400:360)*dt;e.y+=e.chargeY*(e.elite?400:360)*dt;
    }else if(e.state!=='windup'&&!stunned){
      let speed=e.speed*(1+Math.min(run.time/1200,.25)),x=nx,y=ny;
      if(e.type==='ranger'){
        if(d<245){x=-nx;y=-ny;}
        else if(d<335){x=-ny*.35;y=nx*.35;}
      }
      if(e.type==='blocker'&&d<230){x=-ny*.4;y=nx*.4;}
      if(run.sites.some(s=>s.type==='haven'&&s.activeUntil>run.time&&distance(s,e)<s.radius+25)&&!e.elite){x=-nx;y=-ny;speed*=1.4;}
      e.x+=x*speed*dt;e.y+=y*speed*dt;
    }
    e.x+=e.pushX*dt;e.y+=e.pushY*dt;e.pushX*=Math.exp(-7*dt);e.pushY*=Math.exp(-7*dt);
    if(!stunned&&e.state==='move'&&run.time>=e.attackAt&&d<500&&inView(run,e,-12))enemyAttack(run,e);
  }
  separateEnemies(run,dt);
  for(const e of run.enemies){
    e.x=clamp(e.x,e.radius,WORLD.width-e.radius);e.y=clamp(e.y,e.radius,WORLD.height-e.radius);
    if(!e.dead&&run.time-e.born>=.6&&distance(e,run.player)<e.radius+run.player.radius-3)hurtPlayer(run,e.damage,e);
    if(run.status==='lost')break;
  }
}
function updateHazards(run,dt) {
  for(const h of run.hazards){
    if(run.time<h.at||run.time>h.until||h.type==='lane')continue;
    let hit=false;
    if(h.type==='bullet'){
      const previous={x:h.x,y:h.y};h.x+=h.vx*dt;h.y+=h.vy*dt;
      hit=segmentDistance(run.player,previous,h)<h.radius+run.player.radius;
      if(hit)h.until=run.time;
    }else if(h.type==='ring'){
      const previous=h.radius;h.radius=Math.min(h.maxRadius,h.radius+h.speed*dt);
      const d=distance(h,run.player);
      hit=d+run.player.radius>=previous-6&&d-run.player.radius<=h.radius+6;
    }else hit=distance(h,run.player)<h.radius+run.player.radius;
    if(hit)hurtPlayer(run,h.damage,h);
    if(run.status==='lost')break;
  }
  run.hazards=run.hazards.filter(h=>h.until>run.time);
}
export function tickSurvival(run,input={},delta=1/60) {
  if(!Number.isFinite(delta)||delta<=0)return false;
  const dt=Math.min(delta,.05),before=run.status;
  if(run.status==='confirm'){
    run.confirmRemaining=Math.max(0,run.confirmRemaining-dt);
    if(!run.confirmRemaining){run.status='running';run.choices=[];run.selected=null;levelUp(run);}
    return before!==run.status;
  }
  if(run.status!=='running')return false;
  const stats=survivalStats(run);run.time+=dt;
  run.player.invulnerable=Math.max(0,run.player.invulnerable-dt);run.hurt=Math.max(0,run.hurt-dt);
  let x=Number.isFinite(input.x)?input.x:0,y=Number.isFinite(input.y)?input.y:0;
  const length=Math.hypot(x,y);if(length>1){x/=length;y/=length;}
  run.player.moving=length>.05;
  if(run.player.moving){
    run.player.x=clamp(run.player.x+x*stats.speed*dt,24,WORLD.width-24);
    run.player.y=clamp(run.player.y+y*stats.speed*dt,24,WORLD.height-24);run.player.angle=Math.atan2(y,x);
  }
  if(run.priority&&(run.priority.until<=run.time||!run.enemies.some(e=>e.id===run.priority.id&&!e.dead)))run.priority=null;
  for(const key of Object.keys(run.timers))run.timers[key]-=dt;
  spawnWave(run);autoAttack(run);updateWeapons(run,dt);
  run.enemies=run.enemies.filter(e=>!e.dead);
  updateEnemies(run,dt);
  if(run.status!=='lost')updateHazards(run,dt);
  run.effects=run.effects.filter(e=>run.time-e.born<e.life);
  if(run.status==='lost')return true;
  updateSites(run);collectPickups(run,dt,stats);
  if(run.time>=RUN_DURATION&&run.bossDefeated)run.status='won';else levelUp(run);
  return before!==run.status;
}