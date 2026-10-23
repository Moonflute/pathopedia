import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {applyTileLayout,createTileLayout,siteAt,compileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,groundPoint} from '../src/city-three-layout.mjs';
import {createCityPilot} from '../src/city-pilot.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';
import {pilotedCell,pilotInventory} from '../src/city-pilot-state.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());return s;};
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function face(p,point){for(let i=0;i<16;i++){const v=p.view(),angle=Math.atan2(point.x-v.position.x,-(point.z-v.position.z)),delta=Math.atan2(Math.sin(angle-v.yaw),Math.cos(angle-v.yaw));if(Math.abs(delta)<.001)return;p.look(delta/.0025,0);}}
function travel(p,goal){
 for(const point of p.world.route(p.view().position,goal,'neutrophil')){
  let steps=0;while(d(p.view().position,point)>.09&&steps++<1800){face(p,point);p.step(.02,{forward:Math.min(1,d(p.view().position,point)*2)});}
  assert.ok(steps<1800,'manual movement reaches a route corner');for(let i=0;i<20;i++)p.step(.02);
 }
}
for(const theme of ['2','1']){
 test('theme '+theme+': one explorer owns an existing cell and returns it to AI',()=>{
  const s=city(),p=createCityPilot(),count=s.cells.length;assert.ok(p.start(s,{theme}));const c=p.cell,origin=groundPoint(c);tickCity(s,.05,data,theme);
  assert.ok(d(groundPoint(c),origin)<1e-6);assert.equal(s.cells.length,count);assert.equal(pilotedCell(s),c);
  const restored=restoreCity(serializeCity(s));assert.ok(restored);assert.equal(pilotedCell(restored),null);
  p.step(.05,{forward:1});assert.ok(d(groundPoint(c),origin)>.01);p.stop();assert.equal(pilotedCell(s),null);assert.ok(c.path.length);
 });
 test('theme '+theme+': all oxygen destinations have a traversable route; structures block movement',()=>{
  const s=city(),world=pilotWorld(s.layout,theme),lung=siteAt(s.layout,'lung');
  for(const id of ['heart','gut','kidney','marrow','lymph']){const goal=siteAt(s.layout,id),path=world.route(lung,goal,'neutrophil');assert.ok(path.length>1,id+' reachable');assert.ok(d(path.at(-1),goal)<1);
   for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.ceil(d(a,b)*8);for(let j=0;j<=n;j++)assert.ok(world.canStand({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n}),id+' path blocked');}
  }
  const [key]=compileLayout(s.layout).occupied.keys(),[x,z]=key.split(',').map(Number);assert.equal(world.canStand({x,z}),false);assert.equal(world.canStand({x:45,z:0}),false);
 });
 test('theme '+theme+': same neutrophil carries oxygen, switches tools, walks and unloads once',()=>{
  const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'lung')));const originalCargo=c.cargo;s.districts.heart.oxygen=20;
  assert.ok(p.start(s,{preferred:c.id,theme}));p.equip('oxygen');p.chooseDestination('heart');for(let i=0;i<20;i++)p.step(.05,{use:true});const cargo=pilotInventory(s).oxygen;assert.ok(cargo>0);
  const position=p.view().position;p.equip('engulf');assert.equal(p.cell,c);assert.deepEqual(p.view().position,position);assert.equal(pilotInventory(s).oxygen,cargo);assert.equal(c.cargo,originalCargo);
  p.equip('oxygen');travel(p,siteAt(s.layout,'heart'));const before=s.stats.oxygen;for(let i=0;i<20;i++)p.step(.05,{use:true});assert.equal(pilotInventory(s).oxygen,0);assert.equal(s.districts.heart.oxygen,20+cargo);assert.equal(s.stats.oxygen,before+cargo);
  for(let i=0;i<30;i++)p.step(.05,{use:true});assert.equal(s.stats.oxygen,before+cargo);assert.equal(p.view().deliveries,1);assert.ok(restoreCity(serializeCity(s)));p.stop();
 });
}
test('combat tool works on an RBC without changing its identity or autonomous cargo',()=>{
 const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='rbc');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'heart')));const cargo=c.cargo;assert.ok(p.start(s,{preferred:c.id}));
 const point={x:p.view().position.x+1,z:p.view().position.z},enemy={id:++s.serial,...groundCoordinate(point),recordId:'SAU-001',hp:1,maxHp:34,entered:true,front:'blood',site:'heart',dead:false};s.enemies=[enemy];face(p,point);
 assert.equal(p.view().aim,enemy);const defeated=s.stats.defeated;p.step(.05,{use:true});assert.equal(enemy.dead,true);assert.equal(s.stats.defeated,defeated+1);assert.equal(s.debris.length,1);assert.equal(c.kind,'rbc');assert.equal(c.cargo,cargo);
 const second={...enemy,id:++s.serial,hp:34,dead:false};s.enemies=[second];p.step(.05,{use:true});assert.equal(second.hp,34,'attack cooldown prevents repeat');
 const building=siteAt(s.layout,'heart').building;assert.equal(p.world.clear({x:building[0]-4,z:building[1]},{x:building[0]+4,z:building[1]}),false);p.stop();assert.equal(pilotedCell(s),null);
});
test('smooth movement interpolates, sprints, decelerates and lowers the crouched camera',()=>{
 const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'heart')));assert.ok(p.start(s));
 const open=p.world.safe(p.view().position,'neutrophil',q=>Array.from({length:25},(_,i)=>({x:q.x,z:q.z-i*.25})).every(v=>p.world.canStand(v)));assert.ok(open,'fixture has six metres of clear ground');Object.assign(c,groundCoordinate(open));p.resetMotion();face(p,{x:open.x,z:open.z-10});
 const start=p.view().position;p.step(.02,{forward:1});const first=p.view(),mid=p.view(.5);assert.ok(first.speed>0&&first.speed<4.2);assert.ok(d(mid.position,start)>0&&d(mid.position,start)<d(first.position,start));
 for(let i=0;i<12;i++)p.step(.02,{forward:1});const walk=p.view().speed;for(let i=0;i<12;i++)p.step(.02,{forward:1,sprint:true});assert.ok(p.view().speed>walk+1);assert.ok(p.view().sprinting);
 const fast=p.view().speed;p.step(.02);assert.ok(p.view().speed>0&&p.view().speed<fast);for(let i=0;i<20;i++)p.step(.02);assert.ok(p.view().speed<.01);
 const eye=p.view().eye;for(let i=0;i<20;i++)p.step(.02,{crouch:true});assert.ok(p.view().crouching);assert.ok(p.view().eye<eye-.2);p.step(.02,{forward:1,crouch:true,sprint:true});assert.equal(p.view().sprinting,false);assert.ok(p.view().speed<1.75);
 p.stop();
});
test('jump raises the camera, lands once while held, and works again after release',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s));const eye=p.view().eye;p.step(.05,{jump:true});assert.ok(p.view().airborne);assert.ok(p.view().eye>eye);assert.ok(p.view(.5).eye>eye&&p.view(.5).eye<p.view().eye);
 for(let i=0;i<30;i++)p.step(.05,{jump:true});assert.equal(p.view().airborne,false);assert.equal(p.view().eye,eye);p.step(.05);p.step(.05,{jump:true});assert.ok(p.view().airborne);p.stop();
});
test('inventory survives saving, reentry and theme changes; missing cells safely release control',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s));const c=p.cell;p.equip('oxygen');pilotInventory(s).oxygen=12;p.chooseDestination('kidney');p.setTheme('1');assert.equal(p.cell,c);assert.ok(p.world.canStand(p.view().position));p.stop();
 const restored=restoreCity(serializeCity(s));assert.deepEqual(pilotInventory(restored),{tool:'oxygen',oxygen:12,target:'kidney'});assert.ok(p.start(restored,{theme:'1'}));assert.equal(p.view().inventory.oxygen,12);
 restored.cells=restored.cells.filter(x=>x!==p.cell);p.step(.05,{forward:1});assert.equal(p.active,false);assert.equal(pilotedCell(restored),null);
 const bad=JSON.parse(serializeCity(s));bad.pilotInventory.oxygen=-1;assert.equal(restoreCity(JSON.stringify(bad)),null);
});
