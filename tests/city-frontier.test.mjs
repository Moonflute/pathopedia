import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createCity,tickCity,command,serializeCity,restoreCity,upgradeVillage} from '../src/city-engine.mjs';
import {WALLS,AIRWAY_PATH} from '../src/city-frontier-data.mjs';
import {tickFrontierEnemy,receiveAntigen} from '../src/city-frontier.mjs';
import {requestWorkplace,releaseWorkplace,workplaceCapacity} from '../src/city-workplaces.mjs';
import {createFrontierScene} from '../src/city-three-frontier.mjs';
import {cellObservation} from '../src/city-cell-observer.mjs';
const step=s=>tickCity(s,1/30,{});
const advance=(s,n)=>{for(let i=0;i<n*30;i++)step(s);};
const city=()=>{const s=createCity('normal','steady',{specialists:true});s.nextWave=999999;s.frontier.woundDone=true;s.frontier.supplyClock=999999;return s;};
const api={log(){},damage(s,e,n){e.hp-=n;if(e.hp<=0)e.dead=true;}};
function until(s,predicate,seconds=80){for(let i=0;i<seconds*30;i++){step(s);if(predicate())return;}assert.fail('Work did not complete: '+JSON.stringify(s.cells.filter(c=>c.kind==='fibroblast').map(c=>({task:c.task,job:c.frontJob,logistics:c.logisticsJob}))));}

test('skin admits enemies only through an open segment; closing intercepts entrants before crossing',()=>{
 const s=city(),w=s.frontier.walls[11],e={id:900,front:'skin',wall:11,hp:100,...WALLS[11].outside};
 for(let i=0;i<30;i++)tickFrontierEnemy(s,e,1/30,api);
 assert.ok(w.hp<100&&w.hp>0);assert.ok(!e.entered);assert.deepEqual({x:e.x,y:e.y},WALLS[11].outside);
 w.hp=0;tickFrontierEnemy(s,e,1/30,api);w.hp=100;
 for(let i=0;i<30;i++)tickFrontierEnemy(s,e,1/30,api);assert.ok(!e.entered);
 w.hp=0;for(let i=0;i<180;i++)tickFrontierEnemy(s,e,1/30,api);assert.equal(e.entered,true);
 const position={x:e.x,y:e.y};w.hp=100;tickFrontierEnemy(s,e,1/30,api);assert.notDeepEqual({x:e.x,y:e.y},WALLS[11].outside);assert.ok(Number.isFinite(position.x));
});

test('repair consumes stock, waits for delivery and a living crew, restores the wall and survives saves',()=>{
 const s=city();s.frontier.walls[11].hp=0;const before=s.resources.materials;
 assert.equal(command(s,'wall-repair','11').ok,true);assert.equal(s.resources.materials,before-8);
 const crew=s.cells.filter(c=>c.kind==='fibroblast');s.cells=s.cells.filter(c=>c.kind!=='fibroblast');
 advance(s,25);assert.ok(s.frontier.walls[11].hp<30,'platelets can patch, but only a builder completes reconstruction');assert.equal(s.frontier.walls[11].repair.remaining,7);assert.equal(s.frontier.walls[11].repair.materials,true);
 s.cells.push(...crew);until(s,()=>s.cells.some(c=>c.frontStage==='field'));
 const worker=s.cells.find(c=>c.frontStage==='field');assert.equal(worker.materialCargo,8);assert.match(cellObservation(s,worker).destination,/피부 12/);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,1);advance(copy,1);assert.equal(serializeCity(s),serializeCity(copy));
 until(s,()=>!s.frontier.walls[11].repair);assert.equal(s.frontier.walls[11].hp,100);
});

test('workplace reservations queue uniquely, grant oldest ticket, and release retired workers',()=>{
 const s=city();s.cells=s.cells.slice(0,5);for(const c of s.cells)requestWorkplace(s,c,'lung','oxygen');
 assert.equal(new Set(s.cells.filter(c=>c.workplace.slot!=null).map(c=>c.workplace.slot)).size,3);
 assert.equal(s.cells[3].workplace.slot,null);assert.match(s.cells[4].waitReason,/대기 2/);
 releaseWorkplace(s.cells[0]);requestWorkplace(s,s.cells[4],'lung','oxygen');assert.notEqual(s.cells[3].workplace.slot,null);assert.equal(s.cells[4].workplace.slot,null);
 s.cells.splice(1,1);requestWorkplace(s,s.cells.at(-1),'lung','oxygen');assert.notEqual(s.cells.at(-1).workplace.slot,null);
 s.frontier.plots.lung=['production'];assert.equal(workplaceCapacity(s,'lung','oxygen'),4);
});

