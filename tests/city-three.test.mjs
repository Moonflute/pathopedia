import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {SITES,groundPoint,CITY_3D_SAVE_KEY,qualityProfile} from '../src/city-three-layout.mjs';
import {DISTRICTS} from '../src/city-data.mjs';
import {createCity,tickCity,command,restoreCity,serializeCity} from '../src/city-engine.mjs';
import {resolveAppRoute} from '../src/app-routing.mjs';

test('3D has a separate route/save and shared simulation anchors meet the new courtyards',()=>{
 assert.deepEqual(resolveAppRoute('#city3d'),{view:'city3d',hash:'#city3d'});
 assert.notEqual(CITY_3D_SAVE_KEY,'pathopedia:cell-city:v1');
 for(const d of DISTRICTS){const p=groundPoint(d);assert.ok(Math.hypot(p.x-SITES[d.id].x,p.z-SITES[d.id].z)<1e-8);}
 // Sector seams must not teleport a walking actor at a shared circulation road.
 const heart=DISTRICTS.find(d=>d.id==='heart');
 for(const d of DISTRICTS)for(const t of [.2,.5,1,1.4]){const p={x:heart.x+(d.x-heart.x)*t,y:heart.y+(d.y-heart.y)*t},a=groundPoint({...p,x:p.x-.001}),b=groundPoint({...p,x:p.x+.001});assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.001);}
});
test('real delivery, building and combat states remain finite in the 3D layout',()=>{
 const s=createCity('normal','steady',{workCrews:true}),data=JSON.parse(readFileSync(new URL('../data/organisms.json',import.meta.url)));let working=false;
 command(s,'upgrade','lung');command(s,'wave');
 for(let i=0;i<3600;i++){
  tickCity(s,1/30,data);
  if(s.cells.some(c=>c.task==='시설 건설'))working=true;
  if(i%30===0)for(const c of [...s.cells,...s.shipments,...s.enemies]){const p=groundPoint(c);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(Math.abs(p.x)<50&&Math.abs(p.z)<50);}
 }
 assert.equal(s.districts.lung.level,2);assert.ok(working);assert.ok(s.stats.deliveries>0);assert.ok(s.stats.defeated>0);assert.equal(restoreCity(serializeCity(s)).workCrews,true);
 const mobile=qualityProfile(390,3);assert.equal(mobile.fps,60);assert.equal(mobile.shadow,512);assert.ok(mobile.dpr<1.5);
});
test('3D construction waits for a living worker as well as materials',()=>{
 const s=createCity('normal','steady',{workCrews:true});s.cells=s.cells.filter(c=>c.kind!=='fibroblast');command(s,'upgrade','heart');
 for(let i=0;i<1500;i++)tickCity(s,1/30,{});
 assert.equal(s.districts.heart.level,1);assert.equal(s.districts.heart.building.remaining,9);
 command(s,'recruit','fibroblast');
 for(let i=0;i<2100;i++)tickCity(s,1/30,{});
 assert.equal(s.districts.heart.level,2);
});
test('all CC0 models and their external texture references ship locally',()=>{
 const root=new URL('../assets/city3d/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('sources.json',root)));
 assert.equal(manifest.kenney.license,'CC0-1.0');
 for(const name of manifest.kenney.models){const url=new URL(`kenney/${name}.glb`,root),b=readFileSync(url);assert.equal(b.readUInt32LE(0),0x46546c67);const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));for(const image of json.images||[])if(image.uri&&!image.uri.startsWith('data:'))assert.ok(existsSync(new URL(image.uri,url)),image.uri);}
});
