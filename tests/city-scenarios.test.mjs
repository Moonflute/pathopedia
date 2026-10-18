import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command,restoreCity,serializeCity} from '../src/city-engine.mjs';
import {JOBS,SCENARIOS} from '../src/city-data.mjs';
import {vascularRoute,ROADS} from '../src/city-map.mjs';
const advance=(s,seconds)=>{for(let n=0;n<seconds*20;n++)tickCity(s,.05);};

test('scenario opening conditions distinguish recovery, maintenance and reduced immunity',()=>{
  const recovery=createCity('normal','recovery'),steady=createCity('normal','steady'),fragile=createCity('normal','fragile');
  assert.ok(recovery.enemies.length>0);assert.equal(recovery.districts.lung.hp,45);assert.ok(recovery.waste>30);
  assert.equal(steady.cells.length,40);assert.equal(steady.districts.heart.hp,100);
  assert.equal(fragile.host,'neutropenia');assert.equal(fragile.cells.filter(c=>c.kind==='neutrophil').length,4);
  assert.equal(SCENARIOS.fragile.terrain,'desert');
});

test('maintenance must reach its deadline, and a sustained health breach loses',()=>{
  const s=createCity('normal','steady');s.nextWave=Infinity;s.wave=3;s.time=299;
  advance(s,.5);assert.equal(s.status,'running');advance(s,.6);assert.equal(s.status,'won');
  const failed=createCity('normal','fragile');failed.cells=failed.cells.filter(c=>c.kind!=='fibroblast');
  for(const d of Object.values(failed.districts))d.hp=50;
  advance(failed,14);assert.equal(failed.status,'running');advance(failed,2);assert.equal(failed.status,'lost');
});

test('recovery requires infection clearance and restored districts; timeout is a loss',()=>{
  const s=createCity('normal','recovery');s.wave=3;s.spawn=[];s.enemies=[];s.waste=20;
  for(const d of Object.values(s.districts))d.hp=86;
  advance(s,15.1);assert.equal(s.status,'won');
  const failed=createCity('normal','recovery');failed.time=479.95;advance(failed,.1);assert.equal(failed.status,'lost');
});

test('optional lifetimes retire cells and replace them through the marrow queue',()=>{
  const s=createCity('normal','steady'),c=s.cells.find(c=>c.kind==='neutrophil'),id=c.id;
  c.age=c.life-.02;advance(s,.1);assert.ok(s.cells.some(c=>c.id===id));
  command(s,'lifecycle');advance(s,.1);assert.ok(!s.cells.some(c=>c.id===id));assert.equal(s.stats.retired,1);
  assert.ok(s.recruits.some(r=>r.kind==='neutrophil'&&r.automatic));
  advance(s,10);assert.equal(s.stats.born,1);assert.equal(s.cells.filter(c=>c.kind==='neutrophil').length,8);
});

test('curved supply routes and new scenario state survive save/restore',()=>{
  const s=createCity('normal','fragile');command(s,'lifecycle');command(s,'recruit','rbc');advance(s,12);
  const restored=restoreCity(serializeCity(s));assert.ok(restored);advance(s,3);advance(restored,3);
  assert.equal(serializeCity(s),serializeCity(restored));assert.ok(s.rawFood>0);assert.ok(s.stats.deliveries>0);
  const out=vascularRoute('heart','lung'),back=vascularRoute('lung','heart');assert.ok(out.length>5);assert.notDeepEqual(out,back.toReversed());
  assert.equal(ROADS.filter(r=>r.pulmonary).length,1);assert.equal(Object.values(JOBS).reduce((n,j)=>n+j.cap,0),96);
  assert.equal(restoreCity({...s,scenario:'unknown'}),null);
});
