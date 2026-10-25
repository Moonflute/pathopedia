import {residentView} from '../src/city-residents.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_THEME_KEY,readCityTheme,storeCityTheme} from '../src/city-theme.mjs';
import {compileCanalLayout,canalFlowPoint} from '../src/city-canal-layout.mjs';
import {createTileLayout,compileLayout,applyTileLayout,cityRoute,addLayoutBuilding} from '../src/city-tile-layout.mjs';
import {createCity,serializeCity,restoreCity,tickCity} from '../src/city-engine.mjs';
import {roadNavigator} from '../src/city-grid-path.mjs';
import {compileVascularLayout,vascularWalkingRoute} from '../src/city-vascular-layout.mjs';
import {createVillage} from '../src/city-three-village.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {qualityProfile,groundPoint,groundCoordinate} from '../src/city-three-layout.mjs';
import {compileThemeLayout} from '../src/city-theme-layout.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';

test('theme defaults to the original village and persists independently of game saves',()=>{
 const values=new Map([['pathopedia:cell-city:3d:v1','existing game']]),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 assert.equal(readCityTheme(storage),'1');assert.ok(storeCityTheme('2',storage));assert.equal(readCityTheme(storage),'2');
 assert.equal(values.get('pathopedia:cell-city:3d:v1'),'existing game');assert.equal(values.get(CITY_THEME_KEY),'2');
 storeCityTheme('1',storage);assert.equal(readCityTheme(storage),'1');storeCityTheme('unknown',storage);assert.equal(readCityTheme(storage),'1');
 assert.equal(readCityTheme({getItem(){throw Error('blocked');}}),'1');assert.equal(storeCityTheme('2',{setItem(){throw Error('full');}}),false);
});

