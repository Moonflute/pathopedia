import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog,createMap,WAVES,STAGES,HOSTS,REWARDS,roomAt} from '../src/play-data.mjs';
import {newRun,tick,coverage,applyHit,spawnEnemy,fire,scan,visibleLabel,controlSource,switchWeapon,protectedBySource,canStand,moveBody,lineOfSight,chooseReward,resistanceChance,MAX_ENEMIES,canDetect,maxAmmo,ammoCount,isWeaponReady,combatCoverage,rewardOptions,cycleWeapon,reload,reserveCount,magazineCapacity,scanHints,equipWeapon} from '../src/play-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const catalog=createPlayCatalog(data);
const setup=(options={})=>{const r=newRun(catalog,{seed:31,...options});r.status='running';r.spawnTimer=9999;return r;};

test('Play uses the existing eleven drug cards and fifteen fixed isolates without reauthoring AST',()=>{
 assert.equal(catalog.weapons.length,11);assert.equal(catalog.enemies.length,15);
 for(const e of catalog.enemies){const record=data.records.find(r=>r.id===e.recordId);assert.equal(e.ast,record.susceptibility);assert.equal(e.name,record.organism);for(const w of catalog.weapons)assert.equal(e.ast[w.id],record.susceptibility[w.id]);}
 for(const w of catalog.weapons)assert.equal(w.name,data.drugs.find(d=>d.id===w.id).name);
});

test('R never takes damage, even with source control, increased exposure and extreme attack power',()=>{
 for(const profile of catalog.enemies)for(const weapon of catalog.weapons){if(!['R','INACTIVE'].includes(profile.ast[weapon.id]?.category))continue;const r=setup();r.upgrades.infusion=9;r.map.sources.forEach(s=>s.active=false);const e=spawnEnemy(r,profile.id,{x:6.5,y:3.5});const hp=e.hp,shield=e.shield;const result=applyHit(r,e,weapon,999999);assert.equal(result.factor,0);assert.equal(e.hp,hp);assert.equal(e.shield,shield);assert.equal(e.dot,0);}
});

test('I needs increased exposure, site-limited results do not leak into community infection, ACTIVE is distinct',()=>{
 assert.equal(coverage(catalog,'cefazolin','mssa').factor,1);
 assert.equal(coverage(catalog,'ceftriaxone','mssa').factor,0);
 assert.equal(coverage(catalog,'ceftriaxone','mssa',{exposure:true}).factor,1);
 assert.equal(coverage(catalog,'cefazolin','ecoli',{exposure:true}).factor,0);
 assert.equal(coverage(catalog,'cefazolin','ecoli',{site:'urinary'}).factor,1);
 assert.equal(coverage(catalog,'cefazolin','pneumo').category,'ACTIVE');
 assert.equal(coverage(catalog,'missing','pneumo').factor,0);
});

test('capsule absorbs susceptible hits first; a biofilm source protects nearby enemies until removed',()=>{
 const r=setup(),w=catalog.weaponById.ampicillin,e=spawnEnemy(r,'pneumo',{x:6.5,y:3.5});applyHit(r,e,w,20);assert.equal(e.hp,e.maxHp);assert.equal(e.shield,10);
 const bio=spawnEnemy(r,'mssa',{x:22.5,y:5.5});assert.equal(protectedBySource(r,bio),true);const before=bio.hp;applyHit(r,bio,catalog.weaponById.cefazolin,20);assert.ok(before-bio.hp<20);
 r.player.x=22.5;r.player.y=5.5;assert.ok(controlSource(r));assert.equal(protectedBySource(r,bio),false);const after=bio.hp;applyHit(r,bio,catalog.weaponById.cefazolin,20);assert.equal(after-bio.hp,20);
});

test('Hard scanner unlocks shape, culture and AST without stopping movement or exposing phenotype early',()=>{
 const r=setup({hard:true}),e=spawnEnemy(r,'mrsa',{x:6.5,y:3.5});assert.equal(visibleLabel(r,e),'???');
 assert.ok(scan(r));assert.equal(visibleLabel(r,e),'Gram-positive cocci');assert.equal(r.status,'running');r.scannerCooldown=0;
 assert.ok(scan(r));assert.equal(visibleLabel(r,e),'S. aureus');r.scannerCooldown=0;assert.ok(scan(r));assert.match(visibleLabel(r,e),/MRSA/);
 const x=r.player.x;tick(r,{forward:1},.05);assert.ok(r.player.x>x);
});

