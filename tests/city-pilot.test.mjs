import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,serializeCity,restoreCity,pilotCellAction} from '../src/city-engine.mjs';
import {applyTileLayout,createTileLayout,siteAt,compileLayout} from '../src/city-tile-layout.mjs';
import {groundCoordinate,groundPoint} from '../src/city-three-layout.mjs';
import {createCityPilot} from '../src/city-pilot.mjs';
import {pilotWorld} from '../src/city-pilot-world.mjs';
import {pilotedCell,pilotInventory,PILOT_TOOLS} from '../src/city-pilot-state.mjs';
import {pilotJobs} from '../src/city-pilot-tasks.mjs';
import {pilotSites} from '../src/city-pilot-sites.mjs';
import {CITY_RADIUS} from '../src/city-boundary.mjs';
import {WALLS,TISSUES} from '../src/city-frontier-data.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());return s;};
const d=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function hold(p,seconds){for(let t=0;t<seconds;t+=.05){p.run.time+=.05;p.step(.05,{use:true});}}
function face(p,point){for(let i=0;i<16;i++){const v=p.view(),angle=Math.atan2(point.x-v.position.x,-(point.z-v.position.z)),delta=Math.atan2(Math.sin(angle-v.yaw),Math.cos(angle-v.yaw));if(Math.abs(delta)<.001)return;p.look(delta/.0025,0);}}
function aim(p,point,height=.5){face(p,point);for(let i=0;i<5;i++){const v=p.view(),pitch=Math.atan2(height-v.eye,d(v.position,point));if(Math.abs(pitch-v.pitch)<.001)return;p.look(0,(v.pitch-pitch)/.0025);}}
function travel(p,goal){
 for(const point of p.world.route(p.view().position,goal,'neutrophil')){
  let steps=0;while(d(p.view().position,point)>.09&&steps++<1800){face(p,point);p.run.time+=.02;p.step(.02,{forward:Math.min(1,d(p.view().position,point)*2)});}
  assert.ok(steps<1800,'manual movement reaches a route corner');for(let i=0;i<20;i++)p.step(.02);
 }
}
for(const theme of ['2','1']){
 test('theme '+theme+': chosen spawn is exact and preserves the cell and its carried supplies',()=>{
  const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='rbc'),world=pilotWorld(s.layout,theme),spawn=world.safe(siteAt(s.layout,'lung'),'neutrophil');
  const kind=c.kind,cargo=structuredClone(c.cargo),count=s.cells.length;pilotInventory(s).oxygen=12;
  assert.ok(p.start(s,{theme,preferred:c.id,spawn}));assert.equal(p.cell,c);assert.ok(d(p.view().position,spawn)<1e-9);assert.ok(d(groundPoint(c),spawn)<1e-9);
  assert.equal(s.cells.length,count);assert.equal(c.kind,kind);assert.deepEqual(c.cargo,cargo);assert.equal(p.view().inventory.oxygen,12);p.stop();assert.equal(pilotedCell(s),null);
 });
 test('theme '+theme+': blocked and invalid spawn points cannot take over or move a cell',()=>{
  const s=city(),p=createCityPilot(),[key]=compileLayout(s.layout).occupied.keys(),[x,z]=key.split(',').map(Number),before=serializeCity(s);
  for(const spawn of [{x,z},{x:CITY_RADIUS+1,z:0},{x:NaN,z:0},{x:0,z:Infinity},{}]){assert.equal(p.start(s,{theme,spawn}),false);assert.equal(p.active,false);assert.equal(pilotedCell(s),null);assert.equal(serializeCity(s),before);}
  assert.ok(p.start(s,{theme}));const cell=p.cell,position=p.view().position;assert.equal(p.start(s,{theme,spawn:{x,z}}),false);assert.equal(p.cell,cell);assert.deepEqual(p.view().position,position);p.stop();
 });
 test('theme '+theme+': one explorer owns an existing cell and returns it to AI',()=>{
  const s=city(),p=createCityPilot(),count=s.cells.length;assert.ok(p.start(s,{theme}));const c=p.cell,origin=groundPoint(c);tickCity(s,.05,data,theme);
  assert.ok(d(groundPoint(c),origin)<1e-6);assert.equal(s.cells.length,count);assert.equal(pilotedCell(s),c);
  const restored=restoreCity(serializeCity(s));assert.ok(restored);assert.equal(pilotedCell(restored),null);
  p.step(.05,{forward:1});assert.ok(d(groundPoint(c),origin)>.01);p.stop();assert.equal(pilotedCell(s),null);assert.ok(c.path.length);
 });
 test('theme '+theme+': all oxygen destinations have a traversable route; structures block movement',()=>{
  const s=city(),world=pilotWorld(s.layout,theme),lung=siteAt(s.layout,'lung');
  for(const id of ['heart','gut','kidney','marrow','lymph']){const goal=siteAt(s.layout,id),path=world.route(lung,goal,'neutrophil');assert.ok(path.length>1,id+' reachable');assert.ok(d(path.at(-1),goal)<1);
   for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.ceil(d(a,b)*8);for(let j=0;j<=n;j++)assert.ok(world.canStand({x:a.x+(b.x-a.x)*j/n,z:a.z+(b.z-a.z)*j/n}),id+' path blocked');}
  }
  const [key]=compileLayout(s.layout).occupied.keys(),[x,z]=key.split(',').map(Number);assert.equal(world.canStand({x,z}),false);assert.equal(world.canStand({x:CITY_RADIUS+1,z:0}),false);
 });
 test('theme '+theme+': same neutrophil carries oxygen, switches tools, walks and unloads once',()=>{
  const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'lung')));const originalCargo=c.cargo;s.districts.heart.oxygen=20;
  assert.ok(p.start(s,{preferred:c.id,theme}));p.equip('oxygen');p.chooseDestination('heart');aim(p,p.objective().target,.72);hold(p,1);const cargo=pilotInventory(s).oxygen;assert.ok(cargo>0);
  const position=p.view().position;p.equip('engulf');assert.equal(p.cell,c);assert.deepEqual(p.view().position,position);assert.equal(pilotInventory(s).oxygen,cargo);assert.equal(c.cargo,originalCargo);
  p.equip('oxygen');travel(p,pilotJobs(s,'oxygen').find(j=>j.id==='heart'));aim(p,p.objective().target,.72);const before=s.stats.oxygen;hold(p,1);assert.equal(pilotInventory(s).oxygen,0);assert.equal(s.districts.heart.oxygen,20+cargo);assert.equal(s.stats.oxygen,before+cargo);
  for(let i=0;i<30;i++)p.step(.05,{use:true});assert.equal(s.stats.oxygen,before+cargo);assert.equal(p.view().deliveries,1);assert.ok(restoreCity(serializeCity(s)));p.stop();
 });
}
test('combat tool works on an RBC without changing its identity or autonomous cargo',()=>{
 const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='rbc');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'heart')));const cargo=c.cargo;assert.ok(p.start(s,{preferred:c.id}));
 const point={x:p.view().position.x+1,z:p.view().position.z},enemy={id:++s.serial,...groundCoordinate(point),recordId:'SAU-001',hp:1,maxHp:34,entered:true,front:'blood',site:'heart',dead:false};s.enemies=[enemy];face(p,point);
 assert.equal(p.view().aim,enemy);const defeated=s.stats.defeated;p.step(.05,{use:true});assert.equal(enemy.dead,true);assert.equal(s.stats.defeated,defeated+1);assert.equal(s.debris.length,1);assert.equal(c.kind,'rbc');assert.equal(c.cargo,cargo);
 const second={...enemy,id:++s.serial,hp:34,dead:false};s.enemies=[second];p.step(.05,{use:true});assert.equal(second.hp,34,'attack cooldown prevents repeat');
 const building=siteAt(s.layout,'heart').building;assert.equal(p.world.clear({x:building[0]-4,z:building[1]},{x:building[0]+4,z:building[1]}),false);p.stop();assert.equal(pilotedCell(s),null);
});
test('smooth movement interpolates, sprints, decelerates and lowers the crouched camera',()=>{
 const s=city(),p=createCityPilot(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,groundCoordinate(siteAt(s.layout,'heart')));assert.ok(p.start(s));
 const open=p.world.safe(p.view().position,'neutrophil',q=>Array.from({length:25},(_,i)=>({x:q.x,z:q.z-i*.25})).every(v=>p.world.canStand(v)));assert.ok(open,'fixture has six metres of clear ground');Object.assign(c,groundCoordinate(open));p.resetMotion();face(p,{x:open.x,z:open.z-10});
 const start=p.view().position;p.step(.02,{forward:1});const first=p.view(),mid=p.view(.5);assert.ok(first.speed>0&&first.speed<4.2);assert.ok(d(mid.position,start)>0&&d(mid.position,start)<d(first.position,start));
 for(let i=0;i<12;i++)p.step(.02,{forward:1});const walk=p.view().speed;for(let i=0;i<12;i++)p.step(.02,{forward:1,sprint:true});assert.ok(p.view().speed>walk+1);assert.ok(p.view().sprinting);
 const fast=p.view().speed;p.step(.02);assert.ok(p.view().speed>0&&p.view().speed<fast);for(let i=0;i<20;i++)p.step(.02);assert.ok(p.view().speed<.01);
 const eye=p.view().eye;for(let i=0;i<20;i++)p.step(.02,{crouch:true});assert.ok(p.view().crouching);assert.ok(p.view().eye<eye-.2);p.step(.02,{forward:1,crouch:true,sprint:true});assert.equal(p.view().sprinting,false);assert.ok(p.view().speed<1.75);
 p.stop();
});
test('jump raises the camera, lands once while held, and works again after release',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s));const eye=p.view().eye;p.step(.05,{jump:true});assert.ok(p.view().airborne);assert.ok(p.view().eye>eye);assert.ok(p.view(.5).eye>eye&&p.view(.5).eye<p.view().eye);
 for(let i=0;i<30;i++)p.step(.05,{jump:true});assert.equal(p.view().airborne,false);assert.equal(p.view().eye,eye);p.step(.05);p.step(.05,{jump:true});assert.ok(p.view().airborne);p.stop();
});
test('inventory survives saving, reentry and theme changes; missing cells safely release control',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s));const c=p.cell;p.equip('oxygen');pilotInventory(s).oxygen=12;p.chooseDestination('kidney');p.setTheme('1');assert.equal(p.cell,c);assert.ok(p.world.canStand(p.view().position));p.stop();
 const restored=restoreCity(serializeCity(s));assert.deepEqual(pilotInventory(restored),{tool:'oxygen',oxygen:12,target:'kidney',nutrient:0,debris:0,antigen:null,fuel:100});assert.ok(p.start(restored,{theme:'1'}));assert.equal(p.view().inventory.oxygen,12);
 restored.cells=restored.cells.filter(x=>x!==p.cell);p.step(.05,{forward:1});assert.equal(p.active,false);assert.equal(pilotedCell(restored),null);
 const bad=JSON.parse(serializeCity(s));bad.pilotInventory.oxygen=-1;assert.equal(restoreCity(JSON.stringify(bad)),null);
});
test('all tools wrap, Q restores the previous tool, and held use cannot spill into a new tool',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s));const c=p.cell,kind=c.kind;
 for(const tool of PILOT_TOOLS){p.equip(tool.id);assert.equal(p.cell,c);assert.equal(c.kind,kind);}
 p.cycle();assert.equal(p.view().tool.id,'engulf');p.cycle(-1);assert.equal(p.view().tool.id,PILOT_TOOLS.at(-1).id);p.previous();assert.equal(p.view().tool.id,'engulf');p.previous();assert.equal(p.view().tool.id,PILOT_TOOLS.at(-1).id);
 Object.assign(c,groundCoordinate(siteAt(s.layout,'heart')));p.resetMotion();p.equip('engulf');p.step(.05,{use:true});s.districts.heart.hp=50;
 p.equip('repair');aim(p,pilotJobs(s,'repair').find(j=>j.id==='heart').target);hold(p,2);assert.equal(s.districts.heart.hp,50);p.step(.05);hold(p,1.3);assert.equal(s.districts.heart.hp,58);p.stop();
});
for(const theme of ['2','1'])test('theme '+theme+': supply, repairs, cleanup, patching, antigen and support affect the real city',()=>{
 const s=city(),p=createCityPilot();assert.ok(p.start(s,{theme}));const i=pilotInventory(s),c=p.cell;
 const act=(tool,id)=>{p.equip(tool);const job=pilotJobs(s,tool).find(j=>j.id===id);assert.ok(job,tool+' target');Object.assign(c,groundCoordinate(job));p.resetMotion();s.time+=7;return pilotCellAction(s,tool,id);};
 const food=s.resources.food;assert.ok(act('nutrient','gut').ok);assert.equal(s.resources.food,food-20);assert.equal(i.nutrient,20);
 s.districts.heart.food=38;assert.ok(act('nutrient','heart').ok);assert.equal(i.nutrient,18);assert.equal(s.districts.heart.food,40);
 s.districts.heart.hp=96;const materials=s.resources.materials;assert.ok(act('repair','heart').ok);assert.equal(s.districts.heart.hp,100);assert.equal(s.resources.materials,materials-1);
 s.frontier.tissues[0].hp=40;assert.ok(act('repair','tissue:'+TISSUES[0].id).ok);assert.equal(s.frontier.tissues[0].hp,48);
 s.debris=[{id:++s.serial,...groundCoordinate(siteAt(s.layout,'heart')),recordId:'SAU-001'}];const debris=s.debris[0],waste=s.waste;
 assert.ok(act('cleanup','debris:'+debris.id).ok);assert.equal(s.debris.length,0);assert.equal(i.debris,1);assert.equal(s.waste,waste,'kidney handles waste after unloading');
 assert.equal(pilotCellAction(s,'cleanup','debris:'+debris.id).ok,false);assert.ok(act('cleanup','kidney').ok);assert.equal(i.debris,0);assert.equal(s.frontier.waste.stock,1);
 s.frontier.walls[0].hp=0;assert.ok(act('patch','wall:'+WALLS[0].id).ok);assert.equal(s.frontier.walls[0].hp,12);act('patch','wall:'+WALLS[0].id);act('patch','wall:'+WALLS[0].id);assert.equal(s.frontier.walls[0].hp,25);
 s.debris=[{id:++s.serial,...groundCoordinate(siteAt(s.layout,'heart')),recordId:'SAU-001'}];assert.ok(act('antigen','debris:'+s.debris[0].id).ok);assert.equal(i.antigen,'SAU-001');assert.ok(act('antigen','lymph').ok);assert.equal(i.antigen,null);assert.equal(s.frontier.inbox.filter(x=>x.recordId==='SAU-001').length,1);
 assert.equal(pilotJobs(s,'antigen').length,0,'no duplicate antigen collection');
 const energy=c.energy;assert.ok(act('signal','heart').ok);assert.equal(c.energy,energy-10);assert.equal(s.rally,'heart');assert.equal(s.districts.heart.supportUntil,s.time+15);
 p.equip('repair');p.equip('signal');assert.equal(pilotCellAction(s,'signal','heart').ok,false,'switching cannot reset the support cooldown');
 const state=JSON.stringify({districts:s.districts,resources:s.resources});const result=act('scanner','heart');assert.ok(result.ok);assert.match(result.text,/HP 100/);assert.equal(JSON.stringify({districts:s.districts,resources:s.resources}),state);
 assert.ok(restoreCity(serializeCity(s)),'all tool state is saveable');p.stop();
});
test('unaffordable or remote jobs cannot grant free resources; old inventory saves migrate',()=>{
 const s=city();s.pilotInventory={tool:'oxygen',oxygen:7,target:'heart'};assert.ok(restoreCity(serializeCity(s)));
 const p=createCityPilot();p.start(s);s.districts.heart.hp=40;s.resources.materials=0;p.equip('repair');Object.assign(p.cell,groundCoordinate(siteAt(s.layout,'heart')));
 assert.equal(pilotCellAction(s,'repair','heart').ok,false);assert.equal(s.districts.heart.hp,40);
 p.equip('nutrient');assert.equal(pilotCellAction(s,'nutrient','gut').ok,false);assert.equal(pilotInventory(s).nutrient,0);
 const bad=JSON.parse(serializeCity(s));bad.pilotInventory.debris=7;assert.equal(restoreCity(JSON.stringify(bad)),null);p.stop();
});