test('water covers the blood network while the skin patrol keeps a separate dry route',()=>{
 const layout=createTileLayout(),before=JSON.stringify(layout),network=compileLayout(layout),surface=compileCanalLayout(layout);
 assert.ok(surface.rows.length&&surface.edges.length);assert.equal(surface.flows.length,compileVascularLayout(layout).vessels.length);assert.ok(surface.patrol.length>=14);assert.ok(surface.patrol.every(r=>!surface.channels.includes(r)));
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

test('waterfront blocks leave traffic and real building expansion clear',()=>{
 const layout=createTileLayout(),expanded=addLayoutBuilding(layout,'house');assert.ok(expanded.ok);
 for(const town of [layout,expanded.layout]){
  const snapshot=JSON.stringify(town),c=compileCanalLayout(town),network=compileLayout(town);
  // Wider circulation changes the amount of free infill; its physical safety is invariant.
  assert.ok(c.blocks.frontages.length>=4);assert.ok(c.blocks.gardens.length>=6);assert.ok(c.blocks.tissues.length>0&&c.blocks.tissues.length<=300);assert.ok(c.blocks.lung.length>=3);
  for(const b of [...c.blocks.frontages,...c.blocks.gardens,...c.blocks.tissues.map(p=>({...p,w:1.35,d:1.35})),...c.blocks.lung.map(p=>({...p,w:2.6,d:2.8}))]){
   const vertical=Math.abs(Math.sin(b.angle||0))>.5,w=b.w||3.5,d=b.d||3.5,hx=(vertical?d:w)/2,hz=(vertical?w:d)/2;
   for(let x=b.x-hx;x<=b.x+hx;x+=.25)for(let z=b.z-hz;z<=b.z+hz;z+=.25){
    assert.equal(c.isWater({x,z}),false,'infill covers water');
    assert.equal(network.occupied.has(Math.round(x)+','+Math.round(z)),false,'infill covers a playable building');
    assert.equal(network.roadCells.has(Math.round(x)+','+Math.round(z)),false,'infill covers a transport route');
   }
  }
  assert.equal(JSON.stringify(town),snapshot);
 }
});

test('district courts and shared lanes stay dry, open and stable after expansion',()=>{
 const base=createTileLayout(),expanded=addLayoutBuilding(base,'house','heart');assert.ok(expanded.ok);
 for(const layout of [base,expanded.layout]){
  const source=JSON.stringify(layout),town=compileCanalLayout(layout),network=compileLayout(layout),b=town.blocks;
  assert.deepEqual(b.gardens.filter(p=>!['orchard','grove'].includes(p.kind)).map(p=>p.kind),['market','wind','harvest','water','workshop','cloister']);
  assert.ok(b.walks.some(p=>p.kind==='promenade'));assert.ok(b.walks.some(p=>!p.kind));
  assert.ok(b.tissues.some(p=>p.angle===Math.PI),'opposite homes face the shared lane');
  const buildings=new Set(b.frontages.flatMap(p=>p.cells));
  for(const walk of b.walks)for(let i=1;i<walk.points.length;i++){
   const a=walk.points[i-1],c=walk.points[i],steps=Math.ceil(Math.hypot(c.x-a.x,c.z-a.z)*8);
   for(let n=0;n<=steps;n++){
    const p={x:a.x+(c.x-a.x)*n/steps,z:a.z+(c.z-a.z)*n/steps};
    assert.equal(town.isWater(p),false,'no decorative bridge across a blood channel');
    assert.equal(network.occupied.has(Math.round(p.x)+','+Math.round(p.z)),false,'keep playable footprints clear');
    assert.equal(buildings.has(Math.floor(p.x*2)+','+Math.floor(p.z*2)),false,'front door approach stays outside houses');
   }
  }
  assert.equal(JSON.stringify(layout),source);
 }
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
  if(id==='lung')assert.deepEqual(artery.points[0],vein.points.at(-1));
  else {assert.ok(v.systemic.arterial.gates.some(p=>p.x===artery.points[0].x&&p.z===artery.points[0].z));if(id==='gut')assert.deepEqual(vein.points.at(-1),v.centres.liver);else assert.ok(v.systemic.venous.gates.some(p=>p.x===vein.points.at(-1).x&&p.z===vein.points.at(-1).z));}
  assert.deepEqual(artery.points.at(-1),vein.points[0]);
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
  const world=pilotWorld(s.layout,theme);
  for(const court of v.root.userData.themePlan.blocks.gardens.filter(p=>p.kind!=='grove')){
   for(const [dx,dz] of [[0,0],[-court.w/2+.3,0],[court.w/2-.3,0],[0,-court.d/2+.3],[0,court.d/2-.3]])assert.ok(world.canStand({x:court.x+dx,z:court.z+dz}),'public court cross stays walkable');
  }
  const feet=actors.root.children.find(m=>m.name==='feet');
  const expected=(theme==='2'?s.cells.filter(c=>!v.canals.isWater(groundPoint(c))).length:s.cells.length)*2+residentView(s).filter(c=>!c.dead).length*2;
  assert.equal(feet.count,expected);assert.equal(actors.root.children.length,16);
  for(const mesh of actors.root.children)assert.ok(mesh.count<=mesh.instanceMatrix.count);
  v.dispose();
 }
 for(const mesh of actors.root.children){mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}
});

test('both presentations keep the saved canal town and all scenery anchors',()=>{
 const original=createTileLayout(),added=addLayoutBuilding(original,'house','heart');assert.ok(added.ok);
 for(const layout of [original,added.layout]){
  const saved=JSON.stringify(layout),water=compileThemeLayout(layout,'2'),plain=compileThemeLayout(layout,'1');
  assert.equal(plain.blocks,water.blocks);assert.equal(plain.outlet,water.outlet);assert.equal(plain.entries,water.entries);
  assert.deepEqual(plain.objects.map(o=>o.role),water.objects.map(o=>o.role));
  assert.equal(plain.objects.find(o=>o.role==='freight').model,'supply-wagon');
  assert.equal(water.objects.find(o=>o.role==='freight').model,'harbour-boat');
  assert.equal(JSON.stringify(layout),saved);assert.equal(compileThemeLayout(layout,'1'),plain);
 }
});

test('plain boulevards form square circuits and yield to the shared town buildings',()=>{
 const layout=createTileLayout(),plain=compileThemeLayout(layout,'1'),water=compileThemeLayout(layout,'2'),occupied=compileLayout(layout).occupied;
 const ring=plain.vascular.systemic.arterial;
 assert.ok(Math.abs(ring.gates[9].x+ring.gates[9].z)<1e-6,'upper-right corner is square');
 assert.ok(Math.abs(water.vascular.systemic.arterial.gates[0].z-ring.gates[0].z)>4,'canal circuit retains its circle between the square corners');
 let aligned=0,total=0;
 for(let i=1;i<ring.points.length;i++){const a=ring.points[i-1],b=ring.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);total+=length;if(Math.abs(a.x-b.x)<1e-6||Math.abs(a.z-b.z)<1e-6)aligned+=length;}
 assert.ok(aligned/total>.9,'boulevard mostly follows the rectangular grid');
 for(const vessel of plain.vascular.vessels)for(let i=1;i<vessel.points.length;i++){
  const a=vessel.points[i-1],b=vessel.points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*8));
  for(let j=0;j<=n;j++){const key=Math.round(a.x+(b.x-a.x)*j/n)+','+Math.round(a.z+(b.z-a.z)*j/n);assert.ok(!occupied.has(key)&&!plain.obstacles.has(key),vessel.id+' crosses the shared town');}
 }
 for(const id of ['lung','gut','kidney','marrow','lymph'])assert.ok(plain.vascular.navigation.route(plain.vascular.centres.heart,plain.vascular.centres[id])?.length);
});

test('changing circular canals to square roads keeps transport cargo and saved placements',()=>{
 let s=createCity('normal','simulation',{specialists:true,workCrews:true,expanded:true});applyTileLayout(s,createTileLayout());
 const cityLayout=JSON.stringify(s.layout),c=s.cells.find(c=>c.kind==='rbc'),centre=compileThemeLayout(s.layout,'2').vascular.centres;
 s.cells=[c];Object.assign(c,groundCoordinate(centre.lung),{cargo:12,target:'kidney',dock:null,path:cityRoute(s,'lung','kidney'),step:0});
 for(const theme of ['2','1','2','1']){const before={x:c.x,y:c.y,cargo:c.cargo};tickCity(s,.01,null,theme);assert.equal(c.id,s.cells[0].id);assert.equal(c.cargo,before.cargo);assert.ok(Math.hypot(c.x-before.x,c.y-before.y)<4,'switch must not teleport');assert.equal(JSON.stringify(s.layout),cityLayout);}
 for(let n=0;n<480;n++)tickCity(s,.25,null,'1');assert.ok(s.stats.oxygen>=12,'the square circuit completes delivery');
 const saved=serializeCity(s);s=restoreCity(saved);assert.ok(s);assert.equal(serializeCity(s),saved);
});