test('walls block hits and scanning, diagonal motion is normalized, and dashes cannot tunnel through walls',()=>{
 const r=setup(),e=spawnEnemy(r,'ecoli',{x:10.5,y:3.5});assert.equal(lineOfSight(r.map,r.player,e),false);assert.ok(fire(r));assert.equal(e.hp,e.maxHp);assert.equal(scan(r),false);
 const a=setup(),b=setup();tick(a,{forward:1},.05);tick(b,{forward:1,strafe:1},.05);assert.ok(Math.abs(Math.hypot(a.player.x-3.5,a.player.y-3.5)-Math.hypot(b.player.x-3.5,b.player.y-3.5))<1e-6);
 const body={x:7.5,y:3.5};moveBody(r.map,body,5,0);assert.ok(body.x<8);assert.ok(canStand(r.map,body.x,body.y));
});

test('all spawn points, pickups, source controls and exit are reachable from the start',()=>{
 const m=createMap(),visited=new Set(),queue=[[Math.floor(m.spawn.x),Math.floor(m.spawn.y)]];
 while(queue.length){const [x,y]=queue.shift(),i=y*m.width+x;if(visited.has(i)||m.cells[i]||x<0||y<0||x>=m.width||y>=m.height)continue;visited.add(i);queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);}
 for(const point of [...m.portals,...m.sources,...m.pickups,m.exit])assert.ok(visited.has(Math.floor(point.y)*m.width+Math.floor(point.x)),JSON.stringify(point));
});

test('all scheduled opponents have an available response and enemy pools have a hard cap',()=>{
 for(const wave of WAVES)for(const kind of wave.pool)assert.ok(catalog.weapons.some(w=>coverage(catalog,w.id,kind,{site:wave.site,scenarios:wave.scenarios}).factor));
 const r=setup();for(let i=0;i<100;i++)spawnEnemy(r,'ecoli',{x:6.5,y:3.5});assert.equal(r.enemies.filter(e=>e.active).length,MAX_ENEMIES);
});

test('broad-spectrum shots raise pressure, thresholds add resistant profiles, and AST stays immutable',()=>{
 const narrow=setup(),broad=setup();broad.weapon=4;fire(narrow);fire(broad);assert.ok(broad.pressure>narrow.pressure*10);assert.equal(resistanceChance(39),0);assert.ok(resistanceChance(40)>0);assert.ok(resistanceChance(70)>resistanceChance(40));
 let low=0,high=0;
 for(let seed=1;seed<=12;seed++)for(const pressure of [0,95]){const r=setup({seed});r.pressure=pressure;r.spawnTimer=0;r.player.hp=10000;for(let i=0;i<650;i++)tick(r,{},.05);const resistant=r.enemies.filter(e=>e.active&&catalog.enemyById[e.kind].resistant).length;if(pressure)high+=resistant;else low+=resistant;}
 assert.equal(low,0);assert.ok(high>15);assert.equal(catalog.enemyById.mrsa.ast.meropenem.category,'R');
});

test('AI detects, chases, attacks, dies, and recycles the enemy slot',()=>{
 const r=setup(),e=spawnEnemy(r,'ecoli',{x:5.5,y:3.5});tick(r,{},.05);assert.equal(e.state,'Detect');for(let i=0;i<80;i++)tick(r,{},.05);assert.ok(r.player.hp<100);assert.equal(e.state,'Attack');
 applyHit(r,e,catalog.weaponById.ampicillin,1000);assert.equal(e.state,'Dead');const hp=r.player.hp;for(let i=0;i<15;i++)tick(r,{},.05);assert.equal(e.active,false);assert.equal(r.player.hp,hp);
});

