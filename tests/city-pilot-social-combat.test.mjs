import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from '../src/vendor/three/three.module.min.js';
import {createCity,pilotCellAction,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createCityPilot} from '../src/city-pilot.mjs';
import {createTileLayout,applyTileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,groundPoint} from '../src/city-three-layout.mjs';
import {createPilotSurface} from '../src/city-pilot-physics.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';
import {pilotEnemyBody,pilotStaggered} from '../src/city-pilot-combat.mjs';
import {cellReaction,toggleCompanion,companionCell,tickCompanion,markCompanionEnemy,tickCellReaction,reactToCell} from '../src/city-pilot-social.mjs';
import {ensureResidents,residentView} from '../src/city-residents.mjs';
import {pilotJobs} from '../src/city-pilot-tasks.mjs';
import {tickPilotThreat,pilotThreatView} from '../src/city-pilot-threats.mjs';
import {viralExposure} from '../src/city-host-response.mjs';

function fixture(theme='2'){
 const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());
 const world=pilotWorld(s.layout,theme);world.setSurface(createPilotSurface(new Group()));const p=createCityPilot();assert.ok(p.start(s,{theme,spawn:{x:0,z:0}}));return {s,p,world};
}
function aim(p,q,height=.45){for(let n=0;n<24;n++){const v=p.view(),a=Math.atan2(q.x-v.position.x,-(q.z-v.position.z)),yaw=Math.atan2(Math.sin(a-v.yaw),Math.cos(a-v.yaw)),pitch=Math.atan2(height-v.eye,Math.hypot(q.x-v.position.x,q.z-v.position.z));p.look(yaw/.0025,(v.pitch-pitch)/.0025);}}
function enemy(s,point,extra={}){const e={id:++s.serial,...groundCoordinate(point),recordId:'SAU-001',hp:100,maxHp:100,entered:true,site:'heart',...extra};s.enemies.push(e);return e;}
function step(p,n,input){for(let i=0;i<n;i++){p.run.time+=.02;p.cell.cooldown=Math.max(0,p.cell.cooldown-.02);p.step(.02,input);}}

