import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout,compileLayout} from '../src/city-tile-layout.mjs';
import {compileThemeLayout} from '../src/city-theme-layout.mjs';
import {CITY_RADIUS} from '../src/city-boundary.mjs';
import {HOME_ORGANS,HOME_SIGNALS,homeSites,homeFootprint} from '../src/city-homeostasis-data.mjs';
import {ensureHomeostasis,tickHomeostasis,tickHomePackets,homeostasisCommand,homeFoodFactor,validateHomeostasis} from '../src/city-homeostasis.mjs';
import {homeTransferPath} from '../src/city-homeostasis-paths.mjs';
import {homeostasisReadout} from '../src/city-homeostasis-ui.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());ensureHomeostasis(s);return s;};
const act=(s,id)=>assert.ok(homeostasisCommand(s,'home-action',id).ok);
function advance(s,seconds,full=false,observe=()=>{}){for(let n=0;n<seconds*10;n++){if(full)tickCity(s,.1,data,'2');else{s.time+=.1;tickHomeostasis(s,.1);for(const o of Object.values(s.homeostasis.organs))o.oxygen=85;}observe(s);}}

test('the larger town preserves its old sites and supplies all annexes on directed blood routes',()=>{
 const layout=createTileLayout(),original=JSON.stringify(layout),compiled=compileLayout(layout);
 assert.equal(CITY_RADIUS,58);assert.ok(compiled.valid);assert.equal(JSON.stringify(layout),original);
 for(const theme of ['1','2']){const v=compileThemeLayout(layout,theme).vascular;
  for(const o of homeSites(layout)){const f=homeFootprint(o);for(const [x,z] of [[f.left,f.top],[f.right,f.top],[f.left,f.bottom],[f.right,f.bottom]])assert.ok(Math.hypot(x,z)<CITY_RADIUS-1,o.id);
   assert.ok(v.navigation.route(v.centres.heart,v.centres[o.id])?.length,o.id+' supply');assert.ok(v.navigation.route(v.centres[o.id],v.centres.heart)?.length,o.id+' return');
  }
  for(const from of ['gut','spleen']){const portal=v.vessels.find(p=>p.id==='vein-'+from);assert.equal(portal.circuit,'portal');assert.deepEqual(portal.points.at(-1),v.centres.liver);}
  for(const [kind,p] of Object.entries(HOME_SIGNALS)){const path=homeTransferPath(layout,theme,p.from,p.to,kind);assert.ok(path.length>0&&Number.isFinite(path.length));}
 }
});

test('a real meal arrives by ship and portal blood, raises insulin, then permits fasting release',()=>{
 const s=city(),h=s.homeostasis;act(s,'meal');let peak=94,insulin=0,stored=72;const phases=new Set();
 advance(s,95,true,()=>{peak=Math.max(peak,h.glucose);insulin=Math.max(insulin,h.effectors.insulin);stored=Math.max(stored,h.glycogen);phases.add(h.loops.digestion.phase);});
 assert.ok(h.digestive.absorbed>10);assert.ok(peak>110);assert.ok(insulin>.5);assert.ok(stored>72);assert.ok(phases.has('sensing')&&phases.has('signaling')&&phases.has('acting')&&phases.has('recovering'));
 act(s,'fast');const reserve=h.glycogen;advance(s,80,true);assert.ok(h.effectors.glucagon>.1);assert.ok(h.glycogen<reserve);assert.ok(h.glucose>65);assert.equal(homeFoodFactor(s),0);
 assert.ok(HOME_ORGANS.every(o=>h.organs[o.id].oxygen>30));
});

test('dehydration waits for ADH delivery, conserves urine and needs water to recover',()=>{
 const s=city(),h=s.homeostasis;act(s,'dehydrate');const water=h.water;
 advance(s,1);assert.equal(h.effectors.adh,0);advance(s,12);assert.ok(h.effectors.adh>.8);assert.ok(h.urine<.008);assert.ok(h.urineConcentration>2);assert.ok(h.water<92);
 act(s,'drink');const before=h.water;tickHomePackets(s,.1);assert.equal(h.water,before);advance(s,12);act(s,'drink');advance(s,12);act(s,'drink');advance(s,55);
 assert.ok(h.water>water+8);assert.ok(h.effectors.adh<.2);assert.ok(Math.abs(h.sodium-140)<4);assert.ok(h.loops.water.cycles>=1);
});

