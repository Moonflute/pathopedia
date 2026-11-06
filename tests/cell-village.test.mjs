import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,SITES,POINTS,RESIDENTS,CLOTHES,createWorld,serializeWorld,findPath,canStand,tickWorld,nearestInteraction,interact} from '../src/cell-village-world.mjs';
import {BRIDGES,FIXTURES,PORTS,TILE,blocked} from '../src/cell-office-layout.mjs';
import {MAX_PARCELS,parcelPoint} from '../src/cell-office-logistics.mjs';

test('the independent village has exactly one resident per role and no old city save dependency',()=>{
  const world=createWorld();assert.equal(world.residents.length,8);assert.equal(new Set(RESIDENTS.map(r=>r.role)).size,8);
  assert.equal(world.player,null);assert.equal(SAVE_KEY,'pathopedia:cell-village:v1');
  assert.deepEqual(world.residents.map(r=>r.id),RESIDENTS.map(r=>r.id));
});
test('every department and break room is reachable through doors and conveyor bridges',()=>{
  for(const site of SITES){const path=findPath(POINTS.plaza,POINTS[site.id]);assert.ok(path.length,site.id);assert.ok(path.every(p=>canStand(p.x,p.y)),site.id);}
  const path=findPath(POINTS.lung,POINTS.kidney);assert.ok(path.length);assert.ok(path.every(p=>canStand(p.x,p.y)));
  assert.ok(findPath(POINTS.plaza,POINTS.lounge).length);
  for(const b of BRIDGES)assert.equal(blocked(b.x,b.y),false);
  for(const f of FIXTURES)assert.equal(blocked(f.x,f.y),true);
  assert.equal(blocked(16,16),true,'uncovered belt cannot be walked through');
});
test('all eight residents continue their routines and stay on accessible ground',()=>{
  const world=createWorld();
  for(let i=0;i<5400;i++){tickWorld(world,1/30);for(const r of world.residents)assert.ok(canStand(r.x,r.y),`${r.id} at ${r.x},${r.y}`);}
  for(const r of world.residents)assert.ok(r.deliveries>=3,`${r.id} stopped on its route`);
});
test('player movement collides with equipment and click paths reach another department',()=>{
  const world=createWorld({version:2,player:{name:'산책',color:CLOTHES[1],x:POINTS.heart.x,y:POINTS.heart.y}});
  for(let i=0;i<90;i++)tickWorld(world,1/30,{walk:true,y:-1});assert.ok(canStand(world.player.x,world.player.y));assert.ok(world.player.y>=18*TILE);
  world.player.path=findPath(world.player,POINTS.lung);
  for(let i=0;i<600;i++)tickWorld(world,1/30,{walk:true});assert.equal(world.player.path.length,0);assert.ok(Math.hypot(world.player.x-POINTS.lung.x,world.player.y-POINTS.lung.y)<16);
});
test('character appearance, progress and valid position survive reload; broken saves recover',()=>{
  const original=createWorld({version:1,time:123,help:2,player:{name:'여행자',color:CLOTHES[3],hair:2,skin:1,...POINTS.plaza}});
  const restored=createWorld(JSON.parse(serializeWorld(original)));assert.equal(restored.player.name,'여행자');assert.equal(restored.player.color,CLOTHES[3]);assert.equal(restored.help,2);assert.equal(restored.time,123);assert.ok(canStand(restored.player.x,restored.player.y));
  const bad=createWorld({version:1,player:{x:Infinity,y:-9,color:'bad'}});assert.deepEqual({x:bad.player.x,y:bad.player.y},POINTS.plaza);assert.ok(CLOTHES.includes(bad.player.color));
  const migrated=createWorld({version:1,player:{name:'기존 사원',color:CLOTHES[4],...POINTS.heart}});assert.equal(migrated.player.name,'기존 사원');assert.equal(migrated.player.color,CLOTHES[4]);assert.equal(migrated.player.x,POINTS.plaza.x);assert.equal(JSON.parse(serializeWorld(migrated)).version,2);
});
test('nearby residents greet the player and organ work records a small contribution',()=>{
  const world=createWorld({version:2,player:{name:'나',...POINTS.kidney}});
  const target=nearestInteraction(world);assert.ok(target);assert.ok(interact(world,{kind:'resident',id:'ruby'}).includes('루비'));
  assert.ok(interact(world,{kind:'site',id:'kidney'}));assert.equal(world.help,1);assert.ok(world.effects.length>=2);
  assert.equal(world.logistics.stations.kidney.boost,15);
});
test('supplies are delivered, consumed, sorted and filtered without creating or losing parcels',()=>{
  const world=createWorld();
  for(let i=0;i<9000;i++)tickWorld(world,1/30);
  const f=world.logistics,count=kind=>f.parcels.filter(p=>p.kind===kind).length,stock=kind=>Object.values(f.stations).reduce((sum,s)=>sum+s[kind],0);
  assert.ok(f.stats.work>10);assert.ok(f.stats.filtered>5);assert.ok(f.stats.sorted>=f.stats.filtered);assert.ok(f.parcels.length<=MAX_PARCELS);
  assert.equal(f.stats.madeOxygen+9,stock('oxygen')+count('oxygen')+f.stats.work);
  assert.equal(f.stats.madeFood+9,stock('food')+count('food')+f.stats.work);
  assert.equal(f.stats.work,count('waste')+count('sorted')+stock('waste')+f.stats.filtered);
  assert.equal(f.stats.sorted,count('sorted')+f.stations.kidney.waste+f.stats.filtered);
  assert.ok(f.parcels.every(p=>PORTS[p.from]&&PORTS[p.to]&&Number.isFinite(parcelPoint(p).x)));
  for(const id of ['brain','heart','marrow'])assert.ok(f.stations[id].completed>0,id);
});
test('equipment waits for its employee and player assistance affects the running machinery',()=>{
  const world=createWorld();world.residents=[];
  for(let i=0;i<90;i++)tickWorld(world,1/30);
  assert.equal(world.logistics.stats.madeOxygen,0);assert.equal(world.logistics.stats.work,0);
  interact(world,{kind:'site',id:'lung'});interact(world,{kind:'site',id:'heart'});
  for(let i=0;i<90;i++)tickWorld(world,1/30);
  assert.ok(world.logistics.stats.madeOxygen>0);assert.ok(world.logistics.beltSpeed>23);
});