test('reward choice happens once; paused and terminal runs freeze; final extraction needs source control',()=>{
 const r=setup();r.spawned=WAVES[0].count;r.map.sources.forEach(s=>s.active=false);tick(r);assert.equal(r.status,'reward');assert.equal(r.rewards.length,3);const id=r.rewards[0].id;assert.ok(chooseReward(r,id));assert.equal(chooseReward(r,id),false);assert.equal(r.wave,1);assert.equal(r.status,'paused');const time=r.time;tick(r,{forward:1});assert.equal(r.time,time);
 r.status='running';r.wave=WAVES.length-1;r.spawned=WAVES.at(-1).count;tick(r);assert.equal(r.status,'running');r.map.sources.forEach(s=>s.active=false);tick(r);assert.equal(r.status,'won');const finished=r.time;tick(r);assert.equal(r.time,finished);
});

test('infusion ticks respect coverage and the immune perk is weaker with neutropenia',()=>{
 const r=setup();r.upgrades.infusion=1;const e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});applyHit(r,e,catalog.weaponById.ampicillin,10);const hp=e.hp;tick(r,{},.05);assert.ok(e.hp<hp);
 for(const host of ['normal','neutropenia']){const n=setup({host});n.upgrades.immune=1;n.immuneTime=0;const target=spawnEnemy(n,'ecoli',{x:6.5,y:3.5});target.hp=20;tick(n);assert.equal(target.state,'Dead');assert.equal(n.immuneTime,host==='normal'?10:24);}
});

test('all rewards remain three choices late in a run and efficiency stacks without changing coverage',()=>{
 const r=setup();r.upgrades={immune:1,scanner:1,infusion:1,efficiency:1,source:1,stewardship:1};r.spawned=WAVES[0].count;r.map.sources.forEach(s=>s.active=false);tick(r);assert.equal(r.rewards.length,3);
 const a=setup(),b=setup();a.upgrades.efficiency=1;b.upgrades.efficiency=2;fire(a);fire(b);assert.ok(b.magazines[0]>a.magazines[0]);
});

test('switching is immediate while each weapon retains its own fire-rate limit',()=>{
 const r=setup();r.weapon=3;assert.ok(fire(r));switchWeapon(r,0);for(let i=0;i<8;i++)tick(r,{},1/60);assert.ok(fire(r));switchWeapon(r,3);for(let i=0;i<8;i++)tick(r,{},1/60);assert.equal(fire(r),false);
});

test('unseen enemies never acquire global aggro, including after a long wait or through an open doorway',()=>{
 const r=setup(),behind=spawnEnemy(r,'mssa',{x:2,y:3.5}),wall=spawnEnemy(r,'mssa',{x:10.5,y:3.5});
 for(let i=0;i<600;i++)tick(r,{},.05);
 assert.equal(behind.state,'Idle');assert.equal(wall.state,'Idle');assert.equal(r.player.hp,100);
 r.player.x=7;r.player.y=4.5;wall.x=10;wall.y=4.5;assert.ok(lineOfSight(r.map,r.player,wall));assert.notEqual(roomAt(r.map,r.player.x,r.player.y),roomAt(r.map,wall.x,wall.y));assert.equal(canDetect(r,wall),false);
 r.player.x=9;assert.equal(canDetect(r,wall),true);tick(r);assert.equal(wall.state,'Detect');
});

test('contact cancels when the player looks away; pursuit searches the last seen position and expires',()=>{
 const r=setup(),e=spawnEnemy(r,'mssa',{x:6.5,y:3.5});tick(r);assert.equal(e.state,'Detect');r.player.angle=Math.PI;tick(r);assert.equal(e.state,'Idle');
 r.player.angle=0;for(let i=0;i<10;i++)tick(r,{},.05);assert.equal(e.state,'Chase');const memory={...e.lastSeen};
 r.player.x=21.5;r.player.y=17.5;for(let i=0;i<25;i++)tick(r,{},.05);assert.equal(e.state,'Search');assert.deepEqual(e.lastSeen,memory);
 for(let i=0;i<100;i++)tick(r,{},.05);assert.equal(e.state,'Idle');assert.equal(e.lastSeen,null);
});

test('a direct resistant hit alerts that target without granting damage or alerting another room',()=>{
 const r=setup(),e=spawnEnemy(r,'mrsa',{x:6.5,y:3.5}),other=spawnEnemy(r,'mssa',{x:21.5,y:17.5});const hp=e.hp;
 applyHit(r,e,catalog.weaponById.ampicillin);assert.equal(e.hp,hp);assert.equal(e.state,'Chase');assert.equal(other.state,'Idle');
});

