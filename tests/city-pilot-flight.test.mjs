import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from '../src/vendor/three/three.module.min.js';
import {createPilotSurface} from '../src/city-pilot-physics.mjs';
import {createCity,serializeCity,restoreCity,pilotCellAction} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';
import {createCityPilot} from '../src/city-pilot.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';
import {pilotInventory,setPilotPose} from '../src/city-pilot-state.mjs';
import {CITY_RADIUS} from '../src/city-boundary.mjs';
import {groundCoordinate,groundPoint} from '../src/city-three-layout.mjs';

function scene(boxes=[]){const root=new Group();for(const [x,y,z,w,h,d] of boxes){const m=new Mesh(new BoxGeometry(w,h,d),new MeshBasicMaterial());m.position.set(x,y,z);root.add(m);}return createPilotSurface(root);}
function fixture(theme='2',boxes=[]){const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());const world=pilotWorld(s.layout,theme);world.setSurface(scene(boxes));const p=createCityPilot();assert.ok(p.start(s,{theme,spawn:{x:0,z:0}}));return {s,p,world};}
function step(p,seconds,input={}){for(let n=0;n<Math.ceil(seconds/.02);n++){p.run.time+=.02;p.step(.02,input);}}

test('surface capsule slides beside actual walls, passes low paving, stops below ceilings and lands on roofs',()=>{
 const {world}=fixture('2',[[2,1,0,.4,2,8],[-2,.08,0,.5,.16,3],[-4,.15,0,1,.3,2],[0,3,0,2,.3,2],[6,1,0,2,2,2]]);
 assert.equal(world.canStand({x:1.4,z:0}),true,'empty margin beside a wall stays usable');assert.equal(world.canStand({x:2,z:0}),false);assert.equal(world.canStand({x:-2,z:0}),true,'paving is walkable');
 const p={x:1,y:0,z:0};world.moveBody(p,{x:2,y:0,z:2});assert.ok(p.x<1.66);assert.ok(p.z>1.8,'diagonal movement slides along the wall');
 const curb={x:-5,y:0,z:0};world.moveBody(curb,{x:2,y:-.05,z:0});assert.ok(curb.x>-3.1,'small curbs do not pin the feet');
 const up={x:0,y:0,z:0};const ceiling=world.moveBody(up,{x:0,y:5,z:0});assert.ok(ceiling.ceiling);assert.ok(up.y<2.3,'cannot tunnel through a ceiling');
 const roof={x:6,y:4,z:0};assert.ok(world.moveBody(roof,{x:0,y:-5,z:0}).grounded);assert.ok(roof.y>1.7&&roof.y<2.1);
 const rim={x:CITY_RADIUS-1.5,y:0,z:0};world.moveBody(rim,{x:4,y:-.05,z:2});assert.ok(Math.hypot(rim.x,rim.z)<CITY_RADIUS-1.3,'step assist cannot escape the city boundary');
 assert.equal(world.clear({x:1,y:1,z:0},{x:3,y:1,z:0}),false);assert.equal(world.clear({x:1,y:4,z:0},{x:3,y:4,z:0}),true);
});

for(const theme of ['2','1'])test('theme '+theme+': toggling flight holds the current height until Space is pressed',()=>{
 const {p}=fixture(theme);assert.ok(p.toggleFlight());step(p,.8);assert.equal(p.view().flying,true);assert.equal(p.view().height,0,'switching mode on the ground must not launch the player');
 p.toggleFlight();step(p,.6,{flight:true});assert.equal(p.view().flying,true);assert.equal(p.view().height,0,'the keyboard input path also only changes the mode');
 step(p,.35,{jump:true});assert.ok(p.view().height>1,'Space explicitly starts ascent');p.toggleFlight();step(p,.1);const height=p.view().height;assert.ok(height>0);p.toggleFlight();step(p,.5);assert.equal(p.view().height,height,'switching mode in the air adds no vertical impulse');p.stop();
});

