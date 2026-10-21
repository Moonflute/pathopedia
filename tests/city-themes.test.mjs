import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_THEME_KEY,readCityTheme,storeCityTheme} from '../src/city-theme.mjs';
import {compileCanalLayout,canalFlowPoint} from '../src/city-canal-layout.mjs';
import {createTileLayout,compileLayout,applyTileLayout,cityRoute} from '../src/city-tile-layout.mjs';
import {createCity,serializeCity,restoreCity,tickCity} from '../src/city-engine.mjs';
import {roadNavigator} from '../src/city-grid-path.mjs';
import {compileVascularLayout,vascularWalkingRoute} from '../src/city-vascular-layout.mjs';
import {createVillage} from '../src/city-three-village.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {qualityProfile,groundPoint,groundCoordinate} from '../src/city-three-layout.mjs';

test('theme defaults to the original village and persists independently of game saves',()=>{
 const values=new Map([['pathopedia:cell-city:3d:v1','existing game']]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(readCityTheme(storage),'1');assert.ok(storeCityTheme('2',storage));assert.equal(readCityTheme(storage),'2');
 assert.equal(values.get('pathopedia:cell-city:3d:v1'),'existing game');assert.equal(values.get(CITY_THEME_KEY),'2');
 storeCityTheme('1',storage);assert.equal(readCityTheme(storage),'1');storeCityTheme('unknown',storage);assert.equal(readCityTheme(storage),'1');
 assert.equal(readCityTheme({getItem(){throw Error('blocked');}}),'1');assert.equal(storeCityTheme('2',{setItem(){throw Error('full');}}),false);
});

test('water covers the actual navigation graph including loading bays and perimeter patrols',()=>{
 const layout=createTileLayout(),before=JSON.stringify(layout),network=compileLayout(layout),surface=compileCanalLayout(layout);
 assert.ok(surface.rows.length&&surface.edges.length);assert.equal(surface.flows.length,10);
 for(const points of surface.channels.map(r=>r.points))for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],samples=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*4);
  for(let j=0;j<=samples;j++){const t=samples?j/samples:0,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};assert.ok(surface.isWater(p),'land blocks route '+JSON.stringify(p));}
 }
 for(const flow of surface.flows)for(const progress of [-1.2,0,.5,.999,2.5]){const p=canalFlowPoint(flow,progress);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.angle));}
 assert.equal(JSON.stringify(layout),before);
});

test('one-way vessels require a full circuit instead of reversing on the same edge',()=>{
 const points=[{x:0,z:0},{x:2,z:0},{x:2,z:2},{x:0,z:2},{x:0,z:0}],a={x:.8,z:0},b={x:.2,z:0};
 const length=path=>path.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-path[i].x,p.z-path[i].z),0);
 assert.ok(Math.abs(length(roadNavigator([{points,oneWay:true}]).route(a,b))-7.4)<1e-6);
 assert.ok(Math.abs(length(roadNavigator([points]).route(a,b))-.6)<1e-6);
});

test('organ vessels separate outward/return paths, avoid buildings and close both circuits',()=>{
 const layout=createTileLayout(),v=compileVascularLayout(layout),network=compileLayout(layout);
 for(const vessel of v.vessels){
  assert.equal(vessel.oneWay,true);assert.equal(vessel.oxygenated,vessel.site==='lung'?vessel.kind==='vein':vessel.kind==='artery');
  for(let i=1;i<vessel.points.length;i++){
   const a=vessel.points[i-1],b=vessel.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*12);
   for(let j=0;j<=n;j++)assert.ok(!network.occupied.has(Math.round(a.x+(b.x-a.x)*j/n)+','+Math.round(a.z+(b.z-a.z)*j/n)),vessel.id+' crosses a building');
  }
 }
 for(const id of ['lung','gut','kidney','marrow','lymph']){
  const outward=v.navigation.route(v.centres.heart,v.centres[id]),inward=v.navigation.route(v.centres[id],v.centres.heart);
  assert.ok(outward?.length&&inward?.length);assert.notDeepEqual(outward,[...inward].reverse());
  const artery=v.vessels.find(x=>x.id==='artery-'+id),vein=v.vessels.find(x=>x.id==='vein-'+id);
  assert.deepEqual(artery.points[0],vein.points.at(-1));assert.deepEqual(artery.points.at(-1),vein.points[0]);
 }
 for(const from of Object.values(v.centres))for(const to of Object.values(v.centres)){
  const route=vascularWalkingRoute(layout,groundCoordinate(from),groundCoordinate(to));assert.ok(route.length<=512);
  const end=groundPoint(route.at(-1));assert.ok(Math.hypot(end.x-to.x,end.z-to.z)<1e-5);
 }
});

test('RBCs deliver and return through canal routes across save/resume and theme changes',()=>{
 let s=createCity('normal','simulation',{specialists:true,workCrews:true,expanded:true});applyTileLayout(s,createTileLayout());
 const v=compileVascularLayout(s.layout),rbc=s.cells.find(c=>c.kind==='rbc');s.cells=[rbc];
 Object.assign(rbc,groundCoordinate(v.centres.lung),{cargo:12,target:'kidney',path:cityRoute(s,'lung','kidney'),step:0});
 tickCity(s,.25,null,true);assert.equal(rbc.roadPathVersion,2);
 const before={id:rbc.id,cargo:rbc.cargo,x:rbc.x,y:rbc.y};s=restoreCity(serializeCity(s));assert.ok(s);
 assert.deepEqual({id:s.cells[0].id,cargo:s.cells[0].cargo,x:s.cells[0].x,y:s.cells[0].y},before);
 for(let i=0;i<480;i++)tickCity(s,.25,null,true);
 assert.ok(s.stats.oxygen>=24,'oxygen transfers must still complete');
 const c=s.cells[0],cargo=c.cargo,position={x:c.x,y:c.y};tickCity(s,.01,null,false);
 assert.ok(Math.hypot(c.x-position.x,c.y-position.y)<4,'theme switch must not teleport');assert.equal(c.cargo,cargo);
 assert.ok(restoreCity(serializeCity(s)));
});

test('switching village → canals → village preserves live state and restores walking visuals',()=>{
 const s=createCity('normal','simulation',{specialists:true,workCrews:true,expanded:true});applyTileLayout(s,createTileLayout());s.time=37;s.resources.food=73;
 const before=serializeCity(s),actors=createActors(qualityProfile(1280,1));
 for(const theme of ['1','2','1']){
  const v=createVillage({},s.layout,null,null,theme);v.update(s,{});actors.draw(s,{canals:v.canals});
  assert.equal(v.root.userData.theme,theme);assert.equal(serializeCity(s),before);
  const feet=actors.root.children.find(m=>m.name==='feet');
  const expected=theme==='2'?s.cells.filter(c=>!v.canals.isWater(groundPoint(c))).length*2:s.cells.length*2;
  assert.equal(feet.count,expected);assert.equal(actors.root.children.length,16);
  for(const mesh of actors.root.children)assert.ok(mesh.count<=mesh.instanceMatrix.count);
  v.dispose();
 }
 for(const mesh of actors.root.children){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});