test('every stage layout and encounter position is reachable; map variants are distinct',()=>{
 const layouts=new Set();
 for(let stage=0;stage<STAGES.length;stage++){
  const r=newRun(catalog,{stage}),m=r.map,visited=new Set(),queue=[Math.floor(m.spawn.y)*m.width+Math.floor(m.spawn.x)];
  while(queue.length){const i=queue.shift();if(i<0||i>=m.cells.length||visited.has(i)||m.cells[i])continue;visited.add(i);queue.push(i-1,i+1,i-m.width,i+m.width);}
  for(const p of [...m.portals,...m.sources,...m.pickups,...r.pending,m.exit]){assert.ok(canStand(m,p.x,p.y,.18),stage+': '+JSON.stringify(p));assert.ok(visited.has(Math.floor(p.y)*m.width+Math.floor(p.x)),stage+': unreachable');}
  assert.equal(r.pending.length,STAGES[stage].count);layouts.add(Buffer.from(m.cells).toString('base64'));
 }
 assert.ok(layouts.size>=4);
});

test('each stage issues enough counters for every enemy and supported host before combat',()=>{
 for(let stage=0;stage<STAGES.length;stage++)for(const h of HOSTS){const r=newRun(catalog,{stage,host:h.id});for(const kind of STAGES[stage].pool)assert.ok(catalog.weapons.some((w,i)=>isWeaponReady(r,i)&&combatCoverage(r,w,kind).factor),stage+'/'+h.id+'/'+kind);}
 const r=setup();assert.equal(isWeaponReady(r,8),false);assert.equal(switchWeapon(r,8),false);r.weapon=4;cycleWeapon(r,1);assert.equal(r.weapon,0);
});

test('magazines are separate from generous regenerating reserves; capacity rewards increase reserves',()=>{
 const r=setup();assert.equal(maxAmmo(r),200);assert.equal(ammoCount(r,0),18);assert.equal(reserveCount(r,0),28);r.energy.fill(50);tick(r,{},.05);assert.ok(r.energy[1]-50>r.energy[0]-50);r.upgrades.reserve=2;assert.equal(maxAmmo(r),320);
 r.energy.fill(320);assert.equal(reserveCount(r,0),45);assert.ok(fire(r));assert.equal(ammoCount(r,0),17);assert.equal(reserveCount(r,0),45);
});

test('aminopenicillin allergy blocks AMP only; renal optimization removes the resource penalty',()=>{
 const a=setup({host:'allergy'});assert.equal(isWeaponReady(a,0),false);assert.equal(switchWeapon(a,0),false);assert.ok(isWeaponReady(a,1));assert.equal(combatCoverage(a,catalog.weapons[0],'ecoli').factor,0);
 const r=setup({host:'renal'}),n=setup();r.energy.fill(50);n.energy.fill(50);tick(r,{},.05);tick(n,{},.05);assert.ok(r.energy[0]<n.energy[0]);r.upgrades.renal=1;r.energy.fill(50);n.energy.fill(50);tick(r,{},.05);tick(n,{},.05);assert.equal(r.energy[0],n.energy[0]);
});

test('regimen and unknown results keep their meaning and enforce the authored infection site',()=>{
 assert.equal(coverage(catalog,'levofloxacin','legionella',{site:'lung'}).category,'REGIMEN');assert.equal(coverage(catalog,'levofloxacin','legionella',{site:'lung'}).factor,1);assert.equal(coverage(catalog,'levofloxacin','legionella',{site:'bloodstream'}).factor,0);
 assert.equal(coverage(catalog,'metronidazole','anaerobe',{site:'abdomen'}).factor,1);assert.equal(coverage(catalog,'ceftriaxone','anaerobe',{site:'abdomen'}).category,'OUTSIDE_REGIMEN');assert.equal(coverage(catalog,'cefazolin','legionella',{site:'lung'}).category,'?');
 const r=setup({stage:2});r.upgrades.infusion=1;assert.equal(combatCoverage(r,catalog.weaponById.levofloxacin,'pseudo').factor,0);r.upgrades.exposure=1;assert.equal(combatCoverage(r,catalog.weaponById.levofloxacin,'pseudo').factor,1);
});

