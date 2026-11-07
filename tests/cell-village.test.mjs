import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,SITES,POINTS,RESIDENTS,CLOTHES,createWorld,serializeWorld,findPath,canStand,tickWorld,nearestInteraction,interact} from '../src/cell-village-world.mjs';
import {BRIDGES,FIXTURES,PORTS,DOCKS,TILE,BREAK_SEATS,GARDEN_SPOTS,SOCIAL_SPOTS,blocked} from '../src/cell-office-layout.mjs';
import {MAX_PARCELS,parcelPoint} from '../src/cell-office-logistics.mjs';
import {heldCargo,cargoDestination,officePhase} from '../src/cell-office-life.mjs';

function assertConservation(world){
  const f=world.logistics,stations=Object.values(f.stations);
  const cargo=[...f.parcels.map(p=>p.kind),...stations.flatMap(s=>[...s.inbox,...s.output]),...world.residents.flatMap(r=>r.carry?[r.carry.kind]:[]),...heldCargo(world).map(p=>p.kind)];
  const count=kind=>cargo.filter(k=>k===kind).length,stock=kind=>stations.reduce((sum,s)=>sum+s[kind],0);
  assert.equal(f.stats.madeOxygen+9,stock('oxygen')+count('oxygen')+f.stats.work);
  assert.equal(f.stats.madeFood+9,stock('food')+count('food')+f.stats.work);
  assert.equal(f.stats.work,count('waste')+count('sorted')+stock('waste')+f.stats.filtered);
  assert.equal(f.stats.sorted,count('sorted')+f.stations.kidney.waste+f.stats.filtered);
}

test('the independent village has exactly one resident per role and no old city save dependency',()=>{
  const world=createWorld();assert.equal(world.residents.length,8);assert.equal(new Set(RESIDENTS.map(r=>r.role)).size,8);
  assert.equal(world.player,null);assert.equal(SAVE_KEY,'pathopedia:cell-village:v1');
  assert.deepEqual(world.residents.map(r=>r.id),RESIDENTS.map(r=>r.id));
});
test('every department and break room is reachable through doors and conveyor bridges',()=>{
  for(const site of SITES){
    const path=findPath(POINTS.plaza,POINTS[site.id]);assert.ok(path.length,site.id);assert.ok(path.every(p=>canStand(p.x,p.y)),site.id);
    const dock=DOCKS[site.id],handoff=findPath(POINTS[site.id],dock);assert.ok(canStand(dock.x,dock.y),site.id);assert.ok(handoff.length);assert.deepEqual(handoff.at(-1),dock);assert.ok(handoff.every(p=>canStand(p.x,p.y)));
  }
  const path=findPath(POINTS.lung,POINTS.kidney);assert.ok(path.length);assert.ok(path.every(p=>canStand(p.x,p.y)));
  assert.ok(findPath(POINTS.plaza,POINTS.lounge).length);
  for(const point of [...BREAK_SEATS,...GARDEN_SPOTS,...SOCIAL_SPOTS,POINTS.assist]){assert.ok(canStand(point.x,point.y));assert.deepEqual(findPath(POINTS.plaza,point).at(-1),{x:point.x,y:point.y});}
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
  const world=createWorld(),carried=new Set();
  for(let i=0;i<9000;i++){
    tickWorld(world,1/30);
    for(const r of world.residents){if(r.carry)carried.add(r.carry.kind);if(['break','rest'].includes(r.task))assert.equal(r.carry,null);}
    if(i%300===0)assertConservation(world);
  }
  const f=world.logistics;
  assert.ok(f.stats.work>10);assert.ok(f.stats.filtered>5);assert.ok(f.stats.sorted>=f.stats.filtered);assert.ok(f.parcels.length<=MAX_PARCELS);
  assertConservation(world);assert.deepEqual([...carried].sort(),['food','oxygen','sorted','waste']);
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
  assert.deepEqual(world.logistics.stations.lung.output,['oxygen'],'assistance fills a canister but an employee must carry it out');
});

test('arriving parcels wait at the dock until an employee carries them to the machine',()=>{
  const world=createWorld();world.residents=[];
  for(let i=0;i<1800;i++)tickWorld(world,1/30);
  for(const id of ['brain','heart','marrow']){
    const station=world.logistics.stations[id];assert.equal(station.oxygen,2);assert.equal(station.food,2);assert.equal(station.inbox.length,2);assert.equal(station.completed,0);
  }
  assertConservation(world);
});
test('greeting a carrier pauses and resumes the same parcel without teleporting or losing it',()=>{
  const world=createWorld(),r=world.residents.find(r=>r.id==='breeze');
  for(let i=0;i<300&&!r.carry;i++)tickWorld(world,1/30);
  assert.equal(r.carry?.kind,'oxygen');assert.deepEqual({x:r.x,y:r.y},POINTS.lung);
  const parcel={...r.carry},path=r.path.map(p=>({...p})),position={x:r.x,y:r.y};
  interact(world,{kind:'resident',id:r.id});
  for(let i=0;i<60;i++)tickWorld(world,1/30);
  assert.deepEqual(r.carry,parcel);assert.deepEqual(r.path,path);assert.deepEqual({x:r.x,y:r.y},position);assertConservation(world);
  for(let i=0;i<300&&r.carry;i++)tickWorld(world,1/30);
  assert.equal(r.carry,null);assert.deepEqual({x:r.x,y:r.y},DOCKS.lung);assert.ok(r.deliveries>0);assertConservation(world);
});

