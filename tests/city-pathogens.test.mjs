import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {PATHOGENS,pathogenDef,pathogenTarget,spreadDestination} from '../src/city-pathogens.mjs';
import {createTileLayout,applyTileLayout,cityDistrict,tissueAt} from '../src/city-tile-layout.mjs';
import {WALLS,TISSUES,SKIN_TISSUES} from '../src/city-frontier-data.mjs';
import {combatDestination} from '../src/city-biology.mjs';
import {infectionFocus} from '../src/city-infection-focus.mjs';
import {cityAlarmPoints} from '../src/city-three-alarms.mjs';
import {tickFrontierEnemy} from '../src/city-frontier.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {createFrontierScene} from '../src/city-three-frontier.mjs';
import {qualityProfile} from '../src/city-three-layout.mjs';
import {biologyPanel,createBiologyControls} from '../src/city-biology-ui.mjs';

const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>createCity('normal','simulation',{specialists:true});
const advance=(s,n)=>{for(let i=0;i<n*20;i++)tickCity(s,.05,data);};
const api={log(){},damage(){}};

test('each skin breach damages its local tissue first and recruits cells to that actual position',()=>{
 const s=city();applyTileLayout(s,createTileLayout());const c=s.cells.find(c=>c.kind==='neutrophil');
 for(const wall of WALLS){
  const e={id:900+wall.id,recordId:'SAU-002',front:'skin',wall:wall.id,entered:true,hp:50,maxHp:50,...wall.inside};
  const target=pathogenTarget(s,e);assert.equal(target.id,SKIN_TISSUES[wall.id].id);Object.assign(e,target.point,{site:target.site});s.enemies=[e];
  const focus=infectionFocus(s,target.site,e.recordId,c),destination=combatDestination(s,c);assert.equal(focus.x,e.x);assert.equal(focus.y,e.y);assert.equal(destination.focusKey,'skin:'+wall.id);assert.equal(destination.x,e.x);
  const before=s.frontier.tissues[target.id].hp;for(let n=0;n<80&&s.frontier.tissues[target.id].hp===before;n++)tickFrontierEnemy(s,e,.2,api);assert.ok(s.frontier.tissues[target.id].hp<before);
  const alarm=cityAlarmPoints(s)[0];assert.equal(alarm.inside,1);assert.match(alarm.text,/침입/);
  s.frontier.tissues[target.id].hp=0;assert.notEqual(pathogenTarget(s,e).id,target.id);s.time++;
 }
});

test('twelve sourced isolates expose supported routes and larger bounded introductions',()=>{
 const s=city();applyTileLayout(s,createTileLayout());
 assert.equal(PATHOGENS.length,12);
 for(const p of PATHOGENS){assert.ok(data.records.some(r=>r.id===p.recordId));assert.ok(p.routes.every(r=>p.focus[r]));assert.ok(p.mechanism);}
 assert.equal(command(s,'expose',{recordId:'SPY-101',front:'gut',amount:3},data).ok,false);
 assert.equal(command(s,'expose',{recordId:'PAE-013',front:'skin',amount:128,wall:11},data).ok,true);
 assert.equal(command(s,'expose',{recordId:'GNX-221',front:'gut',amount:128},data).ok,true);
 assert.equal(command(s,'expose',{recordId:'SPN-105',front:'blood',amount:3},data).ok,false);
 const controls=createBiologyControls();controls.page='exposure';assert.match(biologyPanel(s,data,controls),/256개체/);
 assert.ok(restoreCity(serializeCity(s)));
});

test('soft tissue targets persist and seed the district that actually owns the tissue',()=>{
 const s=city();applyTileLayout(s,createTileLayout());
 const e={recordId:'SPY-101',front:'skin',wall:11,entered:true,...WALLS[11].inside};
 const first=pathogenTarget(s,e);e.attackTarget={kind:first.kind,id:first.id};Object.assign(e,tissueAt(s,TISSUES[(first.id+1)%TISSUES.length]).point);
 assert.equal(pathogenTarget(s,e).id,first.id);
 Object.assign(e,first.point);let seeded=null;
 tickFrontierEnemy(s,e,.1,{...api,seed(s,e,site){seeded=site;}});
 assert.equal(seeded,TISSUES[first.id].district);assert.equal(e.action,'attack');
 s.frontier.tissues[first.id].hp=0;assert.notEqual(pathogenTarget(s,e).id,first.id);
 const respiratory={recordId:'KPN-011',front:'airway',entered:true,...cityDistrict(s,'lung')};
 tickFrontierEnemy(s,respiratory,.1,api);assert.equal(respiratory.attackTarget.id,'lung');assert.ok(s.barrier<100);
});

