import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog,createMap,WAVES,STAGES,HOSTS,REWARDS,roomAt,THEME_STAGES,COMPANIONS} from '../src/play-data.mjs';
import {newRun,tick,coverage,applyHit,spawnEnemy,fire,scan,visibleLabel,controlSource,switchWeapon,protectedBySource,canStand,moveBody,lineOfSight,chooseReward,resistanceChance,MAX_ENEMIES,canDetect,maxAmmo,ammoCount,isWeaponReady,combatCoverage,rewardOptions,cycleWeapon,reload,reserveCount,magazineCapacity,scanHints,equipWeapon,selectScanner,revealMap,canExtract,targetEnemy,throwGrenade,stageReport,chooseAugment,augmentOptions,MAX_SURVIVAL_ENEMIES,equipCompanion,companionAccepts,recruitCompanion} from '../src/play-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const library=JSON.parse(readFileSync(new URL('../data/library.json',import.meta.url),'utf8'));
const catalog=createPlayCatalog(data,library);
const setup=(options={})=>{const r=newRun(catalog,{seed:31,...options});r.status='running';r.spawnTimer=9999;return r;};

test('Play uses the existing twelve drug cards and seventeen fixed isolates without reauthoring AST',()=>{
 assert.equal(catalog.weapons.length,12);assert.equal(catalog.enemies.length,17);
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
 const source=r.map.sources[0],bio=spawnEnemy(r,'mssa',source);assert.equal(protectedBySource(r,bio),true);const before=bio.hp;applyHit(r,bio,catalog.weaponById.cefazolin,20);assert.ok(before-bio.hp<20);
 Object.assign(r.player,source);assert.ok(controlSource(r));assert.equal(protectedBySource(r,bio),false);const after=bio.hp;applyHit(r,bio,catalog.weaponById.cefazolin,20);assert.equal(after-bio.hp,20);
});

test('Hard scanner unlocks shape, culture and AST without stopping movement or exposing phenotype early',()=>{
 const r=setup({hard:true}),e=spawnEnemy(r,'mrsa',{x:6.5,y:3.5});assert.equal(visibleLabel(r,e),'???');
 assert.ok(scan(r));assert.equal(visibleLabel(r,e),'Gram-positive cocci');assert.equal(r.status,'running');r.scannerCooldown=0;
 assert.ok(scan(r));assert.equal(visibleLabel(r,e),'S. aureus');r.scannerCooldown=0;assert.ok(scan(r));assert.match(visibleLabel(r,e),/MRSA/);
 const x=r.player.x;tick(r,{forward:1},.05);assert.ok(r.player.x>x);
});

test('walls block hits and scanning, diagonal motion is normalized, and dashes cannot tunnel through walls',()=>{
 const r=setup(),e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});r.map.cells[3*r.map.width+5]=1;assert.equal(lineOfSight(r.map,r.player,e),false);assert.ok(fire(r));assert.equal(e.hp,e.maxHp);assert.equal(scan(r),false);
 const a=setup(),b=setup();tick(a,{forward:1},.05);tick(b,{forward:1,strafe:1},.05);assert.ok(Math.abs(Math.hypot(a.player.x-3.5,a.player.y-3.5)-Math.hypot(b.player.x-3.5,b.player.y-3.5))<1e-6);
 const body={x:3.5,y:3.5};moveBody(r.map,body,8,0);assert.ok(body.x<5);assert.ok(canStand(r.map,body.x,body.y));
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

test('reward choice happens once; paused and terminal runs freeze; extraction still needs the exit',()=>{
 const r=setup();r.spawned=WAVES[0].count;r.map.sources.forEach(s=>s.active=false);Object.assign(r.player,r.map.exit);tick(r);assert.equal(r.status,'reward');assert.equal(r.rewards.length,3);const id=r.rewards[0].id;assert.ok(chooseReward(r,id));assert.equal(chooseReward(r,id),false);assert.equal(r.wave,1);assert.equal(r.status,'paused');const time=r.time;tick(r,{forward:1});assert.equal(r.time,time);
 r.status='running';r.wave=WAVES.length-1;r.spawned=WAVES.at(-1).count;tick(r);assert.equal(r.status,'running');r.map.sources.forEach(s=>s.active=false);Object.assign(r.player,r.map.exit);tick(r);assert.equal(r.status,'won');const finished=r.time;tick(r);assert.equal(r.time,finished);
});

