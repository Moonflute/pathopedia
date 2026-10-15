import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog,STAGES,createMap,REWARDS} from '../src/play-data.mjs';
import {newRun,tick,moveBody,floorAt,canTraverse,spawnEnemy,targetEnemy,applyHit,stageReport,protectedBySource,rewardOptions,chooseReward,switchWeapon,magazineCapacity,scan} from '../src/play-engine.mjs';
const catalog=createPlayCatalog(JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url))));
const setup=(options={})=>{const r=newRun(catalog,{seed:31,...options});r.status='running';r.spawnTimer=9999;return r;};

test('stairs can be walked both ways; every encounter and pickup is reachable using legal height transitions',()=>{
 for(const seed of [12,31,94]){
  const r=setup({seed}),m=r.map,queue=[3*m.width+3],seen=new Set(queue);
  for(let i=0;i<queue.length;i++)for(const next of [queue[i]-1,queue[i]+1,queue[i]-m.width,queue[i]+m.width])
   if(next>=0&&next<m.cells.length&&!seen.has(next)&&canTraverse(m,queue[i],next)){seen.add(next);queue.push(next);}
  for(const p of [...r.pending,...m.pickups,m.exitDoor.approach])assert.ok(seen.has(Math.floor(p.y)*m.width+Math.floor(p.x)),JSON.stringify(p));
  for(const ramp of m.ramps){Object.assign(r.player,ramp.bottom);const dx=ramp.top.x-ramp.bottom.x,dy=ramp.top.y-ramp.bottom.y;moveBody(m,r.player,dx,dy);assert.ok(floorAt(m,r.player.x,r.player.y)>.59);assert.equal(r.player.z,0);moveBody(m,r.player,-dx,-dy);assert.equal(floorAt(m,r.player.x,r.player.y),0);assert.ok(Math.hypot(r.player.x-ramp.bottom.x,r.player.y-ramp.bottom.y)<.1);}
 }
});

test('a raised ledge blocks walking and low shots; upper-deck aiming can hit a lower target',()=>{
 const r=setup(),m=r.map;m.floors[3*m.width+5]=.6;
 const e=spawnEnemy(r,'mssa',{x:6.5,y:3.5});assert.equal(targetEnemy(r),null);
 moveBody(m,r.player,4,0);assert.ok(r.player.x<5);
 Object.assign(r.player,{x:5.5,y:3.5,pitch:0});assert.equal(targetEnemy(r),null);
 r.player.pitch=-.55;assert.equal(targetEnemy(r),e);
});

test('middle encounters open the shortcut once and bosses keep their original clinical gate',()=>{
 const r=setup();r.spawnTimer=0;tick(r);const mid=r.enemies.find(e=>e.miniboss),boss=r.enemies.find(e=>e.boss);
 assert.ok(mid&&boss);assert.equal(protectedBySource(r,mid),false);assert.ok(r.map.shortcuts.every(g=>!g.open));
 const blocked=catalog.weapons.find(w=>['R','INACTIVE'].includes(catalog.enemyById[boss.kind].ast[w.id].category));
 const hp=boss.hp;applyHit(r,boss,blocked,99999);assert.equal(boss.hp,hp);
 const valid=catalog.weapons.find(w=>catalog.enemyById[mid.kind].ast[w.id].category==='S');
 applyHit(r,mid,valid,99999);assert.ok(r.map.shortcuts.every(g=>g.open&&g.cells.every(i=>!r.map.cells[i])));
 assert.equal(stageReport(r).miniKills,1);const after=r.player.hp;applyHit(r,mid,valid,99999);assert.equal(stageReport(r).miniKills,1);assert.equal(r.player.hp,after);
});

test('endless alternates intensity, schedules a major encounter and rewards a recovery interval',()=>{
 const r=setup({mission:'survival'});r.time=35;tick(r);assert.equal(r.director.phase,'surge');
 r.time=66;tick(r);assert.equal(r.director.phase,'recover');
 r.time=120;r.spawnTimer=0;tick(r);const major=r.enemies.find(e=>e.active&&e.miniboss);assert.ok(major);assert.equal(r.director.bossNumber,1);
 applyHit(r,major,catalog.weaponById.ampicillin,99999);assert.ok(r.director.restUntil>r.time);tick(r);assert.equal(r.director.phase,'recover');
});