for(const theme of ['2','1'])test('theme '+theme+': workstations have reachable approaches; aimed work stops when looking away',()=>{
 const s=city(),p=createCityPilot(),sites=pilotSites(s),lung=sites.find(x=>x.key==='oxygen:lung');assert.equal(sites.length,13);
 assert.ok(p.start(s,{theme,spawn:lung.approach}));
 for(const site of sites){assert.ok(p.world.canStand(site.approach),site.key);assert.ok(p.world.route(lung.approach,site.approach,'neutrophil').length,site.key+' reachable');}
 aim(p,lung.target,lung.height);assert.equal(p.view().interaction.key,lung.key);const original=p.cell;assert.ok(p.matchTool());assert.equal(p.view().tool.id,'oxygen');assert.equal(p.cell,original);
 const away={x:p.view().position.x,z:p.view().position.z+2};aim(p,away);hold(p,1);assert.equal(pilotInventory(s).oxygen,0,'proximity alone cannot load');p.step(.05);
 aim(p,lung.target,lung.height);hold(p,.3);assert.ok(p.view().progress>0);aim(p,away);hold(p,.2);assert.equal(p.view().progress,0);assert.equal(pilotInventory(s).oxygen,0);
 p.step(.05);aim(p,lung.target,lung.height);hold(p,1);assert.ok(pilotInventory(s).oxygen>0);assert.equal(p.view().workPulse.key,lung.key);assert.ok(restoreCity(serializeCity(s)));p.stop();
});