test('exercise increases ventilation and CO2 demand; rest restores acid-base balance',()=>{
 const s=city(),h=s.homeostasis;act(s,'exercise');advance(s,40);assert.ok(h.co2>42);assert.ok(h.ventilation>1.5);assert.ok(h.pulse>95);assert.ok(h.ph<7.4);
 act(s,'rest');advance(s,100);assert.ok(Math.abs(h.co2-40)<2);assert.ok(Math.abs(h.ph-7.4)<.04);assert.ok(h.pulse<85);
});

test('heat and cold recruit distinct effectors with energy and water costs',()=>{
 const hot=city(),cold=city();act(hot,'heat');act(cold,'cold');advance(hot,70);advance(cold,70);
 assert.ok(hot.homeostasis.sweat>.5);assert.ok(hot.homeostasis.skinFlow>1);assert.ok(hot.homeostasis.water<100);assert.ok(hot.homeostasis.temperature<38);
 assert.ok(cold.homeostasis.shiver>.5);assert.ok(cold.homeostasis.skinFlow<1);assert.ok(cold.homeostasis.temperature>36);assert.ok(cold.homeostasis.glycogen<hot.homeostasis.glycogen);
 for(const s of [hot,cold]){act(s,'neutral');advance(s,100);assert.ok(Math.abs(s.homeostasis.temperature-37)<.15);}
});

test('digestive secretions must arrive and thyroid feedback compensates without hiding organ loss',()=>{
 const s=city(),h=s.homeostasis;s.rawFood=20;h.organs.pancreas.function=.4;advance(s,1);assert.ok(h.digestive.enzymes>.9);advance(s,20);assert.ok(h.digestive.enzymes<.5);assert.ok(homeFoodFactor(s)<.5);
 assert.ok(h.packets.some(p=>p.kind==='bile'||p.kind==='enzyme'));
 const thyroid=city();homeostasisCommand(thyroid,'home-function','thyroid');advance(thyroid,100);assert.ok(thyroid.homeostasis.effectors.tsh>1.5);assert.ok(thyroid.homeostasis.thyroid<.85);assert.ok(thyroid.homeostasis.metabolism<1);
 homeostasisCommand(thyroid,'home-function','thyroid');advance(thyroid,150);assert.ok(Math.abs(thyroid.homeostasis.thyroid-1)<.05);
});

test('PTH uses the parathyroid site and restores calcium at a cost to bone reserves',()=>{
 const s=city(),h=s.homeostasis;act(s,'lowcalcium');advance(s,15);assert.ok(h.effectors.pth>.5);assert.equal(HOME_SIGNALS.pth.from,'thyroid');advance(s,85);assert.ok(Math.abs(h.calcium-9.5)<.1);assert.ok(h.boneMineral<99.5);assert.ok(h.loops.calcium.cycles>=1);
});

test('aged red cells physically reach the spleen before iron can support replacement',()=>{
 const s=city(),h=s.homeostasis;act(s,'aging');const ids=s.cells.filter(c=>c.kind==='rbc'&&c.age>=c.life).map(c=>c.id);assert.equal(ids.length,3);
 advance(s,.1,true);assert.equal(h.recycling.retired,0);assert.ok(s.cells.some(c=>ids.includes(c.id)&&c.homeSite==='spleen'&&c.recycling));
 advance(s,75,true);assert.equal(h.recycling.retired,3);assert.equal(h.recycling.processed,3);assert.equal(h.recycling.born,3);assert.ok(ids.every(id=>!s.cells.some(c=>c.id===id)));assert.ok(s.stats.born>=3);
});

test('in-flight homeostasis persists, old saves upgrade, malformed state and event HTML are safe',()=>{
 const s=city();act(s,'dehydrate');advance(s,6,true);const restored=restoreCity(serializeCity(s));assert.ok(restored);assert.deepEqual(restored.homeostasis,s.homeostasis);assert.equal(validateHomeostasis(s),true);
 advance(s,8,true);advance(restored,8,true);assert.deepEqual(restored.homeostasis,s.homeostasis);
 const legacy=JSON.parse(serializeCity(s));delete legacy.homeostasis;assert.ok(restoreCity(legacy)?.homeostasis);
 for(const field of ['sodiumMass','digestive','organs']){const bad=JSON.parse(serializeCity(s));delete bad.homeostasis[field];assert.equal(restoreCity(bad),null);}
 const bad=JSON.parse(serializeCity(s));bad.homeostasis.packets[0].progress=NaN;assert.equal(restoreCity(bad),null);
 s.homeostasis.events.unshift({at:0,loop:'water',site:'kidney',text:'<img src=x onerror=alert(1)>'});assert.ok(!homeostasisReadout(s,'water').includes('<img'));
});
