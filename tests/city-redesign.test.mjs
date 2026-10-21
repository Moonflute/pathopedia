import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,compileLayout,cityRoute,applyTileLayout,cloneLayout,validateTileLayout,walkingRoute} from '../src/city-tile-layout.mjs';
import {groundPoint,groundCoordinate} from '../src/city-three-layout.mjs';
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

test('shared streets and worker detours avoid building solids',()=>{
 const l=createTileLayout(),network=compileLayout(l);
 const check=points=>{for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);for(let j=1;j<n;j++){const x=Math.round(a.x+(b.x-a.x)*j/n),z=Math.round(a.z+(b.z-a.z)*j/n);assert.ok(!network.occupied.has(x+','+z),'blocked '+x+','+z);}}};
 for(const c of network.connections)check(c.points);
 for(const [from,to] of [[[-9,0],[4,0]],[[-30,-17],[3,12]],[[3,24],[20,10]]]){
  const a={x:from[0],z:from[1]},b={x:to[0],z:to[1]},route=walkingRoute(l,groundCoordinate(a),[groundCoordinate(b)]).map(groundPoint);
  assert.ok(route.length>1);check([a,...route]);assert.ok(Math.hypot(route.at(-1).x-b.x,route.at(-1).z-b.z)<1e-6);
 }
 const separate=network.connections.reduce((sum,c)=>sum+c.points.slice(1).reduce((n,p,i)=>n+Math.abs(p.x-c.points[i].x)+Math.abs(p.z-c.points[i].z),0),0);
 assert.ok(network.streets.edges<separate*.8,'shared routes must not be paved repeatedly');
});

test('existing version-two saves preserve every user placement and live state',()=>{
 const s=createCity('normal','simulation',{specialists:true,expanded:true});const layout=createTileLayout();layout.revision=19;
 assert.ok(applyTileLayout(s,layout).ok);s.time=137;s.resources.food=73;s.districts.heart.hp=84;
 const before=serializeCity(s),restored=restoreCity(before);assert.ok(restored);
 assert.deepEqual(restored.layout,s.layout);assert.equal(restored.time,137);assert.equal(restored.resources.food,73);assert.equal(restored.districts.heart.hp,84);
 assert.equal(serializeCity(restored),before);assert.ok(validateTileLayout(cloneLayout(restored.layout)));
});