test('aim chooses the intended debris; held use cannot sweep into a second object',()=>{
 const s=city(),p=createCityPilot(),w=pilotWorld(s.layout,'2');
 const origin=w.safe(siteAt(s.layout,'heart'),'neutrophil',q=>[-.65,.65].every(x=>w.canStand({x:q.x+x,z:q.z-1.2})&&w.clear(q,{x:q.x+x,z:q.z-1.2})));assert.ok(origin);p.start(s,{spawn:origin});p.equip('cleanup');
 const targets=[{x:origin.x-.65,z:origin.z-1.2},{x:origin.x+.65,z:origin.z-1.2}];s.debris=targets.map((point,n)=>({id:++s.serial,...groundCoordinate(point),recordId:n?'SAU-001':'KPN-001'}));const [left,right]=s.debris;
 aim(p,targets[1],.12);assert.equal(p.view().interaction.key,'debris:'+right.id);hold(p,.7);assert.deepEqual(s.debris,[left]);assert.equal(pilotInventory(s).debris,1);
 aim(p,targets[0],.12);hold(p,1);assert.deepEqual(s.debris,[left]);p.step(.05);hold(p,.7);assert.equal(s.debris.length,0);assert.equal(pilotInventory(s).debris,2);p.stop();
});

test('a repair interaction across a building cannot consume materials or restore HP',()=>{
 const s=city(),p=createCityPilot();s.frontier.tissues[0].hp=50;p.start(s);p.equip('repair');const job=pilotJobs(s,'repair').find(j=>j.id==='tissue:0');
 let blocked=null;for(let n=0;n<48;n++){const q={x:job.x+Math.cos(n*Math.PI/24)*2.3,z:job.z+Math.sin(n*Math.PI/24)*2.3};if(p.world.canStand(q)&&!p.world.clear(q,job)){blocked=q;break;}}
 assert.ok(blocked,'fixture has another side separated by a structure');Object.assign(p.cell,groundCoordinate(blocked));p.resetMotion();const materials=s.resources.materials;assert.equal(pilotCellAction(s,'repair',job.id).ok,false);assert.equal(s.frontier.tissues[0].hp,50);assert.equal(s.resources.materials,materials);p.stop();
});
