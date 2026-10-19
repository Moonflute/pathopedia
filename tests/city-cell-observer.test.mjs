import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command} from '../src/city-engine.mjs';
import {cellObservation,createCellObserver,moveFollowCamera} from '../src/city-cell-observer.mjs';
import {workStation} from '../src/city-activity.mjs';

const village=()=>createCity('normal','steady',{specialists:true});
const step=s=>tickCity(s,1/30,{});

test('oxygen observation follows the real loading, delivery and empty return cycle',()=>{
 const s=village(),c=s.cells.find(c=>c.kind==='rbc');s.cells=[c];s.nextWave=Infinity;
 Object.assign(c,{...workStation('lung','oxygen',c.id%3).stand,path:[],step:0,cargo:0,dock:'lung',target:'kidney'});
 assert.equal(cellObservation(s,c).destination,'폐 · 산소 충전대');
 step(s);assert.equal(cellObservation(s,c).cargo,'없음');assert.match(cellObservation(s,c).task,/산소 충전/);
 for(let i=0;i<25;i++)step(s);
 assert.match(cellObservation(s,c).destination,/산소 하역대/);assert.match(cellObservation(s,c).cargo,/O₂ [1-9]/);
 for(let i=0;i<35*30&&c.cargo;i++)step(s);
 assert.equal(c.cargo,0);assert.equal(cellObservation(s,c).destination,'폐 · 산소 충전대');assert.equal(cellObservation(s,c).cargo,'없음');
});

test('antigen carriers show their actual destination; a production recipe is not cargo',()=>{
 const s=village(),d=s.cells.find(c=>c.kind==='dendritic'),p=s.cells.find(c=>c.kind==='plasma'),h=s.cells.find(c=>c.kind==='helperT');
 Object.assign(d,{recordId:'SPN-105',target:'lung'});assert.equal(cellObservation(s,d).destination,'림프절 · 항원 전달');assert.equal(cellObservation(s,d).cargo,'항원 표본');
 p.recordId='SPN-105';assert.equal(cellObservation(s,p).cargo,'없음');assert.equal(cellObservation(s,p).destination,'림프절 · 항체 작업대');
 s.rally='heart';h.recordId='SPN-105';assert.equal(cellObservation(s,h).destination,'심장 · 방어 집결지');assert.equal(cellObservation(s,h).cargo,'항원 정보');
 h.recordId=null;h.target='heart';assert.equal(cellObservation(s,h).destination,'림프절 · 항원 확인');
});

test('construction reports overall completion; combat ignores a stale district target',()=>{
 const s=village(),builder=s.cells.find(c=>c.kind==='fibroblast'),fighter=s.cells.find(c=>c.kind==='neutrophil');
 command(s,'upgrade','heart');s.districts.heart.building.remaining=s.districts.heart.building.duration*.4;
 Object.assign(builder,{task:'시설 건설',buildSite:'heart',activity:{kind:'build',site:'heart',started:0,duration:1,x:575,y:359}});
 s.time=.1;assert.equal(cellObservation(s,builder).task,'시설 건설 · 60%');assert.equal(cellObservation(s,builder).destination,'심장 · 공사장');
 Object.assign(fighter,{task:'감염 대응',target:'kidney',activity:{kind:'shoot',started:0,duration:1,x:878,y:240}});
 assert.equal(cellObservation(s,fighter).destination,'폐 · 교전 지점');
});

test('follow can stop without losing inspection and ends on retirement or a new city',()=>{
 const s=village(),observer=createCellObserver(),a=s.cells[0],b=s.cells[1];observer.resolve(s);
 observer.select(a.id);observer.setFollowing(true);assert.equal(observer.resolve(s),a);assert.equal(observer.following,true);
 observer.setFollowing(false);assert.equal(observer.resolve(s),a);assert.equal(observer.following,false);
 observer.setFollowing(true);observer.select(b.id);assert.equal(observer.resolve(s),b);assert.equal(observer.following,true);
 s.cells=s.cells.filter(c=>c!==b);assert.equal(observer.resolve(s),null);assert.equal(observer.following,false);
 observer.select(a.id);observer.setFollowing(true);assert.equal(observer.resolve(village()),null);assert.equal(observer.id,null);assert.equal(observer.following,false);
 observer.setFollowing(true);assert.equal(observer.following,false);
});

test('follow preserves the orbit offset and has the same easing at both frame caps',()=>{
 const follow=fps=>{const position={x:20,y:32,z:33},target={x:0,y:0,z:0};for(let i=0;i<fps;i++)moveFollowCamera(position,target,{x:-11,z:10},1/fps);return {position,target};};
 const a=follow(30),b=follow(60);
 assert.ok(Math.abs(a.target.x-b.target.x)<1e-10);assert.ok(Math.abs(a.target.z-b.target.z)<1e-10);
 assert.ok(Math.abs(a.position.x-a.target.x-20)<1e-10);assert.ok(Math.abs(a.position.z-a.target.z-33)<1e-10);assert.equal(a.position.y,32);
 assert.ok(Math.hypot(a.target.x+11,a.target.z-10)<.006);
 const position={x:20,y:32,z:33},target={x:0,y:0,z:0};
 for(let i=0;i<120;i++)moveFollowCamera(position,target,{x:999,z:-999},1/30);
 assert.equal(target.x,18);assert.equal(target.z,-19);assert.equal(moveFollowCamera(position,target,{x:999,z:-999},1/30),false);
});

test('supply couriers are selectable, show only cargo on board, and finish observation on departure',()=>{
 const s=village();command(s,'upgrade','heart');const sh=s.shipments.find(x=>x.kind==='materials'),observer=createCellObserver();
 observer.resolve(s);observer.select('shipment'+sh.id);observer.setFollowing(true);assert.equal(observer.resolve(s),sh);
 assert.equal(cellObservation(s,sh).cargo,'없음');assert.equal(cellObservation(s,sh).destination,'장 · 물자 수령대');
 sh.phase='transit';assert.match(cellObservation(s,sh).cargo,/건축 자재/);assert.equal(cellObservation(s,sh).destination,'심장 · 물자 하역대');
 sh.phase='leaving';assert.equal(cellObservation(s,sh).cargo,'없음');assert.equal(cellObservation(s,sh).task,'배송 완료');
 s.shipments=[];assert.equal(observer.resolve(s),null);assert.equal(observer.following,false);
});