test('dormant spores resist all antibiotic damage; source control removes spores and residual toxin',()=>{
 const r=setup({stage:3}),e=spawnEnemy(r,'clostridium',{x:5.5,y:3.5});assert.equal(e.state,'Dormant');applyHit(r,e,catalog.weaponById.metronidazole,99999);assert.equal(e.hp,e.maxHp);assert.equal(e.state,'Dormant');assert.ok(controlSource(r));assert.equal(e.state,'Dead');assert.equal(r.hazards.filter(h=>h.active).length,0);
 const second=spawnEnemy(r,'clostridium',{x:6,y:3.5});for(let i=0;i<50;i++)tick(r,{},.05);assert.notEqual(second.state,'Dormant');applyHit(r,second,catalog.weaponById.metronidazole,99999);assert.equal(second.state,'Dead');assert.ok(r.hazards.some(h=>h.active));r.player.x=6;r.sourceCooldown=0;controlSource(r);assert.equal(r.hazards.filter(h=>h.active).length,0);
});

test('mobile biofilm protects neighbors until F disrupts it; intracellular exposure slows the host-cell target',()=>{
 const r=setup({stage:4}),carrier=spawnEnemy(r,'pseudo',{x:5.5,y:3.5}),neighbor=spawnEnemy(r,'mrsa',{x:6.5,y:3.5});assert.ok(protectedBySource(r,neighbor));assert.ok(controlSource(r));assert.equal(carrier.biofilm,false);assert.equal(protectedBySource(r,neighbor),false);
 const lung=setup({stage:2}),inside=spawnEnemy(lung,'legionella',{x:6.5,y:3.5});assert.ok(inside.cell>0);applyHit(lung,inside,catalog.weaponById.levofloxacin);assert.equal(inside.cell,0);assert.ok(inside.slow>0);assert.ok(inside.hp<inside.maxHp);
});

test('inhibitor reward unlocks the named CZA combination without altering any original R result',()=>{
 const r=setup();r.status='reward';r.rewards=[REWARDS.find(r=>r.id==='inhibitor')];assert.ok(chooseReward(r,'inhibitor'));assert.equal(r.unlocked[8],true);assert.equal(coverage(catalog,'meropenem','kpc').factor,0);assert.equal(coverage(catalog,'ceftazavi','kpc').factor,1);assert.equal(coverage(catalog,'ceftazavi','mrsa').factor,0);
});

test('extraction requires clearing the entire stage; transitions replace map, pools and sources',()=>{
 const r=setup();r.spawned=STAGES[0].count;r.stageKills=STAGES[0].count;tick(r);assert.equal(r.status,'running');r.map.sources.forEach(s=>s.active=false);r.player.x=21.5;tick(r);assert.equal(r.status,'running');Object.assign(r.player,r.map.exit);tick(r);assert.equal(r.status,'reward');const id=r.rewards[0].id,oldMap=r.map;chooseReward(r,id);assert.notEqual(r.map,oldMap);assert.equal(r.map.site,'urinary');assert.ok(r.map.sources.every(s=>s.active));assert.equal(r.pending.length,STAGES[1].count);assert.equal(r.energy[0],maxAmmo(r));assert.equal(r.status,'paused');
});

test('single-stage practice can extract, and the KPC boss keeps its resistant AST across phases',()=>{
 const r=setup({stage:7,mission:'single'}),boss=spawnEnemy(r,'kpc',{x:6.5,y:3.5},false,{boss:true}),hp=boss.hp,shield=boss.shield;applyHit(r,boss,catalog.weaponById.meropenem,99999);assert.equal(boss.hp,hp);assert.equal(boss.shield,shield);applyHit(r,boss,catalog.weaponById.ceftazavi,99999);assert.equal(boss.state,'Dead');r.spawned=STAGES[7].count;r.map.sources.forEach(s=>s.active=false);tick(r);assert.equal(r.status,'won');assert.equal(r.completedStages,1);
});

test('reward choices exclude already supplied weapons and remain available after capped upgrades',()=>{
 const r=setup({stage:7,host:'renal'});for(const reward of REWARDS)if(reward.max)r.upgrades[reward.id]=reward.max;
 const options=rewardOptions(r);assert.equal(options.length,3);assert.ok(options.every(r=>!r.weapon));
});

