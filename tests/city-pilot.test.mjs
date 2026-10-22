import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {applyTileLayout,createTileLayout,siteAt,compileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,groundPoint} from '../src/city-three-layout.mjs';
import {createCityPilot} from '../src/city-pilot.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';
import {pilotedCell} from '../src/city-pilot-state.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());return s;};
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function face(p,point){for(let i=0;i<16;i++){const v=p.view(),angle=Math.atan2(point.x-v.position.x,-(point.z-v.position.z)),delta=Math.atan2(Math.sin(angle-v.yaw),Math.cos(angle-v.yaw));if(Math.abs(delta)<.001)return;p.look(delta/.0025,0);}}

for(const theme of ['2','1']){
 test('theme '+theme+': control owns one existing cell, leaves saves ordinary and restores AI',()=>{
  const s=city(),pilot=createCityPilot(),count=s.cells.length;assert.ok(pilot.start(s,'neutrophil',null,theme));const c=pilot.cell,p=groundPoint(c);tickCity(s,.05,data,theme);
  assert.ok(d(groundPoint(c),p)<1e-6);assert.equal(s.cells.length,count);assert.equal(pilotedCell(s),c);
  const restored=restoreCity(serializeCity(s));assert.ok(restored);assert.equal(pilotedCell(restored),null);
  pilot.step(.05,{forward:1});assert.ok(d(groundPoint(c),p)>.01);pilot.stop();assert.equal(pilotedCell(s),null);assert.ok(c.path.length);
 });
 test('theme '+theme+': every oxygen destination has a traversable path; buildings and boundary block motion',()=>{
  const s=city(),world=pilotWorld(s.layout,theme),lung=siteAt(s.layout,'lung');
  for(const id of ['heart','gut','kidney','marrow','lymph']){const goal=siteAt(s.layout,id),path=world.route(lung,goal,'rbc');assert.ok(path.length>1,id+' reachable');assert.ok(d(path.at(-1),goal)<1);
   for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.ceil(d(a,b)*8);for(let j=0;j<=n;j++)assert.ok(world.canStand({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n},'rbc'),id+' path blocked');}
  }
  const [key]=compileLayout(s.layout).occupied.keys(),[x,z]=key.split(',').map(Number);assert.equal(world.canStand({x,z}),false);assert.equal(world.canStand({x:45,z:0}),false);
 });
 test('theme '+theme+': a player loads, travels and unloads real oxygen without duplication',()=>{
  const s=city(),pilot=createCityPilot(),c=s.cells.find(c=>c.kind==='rbc');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'lung')));c.cargo=0;s.districts.heart.oxygen=20;
  assert.ok(pilot.start(s,'rbc',c.id,theme));pilot.chooseDestination('heart');for(let i=0;i<16;i++)pilot.step(.05,{interact:true});assert.ok(c.cargo>0);const cargo=c.cargo;
  const goal=siteAt(s.layout,'heart'),path=pilot.world.route(pilot.view().position,goal,'rbc');
  for(const point of path){let steps=0;while(d(pilot.view().position,point)>.11&&steps++<1000){face(pilot,point);pilot.step(.02,{forward:1});}assert.ok(steps<1000,'movement reaches waypoint');}
  const before=s.stats.oxygen;for(let i=0;i<16;i++)pilot.step(.05,{interact:true});assert.equal(c.cargo,0);assert.equal(s.districts.heart.oxygen,20+cargo);assert.equal(s.stats.oxygen,before+cargo);
  for(let i=0;i<50;i++)pilot.step(.05,{interact:true});assert.equal(s.stats.oxygen,before+cargo);assert.equal(pilot.view().deliveries,1);assert.ok(restoreCity(serializeCity(s)));pilot.stop();
 });
}

test('aimed neutrophil combat changes city enemies, obeys cooldown and cannot hit through buildings',()=>{
 const s=city(),pilot=createCityPilot(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'heart')));assert.ok(pilot.start(s,c.kind,c.id,'2'));
 const p=pilot.view().position,point={x:p.x+1,z:p.z},enemy={id:++s.serial,...groundCoordinate(point),recordId:'SAU-001',hp:1,maxHp:34,entered:true,front:'blood',site:'heart',dead:false};s.enemies=[enemy];face(pilot,point);
 assert.equal(pilot.view().aim,enemy);const defeated=s.stats.defeated;pilot.step(.05,{fire:true});assert.equal(enemy.dead,true);assert.equal(s.stats.defeated,defeated+1);assert.equal(s.debris.length,1);
 const second={...enemy,id:++s.serial,hp:34,dead:false};s.enemies=[second];pilot.step(.05,{fire:true});assert.equal(second.hp,34,'attack cooldown prevents repeat');
 const building=siteAt(s.layout,'heart').building;assert.equal(pilot.world.clear({x:building[0]-4,z:building[1]},{x:building[0]+4,z:building[1]}),false);
 pilot.stop();assert.equal(pilotedCell(s),null);
});

test('theme switch keeps role and cargo; disappearing cells safely end control',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s,'rbc',null,'2'));const c=p.cell,cargo=c.cargo;p.setTheme('1');assert.equal(p.cell,c);assert.equal(c.cargo,cargo);assert.ok(p.world.canStand(p.view().position,'rbc'));
 s.cells=s.cells.filter(x=>x!==c);p.step(.05,{forward:1});assert.equal(p.active,false);assert.equal(pilotedCell(s),null);
});
