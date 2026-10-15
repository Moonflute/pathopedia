import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGES,createPlayCatalog} from '../src/play-data.mjs';
import {newRun,tick,spawnEnemy,applyHit,updateStairs,levelAt,combatCoverage,walkableNeighbors} from '../src/play-engine.mjs';
const catalog=createPlayCatalog(JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url),'utf8')));
const setup=id=>{const r=newRun(catalog,{seed:31,stage:STAGES.findIndex(s=>s.id===id)});r.status='running';r.spawnTimer=9999;return r;};

test('stair landings transfer in both directions, preserve state and freeze the other floor',()=>{
 const r=setup('community'),up=r.map.transitions[0],down=r.map.transitions[1],locked=r.map.transitions[3];
 Object.assign(r.player,locked);assert.equal(updateStairs(r),false);assert.equal(r.activeFloor,0);
 const e=spawnEnemy(r,'mssa',r.map.portals[1]);e.state='Chase';e.memory=5;e.lastSeen={...r.player};
 r.magazines[0]=35;r.player.hp=77;r.discovered[3*r.map.width+3]=1;Object.assign(r.player,{x:up.x,y:up.y});assert.ok(updateStairs(r));
 assert.equal(r.activeFloor,1);assert.equal(levelAt(r.map,r.player.x,r.player.y),1);assert.equal(r.player.hp,77);assert.equal(r.magazines[0],35);
 assert.equal(r.discovered[3*r.map.width+3],1);assert.equal(updateStairs(r),false);
 const position={x:e.x,y:e.y},hp=e.hp;for(let i=0;i<30;i++)tick(r,{},.05);assert.deepEqual({x:e.x,y:e.y},position);assert.equal(e.hp,hp);
 Object.assign(r.player,{x:down.x,y:down.y});assert.ok(updateStairs(r));assert.equal(r.activeFloor,0);assert.ok(r.discovered.some(Boolean));
});

test('route graph reaches both floors through stairs while the boss shortcut is locked',()=>{
 const r=setup('virology'),m=r.map,start=Math.floor(r.player.y)*m.width+Math.floor(r.player.x),q=[start],seen=new Set(q);
 for(let i=0;i<q.length;i++)for(const n of walkableNeighbors(m,q[i]))if(!seen.has(n)){seen.add(n);q.push(n);}
 assert.equal(m.levels.length,2);assert.ok(m.transitions.filter(t=>!t.locked).every(t=>seen.has(t.cell)));
 assert.ok(r.pending.every(e=>seen.has(Math.floor(e.y)*m.width+Math.floor(e.x))));assert.ok(m.transitions.slice(2).every(t=>t.locked));
});

test('viral replication is telegraphed, finite and stopped only by an effective antiviral',()=>{
 const r=setup('virology');r.map.rooms[0].anchors=[{x:6.5,y:7.5},{x:8.5,y:7.5}];
 const e=spawnEnemy(r,'hsv',{x:6.5,y:3.5,room:0});Object.assign(e,{state:'Chase',memory:5,lastSeen:{...r.player},slow:100,replication:2.9});
 tick(r,{},.05);assert.ok(e.replicationPoint);const before=e.hp;applyHit(r,e,catalog.weaponById.ganciclovir,1);assert.equal(e.hp,before);assert.equal(e.replicationSuppressed,0);
 applyHit(r,e,catalog.weaponById.acyclovir,1);assert.ok(e.replicationSuppressed>0);assert.equal(e.replicationPoint,null);assert.equal(r.mechanicStats.suppressed,1);
 e.replicationSuppressed=0;e.replication=2.9;r.player.hp=1000;for(let i=0;i<62;i++)tick(r,{},.05);
 const child=r.enemies.find(o=>o.active&&o!==e);assert.ok(child);assert.equal(child.kind,'hsv');assert.equal(child.replicationsLeft,0);assert.equal(e.replicationsLeft,0);assert.equal(r.mechanicStats.replicated,1);assert.equal(r.reinforcementBudget,3);
 assert.ok(Math.hypot(child.x-r.player.x,child.y-r.player.y)>2.5);
});

test('IVM interrupts a larval route; protozoan attachment remains vulnerable to its valid regimen',()=>{
 const r=setup('parasitology'),worm=spawnEnemy(r,'strongyloides',{x:6.5,y:3.5,room:0});
 Object.assign(worm,{state:'Chase',memory:5,lastSeen:{...r.player},migrationPhase:'prepare',migrationPoint:{x:8.5,y:7.5},migrationTime:1.8});
 const hp=worm.hp;applyHit(r,worm,catalog.weaponById.metronidazole,1);assert.equal(worm.hp,hp);assert.equal(worm.migrationPhase,'prepare');
 applyHit(r,worm,catalog.weaponById.ivermectin,1);assert.equal(worm.migrationPhase,null);assert.equal(worm.migrationPoint,null);assert.equal(r.mechanicStats.intercepted,1);assert.ok(worm.migrationSuppressed>0);
 const protozoan=spawnEnemy(r,'giardia',{x:5.5,y:6.5,room:0});protozoan.attachment=3;const before=protozoan.hp;assert.ok(combatCoverage(r,catalog.weaponById.metronidazole,'giardia').factor);applyHit(r,protozoan,catalog.weaponById.metronidazole,10);assert.ok(protozoan.hp<before);
});