for(const theme of ['2','1'])test('theme '+theme+': zero legacy fuel permits unlimited flight, air dash and safe cargo save/exit',()=>{
 const {s,p,world}=fixture(theme);const inventory=pilotInventory(s);inventory.oxygen=12;inventory.fuel=0;
 step(p,1,{flight:true,jump:true});assert.ok(p.view().flying);assert.ok(p.view().height>3);
 step(p,.7);const hover=p.view().height;step(p,6);assert.ok(Math.abs(p.view().height-hover)<.02);assert.ok(p.view().flying,'empty legacy fuel never shuts off flight');assert.equal(inventory.fuel,0,'flight has no fuel drain or recharge');
 const before=p.view().position;step(p,.24,{dash:true});assert.ok(Math.hypot(p.view().position.x-before.x,p.view().position.z-before.z)>2);assert.ok(p.view().dashCooldown>1.8);
 const energy=p.cell.energy;step(p,.2,{dash:true});assert.ok(p.cell.energy>=energy,'held dash cannot spend energy twice');
 const saved=restoreCity(serializeCity(s));assert.equal(saved.pilotInventory.oxygen,12);assert.equal(saved.pilotInventory.fuel,0);assert.ok(world.canStand(groundPoint(saved.cells.find(c=>c.id===p.cell.id))));
 p.toggleFlight();step(p,4);assert.equal(p.view().height,0);assert.equal(inventory.fuel,0);const c=p.cell;p.stop();assert.equal(p.active,false);assert.ok(c.path.length);assert.equal(pilotInventory(s).oxygen,12);
});

test('air dash respects thin walls and flight altitude limits',()=>{
 const {p}=fixture('2',[[0,5,-2,12,10,.1]]);for(let n=0;n<16;n++)p.look(-p.view().yaw/.0025,0);
 step(p,.25,{flight:true,jump:true});step(p,.3,{dash:true});assert.ok(p.view().position.z>-1.8);step(p,10,{jump:true});assert.ok(p.view().height>99&&p.view().height<=100,'100m remains reachable with unlimited flight');assert.ok(p.view().flying);p.stop();
});

test('tractor pulls actual debris, enforces capacity and cannot collect through a wall',()=>{
 const {s,p,world}=fixture();p.equip('tractor');const debris={id:++s.serial,...groundCoordinate({x:0,z:-6}),recordId:'SAU-001'};s.debris=[debris];
 for(let n=0;n<60&&s.debris.length;n++){s.time+=.02;pilotCellAction(s,'tractor-pull','debris:'+debris.id,.02);}
 assert.equal(s.debris.length,0);assert.equal(pilotInventory(s).debris,1);
 s.debris=[{...debris,...groundCoordinate({x:0,z:-3})}];world.setSurface(scene([[0,1,-1.5,3,2,.2]]));const before={...s.debris[0]};assert.equal(pilotCellAction(s,'tractor-pull','debris:'+debris.id,.05).ok,false);assert.deepEqual(s.debris[0],before);
 world.setSurface(scene());pilotInventory(s).debris=6;assert.equal(pilotCellAction(s,'tractor-pull','debris:'+debris.id,.05).ok,false);p.stop();
});

test('repulsor pushes visible hostiles, consumes energy once, and respects walls and vertical reach',()=>{
 const {s,p,world}=fixture();p.equip('repulsor');setPilotPose(s,{height:0,eye:.58,theme:'2',yaw:0,pitch:0});
 const enemy=(id,x,z)=>({id,...groundCoordinate({x,z}),hp:50,entered:true,recordId:'SAU-001'});s.enemies=[enemy(900,0,-2),enemy(901,2,-2)];world.setSurface(scene([[1.4,1,-1.4,.4,2,2]]));
 const first=groundPoint(s.enemies[0]),blocked=groundPoint(s.enemies[1]),energy=p.cell.energy,result=pilotCellAction(s,'repulsor');assert.equal(result.hits,1);assert.equal(p.cell.energy,energy-12);assert.ok(groundPoint(s.enemies[0]).z<first.z-2);assert.deepEqual(groundPoint(s.enemies[1]),blocked);assert.equal(pilotCellAction(s,'repulsor').ok,false);
 s.time+=2;setPilotPose(s,{height:10,eye:10.58,theme:'2',yaw:0,pitch:-1.4});assert.equal(pilotCellAction(s,'repulsor').hits,0);p.equip('engulf');assert.equal(pilotCellAction(s,'attack',901).ok,false);p.stop();
});