test('a full office day includes paired breaks, shared meals, greetings and autonomous incident recovery',()=>{
  const world=createWorld(),phases=new Set(),incidents=new Set();let sharedRest=false;
  for(let i=0;i<21600;i++){
    tickWorld(world,1/30);phases.add(officePhase(world.time).id);
    if(world.life.event)incidents.add(world.life.event.type);
    const resting=world.residents.filter(r=>r.task==='rest');if(resting.length===2&&resting.some(r=>r.chat))sharedRest=true;
    assert.ok(world.residents.filter(r=>r.breakPlan).length<=2,'departments take turns, not an all-staff shutdown');
    if(i%30===0){assertConservation(world);for(const r of world.residents)assert.ok(canStand(r.x,r.y),r.id);}
  }
  assert.equal(phases.size,6);assert.ok(sharedRest);assert.ok(world.life.stats.chats>3);assert.ok(world.life.stats.breaks>=8);assert.ok(world.life.stats.inspections>=8);assert.ok(world.life.stats.tidied>=8);
  assert.deepEqual([...incidents].sort(),['rush','spill']);assert.ok(world.life.stats.resolved>=2);
  for(const r of world.residents)assert.ok(r.lunchDay>=1,`${r.id} missed lunch`);
  assert.ok(world.logistics.stats.work>30);assert.ok(world.logistics.stats.filtered>15);assertConservation(world);
});
test('the player delivers one real parcel, rests, and keeps desk decoration and delivery history',()=>{
  const world=createWorld({version:2,player:{name:'사원',...POINTS.lung}});world.residents=[];
  interact(world,{kind:'site',id:'lung'});for(let i=0;i<90;i++)tickWorld(world,1/30);
  interact(world,{kind:'site',id:'lung'});assert.equal(world.player.carry.kind,'oxygen');assertConservation(world);
  const recipient=world.player.carry.to;world.player.path=findPath(world.player,cargoDestination(world.player.carry));
  for(let i=0;i<900&&world.player.path.length;i++)tickWorld(world,1/30,{walk:true});
  const before=world.logistics.stations[recipient].inbox.length;
  interact(world,{kind:'delivery',id:recipient});assert.equal(world.player.carry,null);assert.equal(world.logistics.stations[recipient].inbox.length,before+1);assert.equal(world.life.deliveries,1);assertConservation(world);
  Object.assign(world.player,POINTS.coffee);interact(world,{kind:'spot',id:'coffee'});tickWorld(world,1/30,{walk:true});assert.equal(world.player.pose,'coffee');
  tickWorld(world,1/30,{walk:true,x:1});assert.equal(world.player.pose,null);
  Object.assign(world.player,POINTS.desk);interact(world,{kind:'spot',id:'desk'});tickWorld(world,1/30,{walk:true});assert.equal(world.player.seated,true);
  interact(world,{kind:'stand'});assert.equal(world.player.seated,false);
  Object.assign(world.player,POINTS.locker);interact(world,{kind:'spot',id:'locker'});
  const restored=createWorld(JSON.parse(serializeWorld(world)));assert.equal(restored.life.deskStyle,1);assert.equal(restored.life.deliveries,1);assert.equal(restored.player.name,'사원');
});
test('the player can recover a dropped parcel before Ruby without duplicate collection',()=>{
  const world=createWorld({version:2,player:{name:'사원',...POINTS.plaza}}),owner=world.residents.find(r=>r.id==='breeze');
  for(let i=0;i<600&&!(owner.carry&&owner.moving);i++)tickWorld(world,1/30);
  assert.ok(owner.carry);world.life.eventCursor=1;world.life.nextEvent=world.time;tickWorld(world,1/30);
  const event=world.life.event;assert.equal(event.type,'spill');assert.ok(event.parcel);assertConservation(world);
  Object.assign(world.player,event.point);interact(world,{kind:'spill',id:'spill'});const carried=world.player.carry;assert.ok(carried);assert.equal(world.life.event,null);assertConservation(world);
  for(let i=0;i<900;i++)tickWorld(world,1/30);
  assert.equal(world.residents.find(r=>r.id==='ruby').carry,null);assert.equal(world.player.carry,carried);assertConservation(world);
  Object.assign(world.player,cargoDestination(carried));interact(world,{kind:'delivery',id:carried.to});assert.equal(world.player.carry,null);assertConservation(world);
});
