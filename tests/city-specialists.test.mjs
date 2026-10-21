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
 assert.ok(s.cells.length>54&&s.cells.length<=96);assert.equal(s.cells.filter(c=>c.kind==='rbc').length,18);
 const saved=serializeCity(s);upgradeVillage(s);assert.equal(serializeCity(s),saved);
 assert.equal(createCity('normal','steady').cells.length,40);
 assert.equal(command(createCity(),'recruit','plasma').ok,false);
 assert.equal(createCity('normal','fragile',{specialists:true}).cells.filter(c=>c.kind==='neutrophil').length,4);
});
test('an old global antigen flag does not skip T-cell priming and B-cell differentiation',()=>{
 const s=village();advance(s,8);assert.equal(s.stats.antibodyBatches,0);assert.equal(s.stats.signals,0);
 s.antigens['SPN-105']=true;advance(s,12);assert.equal(s.antibodies['SPN-105']||0,0);assert.equal(s.stats.antibodyBatches,0);assert.equal(s.cells.some(c=>c.immuneState==='effector'),false);
});
test('platelets travel to damage, patch it, and new jobs retain deterministic saves and lifetimes',()=>{
 const s=village();s.barrier=30;advance(s,35);assert.ok(s.stats.clots>0);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,3);advance(copy,3);assert.equal(serializeCity(s),serializeCity(copy));
 const c=s.cells.find(c=>c.kind==='bcell'),id=c.id,before=s.cells.filter(c=>c.kind==='bcell').length;Object.assign(c,{kind:'plasma',licensed:true,recordId:'SPN-105',isotype:'IgG'});s.antigens['SPN-105']=true;s.lifecycle=true;c.age=c.life-.01;advance(s,.1);
 assert.ok(!s.cells.some(c=>c.id===id));assert.ok(s.recruits.some(r=>r.kind==='bcell'));advance(s,20);assert.equal(s.cells.filter(c=>c.kind==='bcell').length,before);assert.equal(s.cells.filter(c=>c.kind==='plasma').length,0);
});
test('the expanded immune roster remains finite in the same sixteen rendering batches',()=>{
 const s=village(),actor=createActors(qualityProfile(390,3));actor.draw(s,{selectedKind:'plasma'});
 assert.equal(actor.positions.length,s.cells.length);assert.equal(new Set(actor.positions.map(p=>p.cell.kind)).size,15);
 let triangles=0;
 actor.root.traverse(m=>{if(!m.isInstancedMesh)return;assert.ok(m.count<=m.instanceMatrix.count);assert.ok(m.instanceMatrix.array.every(Number.isFinite));triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count;});
 assert.ok(triangles<70000,triangles);assert.equal(actor.root.children.length,16);
});
