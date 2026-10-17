import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,command,drugActivity,cityHealth,serializeCity,restoreCity} from '../src/city-engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
function advance(s,seconds){for(let n=0;n<seconds*20;n++)tickCity(s,.05,data);}

test('construction reserves materials and waits for physical delivery before working',()=>{
  const s=createCity(),before=s.resources.materials;
  assert.equal(command(s,'upgrade','heart').ok,true);
  assert.ok(s.resources.materials<before);
  assert.equal(s.districts.heart.building.remaining,null);
  assert.equal(command(s,'upgrade','heart').ok,false);
  advance(s,1);assert.equal(s.districts.heart.level,1);
  advance(s,25);assert.equal(s.districts.heart.level,2);
  assert.equal(s.districts.heart.building,null);
});

test('oxygen and recruitment arrive through the city and host state slows neutrophil recruitment only',()=>{
  const normal=createCity(),low=createCity('neutropenia');
  assert.equal(normal.cells.filter(c=>c.kind==='neutrophil').length,4);
  assert.equal(low.cells.filter(c=>c.kind==='neutrophil').length,2);
  for(const s of [normal,low])assert.equal(command(s,'recruit','neutrophil').ok,true);
  advance(normal,24);advance(low,24);
  assert.equal(normal.cells.filter(c=>c.kind==='neutrophil').length,5);
  assert.equal(low.cells.filter(c=>c.kind==='neutrophil').length,2);
  assert.ok(normal.stats.oxygen>0);
  advance(low,20);assert.equal(low.cells.filter(c=>c.kind==='neutrophil').length,3);
});

test('drug weapons use fixed isolate evidence and do not turn resistant or missing results into activity',()=>{
  assert.deepEqual(drugActivity(data,'SAU-001','oxacillin'),{category:'S',active:true});
  assert.deepEqual(drugActivity(data,'SAU-002','oxacillin'),{category:'R',active:false});
  assert.deepEqual(drugActivity(data,'SAU-002','vancomycin'),{category:'S',active:true});
  assert.equal(drugActivity(data,'missing','ampicillin').active,false);
  assert.equal(drugActivity({records:[{id:'i',susceptibility:{x:{category:'I'}}}]},'i','x').active,false);
});

test('saving in-flight logistics restores a deterministic continuation and rejects corrupt saves',()=>{
  const s=createCity();command(s,'upgrade','kidney');command(s,'recruit','macrophage');advance(s,3);
  const saved=restoreCity(serializeCity(s));assert.ok(saved);assert.equal(saved.shipments.length,s.shipments.length);
  advance(s,15);advance(saved,15);assert.equal(serializeCity(saved),serializeCity(s));
  assert.equal(restoreCity('{'),null);assert.equal(restoreCity({...s,schema:999}),null);
  assert.equal(restoreCity({...s,resources:{food:NaN,materials:0}}),null);
});

test('a managed city can finish three infections and continue operating; a failed heart ends the run',()=>{
  const s=createCity();command(s,'tower','lung');command(s,'recruit','neutrophil');
  for(let n=0;n<9000&&s.status==='running';n++){
    if(n===2600)command(s,'drug','oxacillin');if(n===4800)command(s,'drug','vancomycin');
    tickCity(s,.05,data);
  }
  assert.equal(s.status,'won');assert.equal(s.stats.defeated,36);assert.ok(cityHealth(s)>30);
  assert.ok(Object.keys(s.antigens).length>0);assert.equal(command(s,'continue').ok,true);
  const time=s.time;advance(s,1);assert.ok(s.time>time);assert.equal(s.status,'running');
  s.districts.heart.hp=0;advance(s,.1);assert.equal(s.status,'lost');
});