test('outside pathogen visible body is targetable, the nearer body wins, and cover blocks it',()=>{
 const {s,p,world}=fixture('1'),e=enemy(s,{x:0,z:-9},{entered:false}),far=enemy(s,{x:0,z:-14},{entered:false});
 aim(p,groundPoint(e),pilotEnemyBody(s,e).y+1);p.step(.02);const result=pilotCellAction(s,'attack');assert.equal(result.hit,true);assert.ok(e.hp<100);assert.equal(far.hp,100);assert.ok(result.impact.y>2);
 const root=new Group(),wall=new Mesh(new BoxGeometry(8,10,.2),new MeshBasicMaterial());wall.position.set(0,5,-4);root.add(wall);world.setSurface(createPilotSurface(root));p.cell.cooldown=0;const hp=e.hp;assert.equal(pilotCellAction(s,'attack').hit,false);assert.equal(e.hp,hp);p.stop();
});
test('charge releases once, damages a group without hurting cells, pushes and interrupts a charge',()=>{
 const {s,p}=fixture(),a=enemy(s,{x:0,z:-7},{recordId:'SPY-101'}),b=enemy(s,{x:1.4,z:-7}),friend=s.cells.find(c=>c!==p.cell&&c.kind==='neutrophil');Object.assign(friend,groundCoordinate({x:1,z:-7}));
 aim(p,groundPoint(a),pilotEnemyBody(s,a).y);const hp=friend.integrity,stock=structuredClone(s.resources);step(p,55,{scope:true});assert.equal(p.view().shots,0);assert.equal(p.view().charge,1);step(p,1,{});assert.equal(p.view().shots,1);assert.ok(a.hp<100&&b.hp<100);assert.equal(friend.integrity,hp);assert.deepEqual(s.resources,stock);assert.ok(pilotStaggered(s,a));assert.ok(groundPoint(a).z<-7);assert.equal(tickPilotThreat(s,a,.02),true);assert.equal(pilotThreatView(a),null);step(p,8,{});assert.equal(p.view().shots,1);
 step(p,55,{scope:true});p.equip('oxygen');step(p,1,{});assert.equal(p.view().shots,1,'switching cancels a held charge');p.stop();
});
test('pulse shots clear extracellular viruses and helminths without invalid debris or host damage',()=>{
 const {s,p}=fixture();viralExposure(s,{front:'airway',amount:1});const virus=s.physiology.virions[0];Object.assign(virus,groundCoordinate({x:0,z:-7}));
 const neutralized=s.physiology.stats.neutralized,hostHP=s.districts.lung.hp;aim(p,groundPoint(virus),pilotEnemyBody(s,virus).y);p.step(.02);
 assert.equal(pilotCellAction(s,'attack').hit,true);assert.ok(virus.hp>0&&virus.hp<12);assert.ok(restoreCity(serializeCity(s)));
 p.cell.cooldown=0;assert.equal(pilotCellAction(s,'charge',null,1).defeated,true);assert.equal(s.physiology.virions.includes(virus),false);assert.equal(s.physiology.stats.neutralized,neutralized+1);
 const worm={id:++s.serial,recordId:'IMM-HELMINTH',site:'gut',...groundCoordinate({x:0,z:-7}),hp:50,maxHp:50};s.immunity.parasites.push(worm);aim(p,groundPoint(worm),pilotEnemyBody(s,worm).y);p.step(.02);
 for(let n=0;n<3&&!worm.dead;n++){p.cell.cooldown=0;pilotCellAction(s,'charge',null,1);aim(p,groundPoint(worm),pilotEnemyBody(s,worm).y);p.step(.02);}
 assert.equal(worm.dead,true);assert.equal(s.immunity.parasites.length,0);assert.equal(s.immunity.stats.parasites,1);assert.equal(s.districts.lung.hp,hostHP);assert.equal(s.debris.length,0);assert.ok(restoreCity(serializeCity(s)));p.stop();
});
test('direct supplies and greetings work without observation and preserve the recipient work',()=>{
 const {s,p}=fixture(),rbc=s.cells.find(c=>c.kind==='rbc');Object.assign(rbc,groundCoordinate({x:0,z:-1.8}),{cargo:12,energy:40});
 aim(p,groundPoint(rbc));assert.equal(p.view().observed,null);assert.equal(p.greet(),true);assert.equal(cellReaction(s,rbc.id).kind,'greet');
 rbc.activity={kind:'load',started:s.time,duration:1.5,x:rbc.x,y:rbc.y,site:'lung'};const activity=rbc.activity;
 s.time+=.2;tickCellReaction(s,rbc,.2);assert.equal(rbc.activity,activity);assert.equal(activity.started,.2);
 p.equip('oxygen');assert.ok(pilotCellAction(s,'oxygen','cell:'+rbc.id).ok);assert.equal(rbc.cargo,20);assert.equal(rbc.activity,activity);assert.equal(cellReaction(s,rbc.id).kind,'oxygen');
 p.equip('nutrient');assert.ok(pilotCellAction(s,'nutrient','cell:'+rbc.id).ok);assert.equal(rbc.energy,64);assert.ok(restoreCity(serializeCity(s)));p.stop();
});
test('ordinary residents receive food and real repair and resume without jumping',()=>{
 const {s,p}=fixture();ensureResidents(s);const r=residentView(s)[0],person=s.somatic.people.find(x=>x.id===r.id);person.health=40;
 Object.assign(p.cell,groundCoordinate({x:r.point.x,z:r.point.z+1.6}));p.step(.02);aim(p,r.point);p.equip('repair');
 const stock=structuredClone(s.resources);assert.ok(pilotJobs(s,'repair').some(j=>j.resident?.id===r.id));assert.ok(pilotCellAction(s,'repair',r.id).ok);assert.equal(person.health,52);
 const before=residentView(s).find(x=>x.id===r.id).point;s.time+=.6;assert.deepEqual(residentView(s).find(x=>x.id===r.id).point,before);s.time+=.301;assert.ok(Math.hypot(residentView(s).find(x=>x.id===r.id).point.x-before.x,residentView(s).find(x=>x.id===r.id).point.z-before.z)<.01);
 p.equip('nutrient');assert.ok(pilotCellAction(s,'nutrient',r.id).ok);assert.equal(person.health,56);assert.deepEqual(s.resources,stock);assert.ok(restoreCity(serializeCity(s)));p.stop();
});
test('one real immune companion follows, assists the marked target, can be repaired, and returns to AI',()=>{
 const {s,p}=fixture(),c=s.cells.find(c=>c!==p.cell&&c.kind==='neutrophil'),other=s.cells.find(c=>c.kind==='macrophage');Object.assign(c,groundCoordinate({x:0,z:-2}));const target=c.target;
 aim(p,groundPoint(c));assert.ok(p.toggleCompanion());assert.equal(companionCell(s),c);Object.assign(p.cell,groundCoordinate({x:4,z:0}));const before=groundPoint(c);
 for(let n=0;n<40;n++){s.time+=.05;tickCompanion(s,c,.05,{damage(){}});}assert.ok(Math.hypot(groundPoint(c).x-4,groundPoint(c).z)<Math.hypot(before.x-4,before.z));
 const e=enemy(s,{x:4,z:-6});markCompanionEnemy(s,e);c.cooldown=0;tickCompanion(s,c,.05,{damage(s,e,n){e.hp-=n;}});assert.ok(e.hp<100);assert.match(c.task,/함께 방어/);
 Object.assign(c,groundCoordinate({x:4,z:-1.6}),{integrity:50});p.step(.02);p.equip('repair');assert.ok(pilotCellAction(s,'repair','cell:'+c.id).ok);assert.equal(c.integrity,58);
 assert.ok(toggleCompanion(s,other).ok);assert.equal(companionCell(s),other);assert.equal(c.target,target);assert.doesNotMatch(c.task,/동행/);assert.ok(restoreCity(serializeCity(s)));p.stop();assert.equal(companionCell(s),null);assert.doesNotMatch(other.task,/동행/);
});
