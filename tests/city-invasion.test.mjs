import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {INVASION_MARCH,startInvasion,tickInvasion,invasionGate,invasionPose,invasionImpact} from '../src/city-invasion.mjs';
import {groundPoint,groundCoordinate,qualityProfile} from '../src/city-three-layout.mjs';
import {WALLS,SKIN_TISSUES,wallOpen} from '../src/city-frontier-data.mjs';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {applyTileLayout,createTileLayout} from '../src/city-tile-layout.mjs';
import {createActors} from '../src/city-three-actors.mjs';
import {createHostResponseScene} from '../src/city-three-host-response.mjs';
import {cityAlarmPoints} from '../src/city-three-alarms.mjs';

const town=()=>{const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());s.cells=[];return s;};
const projection=e=>{const g=invasionGate(e),p=groundPoint(e);return {forward:(p.x-g.x)*g.nx+(p.z-g.z)*g.nz,side:(p.x-g.x)*g.nz-(p.z-g.z)*g.nx};};

test('skin, airway and gut arrivals march slowly in a shared single file before striking',()=>{
 for(const front of ['skin','airway','gut']){
  const s={time:0,layout:{},enemies:[],physiology:{virions:[]},frontier:{walls:Array.from({length:32},()=>({hp:100}))}};
  for(let id=1;id<=4;id++){const e={id,front,wall:11,recordId:id===4?'IMM-VIRUS':'SAU-002',until:100};assert.ok(startInvasion(s,e));(id===4?s.physiology.virions:s.enemies).push(e);assert.ok(Math.abs(projection(e).side)<1e-8);assert.ok(Math.abs(projection(e).forward-(24+(id-1)*INVASION_MARCH.gap))<1e-8);}
  const actors=[...s.enemies,...s.physiology.virions];
  for(let n=0;n<140;n++){s.time+=.1;for(const e of actors)tickInvasion(s,e,.1);for(let k=1;k<actors.length;k++)assert.ok(projection(actors[k]).forward-projection(actors[k-1]).forward>=INVASION_MARCH.gap-1e-7);if(n===9)assert.ok(Math.abs(projection(actors[0]).forward-22.4)<1e-7);}
  assert.equal(actors[0].invasion.stage,'barrier');assert.ok(actors.slice(1).every(e=>e.invasion.stage==='march'));
  if(front==='skin'){s.frontier.walls[11].hp=0;assert.equal(tickInvasion(s,actors[0],.1),false);}else{s.time+=INVASION_MARCH.assault;assert.equal(tickInvasion(s,actors[0],.1),false);}
  assert.equal(actors[0].invasion.stage,'passed');
  if(front==='skin'){s.frontier.walls[11].hp=100;assert.ok(tickInvasion(s,actors[0],.1));assert.equal(actors[0].invasion.stage,'barrier');}
 }
});

test('wind-up, contact effects and recoil share one attack beat at the entry gate',()=>{
 for(const front of ['skin','airway','gut']){
  const e={id:1,front,wall:11,invasion:{stage:'barrier',since:10,moving:false}},g=invasionGate(e),stamps=[];
  const before=JSON.stringify(e),windup=invasionPose(e,10.2),contact=invasionPose(e,10+INVASION_MARCH.period*.5),recoil=invasionPose(e,10+INVASION_MARCH.period*.9);
  assert.ok(windup.lunge<0&&contact.lunge>0);assert.equal(recoil.lunge,0);assert.ok(Math.abs(Math.sin(contact.angle)+g.nx)<1e-8);assert.ok(Math.abs(Math.cos(contact.angle)+g.nz)<1e-8);
  invasionImpact(windup,0,(...args)=>stamps.push(args));assert.equal(stamps.length,0);invasionImpact(contact,0,(...args)=>stamps.push(args));assert.equal(stamps.length,7);assert.equal(stamps[0][1],g.x);assert.equal(stamps[0][3],g.z);assert.equal(JSON.stringify(e),before);
 }
});

test('arbitrary large doses and mixed entry queues resume deterministically',()=>{
 const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url))),s=town();
 assert.ok(command(s,'expose',{recordId:'GNX-221',front:'gut',amount:70},data).ok);
 assert.ok(command(s,'immune-challenge',{type:'virus',front:'gut',site:'gut',amount:3}).ok);
 for(let n=0;n<12;n++)tickCity(s,.1,data,'2');
 assert.ok(s.enemies.some(e=>e.invasion?.stage==='march'));const copy=restoreCity(serializeCity(s));assert.ok(copy);
 tickCity(s,.1,data,'2');tickCity(copy,.1,data,'2');assert.equal(serializeCity(copy),serializeCity(s));
 const invalid=JSON.parse(serializeCity(s));invalid.enemies[0].invasion.since=-1;assert.equal(restoreCity(JSON.stringify(invalid)),null);
});