test('easy scan hints use current coverage, host and target, and never reveal hints in Hard',()=>{
 const r=setup({hints:true}),e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});assert.deepEqual(scanHints(r),[]);assert.ok(scan(r));assert.deepEqual(scanHints(r),[0,2,4]);
 r.host='allergy';assert.deepEqual(scanHints(r),[2,4]);r.player.angle=Math.PI;assert.deepEqual(scanHints(r),[]);r.player.angle=0;r.hintTime=0;assert.deepEqual(scanHints(r),[]);
 const h=setup({hard:true,hints:true});spawnEnemy(h,'ecoli',{x:6.5,y:3.5});scan(h);assert.equal(h.hints,false);assert.deepEqual(scanHints(h),[]);
 const d=setup({stage:3,hints:true});spawnEnemy(d,'clostridium',{x:6.5,y:3.5});scan(d);assert.deepEqual(scanHints(d),[]);
});

test('reload transfers real reserves only on completion and weapon switching cancels it',()=>{
 const r=setup();fire(r);const before=r.magazines[0];assert.ok(reload(r));assert.equal(fire(r),false);tick(r,{},.05);switchWeapon(r,1);assert.equal(r.reloadTime,0);assert.equal(r.magazines[0],before);
 switchWeapon(r,0);assert.ok(reload(r));for(let i=0;i<22;i++)tick(r,{},.05);assert.equal(r.magazines[0],magazineCapacity(r,0));assert.ok(r.energy[0]<maxAmmo(r));
 r.magazines[0]=0;r.cooldowns[0]=0;r.switchTime=0;assert.equal(fire(r),false);assert.ok(r.reloadTime>0);const left=r.reloadTime;r.status='paused';tick(r,{},.05);assert.equal(r.reloadTime,left);
});

test('jump rises and lands without firing, repeated holding does not bunny-hop or bypass walls',()=>{
 const r=setup();tick(r,{jump:true},.05);assert.ok(r.player.z>0);assert.equal(r.shots,0);let max=r.player.z;for(let i=0;i<20;i++){tick(r,{jump:true},.05);max=Math.max(max,r.player.z);}assert.ok(max>.3&&max<.5);assert.equal(r.player.z,0);tick(r,{jump:false});tick(r,{jump:true});assert.ok(r.player.z>0);
 r.player.x=7.5;r.player.y=3.5;for(let i=0;i<20;i++)tick(r,{jump:true,forward:1},.05);assert.ok(r.player.x<8);assert.ok(canStand(r.map,r.player.x,r.player.y));
});

test('every starting room and sightline is empty, with all encounters pre-positioned before exploration',()=>{
 for(let stage=0;stage<STAGES.length;stage++){const r=newRun(catalog,{stage});for(const p of r.pending){assert.notEqual(p.room,roomAt(r.map,r.map.spawn.x,r.map.spawn.y));assert.ok(Math.hypot(p.x-r.player.x,p.y-r.player.y)>=6);assert.equal(lineOfSight(r.map,r.player,p),false);}
 r.status='running';tick(r);assert.equal(r.pending.length,0);assert.equal(r.spawned,STAGES[stage].count);assert.ok(r.enemies.filter(e=>e.active).every(e=>e.state==='Idle'||e.state==='Dormant'));assert.equal(r.player.hp,100);}
});

test('late viral and parasite cases require their authored scenario and fit nine editable slots',()=>{
 assert.equal(coverage(catalog,'ganciclovir','cmv',{site:'bloodstream'}).factor,0);assert.equal(coverage(catalog,'ganciclovir','cmv',{scenarios:['cmv-retinitis']}).factor,1);assert.equal(coverage(catalog,'ivermectin','strongyloides',{scenarios:['strongyloidiasis']}).factor,1);
 for(const stage of STAGES.slice(0,5))assert.ok(!stage.pool.includes('cmv')&&!stage.pool.includes('strongyloides'));
 const r=setup({stage:7});assert.equal(r.slots.length,9);assert.ok(r.slots.includes(9)&&r.slots.includes(10));assert.equal(equipWeapon(r,0,0),false);r.status='paused';assert.ok(equipWeapon(r,0,0));assert.equal(r.slots[0],0);assert.equal(new Set(r.slots).size,9);
});
