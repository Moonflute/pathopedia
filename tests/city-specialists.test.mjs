import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,upgradeVillage,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {qualityProfile} from '../src/city-three-layout.mjs';
const advance=(s,seconds)=>{for(let i=0;i<seconds*30;i++)tickCity(s,1/30,{});};
const village=()=>{const s=createCity('normal','steady',{specialists:true});s.nextWave=Infinity;return s;};

test('village upgrade keeps progress, reduces RBCs and adds a roster exactly once',()=>{
 const s=createCity('normal','steady');command(s,'upgrade','heart');advance(s,3);
 const deliveries=JSON.stringify(s.shipments),time=s.time;
 upgradeVillage(s);assert.equal(s.time,time);assert.equal(JSON.stringify(s.shipments),deliveries);
 assert.equal(s.cells.length,54);assert.equal(s.cells.filter(c=>c.kind==='rbc').length,18);
 const saved=serializeCity(s);upgradeVillage(s);assert.equal(serializeCity(s),saved);
 assert.equal(createCity('normal','steady').cells.length,40);
 assert.equal(command(createCity(),'recruit','plasma').ok,false);
 assert.equal(createCity('normal','fragile',{specialists:true}).cells.filter(c=>c.kind==='neutrophil').length,4);
});
test('antigen delivery enables actual plasma production and helper support at the rally',()=>{
 const s=village();advance(s,8);assert.equal(s.stats.antibodyBatches,0);assert.equal(s.stats.signals,0);
 s.antigens['SPN-105']=true;advance(s,70);
 assert.ok(s.antibodies['SPN-105']>0);assert.ok(s.stats.antibodyBatches>0);assert.ok(s.stats.signals>0);assert.ok(s.districts.lung.supportUntil>0);
 const absent=village();absent.cells=absent.cells.filter(c=>c.kind!=='plasma');absent.antigens['SPN-105']=true;advance(absent,45);
 assert.equal(absent.antibodies['SPN-105']||0,0);
});
test('platelets travel to damage, patch it, and new jobs retain deterministic saves and lifetimes',()=>{
 const s=village();s.barrier=30;advance(s,35);assert.ok(s.stats.clots>0);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,3);advance(copy,3);assert.equal(serializeCity(s),serializeCity(copy));
 const c=s.cells.find(c=>c.kind==='plasma'),id=c.id;s.lifecycle=true;c.age=c.life-.01;advance(s,.1);
 assert.ok(!s.cells.some(c=>c.id===id));assert.ok(s.recruits.some(r=>r.kind==='plasma'));advance(s,20);
 assert.equal(s.cells.filter(c=>c.kind==='plasma').length,3);
});
test('all eight appearances stay finite and fit a modest shared rendering budget',()=>{
 const s=village(),actor=createActors(qualityProfile(390,3));actor.draw(s,{selectedKind:'plasma'});
 assert.equal(actor.positions.length,54);assert.equal(new Set(actor.positions.map(p=>p.cell.kind)).size,8);
 let triangles=0;
 actor.root.traverse(m=>{if(!m.isInstancedMesh)return;assert.ok(m.count<=m.instanceMatrix.count);assert.ok(m.instanceMatrix.array.every(Number.isFinite));triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count;});
 assert.ok(triangles<40000,triangles);assert.ok(actor.root.children.length<=18);
});
