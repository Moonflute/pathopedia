import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,command,tickCity,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {createTileLayout,applyTileLayout,compileLayout} from '../src/city-tile-layout.mjs';
import {organDashboard,cellDashboard,infectionForm,defenseDashboard} from '../src/city-management-ui.mjs';
import {createBiologyControls} from '../src/city-biology-ui.mjs';
import {residentView,ensureResidents,RESIDENT_LIMIT} from '../src/city-residents.mjs';
import {injure} from '../src/city-host-response.mjs';
import {HOME_ORGANS,homeSites} from '../src/city-homeostasis-data.mjs';
import {groundCoordinate} from '../src/city-three-layout.mjs';
import {compileCanalLayout} from '../src/city-canal-layout.mjs';
import {createCellObserver,cellObservation} from '../src/city-cell-observer.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
function city(){const s=createCity('normal','simulation',{specialists:true,expanded:true,workCrews:true});applyTileLayout(s,createTileLayout());s.resources.materials=300;s.resources.food=300;return s;}

test('dashboards include all 15 organs, all cell kinds and three simultaneous barriers',()=>{
 const s=city(),organs=organDashboard(s,'heart'),cells=cellDashboard(s,'rbc'),defense=defenseDashboard(s),form=infectionForm(s,data,createBiologyControls());
 for(const o of HOME_ORGANS)assert.ok(organs.includes(o.name));assert.equal((organs.match(/class="cc-organ-card/g)||[]).length,15);
 assert.ok(!organs.includes('data-city-action="tower"'));assert.ok(cells.includes('체세포'));assert.ok(cells.includes('CD8 T세포'));assert.ok(cells.includes('추가 생산'));
 for(const label of ['피부','호흡기','소화기','실시간 면역 대응'])assert.ok(defense.includes(label));
 assert.ok(form.includes('type="number"'));assert.ok(form.includes('침투 시작'));assert.ok(!form.includes('data-city-action="lab-response"'));
});

test('infection accepts typed integer counts and preserves supported entry routes',()=>{
 const s=city();assert.equal(command(s,'expose',{recordId:'SAU-002',amount:7,front:'skin',wall:8},data).ok,true);assert.equal(s.spawn.length,7);assert.ok(s.spawn.every(p=>p.wall===8));
 for(const amount of [0,-1,1.5,NaN,10000])assert.equal(command(s,'expose',{recordId:'SAU-002',amount,front:'skin',wall:8},data).ok,false);
 assert.equal(command(s,'expose',{recordId:'SAU-002',amount:7,front:'gut'},data).ok,false);
 assert.equal(command(s,'immune-challenge',{type:'virus',site:'lung',front:'airway',amount:7},data).ok,true);assert.equal(s.physiology.virions.length,7);
 assert.ok(restoreCity(serializeCity(s)));
});

test('resident cells stay on dry clear lanes and respond to real tissue injury across saves',()=>{
 const s=city(),save=serializeCity(s),view=residentView(s),town=compileCanalLayout(s.layout),network=compileLayout(s.layout);
 assert.equal(serializeCity(s),save,'rendering resident positions does not write a save');
 assert.ok(view.length>120&&view.length<=RESIDENT_LIMIT);
 for(const id of ['heart','lung','gut','kidney','marrow','lymph',...HOME_ORGANS.map(o=>o.id)])assert.ok(view.filter(c=>c.organ===id).length>=4,id+' has a local community');
 for(const time of [0,6,12,20,27]){s.time=time;for(const c of residentView(s)){assert.equal(town.isWater(c.point),false);assert.equal(network.occupied.has(Math.round(c.point.x)+','+Math.round(c.point.z)),false);}}
 ensureResidents(s);const victim=residentView(s).find(c=>c.organ==='gut');injure(s,'gut','pathogen',30,victim);
 const hurt=residentView(s).find(c=>c.id===victim.id);assert.equal(hurt.dead,true);assert.equal(hurt.health,0);assert.ok(restoreCity(serializeCity(s)));
 const observer=createCellObserver();observer.resolve(s);observer.select(hurt.id);assert.match(cellObservation(s,observer.resolve(s)).condition,/건강/);
 assert.equal(command(s,'resident-recruit','',data).ok,true);for(let n=0;n<200;n++)tickCity(s,.05,data,'2');assert.equal(residentView(s).find(c=>c.id===hurt.id).dead,false);assert.ok(restoreCity(serializeCity(s)));
});

test('outer organ repair is performed by an assigned fibroblast and survives reload',()=>{
 let s=city();const organ=homeSites(s.layout).find(o=>o.id==='liver'),builder=s.cells.find(c=>c.kind==='fibroblast');s.cells=[builder];s.homeostasis.organs.liver.hp=35;
 Object.assign(builder,groundCoordinate({x:organ.x,z:organ.z-.6}),{path:[],step:0,frontJob:null,tissueJob:null,logisticsJob:null,buildSite:null});
 assert.equal(command(s,'organ-work','liver:repair',data).ok,true);tickCity(s,.05,data,'2');assert.equal(s.homeostasis.works[0].worker,builder.id);
 s=restoreCity(serializeCity(s));assert.ok(s);for(let n=0;n<240&&s.homeostasis.works.length;n++)tickCity(s,.05,data,'2');
 assert.equal(s.homeostasis.works.length,0);assert.ok(s.homeostasis.organs.liver.hp>=79);
 assert.equal(command(s,'organ-work','liver:upgrade',data).ok,true);for(let n=0;n<600&&s.homeostasis.works.length;n++)tickCity(s,.05,data,'2');assert.equal(s.homeostasis.organs.liver.level,2);
});

test('pathogen selection uses the live entity and never enables following automatically',()=>{
 const s=city(),e={id:123,recordId:'SAU-002',hp:30,maxHp:60,site:'gut',front:'blood',action:'attack',entered:true,x:600,y:400};s.enemies.push(e);
 const observer=createCellObserver();observer.resolve(s);observer.select('enemy123');const observed=observer.resolve(s),detail=cellObservation(s,observed);
 assert.equal(observer.following,false);assert.match(detail.name,/MRSA/);assert.equal(detail.task,'조직 공격');assert.match(detail.condition,/30.*60/);
 e.hp=12;assert.match(cellObservation(s,observer.resolve(s)).condition,/12/);e.dead=true;assert.equal(observer.resolve(s),null);
});

test('a restored older blood route rejoins the new waterways without losing its cargo',()=>{
 let s=city();const c=s.cells.find(c=>c.kind==='rbc'),target=groundCoordinate({x:18,z:18});s.cells=[c];s.transportTheme='2';Object.assign(c,{cargo:8,target:'kidney',path:[target],step:0,roadPathVersion:2,travelMode:null,dock:null});delete c.vascularRevision;
 s=restoreCity(serializeCity(s));assert.ok(s);const restored=s.cells[0],cargo=restored.cargo;tickCity(s,.05,data,'2');assert.equal(restored.cargo,cargo);assert.equal(restored.vascularRevision,2);assert.ok(restored.path.length>2);assert.equal(restored.roadPathVersion,2);
});
