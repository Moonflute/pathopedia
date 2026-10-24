import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from '../src/vendor/three/three.module.min.js';
import {createCity,pilotCellAction,serializeCity,restoreCity,tickCity} from '../src/city-engine.mjs';
import {createCityPilot} from '../src/city-pilot.mjs';
import {createPilotSurface} from '../src/city-pilot-physics.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,groundPoint} from '../src/city-three-layout.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';
import {pilotInventory} from '../src/city-pilot-state.mjs';
import {cellHistory,tickCellMemory} from '../src/city-cell-memory.mjs';
import {beginActivity} from '../src/city-activity.mjs';
import {selectSandboxCell,coordinatedTarget} from '../src/city-sandbox.mjs';
import {tickSandboxEvents,setSandboxEvents} from '../src/city-sandbox-events.mjs';
import {tickPilotThreat,pilotThreatView} from '../src/city-pilot-threats.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
function surface(boxes=[]){const root=new Group();for(const [x,y,z,w,h,d]of boxes){const m=new Mesh(new BoxGeometry(w,h,d),new MeshBasicMaterial());m.position.set(x,y,z);root.add(m);}return createPilotSurface(root);}
function fixture(theme='2',boxes=[]){const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());const world=pilotWorld(s.layout,theme);world.setSurface(surface(boxes));const p=createCityPilot();assert.ok(p.start(s,{theme,spawn:{x:0,z:0}}));return {s,p,world};}
function step(p,seconds,input={}){for(let n=0;n<Math.ceil(seconds/.02);n++){p.run.time+=.02;p.step(.02,input);}}
function aim(p,q,height=.45){for(let i=0;i<40;i++){const v=p.view(),angle=Math.atan2(q.x-v.position.x,-(q.z-v.position.z)),yaw=Math.atan2(Math.sin(angle-v.yaw),Math.cos(angle-v.yaw)),pitch=Math.atan2(height-v.eye,Math.hypot(q.x-v.position.x,q.z-v.position.z));p.look(yaw/.0025,(v.pitch-pitch)/.0025);}}