test('arrival feet and impacts fit existing renderer pools on desktop and mobile',()=>{
 const s=town();assert.ok(command(s,'immune-challenge',{type:'virus',front:'airway',site:'lung',amount:192}).ok);
 for(const [n,front] of ['skin','airway','gut'].entries()){const e={id:900+n,recordId:'SAU-002',front,wall:11,hp:100,maxHp:100};startInvasion(s,e);e.invasion.stage='barrier';s.enemies.push(e);}
 s.physiology.virions[0].invasion.stage='barrier';s.time=INVASION_MARCH.period*.5;
 assert.ok(cityAlarmPoints(s).filter(a=>['skin:11','airway','gut'].includes(a.key)).every(a=>a.text.includes('장벽 공격')));
 for(const width of [390,1280]){const actors=createActors(qualityProfile(width)),host=createHostResponseScene(),before=serializeCity(s);actors.draw(s);host.update(s);assert.equal(actors.root.children.length,16);assert.equal(host.root.children.length,5);assert.ok(actors.root.getObjectByName('feet').count>=6);assert.ok(actors.root.getObjectByName('pod').count>=18);
  for(const root of [actors.root,host.root])root.traverse(m=>{if(m.isInstancedMesh){assert.ok(m.count<=m.instanceMatrix.count);assert.ok(m.instanceMatrix.array.every(Number.isFinite));}});assert.equal(serializeCity(s),before);host.dispose();
 }
});

test('wall damage lands once per contact, reflects bacterial strength and caps queue pressure',()=>{
 const hit=(recordId,count=1)=>{
  const s={time:0,layout:{},enemies:[],frontier:{walls:WALLS.map(()=>({hp:100,warningUntil:0}))}},g=WALLS[11];
  for(let n=0;n<count;n++)s.enemies.push({id:n+1,front:'skin',wall:11,recordId,...groundCoordinate({x:g.x+g.nx*(3.4+n*6.2),z:g.z+g.nz*(3.4+n*6.2)}),invasion:{version:1,stage:n?'march':'barrier',since:0,moving:false,strikes:0}});
  const e=s.enemies[0],w=s.frontier.walls[11];s.time=.66;tickInvasion(s,e,.66);assert.equal(w.hp,100);
  s.time=.7;tickInvasion(s,e,.04);const hp=w.hp;tickInvasion(s,e,.04);assert.equal(w.hp,hp,'one impact cannot be applied twice');assert.equal(s.frontier.walls[10].hp,100);
  return {s,e,w,damage:100-hp};
 };
 const single=hit('SAU-002'),crowd=hit('SAU-002',256),gas=hit('SPY-101'),virus=hit('IMM-VIRUS');
 assert.ok(single.damage>0&&gas.damage>single.damage);assert.ok(crowd.damage>single.damage&&crowd.damage<=single.damage*1.75+1e-8);assert.equal(virus.damage,0);
 for(let n=0;n<30&&!wallOpen(single.w);n++){single.s.time+=.1;tickInvasion(single.s,single.e,.1);}assert.ok(single.w.hp<100);
 single.w.hp=0;single.w.breached=true;tickInvasion(single.s,single.e,.1);single.w.hp=4;assert.ok(wallOpen(single.w));assert.equal(tickInvasion(single.s,single.e,.1),false);
 single.w.hp=25;assert.equal(wallOpen(single.w),false);assert.ok(tickInvasion(single.s,single.e,.1));single.s.time+=.7;tickInvasion(single.s,single.e,.7);assert.ok(single.w.hp<25);assert.equal(wallOpen(single.w),false,'a sealed wall must be broken again');
});

test('skin invaders naturally break a healthy wall and reach the adjacent tissue with city defenses active',()=>{
 const s=createCity('normal','simulation',{specialists:true,expanded:true});applyTileLayout(s,createTileLayout());
 const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));assert.ok(command(s,'expose',{recordId:'SAU-002',front:'skin',wall:11,amount:6},data).ok);
 let damaged=false,broken=false,entered=false,local=false;
 for(let n=0;n<600&&!local;n++){
  tickCity(s,.1,data,'2');const w=s.frontier.walls[11];damaged||=w.hp<100;broken||=wallOpen(w);entered||=s.enemies.some(e=>e.front==='skin'&&e.entered);local||=s.enemies.some(e=>e.action==='attack'&&e.attackTarget?.kind==='tissue'&&e.attackTarget.id===SKIN_TISSUES[11].id);
 }
 assert.ok(damaged,'strikes reduce wall health');assert.ok(broken,'a breach occurs without a manual wound');assert.ok(entered,'automatic patches do not close the breach at one HP');assert.ok(local,'the first attack targets tissue immediately inside the breach');
});

test('a saved assault resumes without replaying impacts and rejects invalid damage state',()=>{
 const s=town(),data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));command(s,'expose',{recordId:'SAU-002',front:'skin',wall:11,amount:3},data);
 for(let n=0;n<300&&s.frontier.walls[11].hp===100;n++)tickCity(s,.1,data,'2');assert.ok(s.frontier.walls[11].hp<100);
 const saved=serializeCity(s),copy=restoreCity(saved);assert.ok(copy);
 for(let n=0;n<35;n++){tickCity(s,.1,data,'2');tickCity(copy,.1,data,'2');}assert.equal(serializeCity(copy),serializeCity(s));
 const invalid=JSON.parse(saved);invalid.enemies[0].invasion.strikes=-1;assert.equal(restoreCity(invalid),null);invalid.enemies[0].invasion.strikes=1;invalid.frontier.walls[11].breached='yes';assert.equal(restoreCity(invalid),null);
});