test('infusion ticks respect coverage and the immune perk is weaker with neutropenia',()=>{
 const r=setup();r.upgrades.infusion=1;const e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});applyHit(r,e,catalog.weaponById.ampicillin,10);const hp=e.hp;tick(r,{},.05);assert.ok(e.hp<hp);
 for(const host of ['normal','neutropenia']){const n=setup({host});n.upgrades.immune=1;n.immuneTime=0;const target=spawnEnemy(n,'ecoli',{x:6.5,y:3.5});target.hp=20;tick(n);assert.equal(target.state,'Dead');assert.equal(n.immuneTime,host==='normal'?10:24);}
});

test('all rewards remain three choices late in a run and efficiency stacks without changing coverage',()=>{
 const r=setup();r.upgrades={immune:1,scanner:1,infusion:1,efficiency:1,source:1,stewardship:1};r.spawned=WAVES[0].count;r.map.sources.forEach(s=>s.active=false);Object.assign(r.player,r.map.exit);tick(r);assert.equal(r.rewards.length,3);
 const a=setup(),b=setup();a.upgrades.efficiency=1;b.upgrades.efficiency=2;fire(a);fire(b);assert.ok(b.magazines[0]>a.magazines[0]);
});

test('switching is immediate while each weapon retains its own fire-rate limit',()=>{
 const r=setup();r.weapon=3;assert.ok(fire(r));switchWeapon(r,0);for(let i=0;i<8;i++)tick(r,{},1/60);assert.ok(fire(r));switchWeapon(r,3);for(let i=0;i<8;i++)tick(r,{},1/60);assert.equal(fire(r),false);
});

test('unseen enemies never acquire global aggro, including after a long wait or through an open doorway',()=>{
 const r=setup(),behind=spawnEnemy(r,'mssa',{x:2,y:3.5}),wall=spawnEnemy(r,'mssa',{x:6.5,y:3.5});r.map.cells[3*r.map.width+5]=1;
 for(let i=0;i<600;i++)tick(r,{},.05);
 assert.equal(behind.state,'Idle');assert.equal(wall.state,'Idle');assert.equal(r.player.hp,100);
 r.map.cells[3*r.map.width+5]=0;for(let y=1;y<=7;y++)for(let x=5;x<=7;x++)r.map.roomCells[y*r.map.width+x]=1;r.player.x=4.5;assert.ok(lineOfSight(r.map,r.player,wall));assert.notEqual(roomAt(r.map,r.player.x,r.player.y),roomAt(r.map,wall.x,wall.y));assert.equal(canDetect(r,wall),false);
 r.player.x=5.5;assert.equal(canDetect(r,wall),true);tick(r);assert.equal(wall.state,'Detect');
});

test('contact cancels when the player looks away; pursuit searches the last seen position and expires',()=>{
 const r=setup(),e=spawnEnemy(r,'mssa',{x:6.5,y:3.5});tick(r);assert.equal(e.state,'Detect');r.player.angle=Math.PI;tick(r);assert.equal(e.state,'Idle');
 r.player.angle=0;for(let i=0;i<10;i++)tick(r,{},.05);assert.equal(e.state,'Chase');const memory={...e.lastSeen};
 r.player.x=21.5;r.player.y=17.5;for(let i=0;i<25;i++)tick(r,{},.05);assert.equal(e.state,'Search');assert.deepEqual(e.lastSeen,memory);
 for(let i=0;i<100;i++)tick(r,{},.05);assert.equal(e.state,'Idle');assert.equal(e.lastSeen,null);
});

test('a direct resistant hit alerts that target without granting damage or alerting another room',()=>{
 const r=setup(),e=spawnEnemy(r,'mrsa',{x:6.5,y:3.5}),other=spawnEnemy(r,'mssa',r.pending[0]);const hp=e.hp;
 applyHit(r,e,catalog.weaponById.ampicillin);assert.equal(e.hp,hp);assert.equal(e.state,'Chase');assert.equal(other.state,'Idle');
});