for(const theme of ['1','2'])test('theme '+theme+': scan, live follow, recent activity and removal share the real cell',()=>{
 const {s,p}=fixture(theme),other=s.cells.find(c=>c.kind==='rbc');s.cells=[p.cell,other];Object.assign(other,groundCoordinate({x:0,z:-4}),{cargo:18,target:'kidney',task:'산소 운반'});tickCellMemory(s);p.equip('scanner');aim(p,{x:0,z:-4});step(p,.6,{use:true});
 assert.equal(p.view().observed.track,other);assert.match(p.view().observed.destination,/신장/);assert.match(p.view().observed.cargo,/18/);assert.ok(p.view().observed.history.length);assert.ok(p.toggleFollowing());const start=p.view().position;step(p,.8);assert.ok(Math.hypot(p.view().position.x-start.x,p.view().position.z-start.z)>.2);step(p,.05,{strafe:1});assert.equal(p.view().following,false);
 s.cells=[p.cell];step(p,.02);assert.equal(p.view().observed,null);p.stop();
});
test('cell handoffs conserve oxygen and debris; remote interaction cannot transfer cargo',()=>{
 const {s,p}=fixture(),rbc=s.cells.find(c=>c.kind==='rbc'),mac=s.cells.find(c=>c.kind==='macrophage');s.cells=[p.cell,rbc,mac];Object.assign(rbc,groundCoordinate({x:0,z:-1}),{cargo:18});Object.assign(mac,groundCoordinate({x:1,z:0}),{debrisCargo:3});
 p.equip('oxygen');selectSandboxCell(s,rbc);const total=rbc.cargo+pilotInventory(s).oxygen;assert.ok(pilotCellAction(s,'oxygen','cell:'+rbc.id).ok);assert.equal(total,rbc.cargo+pilotInventory(s).oxygen);assert.equal(pilotInventory(s).oxygen,8);s.time+=2;assert.ok(pilotCellAction(s,'oxygen','cell:'+rbc.id).ok);assert.equal(total,rbc.cargo+pilotInventory(s).oxygen);
 Object.assign(rbc,groundCoordinate({x:0,z:-9}));s.time+=2;const before=rbc.cargo;assert.equal(pilotCellAction(s,'oxygen','cell:'+rbc.id).ok,false);assert.equal(rbc.cargo,before);
 p.equip('cleanup');selectSandboxCell(s,mac);assert.ok(pilotCellAction(s,'cleanup','cell:'+mac.id).ok);assert.equal(mac.debrisCargo,0);assert.equal(pilotInventory(s).debris,3);assert.ok(restoreCity(serializeCity(s)));p.stop();
});
test('helping a worker consumes real materials and reduces only a delivered construction job',()=>{
 const {s,p}=fixture(),worker=s.cells.find(c=>c.kind==='fibroblast');s.cells=[p.cell,worker];Object.assign(worker,groundCoordinate({x:0,z:-1}),{target:'heart',buildSite:'heart'});s.districts.heart.building={type:'upgrade',remaining:8,duration:9};beginActivity(s,worker,'build',5,worker,'heart');p.equip('repair');const stock=s.resources.materials;
 selectSandboxCell(s,worker);assert.ok(pilotCellAction(s,'repair','cell:'+worker.id).ok);assert.equal(s.districts.heart.building.remaining,6);assert.equal(s.resources.materials,stock-1);assert.equal(pilotCellAction(s,'repair','cell:'+worker.id).ok,false,'one use cannot bypass cooldown');s.time+=6;assert.equal(pilotCellAction(s,'repair','cell:'+worker.id).ok,false,'the worker has finished this activity');
 p.stop();
});
test('pulse gun hits at range, traces the first wall and cannot damage a covered target',()=>{
 const {s,p,world}=fixture();s.cells=[p.cell];const enemy={id:++s.serial,...groundCoordinate({x:0,z:-8}),recordId:'SAU-001',hp:50,maxHp:50,entered:true,site:'heart'};s.enemies=[enemy];aim(p,{x:0,z:-8},.43);const energy=p.cell.energy;p.step(.02,{use:true});assert.ok(enemy.hp<50);assert.equal(p.view().shots,1);assert.ok(p.view().shot.hit);assert.ok(p.cell.energy<energy);
 p.step(.02);for(let i=0;i<17;i++)tickCity(s,.02,data,'2');world.setSurface(surface([[0,1,-4,5,2,.2]]));const hp=enemy.hp;assert.equal(pilotCellAction(s,'attack',enemy.id).ok,false);p.step(.02,{use:true});assert.equal(enemy.hp,hp);assert.equal(p.view().shot.hit,false);assert.ok(p.view().shot.target.z>-4.2);p.stop();
});
test('joint repair follows the worker wall or tissue job without healing a different organ',()=>{
 const {s,p}=fixture(),worker=s.cells.find(c=>c.kind==='fibroblast');s.cells=[p.cell,worker];Object.assign(worker,groundCoordinate({x:0,z:-1}),{target:'heart',frontJob:0});s.districts.heart.hp=50;s.frontier.walls[0].repair={remaining:5,delivered:true};beginActivity(s,worker,'repair',5,worker,'heart');selectSandboxCell(s,worker);p.equip('repair');const stock=s.resources.materials;
 assert.ok(pilotCellAction(s,'repair','cell:'+worker.id).ok);assert.equal(s.frontier.walls[0].repair.remaining,3.8);assert.equal(s.districts.heart.hp,50);
 worker.frontJob=null;worker.tissueJob=0;s.frontier.tissues[0].hp=50;s.time+=1;assert.ok(pilotCellAction(s,'repair','cell:'+worker.id).ok);assert.equal(s.frontier.tissues[0].hp,56);assert.equal(s.districts.heart.hp,50);assert.equal(s.resources.materials,stock-2);p.stop();
});
for(const theme of ['1','2'])test('theme '+theme+': grapple uses rendered surfaces, constrains the rope and preserves release momentum',()=>{
 const {s,p}=fixture(theme,[[0,3,-7,5,6,.3]]);s.cells=[p.cell];aim(p,{x:0,z:-7},3);step(p,.02,{grapple:true});assert.ok(p.view().grapple);step(p,.5,{grapple:true,strafe:1,jump:true});const v=p.view(),a=v.grapple.target;assert.ok(Math.hypot(v.position.x-a.x,v.eye-a.y,v.position.z-a.z)<=v.grapple.length+.3);assert.ok(v.height>.2);step(p,.02);assert.equal(p.view().grapple,null);assert.ok(p.view().speed>.1);assert.ok(restoreCity(serializeCity(s)));p.stop();
});
test('riding follows the actual shipment without taking its cargo and safely ends on departure',()=>{
 const {s,p}=fixture();s.cells=[p.cell];const sh={id:++s.serial,kind:'food',to:'heart',amount:8,phase:'travel',path:[],step:0,...groundCoordinate({x:0,z:-1.5})};s.shipments=[sh];p.equip('scanner');aim(p,{x:0,z:-1.5},.5);assert.ok(p.toggleRide());Object.assign(sh,groundCoordinate({x:1,z:-1.5}));step(p,.04);assert.ok(Math.hypot(p.view().position.x-1,p.view().position.z+1.5)<.1);assert.equal(sh.amount,8);s.shipments=[];step(p,.02);assert.equal(p.view().riding,null);assert.equal(p.cell.lost,undefined);p.stop();
});
test('coordinated defenders split close threats, and pathogen attacks visibly wind up before damage',()=>{
 const {s,p}=fixture();s.cells=[p.cell];s.enemies=[{id:800,recordId:'SPY-101',entered:true,hp:50,...groundCoordinate({x:0,z:-2})},{id:801,recordId:'KPN-011',entered:true,hp:50,...groundCoordinate({x:.2,z:-2})}];
 const a={id:1,x:0,y:0},b={id:2,x:0,y:0},assigned={x:0,y:0};assert.notEqual(coordinatedTarget(s,a,()=>true,assigned,false),coordinatedTarget(s,b,()=>true,assigned,false));
 const hp=p.cell.integrity;tickPilotThreat(s,s.enemies[0],.02);assert.ok(pilotThreatView(s.enemies[0]).windup>s.time);assert.equal(p.cell.integrity,hp);s.time+=.7;tickPilotThreat(s,s.enemies[0],.02);assert.equal(pilotThreatView(s.enemies[0]).style,'charge');p.stop();
});
test('ambient changes use real meal and exposure systems, stop when disabled and stop outside exploration',()=>{
 const {s,p}=fixture();const api={log(){},route(){},move(){},output(){return 1;}};tickSandboxEvents(s,36,data,api);assert.ok(s.homeostasis.pendingMeal>0);const introduced=s.biology.stats.introduced;tickSandboxEvents(s,56,data,api);assert.equal(s.biology.stats.introduced,introduced+3);assert.equal(s.spawn.length,3);
 setSandboxEvents(s,false);const exercise=s.homeostasis.exercise;tickSandboxEvents(s,500,data,api);assert.equal(s.homeostasis.exercise,exercise);p.stop();setSandboxEvents(s,true);tickSandboxEvents(s,500,data,api);assert.equal(s.homeostasis.exercise,exercise);
});
