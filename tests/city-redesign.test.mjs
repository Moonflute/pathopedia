import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,compileLayout,cityRoute,applyTileLayout,cloneLayout,validateTileLayout} from '../src/city-tile-layout.mjs';
import {groundPoint} from '../src/city-three-layout.mjs';
import {DISTRICTS} from '../src/city-data.mjs';

test('all organ pairs preserve circulation endpoints and finite traversable segments',()=>{
 const s=createCity('normal','simulation',{specialists:true,expanded:true});assert.ok(applyTileLayout(s,createTileLayout()).ok);
 const network=compileLayout(s.layout);
 for(const a of DISTRICTS)for(const b of DISTRICTS){
  const route=cityRoute(s,a.id,b.id).map(groundPoint);assert.ok(route.length);
  const end=route.at(-1),target=s.layout.items[b.id];assert.ok(Math.hypot(end.x-target.col,end.z-target.row)<1e-7);
  for(const p of route)assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
 }
 assert.equal(network.connections.filter(r=>r.kind==='pulmonary').length,1);
 assert.equal(network.connections.filter(r=>r.kind==='systemic').length,4);
 assert.ok(network.entries.airway.length&&network.entries.gut.length);
});

test('existing version-two saves preserve every user placement and live state',()=>{
 const s=createCity('normal','simulation',{specialists:true,expanded:true});const layout=createTileLayout();layout.revision=19;
 assert.ok(applyTileLayout(s,layout).ok);s.time=137;s.resources.food=73;s.districts.heart.hp=84;
 const before=serializeCity(s),restored=restoreCity(before);assert.ok(restored);
 assert.deepEqual(restored.layout,s.layout);assert.equal(restored.time,137);assert.equal(restored.resources.food,73);assert.equal(restored.districts.heart.hp,84);
 assert.equal(serializeCity(restored),before);assert.ok(validateTileLayout(cloneLayout(restored.layout)));
});
