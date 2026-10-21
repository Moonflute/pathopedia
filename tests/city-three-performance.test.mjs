import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdaptiveQuality,createFramePacer,createThreeLoop,CITY_STEP} from '../src/city-three-performance.mjs';
import {createCityMotion} from '../src/city-three-motion.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {qualityProfile,groundPoint} from '../src/city-three-layout.mjs';
import {createCity,tickCity,serializeCity} from '../src/city-engine.mjs';

function driver(q){
 let now=0;const changes=[];
 return {changes,run(seconds,fps=60,active=true,cost=5){for(let i=0;i<seconds*fps;i++){now+=1000/fps;if(q.sample(now,active))changes.push(q.profile);if(active)q.rendered(cost);}},gap(ms){now+=ms;q.sample(now);}};
}

test('sustained load reduces resolution and shadows before the frame rate; recovery is gradual',()=>{
 const q=createAdaptiveQuality(390,3),d=driver(q);
 assert.equal(q.profile.fps,60);assert.equal(q.profile.dpr,1.35);
 d.run(20,30);assert.deepEqual(d.changes.map(p=>p.level),[1,2,3,4]);
 for(const p of d.changes.slice(0,3))assert.equal(p.fps,60);
 assert.ok(d.changes[0].dpr<1.35);assert.equal(d.changes[0].shadow,512);
 assert.equal(d.changes[1].shadow,256);assert.equal(d.changes[2].shadow,0);assert.equal(q.profile.fps,30);
 d.run(7);assert.equal(q.profile.level,4);
 d.run(12);assert.equal(q.profile.level,3);assert.equal(q.profile.fps,60);
 d.run(65);assert.equal(q.profile.level,0);
});

test('isolated stalls, hidden time and paused/editor views do not lower quality',()=>{
 const q=createAdaptiveQuality(390,3),d=driver(q);
 d.run(4);d.gap(120);d.run(4);d.gap(10000);d.run(4);d.run(30,4,false);d.run(5);
 assert.equal(q.profile.level,0);assert.equal(d.changes.length,0);
 q.resize(1280,3,100000);assert.equal(q.profile.fps,60);assert.equal(q.profile.dpr,1.75);
 for(const width of [390,1280])for(const ratio of [1,2,3])for(let i=0;i<=4;i++){
  const p=qualityProfile(width,ratio,i);assert.ok(p.dpr<=ratio&&p.dpr>=.75);assert.equal(p.maxCells,256);
 }
});

test('60 fps pacing works on 60, 90, 120 and 144 Hz screens without oversampling',()=>{
 for(const hz of [60,90,120,144])for(const target of [30,60]){
  const due=createFramePacer();let count=0;
  for(let i=0;i<hz*10;i++)if(due(i*1000/hz,target))count++;
  assert.ok(Math.abs(count-target*10)<=1,`${hz} Hz / ${target}: ${count}`);
 }
});

test('rendering at different refresh rates leaves simulation at 30 Hz; hidden/stop time never catches up',t=>{
 const saved=new Map(['document','requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 t.after(()=>{for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 let queued;const doc={hidden:false};
 Object.defineProperties(globalThis,{
  document:{configurable:true,value:doc},
  requestAnimationFrame:{configurable:true,value:callback=>{queued=callback;return 1;}},
  cancelAnimationFrame:{configurable:true,value:()=>{queued=null;}}
 });
 for(const hz of [30,60,144]){
  let ticks=0;const fractions=[],loop=createThreeLoop({update:dt=>{assert.equal(dt,CITY_STEP);ticks++;},render:alpha=>fractions.push(alpha)});
  loop.start();for(let i=0;i<=hz;i++)queued(i*1000/hz);
  assert.equal(ticks,30);assert.ok(fractions.every(a=>a>=0&&a<1));
  if(hz>30)assert.ok(fractions.some(a=>a>.2&&a<.8));
  loop.stop();assert.equal(queued,null);
 }
 let ticks=0;const loop=createThreeLoop({update:()=>ticks++,render:()=>{}});
 loop.start();queued(0);queued(16);doc.hidden=true;queued(10000);doc.hidden=false;queued(20000);assert.equal(ticks,0);
 queued(20000+1000/30);assert.equal(ticks,1);loop.stop();loop.start();queued(100000);assert.equal(ticks,1);loop.stop();
});

test('interpolated cells, cargo and pathogens share visual coordinates without changing saved state',()=>{
 const s=createCity('normal','steady',{specialists:true}),profile=qualityProfile(390,3),motion=createCityMotion(profile),actor=createActors(profile);
 const c=s.cells[0],sh={id:1,x:c.x,y:c.y,kind:'food',phase:'delivery'},e={id:1,x:c.x,y:c.y,color:'#b4b18b'};
 s.shipments=[sh];s.enemies=[e];const units=[[c,c.id],[sh,'shipment1'],[e,'enemy1']],old=groundPoint(c);
 motion.capture(s);for(const [u] of units){u.x+=3;u.y+=1;}s.time+=CITY_STEP;
 const end=groundPoint(c),saved=serializeCity(s);
 motion.prepare(s,0);assert.deepEqual(motion.point(c,c.id),old);
 motion.prepare(s,.5);actor.draw(s,{motion,selectedCell:c.id});
 for(const [u,id] of units){const p=motion.point(u,id);assert.ok(Math.abs(p.x-(old.x+end.x)/2)<1e-9);assert.ok(Math.abs(p.z-(old.z+end.z)/2)<1e-9);}
 assert.deepEqual({x:actor.positions[0].x,z:actor.positions[0].z},motion.point(c,c.id));
 assert.ok(Math.abs(motion.time-s.time+CITY_STEP/2)<1e-9);assert.equal(serializeCity(s),saved);
 motion.prepare(s,1);assert.deepEqual(motion.point(c,c.id),end);
 for(const mesh of actor.root.children)assert.ok(mesh.count<=mesh.instanceMatrix.count);
 assert.equal(actor.root.children.length,16);
});

test('pause, new actors, teleports, replaced layouts and restored runs never interpolate stale positions',()=>{
 const s=createCity('normal','steady',{specialists:true}),motion=createCityMotion(qualityProfile(390)),c=s.cells[0];
 const move=()=>{motion.capture(s);s.time+=CITY_STEP;c.x+=3;motion.prepare(s,.25);};
 move();motion.prepare(s,0,true);assert.deepEqual(motion.point(c,c.id),groundPoint(c));
 move();assert.deepEqual(motion.point({...c},c.id),groundPoint(c));
 c.x+=1000;assert.deepEqual(motion.point(c,c.id),groundPoint(c));
 move();s.layout={};motion.prepare(s,0);assert.deepEqual(motion.point(c,c.id),groundPoint(c));
 move();motion.prepare({...s},0);assert.deepEqual(motion.point(c,c.id),groundPoint(c));
});

test('each fixed update captures the previous state even at double speed and during catch-up',()=>{
 const s=createCity('normal','steady',{specialists:true}),motion=createCityMotion(qualityProfile(390)),c=s.cells.find(c=>c.kind==='rbc');
 let previous;
 for(let i=0;i<3;i++){previous=groundPoint(c);motion.capture(s);tickCity(s,CITY_STEP,{});tickCity(s,CITY_STEP,{});}
 motion.prepare(s,.5);const current=groundPoint(c),p=motion.point(c,c.id);
 assert.ok(Math.abs(p.x-(previous.x+current.x)/2)<1e-9);assert.ok(Math.abs(p.z-(previous.z+current.z)/2)<1e-9);
});