test('every stage layout and encounter position is reachable; map variants are distinct',()=>{
 const layouts=new Set();
 for(let stage=0;stage<STAGES.length;stage++)for(const seed of [31,97,108]){
  const r=newRun(catalog,{stage,seed}),m=r.map,visited=new Set(),queue=[Math.floor(m.spawn.y)*m.width+Math.floor(m.spawn.x)];
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

test('extraction requires all enemies, leaves optional sources intact, and records the sector before resetting',()=>{
 const r=setup();r.spawned=STAGES[0].count;const survivor=spawnEnemy(r,'mssa',{x:6.5,y:3.5});Object.assign(r.player,r.map.exit);r.messageTime=0;tick(r);assert.equal(r.status,'running');assert.equal(canExtract(r),false);assert.match(r.message,/적이 남아 있습니다/);
 applyHit(r,survivor,catalog.weaponById.cefazolin,9999);assert.ok(canExtract(r));tick(r);assert.equal(r.status,'reward');assert.ok(r.map.sources.every(s=>s.active));assert.equal(r.lastReport.rows[0].kills,1);const oldMap=r.map;chooseReward(r,r.rewards[0].id);assert.notEqual(r.map,oldMap);assert.equal(r.map.site,'urinary');assert.equal(r.pending.length,STAGES[1].count);assert.equal(r.status,'paused');assert.deepEqual(r.kindReports,{});
});

test('single-stage practice can extract, and the KPC boss keeps its resistant AST across phases',()=>{
 const r=setup({stage:7,mission:'single'}),boss=spawnEnemy(r,'kpc',{x:6.5,y:3.5},false,{boss:true}),hp=boss.hp,shield=boss.shield;applyHit(r,boss,catalog.weaponById.meropenem,99999);assert.equal(boss.hp,hp);assert.equal(boss.shield,shield);applyHit(r,boss,catalog.weaponById.ceftazavi,99999);assert.equal(boss.state,'Dead');r.spawned=STAGES[7].count;r.map.sources.forEach(s=>s.active=false);Object.assign(r.player,r.map.exit);tick(r);assert.equal(r.status,'won');assert.equal(r.completedStages,1);
});

test('reward choices exclude already supplied weapons and remain available after capped upgrades',()=>{
 const r=setup({stage:7,host:'renal'});for(const reward of REWARDS)if(reward.max)r.upgrades[reward.id]=reward.max;
 const options=rewardOptions(r);assert.equal(options.length,3);assert.ok(options.every(r=>!r.weapon));
});

test('easy scan hints use current coverage, host and target, and never reveal hints in Hard',()=>{
 const r=setup({hints:true}),e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});assert.deepEqual(scanHints(r),[]);assert.ok(scan(r));assert.deepEqual(scanHints(r),[0,2,4]);
 r.host='allergy';assert.deepEqual(scanHints(r),[2,4]);r.player.angle=Math.PI;assert.deepEqual(scanHints(r),[]);r.player.angle=0;r.hintTime=0;assert.deepEqual(scanHints(r),[2,4]);e.scanned=false;assert.deepEqual(scanHints(r),[]);
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

test('map and encounter seeds reproduce a run while other seeds change both geometry and placements',()=>{
 const a=newRun(catalog,{seed:'ward-7'}),b=newRun(catalog,{seed:'ward-7'}),c=newRun(catalog,{seed:'ward-8'});
 assert.equal(a.seed,b.seed);assert.deepEqual(a.map.cells,b.map.cells);assert.deepEqual(a.pending,b.pending);assert.notDeepEqual(a.map.cells,c.map.cells);assert.notDeepEqual(a.pending,c.pending);
});
test('holding the offhand scanner progressively scans without consuming ammo and release returns to the same gun',()=>{
 const r=setup({hard:true,hints:true});spawnEnemy(r,'mrsa',{x:6.5,y:3.5});fire(r);const rounds=ammoCount(r,0);selectScanner(r);assert.equal(fire(r),false);assert.equal(reload(r),false);
 for(let n=0;n<4;n++)tick(r,{scope:true},.05);assert.equal(r.intel.mrsa,0);assert.ok(r.scoped);
 for(let n=0;n<29;n++)tick(r,{scope:true},.05);assert.equal(r.intel.mrsa,3);assert.equal(ammoCount(r,0),rounds);assert.deepEqual(scanHints(r),[]);
 tick(r,{scope:false},.05);assert.equal(r.scannerActive,false);assert.equal(r.scoped,false);assert.equal(r.weapon,0);assert.equal(ammoCount(r,0),rounds);tick(r,{scope:true},.05);assert.equal(r.scoped,true);
});
test('exploration reveals only current sight rays, retains history and cannot see through a wall',()=>{
 const r=setup();r.map.cells[3*r.map.width+5]=1;r.discovered.fill(0);revealMap(r);
 assert.equal(r.discovered[3*r.map.width+5],1);assert.equal(r.discovered[3*r.map.width+6],0);assert.equal(r.discovered[3*r.map.width+2],0);
 r.player.angle=Math.PI;revealMap(r);assert.equal(r.discovered[3*r.map.width+2],1);assert.equal(r.discovered[3*r.map.width+5],1);
 assert.ok(r.discovered.some(n=>!n));assert.equal(newRun(catalog,{mapMode:'full'}).mapMode,'full');assert.equal(newRun(catalog,{mapMode:'invalid'}).mapMode,'explore');
});
test('final exit stays locked while any opponent remains, including the resistant boss',()=>{
 const r=setup({stage:7,mission:'single'});r.spawnTimer=0;tick(r);Object.assign(r.player,r.map.exit);assert.equal(canExtract(r),false);
 for(const e of r.enemies.filter(e=>e.active)){e.biofilm=false;const w=catalog.weapons.find(w=>combatCoverage(r,w,e.kind).factor);applyHit(r,e,w,99999);}assert.ok(canExtract(r));tick(r);assert.equal(r.status,'won');assert.ok(r.map.sources.every(s=>s.active));
});

test('vertical looking cannot shoot or scan an enemy below the reticle and resets at the next stage',()=>{
 const r=setup(),e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});r.player.pitch=.55;assert.equal(targetEnemy(r),null);assert.equal(scan(r),false);fire(r);assert.equal(e.hp,e.maxHp);r.player.pitch=0;assert.equal(targetEnemy(r),e);
 r.status='reward';r.rewards=rewardOptions(r);chooseReward(r,r.rewards[0].id);assert.equal(r.player.pitch,0);
});

test('late pressure escalation preserves a susceptible cohort and covers every scheduled type',()=>{
 for(const stage of [5,6,7]){const r=setup({stage});r.spawnTimer=0;r.pressure=95;tick(r);const ordinary=r.enemies.filter(e=>e.active&&!catalog.enemyById[e.kind].resistant&&!catalog.enemyById[e.kind].viral&&!catalog.enemyById[e.kind].parasite);assert.ok(ordinary.length>=Math.ceil(STAGES[stage].count*.3));}
});

test('stage review separates targeted effective, blocked and missed shots, uses shared clinical contexts',()=>{
 const r=setup(),e=spawnEnemy(r,'mrsa',{x:6.5,y:3.5});fire(r);switchWeapon(r,3);r.switchTime=0;fire(r);r.player.angle=Math.PI;switchWeapon(r,2);r.switchTime=0;fire(r);
 const report=stageReport(r),row=report.rows[0];assert.equal(report.shots,3);assert.equal(report.misses,1);assert.equal(row.effective,1);assert.equal(row.blocked,1);assert.equal(row.weapons.ampicillin.effective,0);assert.equal(row.weapons.vancomycin.effective,1);
 for(const profile of catalog.enemies){assert.ok(profile.therapies.length);for(const context of profile.therapies){assert.equal(context,library.therapyContexts[context.id]);assert.ok(context.sourceIds.every(id=>catalog.sources[id]?.url.startsWith('https://')));}}
});

test('environmental throwable is pooled, finite, wall blocked and does not kill dormant spores or parasites',()=>{
 const r=setup({stage:6}),e=spawnEnemy(r,'mssa',{x:5.5,y:3.5}),spore=spawnEnemy(r,'clostridium',{x:5.5,y:4.5}),worm=spawnEnemy(r,'strongyloides',{x:5.5,y:5.5});r.player.angle=Math.PI;assert.ok(throwGrenade(r));assert.equal(r.grenades,2);assert.equal(throwGrenade(r),false);
 const f=r.fields[0];Object.assign(f,{active:true,x:5.5,y:3.5,radius:3,life:4.5});const hp=e.hp;tick(r,{},.05);assert.ok(e.hp<hp);assert.equal(spore.hp,spore.maxHp);assert.equal(worm.hp,worm.maxHp);assert.equal(r.shots,0);
 r.map.cells[3*r.map.width+4]=1;f.x=3.5;e.state='Idle';const before=e.hp;tick(r,{},.05);assert.equal(e.hp,before);r.status='paused';const life=f.life;tick(r,{},.05);assert.equal(f.life,life);
});

test('endless waves use bounded pools, delayed specialists, valid per-case coverage and three augments',()=>{
 const r=setup({mission:'survival'});r.spawnTimer=0;r.player.hp=100000;tick(r);assert.equal(r.enemies.length,MAX_SURVIVAL_ENEMIES);assert.equal(r.spawned,1);assert.ok(r.enemies.every(e=>!e.active||(!['cmv','strongyloides'].includes(e.kind)&&Math.hypot(e.x-r.player.x,e.y-r.player.y)>=5.5)));
 const pools=[r.enemies.length,r.orbs.length,r.fields.length,r.thrown.length];r.time=425;r.spawnTimer=0;tick(r);assert.equal(r.wave,6);assert.ok(r.slots.includes(9)&&r.slots.includes(10));assert.equal(combatCoverage(r,catalog.weaponById.ganciclovir,'cmv').factor,1);assert.equal(combatCoverage(r,catalog.weaponById.metronidazole,'anaerobe').factor,1);assert.equal(combatCoverage(r,catalog.weaponById.levofloxacin,'legionella').factor,1);
 r.xp=r.xpNeeded;tick(r);assert.equal(r.status,'augment');assert.equal(r.augmentChoices.length,3);assert.ok(chooseAugment(r,r.augmentChoices[0].id));assert.equal(r.status,'paused');assert.deepEqual([r.enemies.length,r.orbs.length,r.fields.length,r.thrown.length],pools);
 for(const id of ['cephaPulse','isolation','magnet','fastReload','recovery','grenadier','exposure','infusion','rate','efficiency'])r.upgrades[id]=99;assert.equal(augmentOptions(r).length,3);
});

test('automatic CRO respects resistance, grants no manual accuracy and orb collection advances levels',()=>{
 const r=setup({mission:'survival'});r.upgrades.cephaPulse=4;r.pulseTime=0;r.player.angle=Math.PI;
 const resistant=spawnEnemy(r,'mrsa',{x:5.5,y:3.5}),susceptible=spawnEnemy(r,'ecoli',{x:6,y:3.5});tick(r,{},.05);assert.equal(resistant.hp,resistant.maxHp);assert.equal(susceptible.state,'Dead');assert.equal(r.effective,0);assert.equal(stageReport(r).rows.find(row=>row.kind==='ecoli').automaticKills,1);assert.ok(r.orbs.some(o=>o.active));
 const orb=r.orbs.find(o=>o.active);Object.assign(orb,{x:r.player.x,y:r.player.y,value:r.xpNeeded});tick(r,{},.05);assert.equal(r.status,'augment');assert.equal(r.level,2);
});

test('themed operations start with their counters, preserve cases and finish independently',()=>{
 for(const theme of THEME_STAGES)for(const host of HOSTS){
  const r=setup({mission:'theme',themeId:theme.id,host:host.id,companion:'auto'});
  assert.equal(r.companion,theme.companion);assert.equal(r.wave,0);
  for(const kind of theme.pool)assert.ok(catalog.weapons.some((w,i)=>isWeaponReady(r,i)&&combatCoverage(r,w,kind).factor>0),theme.id+'/'+host.id+'/'+kind);
  r.pressure=100;r.spawnTimer=0;tick(r);assert.equal(r.spawned,theme.count);
  assert.ok(r.enemies.filter(e=>e.active&&(catalog.enemyById[e.kind].viral||catalog.enemyById[e.kind].parasite)).length>=10);
  assert.ok(r.enemies.filter(e=>e.active).every(e=>e.state==='Idle'));assert.equal(r.player.hp,100);
  for(const e of r.enemies.filter(e=>e.active)){const w=catalog.weapons.find((w,i)=>isWeaponReady(r,i)&&combatCoverage(r,w,e.kind).factor);applyHit(r,e,w,99999);}
  Object.assign(r.player,r.map.exit);tick(r);assert.equal(r.status,'won');assert.equal(r.completedStages,1);
 }
 const r=setup({mission:'theme',themeId:'virology'});
 assert.equal(combatCoverage(r,catalog.weaponById.acyclovir,'hsv').factor,1);
 assert.equal(combatCoverage(r,catalog.weaponById.acyclovir,'cmv').factor,0);
 assert.equal(combatCoverage(r,catalog.weaponById.ganciclovir,'hsv').factor,0);
 assert.equal(coverage(catalog,'acyclovir','hsv').factor,0);
 assert.equal(catalog.enemyById.giardia.therapies[0],library.therapyContexts.giardiasis);
});
test('immune companions acquire and equip one slot, specialize and keep drug AST immutable',()=>{
 for(const c of COMPANIONS){
  const r=setup({companion:c.id}),kind=c.id==='nk'?'cmv':c.id==='eosinophil'?'strongyloides':'mrsa';
  const e=spawnEnemy(r,kind,{x:6,y:3.5});e.state='Chase';e.revealed=true;e.hp=1;r.pet.cooldown=0;r.map.sources=[];
  const ast=catalog.enemyById[kind].ast;tick(r,{},.01);
  assert.equal(e.state,'Dead',c.id);assert.equal(r.pet.shots,1);assert.equal(r.shots,0);assert.equal(stageReport(r).rows[0].supportKills,1);assert.equal(catalog.enemyById[kind].ast,ast);
  assert.equal(equipCompanion(r,'none'),false);r.status='paused';assert.ok(equipCompanion(r,'none'));
  recruitCompanion(r,'nk');recruitCompanion(r,'nk');assert.equal(r.companions.filter(id=>id==='nk').length,1);
 }
 assert.equal(companionAccepts('eosinophil',catalog.enemyById.giardia),false);
 assert.equal(companionAccepts('nk',catalog.enemyById.mssa),false);
 assert.equal(companionAccepts('neutrophil',catalog.enemyById.cmv),false);
 assert.equal(coverage(catalog,'ampicillin','mrsa').factor,0);
});
test('companions cannot pull idle enemies or fire through walls and neutropenia slows only neutrophils',()=>{
 const r=setup({companion:'neutrophil'}),e=spawnEnemy(r,'mssa',{x:6,y:3.5});r.player.angle=Math.PI;r.pet.cooldown=0;
 tick(r,{},.01);assert.equal(e.hp,e.maxHp);assert.equal(e.state,'Idle');
 r.player.angle=0;e.state='Chase';e.revealed=true;r.pet.cooldown=0;
 const idx=3*r.map.width+5;r.map.cells[idx]=1;tick(r,{},.01);assert.equal(r.pet.shots,0);
 const intervals=[];
 for(const host of ['normal','neutropenia']){const n=setup({companion:'neutrophil',host}),target=spawnEnemy(n,'mssa',{x:6,y:3.5});target.state='Chase';target.revealed=true;n.pet.cooldown=0;tick(n,{},.01);intervals.push(n.pet.cooldown);}
 assert.ok(intervals[1]>intervals[0]*2);
});


test('scatter and rail hit distinct targets while each target retains its clinical gate',()=>{
 const r=setup(),a=spawnEnemy(r,'mssa',{x:6.5,y:3.1}),b=spawnEnemy(r,'mrsa',{x:6.5,y:3.9});r.map.sources=[];r.weapon=1;fire(r);
 assert.ok(a.hp<a.maxHp);assert.equal(b.hp,b.maxHp);assert.equal(stageReport(r).rows.find(row=>row.kind==='mrsa').blocked,1);
 const rail=setup({stage:2});rail.map.sources=[];const front=spawnEnemy(rail,'mssa',{x:5.5,y:3.5}),back=spawnEnemy(rail,'mssa',{x:6.5,y:3.5});rail.weapon=5;fire(rail);assert.equal(front.hp,front.maxHp);assert.equal(back.hp,back.maxHp);rail.upgrades.exposure=1;rail.cooldowns[5]=0;fire(rail);assert.ok(front.hp<front.maxHp&&back.hp<back.maxHp);
});
test('charge cancels without consuming a round; burst packets are bounded and cancel on switching',()=>{
 const r=setup();r.weapon=2;const before=r.magazines[2];tick(r,{fire:true},.05);assert.ok(r.chargeTime>0);assert.equal(r.magazines[2],before);tick(r,{},.05);assert.equal(r.chargeTime,0);
 for(let i=0;i<6;i++)tick(r,{fire:true},.05);assert.ok(r.magazines[2]<before);assert.equal(r.shots,1);
 const burst=setup();burst.weapon=4;spawnEnemy(burst,'ecoli',{x:6.5,y:3.5});fire(burst);assert.equal(burst.volley.left,2);const report=stageReport(burst);tick(burst,{},.05);assert.equal(stageReport(burst).rows[0].shots,report.rows[0].shots);switchWeapon(burst,0);assert.equal(burst.volley,null);assert.ok(burst.tracers.length<=12);
});
test('debrief separates a narrower available choice from resistance and unavailable alternatives',()=>{
 const r=setup();r.map.sources=[];const e=spawnEnemy(r,'mssa',{x:6.5,y:3.5});r.weapon=4;fire(r);assert.equal(stageReport(r).rows[0].broad,1);
 const empty=setup();empty.map.sources=[];empty.magazines[1]=0;spawnEnemy(empty,'mssa',{x:6.5,y:3.5});empty.weapon=4;fire(empty);assert.equal(stageReport(empty).rows[0].broad,0);
 const unknown=setup({information:'blind'});spawnEnemy(unknown,'mssa',{x:6.5,y:3.5});unknown.weapon=4;fire(unknown);assert.equal(stageReport(unknown).rows[0].broad,0);
 const wrong=setup();spawnEnemy(wrong,'mrsa',{x:6.5,y:3.5});fire(wrong);wrong.time+=.8;switchWeapon(wrong,3);wrong.switchTime=0;fire(wrong);const row=stageReport(wrong).rows[0];assert.equal(row.firstCorrect,0);assert.equal(row.firstAttempts,1);assert.equal(row.switchCount,1);assert.equal(row.switchTotal,.8);
});
test('four information levels are distinct and progression reserves safe supply rooms',()=>{
 for(const [information,intel,hints] of [['guided',3,true],['open',3,false],['identify',2,false],['blind',0,false]]){const r=newRun(catalog,{information});assert.equal(r.intel.mrsa,intel);assert.equal(r.hints,hints);}
 const r=newRun(catalog,{seed:23});assert.ok(r.map.rooms.some(room=>room.rest));for(const plan of r.pending)assert.ok(r.map.rooms[plan.room].encounter);assert.equal(roomAt(r.map,r.map.exit.x,r.map.exit.y),r.map.rooms.at(-1).id);
});
test('last-contact guide follows walkable cells and pressure reports count actual replacements',()=>{
 const r=setup();r.spawned=STAGES[0].count;const target=spawnEnemy(r,'mssa',r.map.portals.at(-1));tick(r,{},.05);assert.equal(r.guide.remaining,1);assert.ok(canStand(r.map,r.guide.x,r.guide.y));assert.ok(Math.hypot(r.guide.x-r.player.x,r.guide.y-r.player.y)<2);assert.equal(r.intel.mssa,3);
 const pressured=setup({seed:12});pressured.pressure=95;pressured.spawnTimer=0;tick(pressured);assert.equal(pressured.pressureReplacements,pressured.enemies.filter(e=>e.active&&e.pressureSpawn).length);assert.ok(pressured.pressureReplacements>0);
});