test('immune echo respects target groups and cover; a dash trail slows without drug damage',()=>{
 const r=setup({mission:'survival',companion:'neutrophil'});r.upgrades.immuneEcho=1;r.pet.cooldown=0;
 const a=spawnEnemy(r,'mssa',{x:5.5,y:3.1}),b=spawnEnemy(r,'mssa',{x:5.5,y:3.9}),virus=spawnEnemy(r,'cmv',{x:6.5,y:3.5});
 for(const e of [a,b,virus]){e.state='Chase';e.revealed=true;}
 tick(r,{},.01);assert.ok(a.hp<a.maxHp&&b.hp<b.maxHp);assert.equal(virus.hp,virus.maxHp);assert.ok(r.pet.echoTarget);
 r.upgrades.isolationTrail=1;tick(r,{dash:true},.01);const field=r.fields.find(f=>f.active&&f.kind==='isolation');assert.ok(field);
 Object.assign(a,{x:field.x+.8,y:field.y});const hp=a.hp;r.pet.cooldown=100;tick(r,{},.01);assert.ok(a.slow>0);assert.equal(a.hp,hp);
});


test('seeds vary graph connectivity and modules, and preserve a reachable exit behind the door',()=>{
 const signatures=new Set(),families=new Set();
 for(const seed of [12,31,94,721]){
  const m=createMap(0,seed),again=createMap(0,seed);assert.deepEqual(m.cells,again.cells);assert.deepEqual(m.links,again.links);families.add(m.layout);
  signatures.add(JSON.stringify(m.links.map(e=>[m.rooms[e.a].node,m.rooms[e.b].node,e.kind])));
  assert.ok(new Set(m.rooms.map(r=>r.type)).size>=5);assert.ok(m.ramps.length);assert.ok(m.links.some(e=>e.kind==='loop'));
  assert.ok(m.exitDoor.cells.every(i=>m.cells[i]===7));for(const i of m.exitDoor.cells)m.cells[i]=0;
  const start=3*m.width+3,seen=new Set([start]),q=[start];for(let i=0;i<q.length;i++)for(const next of [q[i]-1,q[i]+1,q[i]-m.width,q[i]+m.width])if(next>=0&&next<m.cells.length&&!seen.has(next)&&canTraverse(m,q[i],next)){seen.add(next);q.push(next);}
  assert.ok(seen.has(Math.floor(m.exit.y)*m.width+Math.floor(m.exit.x)));
 }
 assert.equal(signatures.size,4);assert.equal(families.size,2);
});

test('exit shutter opens after clearance; crossing gives one frozen success beat before results',()=>{
 const r=setup({mission:'single'}),door=r.map.exitDoor;Object.assign(r.player,door.approach);r.messageTime=0;tick(r);assert.equal(door.open,0);assert.match(r.message,/적이 남아 있습니다/);
 r.spawned=STAGES[0].count;r.bossDefeated=true;for(let i=0;i<12;i++)tick(r,{},.05);
 assert.equal(r.status,'running');assert.equal(door.open,1);assert.ok(door.cells.every(i=>!r.map.cells[i]));
 moveBody(r.map,r.player,door.normal.x*4,door.normal.y*4);tick(r);assert.equal(r.status,'clearing');assert.equal(r.completedStages,1);
 const time=r.time,hp=r.player.hp,score=r.score,position={x:r.player.x,y:r.player.y},report=r.lastReport;
 for(let i=0;i<20;i++)tick(r,{fire:true,forward:1,throw:true},.05);
 assert.equal(r.status,'clearing');assert.equal(r.time,time);assert.equal(r.player.hp,hp);assert.equal(r.score,score);assert.equal(r.lastReport,report);assert.equal(r.player.x,position.x);assert.equal(r.player.y,position.y);
 for(let i=0;i<14;i++)tick(r,{},.05);assert.equal(r.status,'won');assert.equal(r.completedStages,1);
});

test('stage rewards diversify mechanics, avoid next-stage issue duplicates and companionless boosts',()=>{
 const r=setup({stage:1});
 for(let i=0;i<12;i++){const options=rewardOptions(r);assert.equal(options.length,3);assert.equal(new Set(options.map(o=>o.group)).size,3);assert.ok(!options.some(o=>o.id==='immuneBoost'||o.weapon==='levofloxacin'));}
 const a=setup();a.status='reward';a.rewards=[REWARDS.find(r=>r.id==='holster')];chooseReward(a,'holster');a.status='running';a.spawnTimer=9999;a.magazines[0]=0;a.energy[0]=200;switchWeapon(a,1);
 for(let i=0;i<47;i++)tick(a,{},.05);assert.equal(a.magazines[0],0);const before=a.energy[0];tick(a,{},.05);assert.equal(a.magazines[0],magazineCapacity(a,0));assert.ok(a.energy[0]<before);
 a.magazines[0]=0;switchWeapon(a,0);for(let i=0;i<50;i++)tick(a,{},.05);assert.equal(a.magazines[0],0);
});
