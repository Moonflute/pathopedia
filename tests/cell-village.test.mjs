import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,SITES,POINTS,RESIDENTS,CLOTHES,createWorld,serializeWorld,findPath,canStand,tickWorld,nearestInteraction,interact} from '../src/cell-village-world.mjs';

test('the independent village has exactly one resident per role and no old city save dependency',()=>{
  const world=createWorld();assert.equal(world.residents.length,8);assert.equal(new Set(RESIDENTS.map(r=>r.role)).size,8);
  assert.equal(world.player,null);assert.equal(SAVE_KEY,'pathopedia:cell-village:v1');
  assert.deepEqual(world.residents.map(r=>r.id),RESIDENTS.map(r=>r.id));
});
test('every organ is reachable without crossing buildings or the pond',()=>{
  for(const site of SITES){const path=findPath(POINTS.plaza,POINTS[site.id]);assert.ok(path.length,site.id);assert.ok(path.every(p=>canStand(p.x,p.y)),site.id);}
  const path=findPath(POINTS.lung,POINTS.kidney);assert.ok(path.length);assert.ok(path.every(p=>canStand(p.x,p.y)));
});
test('all eight residents continue their routines and stay on accessible ground',()=>{
  const world=createWorld();
  for(let i=0;i<5400;i++){tickWorld(world,1/30);for(const r of world.residents)assert.ok(canStand(r.x,r.y),`${r.id} at ${r.x},${r.y}`);}
  for(const r of world.residents)assert.ok(r.deliveries>=3,`${r.id} stopped on its route`);
});
test('player movement collides with buildings and click paths reach a destination',()=>{
  const world=createWorld({version:1,player:{name:'산책',color:CLOTHES[1],x:POINTS.heart.x,y:POINTS.heart.y}});
  for(let i=0;i<90;i++)tickWorld(world,1/30,{walk:true,y:-1});assert.ok(canStand(world.player.x,world.player.y));assert.ok(world.player.y>=19*16);
  world.player.path=findPath(world.player,POINTS.lung);
  for(let i=0;i<600;i++)tickWorld(world,1/30,{walk:true});assert.equal(world.player.path.length,0);assert.ok(Math.hypot(world.player.x-POINTS.lung.x,world.player.y-POINTS.lung.y)<16);
});
test('character appearance, progress and valid position survive reload; broken saves recover',()=>{
  const original=createWorld({version:1,time:123,help:2,player:{name:'여행자',color:CLOTHES[3],hair:2,skin:1,...POINTS.plaza}});
  const restored=createWorld(JSON.parse(serializeWorld(original)));assert.equal(restored.player.name,'여행자');assert.equal(restored.player.color,CLOTHES[3]);assert.equal(restored.help,2);assert.equal(restored.time,123);assert.ok(canStand(restored.player.x,restored.player.y));
  const bad=createWorld({version:1,player:{x:Infinity,y:-9,color:'bad'}});assert.deepEqual({x:bad.player.x,y:bad.player.y},POINTS.plaza);assert.ok(CLOTHES.includes(bad.player.color));
});
test('nearby residents greet the player and organ work records a small contribution',()=>{
  const world=createWorld({version:1,player:{name:'나',...POINTS.kidney}});
  const target=nearestInteraction(world);assert.ok(target);assert.ok(interact(world,{kind:'resident',id:'ruby'}).includes('루비'));
  assert.ok(interact(world,{kind:'site',id:'kidney'}));assert.equal(world.help,1);assert.ok(world.effects.length>=2);
});