test('respiratory capture expels while gut quarantine trades production for defense',()=>{
 const s=city(),e={id:901,front:'airway',hp:30,...AIRWAY_PATH[2]};tickFrontierEnemy(s,e,1/30,api);assert.ok(e.caughtUntil>s.time);assert.ok(!e.entered);
 for(let i=0;i<500&&!e.dead;i++){s.time+=1/30;tickFrontierEnemy(s,e,1/30,api);}assert.equal(e.dead,true);assert.equal(s.frontier.airway.cleared,1);
 s.resources.food=4;assert.equal(command(s,'airway-clear').ok,true);assert.equal(s.resources.food,0);
 const a=city(),b=structuredClone(a);for(const state of [a,b]){state.intakeClock=999;state.supplyClock=999;state.drugClock=999;state.cells=[];}
 command(b,'gut-quarantine');const starting=a.rawFood;advance(a,1);advance(b,1);assert.ok(Math.abs((starting-b.rawFood)/(starting-a.rawFood)-.55)<.001);
});

test('forward supply needs common workshop crews; expansion consumes two limited plots',()=>{
 const s=city();s.cells=s.cells.filter(c=>c.kind!=='fibroblast');command(s,'front-supply','skin');advance(s,15);
 assert.equal(s.frontier.depots.skin.materials,0);assert.ok(s.shipments.some(sh=>sh.waitReason==='보급 출고 인력 작업 중'));
 const donor=city().cells.filter(c=>c.kind==='fibroblast');s.cells.push(...donor);
 until(s,()=>s.frontier.depots.skin.materials>0);assert.ok(s.stats.deliveries>0);
 s.resources.materials=200;assert.equal(command(s,'invest','lung:production').ok,true);until(s,()=>s.frontier.plots.lung.length===1);
 assert.equal(workplaceCapacity(s,'lung','oxygen'),4);assert.equal(command(s,'invest','lung:barrier').ok,true);until(s,()=>s.frontier.plots.lung.length===2);
 assert.equal(command(s,'invest','lung:sensor').ok,false);assert.equal(s.districts.lung.level,1);
});

test('antigen preparation, debris unloading, recruitment and old saves keep their stages',()=>{
 const s=city();receiveAntigen(s,'SPN-105',api);assert.equal(s.antigens['SPN-105'],undefined);advance(s,2);assert.equal(s.frontier.inbox[0].stage,'반응 준비');advance(s,3);assert.equal(s.antigens['SPN-105'],true);
 s.cells=s.cells.filter(c=>c.kind==='macrophage');s.cells[0].debrisCargo=3;until(s,()=>s.frontier.waste.stock>0);assert.equal(s.cells[0].debrisCargo,0);advance(s,3);assert.ok(s.frontier.waste.processed>0);
 command(s,'recruit','rbc');command(s,'recruit','rbc');step(s);assert.equal(new Set(s.recruits.map(r=>r.bay)).size,2);
 const old=city();delete old.frontier;const copy=restoreCity(serializeCity(old));assert.ok(copy);upgradeVillage(copy);assert.equal(copy.frontier.walls.length,14);
 const bad=JSON.parse(serializeCity(s));bad.districts.lung.building={type:'plot',choice:'unknown',duration:9,remaining:5};assert.equal(restoreCity(bad),null);
});

test('expanded structures and effects fit seven fixed pools and simulation stays bounded',t=>{
 const s=city(),scene=createFrontierScene();s.resources.materials=250;command(s,'skin-wound','11');command(s,'wall-repair','11');command(s,'invest','lung:production');
 const start=performance.now();advance(s,90);const ms=performance.now()-start;assert.equal(s.status,'running');assert.ok(restoreCity(serializeCity(s)));
 for(const d of Object.values(s.districts)){d.level=4;d.hp=40;}for(const w of s.frontier.walls)w.hp=0;for(const x of s.frontier.tissues)x.hp=40;
 scene.update(s);assert.equal(scene.root.children.length,7);let tris=0;
 scene.root.traverse(m=>{if(!m.isInstancedMesh)return;assert.ok(m.count<m.instanceMatrix.count,m.name);assert.ok(m.instanceMatrix.array.every(Number.isFinite));tris+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.count;});assert.ok(tris<15000,tris);
 t.diagnostic('90s simulation '+Math.round(ms)+'ms; frontier '+tris+' triangles / 7 batches');
});

test('unprepared front cargo cannot block materials when every builder is occupied',()=>{
 const s=city();s.resources.materials=300;for(const id of Object.keys(s.districts))command(s,'upgrade',id);step(s);
 assert.equal(s.cells.filter(c=>c.buildSite).length,6);command(s,'front-supply','skin');
 until(s,()=>Object.values(s.districts).every(d=>d.level===2),100);
 until(s,()=>s.frontier.depots.skin.materials>0,60);
 assert.ok(s.shipments.length<=48);
});
