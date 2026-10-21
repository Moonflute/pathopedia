import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {workStation,activeActivity} from '../src/city-activity.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {qualityProfile,groundPoint,groundCoordinate} from '../src/city-three-layout.mjs';
import {DISTRICTS} from '../src/city-data.mjs';

const step=s=>tickCity(s,1/30,{});
const advance=(s,seconds)=>{for(let i=0;i<seconds*30;i++)step(s);};
const village=()=>{const s=createCity('normal','steady',{specialists:true});s.nextWave=Infinity;return s;};
function until(s,predicate,seconds=35){for(let i=0;i<seconds*30;i++){step(s);if(predicate())return;}assert.fail('Expected work transition');}

test('work benches fit arms and cell widths after the ground transform',()=>{
 for(const d of DISTRICTS)for(const role of ['oxygen','produce','fabricate','build','repair','dock'])for(let slot=0;slot<6;slot++){
  const work=workStation(d.id,role,slot),a=groundPoint(work.stand),b=groundPoint(work.target),distance=Math.hypot(a.x-b.x,a.z-b.z);
  assert.ok(distance>=.64&&distance<=1.16,d.id+':'+role);
  const roundTrip=groundCoordinate(a);assert.ok(Math.hypot(roundTrip.x-work.stand.x,roundTrip.y-work.stand.y)<1e-8);
  if(slot<2&&['oxygen','produce','fabricate'].includes(role)){const next=groundPoint(workStation(d.id,role,slot+1).stand);assert.ok(Math.hypot(next.x-a.x,next.z-a.z)>=.79);}
 }
});

test('oxygen and deliveries stop at real docks and transfer only after the handoff',()=>{
 const s=village(),red=s.cells.find(c=>c.kind==='rbc');s.cells=[red];
 Object.assign(red,{...workStation('lung','oxygen',red.id%3).stand,path:[],step:0,cargo:0,dock:'lung'});
 step(s);assert.equal(red.task,'산소 충전');assert.equal(red.cargo,0);
 advance(s,.4);assert.equal(red.cargo,0);advance(s,.4);assert.ok(red.cargo>0);
 command(s,'upgrade','heart');const sh=s.shipments.find(sh=>sh.kind==='materials');
 until(s,()=>sh.activity?.kind==='unload');assert.equal(s.districts.heart.building.remaining,null);
 advance(s,.5);assert.equal(s.districts.heart.building.remaining,null);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);
 advance(s,.5);advance(copy,.5);assert.equal(s.districts.heart.building.remaining,9);assert.equal(sh.phase,'leaving');
 assert.equal(serializeCity(s),serializeCity(copy));
});

test('differentiated plasma cells need nutrition, reserve distinct benches and finish their paid batches',()=>{
 const s=village();s.cells=s.cells.filter(c=>c.kind==='bcell').slice(0,3);for(const c of s.cells)Object.assign(c,{kind:'plasma',licensed:true,recordId:'SPN-105',isotype:'IgG'});s.antigens['SPN-105']=true;s.resources.food=0;s.rawFood=0;s.supplyClock=1e6;s.intakeClock=1e6;s.districts.lymph.food=0;
 advance(s,8);assert.equal(s.stats.antibodyBatches,0);assert.ok(s.cells.every(c=>!activeActivity(c,s.time)));
 advance(s,1);assert.ok(s.cells.every(c=>/영양/.test(c.waitReason)));
 s.districts.lymph.food=10;step(s);assert.equal(s.stats.antibodyBatches,0);assert.ok(s.cells.every(c=>c.activity.kind==='produce'));
 assert.equal(new Set(s.cells.map(c=>c.workSlot)).size,3);
 advance(s,.6);assert.equal(s.stats.antibodyBatches,0);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,.7);advance(copy,.7);
 assert.equal(s.stats.antibodyBatches,3);assert.ok(s.antibodies['SPN-105']>0);assert.equal(serializeCity(s),serializeCity(copy));
});

test('construction waits for materials and a worker; both phagocytes engage at their target',()=>{
 const s=village();command(s,'upgrade','heart');
 until(s,()=>s.cells.some(c=>c.task==='자재 도착 대기'||c.task==='시설 건설'));
 const builder=s.cells.find(c=>c.buildSite==='heart');
 if(s.districts.heart.building.remaining==null)assert.equal(activeActivity(builder,s.time),null);
 until(s,()=>activeActivity(builder,s.time)?.kind==='build');assert.ok(s.districts.heart.building.remaining!=null);
 const target=workStation('heart','build').target;assert.equal(builder.activity.x,target.x);assert.equal(builder.activity.y,target.y);
 const fighters=s.cells.filter(c=>['neutrophil','macrophage'].includes(c.kind));
 for(const kind of ['neutrophil','macrophage']){
  const c=fighters.find(c=>c.kind===kind);s.cells=[c];Object.assign(c,{x:870,y:270,cooldown:0,activity:null});
  s.enemies=[{id:999,recordId:'SPN-105',x:874,y:274,hp:100,maxHp:100,dead:false}];step(s);
  assert.equal(c.activity.kind,'engulf');assert.ok(s.enemies[0].hp<100);assert.ok(c.energy<100);
 }
});

test('work and combat remain in the same 16 bounded actor batches',()=>{
 const s=village(),actors=createActors(qualityProfile(390,3));s.antigens['SPN-105']=true;command(s,'upgrade','heart');command(s,'wave');
 Object.assign(s.cells.find(c=>c.kind==='bcell'),{kind:'plasma',licensed:true,recordId:'SPN-105',isotype:'IgG'});
 const seen=new Set();let peak=0;
 for(let i=0;i<75*30;i++){
  step(s);for(const c of [...s.cells,...s.shipments]){const a=activeActivity(c,s.time);if(a)seen.add(a.kind);}
  if(i%15)continue;
  actors.draw(s,{selectedKind:'fibroblast',readability:1.5});let triangles=0;
  actors.root.traverse(m=>{if(!m.isInstancedMesh)return;assert.ok(m.count<=m.instanceMatrix.count);assert.ok(m.instanceMatrix.array.every(Number.isFinite));triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count;});peak=Math.max(peak,triangles);
 }
 for(const kind of ['load','unload','produce','build','engulf'])assert.ok(seen.has(kind),kind);
 assert.equal(actors.root.children.length,16);assert.ok(peak<90000,peak);
 const bad=JSON.parse(serializeCity(s));bad.cells[0].activity={kind:'load',started:0,duration:0,x:0,y:0,site:'lung'};assert.equal(restoreCity(bad),null);
});
