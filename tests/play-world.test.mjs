import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayCatalog,STAGES} from '../src/play-data.mjs';
import {newRun,tick,moveBody,floorAt,canTraverse,spawnEnemy,targetEnemy,applyHit,stageReport,protectedBySource} from '../src/play-engine.mjs';
const catalog=createPlayCatalog(JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url))));
const setup=(options={})=>{const r=newRun(catalog,{seed:31,...options});r.status='running';r.spawnTimer=9999;return r;};

test('stairs can be walked both ways; every encounter and pickup is reachable using legal height transitions',()=>{
 for(const seed of [12,31,94]){
  const r=setup({seed}),m=r.map,queue=[3*m.width+3],seen=new Set(queue);
  for(let i=0;i<queue.length;i++)for(const next of [queue[i]-1,queue[i]+1,queue[i]-m.width,queue[i]+m.width])
   if(next>=0&&next<m.cells.length&&!seen.has(next)&&canTraverse(m,queue[i],next)){seen.add(next);queue.push(next);}
  for(const p of [...r.pending,...m.pickups,m.exit])assert.ok(seen.has(Math.floor(p.y)*m.width+Math.floor(p.x)),JSON.stringify(p));
  Object.assign(r.player,{x:40.5,y:12.5});moveBody(m,r.player,0,-6);assert.ok(floorAt(m,r.player.x,r.player.y)>.59);assert.equal(r.player.z,0);
  moveBody(m,r.player,0,6);assert.equal(floorAt(m,r.player.x,r.player.y),0);assert.ok(r.player.y>12);
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