test('toxin-only gut damage, epithelial invasion, and low oxygen necrosis differ',()=>{
 const toxin=city(),invasive=city();
 for(const [s,recordId] of [[toxin,'CDF-121'],[invasive,'GNX-221']])tickFrontierEnemy(s,{recordId,front:'gut',entered:true,...cityDistrict(s,'gut')},1,api);
 assert.equal(toxin.districts.gut.hp,100);assert.ok(invasive.districts.gut.hp<100);
 const damage=[];
 for(const oxygen of [85,15]){const s=city(),t=SKIN_TISSUES[11];s.districts[t.district].oxygen=oxygen;tickFrontierEnemy(s,{recordId:'CPE-122',front:'skin',wall:11,entered:true,attackTarget:{kind:'tissue',id:t.id},...tissueAt(s,t).point},1,api);damage.push(100-s.frontier.tissues[t.id].hp);}
 assert.ok(damage[1]>damage[0]);
 assert.equal(spreadDestination(toxin,pathogenDef('CDF-121'),'gut'),null);
 assert.equal(spreadDestination(toxin,pathogenDef('KPN-011'),'blood'),'lung');
});

test('balanced policy automatically patches and reconstructs skin with a replacement crew',()=>{
 const s=city();s.frontier.supplyClock=10000;
 command(s,'lab-wound','11',data);advance(s,.2);
 assert.equal(s.policy,'balanced');assert.ok(s.frontier.walls[11].repair);
 let sawPatch=false,sawProgress=false,replaced=false;
 for(let i=0;i<100*20&&s.frontier.walls[11].hp<100;i++){
  tickCity(s,.05,data);sawPatch||=s.cells.some(c=>c.patchWall===11&&c.task==='피부 응급 봉합');
  const w=s.frontier.walls[11];sawProgress||=w.repair?.delivered&&w.hp>25&&w.hp<100;
  const worker=s.cells.find(c=>c.frontJob===11&&c.frontStage==='repair');
  if(worker&&!replaced){s.cells=s.cells.filter(c=>c!==worker);replaced=true;}
 }
 assert.ok(sawPatch);assert.ok(sawProgress);assert.ok(replaced);assert.equal(s.frontier.walls[11].hp,100);assert.equal(s.frontier.walls[11].repair,null);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,1);advance(copy,1);assert.equal(serializeCity(s),serializeCity(copy));
});

test('capsules reduce actual phagocytosis and target antibodies relieve the penalty',()=>{
 const strike=(recordId,antibody=0)=>{
  const s=city(),c=s.cells.find(c=>c.kind==='neutrophil'),p=cityDistrict(s,'lung');s.cells=[c];Object.assign(c,{x:p.x,y:p.y,path:[],step:0});s.antibodies[recordId]=antibody;
  const e={id:900,recordId,front:'airway',entered:true,site:'lung',hp:100,maxHp:100,x:p.x+8,y:p.y};s.enemies=[e];advance(s,.05);return 100-e.hp;
 };
 const capsule=strike('SPN-105');assert.ok(capsule>0);assert.ok(capsule<strike('GNX-225'));assert.ok(strike('SPN-105',100)>capsule);
});

test('reaction glyphs, attack traces and large destruction effects use bounded existing batches',()=>{
 const s=city(),c=s.cells.find(c=>c.kind==='neutrophil'),p=cityDistrict(s,'lung');
 s.cells=[c];Object.assign(c,{x:p.x,y:p.y,path:[],step:0});
 s.enemies=[{id:900,recordId:'SPN-105',front:'airway',entered:true,site:'lung',hp:200,maxHp:200,x:p.x+8,y:p.y}];
 advance(s,.4);assert.equal(c.alertKind,'threat');assert.ok(c.alertUntil>s.time);assert.equal(s.enemies[0].action,'attack');
 const actors=createActors(qualityProfile(390,1));actors.draw(s,{readability:1.5});assert.equal(actors.root.children.length,16);assert.ok(actors.root.getObjectByName('beam').count>=2);
 for(const w of s.frontier.walls){w.hp=0;w.repair=null;}for(const d of Object.values(s.districts))d.hp=0;for(const t of s.frontier.tissues)t.hp=0;
 const frontier=createFrontierScene();frontier.update(s);assert.equal(frontier.root.children.length,7);assert.ok(frontier.root.getObjectByName('frontier-flame').count>36);
 for(const root of [actors.root,frontier.root])root.traverse(m=>{if(!m.isInstancedMesh)return;assert.ok(m.count<=m.instanceMatrix.count,m.name);assert.ok(m.instanceMatrix.array.every(Number.isFinite),m.name);});
 const copy=restoreCity(serializeCity(s));assert.ok(copy);copy.enemies[0].attackTarget={kind:'tissue',id:99};assert.equal(restoreCity(copy),null);
});
