import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog,createMap,WAVES,REWARDS} from '../src/play-data.mjs';
import {newRun,tick,coverage,applyHit,spawnEnemy,fire,scan,visibleLabel,controlSource,switchWeapon,protectedBySource,canStand,moveBody,lineOfSight,chooseReward,resistanceChance,MAX_ENEMIES} from '../src/play-engine.mjs';
const data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8'));
const catalog=createPlayCatalog(data);
const setup=(options={})=>{const r=newRun(catalog,{seed:31,...options});r.status='running';r.spawnTimer=9999;return r;};

test('Play uses the existing five drug cards and five fixed isolates without reauthoring AST',()=>{
 assert.equal(catalog.weapons.length,5);assert.equal(catalog.enemies.length,5);
 for(const e of catalog.enemies){const record=data.records.find(r=>r.id===e.recordId);assert.equal(e.ast,record.susceptibility);assert.equal(e.name,record.organism);for(const w of catalog.weapons)assert.ok(e.ast[w.id]);}
 for(const w of catalog.weapons)assert.equal(w.name,data.drugs.find(d=>d.id===w.id).name);
});

test('R never takes damage, even with source control, increased exposure and extreme attack power',()=>{
 for(const profile of catalog.enemies)for(const weapon of catalog.weapons){if(profile.ast[weapon.id].category!=='R')continue;const r=setup();r.upgrades.infusion=9;r.map.sources.forEach(s=>s.active=false);const e=spawnEnemy(r,profile.id,{x:6.5,y:3.5});const hp=e.hp,shield=e.shield;const result=applyHit(r,e,weapon,999999);assert.equal(result.factor,0);assert.equal(e.hp,hp);assert.equal(e.shield,shield);assert.equal(e.dot,0);}
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
 for(const wave of WAVES)for(const kind of wave.pool)assert.ok(catalog.weapons.some(w=>coverage(catalog,w.id,kind).factor));
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
 const r=setup();r.spawned=WAVES[0].count;tick(r);assert.equal(r.status,'reward');assert.equal(r.rewards.length,3);const id=r.rewards[0].id;assert.ok(chooseReward(r,id));assert.equal(chooseReward(r,id),false);assert.equal(r.wave,1);assert.equal(r.status,'paused');const time=r.time;tick(r,{forward:1});assert.equal(r.time,time);
 r.status='running';r.wave=WAVES.length-1;r.spawned=WAVES.at(-1).count;tick(r);assert.equal(r.status,'running');r.map.sources.forEach(s=>s.active=false);tick(r);assert.equal(r.status,'won');const finished=r.time;tick(r);assert.equal(r.time,finished);
});

test('infusion ticks respect coverage and the immune perk is weaker with neutropenia',()=>{
 const r=setup();r.upgrades.infusion=1;const e=spawnEnemy(r,'ecoli',{x:6.5,y:3.5});applyHit(r,e,catalog.weaponById.ampicillin,10);const hp=e.hp;tick(r,{},.05);assert.ok(e.hp<hp);
 for(const host of ['normal','neutropenia']){const n=setup({host});n.upgrades.immune=1;n.immuneTime=0;const target=spawnEnemy(n,'ecoli',{x:6.5,y:3.5});target.hp=20;tick(n);assert.equal(target.state,'Dead');assert.equal(n.immuneTime,host==='normal'?10:24);}
});

test('all rewards remain three choices late in a run and efficiency stacks without changing coverage',()=>{
 const r=setup();r.upgrades={immune:1,scanner:1,infusion:1,efficiency:1,source:1,stewardship:1};r.spawned=WAVES[0].count;tick(r);assert.equal(r.rewards.length,3);
 const a=setup(),b=setup();a.upgrades.efficiency=1;b.upgrades.efficiency=2;fire(a);fire(b);assert.ok(b.energy[0]>a.energy[0]);
});

test('switching is immediate while each weapon retains its own fire-rate limit',()=>{
 const r=setup();r.weapon=3;assert.ok(fire(r));switchWeapon(r,0);for(let i=0;i<8;i++)tick(r,{},1/60);assert.ok(fire(r));switchWeapon(r,3);for(let i=0;i<8;i++)tick(r,{},1/60);assert.equal(fire(r),false);
});
