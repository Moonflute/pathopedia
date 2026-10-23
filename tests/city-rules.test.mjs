import test from 'node:test';
import assert from 'node:assert/strict';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {workStation} from '../src/city-activity.mjs';
import {createCityInfoDocument} from '../src/city-info-data.mjs';
import {parseCityInfo,createInfoEditor} from '../src/city-info-model.mjs';
import {compileRuleGraph,setRuleTarget,isRuleView} from '../src/city-info-rules.mjs';
import {defaultCityRules,validateCityRules,applyCityRules,storeRuleProfile,loadRuleProfile,CITY_RULES_KEY} from '../src/city-rules.mjs';
const step=s=>tickCity(s,1/30,{});
const advance=(s,seconds)=>{for(let i=0;i<seconds*30;i++)step(s);};
const town=()=>{const s=createCity('normal','simulation',{specialists:true});s.cells=[];s.intakeClock=10000;s.supplyClock=10000;s.frontier.supplyClock=10000;return s;};
const edit=(s,fn)=>{const c=structuredClone(s.rules);fn(c.entries);assert.equal(applyCityRules(s,c).ok,true);};
function until(s,condition,seconds=30){for(let i=0;i<seconds*30;i++){step(s);if(condition())return;}assert.fail('Expected work transition');}

test('legacy maps migrate without losing notes; executable drafts round-trip and undo',()=>{
 const d=createCityInfoDocument();assert.deepEqual(compileRuleGraph(d).config,defaultCityRules());
 const old=structuredClone(d);old.schema=1;old.nodes=old.nodes.filter(n=>!n.rule&&!n.id.startsWith('home-')&&n.id!=='homeostasis');old.views=old.views.filter(v=>!isRuleView(v)&&!['innate','type2','homeostasis'].includes(v.id));old.nodes[0].label='사용자 설명';old.views[0].positions.lung.x=145;
 const migrated=parseCityInfo(JSON.stringify(old));assert.equal(migrated.nodes[0].label,'사용자 설명');assert.equal(migrated.views[0].positions.lung.x,145);assert.equal(compileRuleGraph(migrated).ok,true);
 const e=createInfoEditor(migrated);e.change(d=>{setRuleTarget(d,'exec-oxygen','kidney');d.nodes.find(n=>n.rule?.op==='oxygen').rule.params.amount=12;});
 const c=compileRuleGraph(e.document);assert.equal(c.config.entries.oxygen.target,'kidney');assert.equal(c.config.entries.oxygen.params.amount,12);assert.deepEqual(parseCityInfo(JSON.stringify(e.document)),e.document);e.undo();assert.equal(compileRuleGraph(e.document).config.entries.oxygen.target,'organs');
});

test('validation blocks bad values, missing/wrong ports, duplicate rules and executable cycles',()=>{
 for(const mutate of [d=>d.nodes.find(n=>n.rule).rule.params.rate=-1,d=>d.nodes.find(n=>n.rule).rule.op='script',d=>d.views.find(v=>v.id==='rules-production').edges.shift(),d=>d.views.find(v=>v.id==='rules-production').edges[0].from='food',d=>{const v=d.views.find(v=>v.id==='rules-production');v.edges[0].from='exec-materials';},d=>{const n=structuredClone(d.nodes.find(n=>n.rule));n.id='duplicate';d.nodes.push(n);d.views.find(v=>v.id==='rules-production').positions.duplicate={x:0,y:0};}]){
  const d=createCityInfoDocument();mutate(d);assert.equal(compileRuleGraph(d).ok,false);
 }
 const bad=defaultCityRules();bad.entries.oxygen.params.duration=0;assert.equal(validateCityRules(bad).ok,false);
 const inherited=createCityInfoDocument();inherited.nodes.find(n=>n.rule).rule.op='toString';assert.equal(compileRuleGraph(parseCityInfo(JSON.stringify(inherited))).ok,false);
 const s=town(),before=serializeCity(s);assert.equal(applyCityRules(s,bad).ok,false);assert.equal(serializeCity(s),before);
});

test('compiled production rates, oxygen gate, freight speed and dispatch destination change the simulation',()=>{
 const a=town(),b=town();edit(b,r=>{r.food.params.rate=3.6;});step(a);step(b);assert.ok(Math.abs((b.resources.food-110)-2*(a.resources.food-110))<1e-9);
 edit(b,r=>{r.food.params.minOxygen=95;});const before=b.rawFood;step(b);assert.equal(b.rawFood,before);
 const d=createCityInfoDocument();setRuleTarget(d,'exec-supply','kidney');const rule=d.nodes.find(n=>n.rule?.op==='supply');rule.rule.params.amount=12;rule.rule.params.interval=8;
 const s=town();assert.equal(applyCityRules(s,compileRuleGraph(d).config).ok,true);s.supplyClock=0;step(s);const sh=s.shipments.find(x=>x.kind==='food');assert.equal(sh.to,'kidney');assert.equal(sh.amount,12);assert.equal(s.supplyClock,8);
 const fast=restoreCity(serializeCity(s));edit(fast,r=>{r.freight.params.speed=170;});
 for(const city of [s,fast]){const delivery=city.shipments[0];Object.assign(delivery,{phase:'transit',x:0,y:0,path:[{x:1000,y:0}],step:0});delete delivery.workplace;delivery.activity=null;step(city);}
 assert.ok(Math.abs(fast.shipments[0].x-2*s.shipments[0].x)<1e-8);
});

test('rewiring oxygen node chooses the real destination; existing cargo survives a later apply',()=>{
 const full=createCity('normal','simulation',{specialists:true}),red=full.cells.find(c=>c.kind==='rbc');full.cells=[red];full.supplyClock=10000;
 Object.assign(red,{...workStation('lung','oxygen',red.id%3).stand,path:[],step:0,cargo:0,dock:'lung'});
 const d=createCityInfoDocument();setRuleTarget(d,'exec-oxygen','kidney');d.nodes.find(n=>n.rule?.op==='oxygen').rule.params.amount=12;
 applyCityRules(full,compileRuleGraph(d).config);until(full,()=>red.cargo>0);assert.equal(red.target,'kidney');assert.equal(red.cargo,12);
 edit(full,r=>{r.oxygen.target='heart';r.oxygen.params.amount=40;r.oxygen.enabled=false;});assert.equal(red.target,'kidney');assert.equal(red.cargo,12);
 until(full,()=>red.cargo===0);assert.equal(full.stats.oxygen,12);advance(full,1);assert.match(red.waitReason,/꺼짐/);
});

test('material and antibody batches charge their costs; paid antibody batches retain original output',()=>{
 const s=createCity('normal','simulation',{specialists:true}),c=s.cells.find(c=>c.kind==='fibroblast');s.cells=[c];s.supplyClock=10000;s.frontier.supplyClock=10000;
 Object.assign(c,{...workStation('marrow','fabricate',0).stand,path:[],step:0});edit(s,r=>{r.food.enabled=false;r.materials.params.cost=2;r.materials.params.amount=4;});const food=s.resources.food,materials=s.resources.materials;
 until(s,()=>c.task==='자재 생산');assert.equal(s.resources.food,food-2);assert.ok(Math.abs(s.resources.materials-materials-4)<1e-8);
 const p=createCity('normal','simulation',{specialists:true}),cell=p.cells.find(c=>c.kind==='bcell');Object.assign(cell,{kind:'plasma',licensed:true,recordId:'SPN-105',isotype:'IgG'});p.cells=[cell];p.antigens['SPN-105']=true;p.supplyClock=10000;p.frontier.supplyClock=10000;
 Object.assign(cell,{...workStation('lymph','produce',0).stand,path:[],step:0});edit(p,r=>{r.antibody.params.amount=3;r.antibody.params.cost=1;r.antibody.params.duration=2;});
 const localFood=p.districts.lymph.food;until(p,()=>cell.activity?.kind==='produce');assert.ok(p.districts.lymph.food<localFood-1);const paid=cell.activity.ruleYield;
 edit(p,r=>{r.antibody.params.amount=5;r.antibody.enabled=false;});until(p,()=>p.stats.antibodyBatches===1);assert.equal(p.antibodies['SPN-105'],paid);advance(p,1);assert.equal(p.stats.antibodyBatches,1);
 assert.ok(restoreCity(serializeCity(p)));
});

test('combat target, damage and oxygen condition affect real attacks; other fronts stay excluded',()=>{
 const attack=(target,minOxygen=0)=>{
  const s=createCity('normal','simulation',{specialists:true}),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,{x:875,y:240,cooldown:0,activity:null,energy:100});
  edit(s,r=>{r.neutrophil.params.damage=12;r.neutrophil.params.interval=3;r.neutrophil.params.minOxygen=minOxygen;r.neutrophil.target=target;});
  s.enemies=[{id:999,recordId:'GNX-225',x:879,y:242,hp:100,maxHp:100,dead:false,front:'airway',entered:true,site:'lung'}];step(s);return {s,c};
 };
 const hit=attack('airwayThreat');assert.ok(hit.s.enemies[0].hp<=88);assert.equal(hit.c.cooldown,3);
 assert.equal(attack('skinThreat').s.enemies[0].hp,100);assert.equal(attack('airwayThreat',95).s.enemies[0].hp,100);
});

test('construction and recruit speed are bounded and survive saved games; rule apply preserves stock/layout',()=>{
 const slow=town();slow.workCrews=false;slow.districts.heart.building={type:'upgrade',duration:9,remaining:9};slow.recruits=[{id:++slow.serial,kind:'neutrophil',remaining:8}];
 const fast=restoreCity(serializeCity(slow));edit(fast,r=>{r.construction.params.speed=2;r.recruit.params.speed=3;});step(slow);step(fast);
 assert.ok(Math.abs((9-fast.districts.heart.building.remaining)-2*(9-slow.districts.heart.building.remaining))<1e-9);assert.ok(Math.abs((8-fast.recruits[0].remaining)-3*(8-slow.recruits[0].remaining))<1e-9);
 const copy=restoreCity(serializeCity(fast));assert.ok(copy);advance(copy,1);advance(fast,1);assert.equal(serializeCity(copy),serializeCity(fast));
 const before=JSON.stringify({stock:fast.resources,cells:fast.cells,shipments:fast.shipments,layout:fast.layout,time:fast.time});applyCityRules(fast,defaultCityRules());assert.equal(JSON.stringify({stock:fast.resources,cells:fast.cells,shipments:fast.shipments,layout:fast.layout,time:fast.time}),before);
});

test('applied/previous profiles round-trip; quota failures and untrusted payloads never activate',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},a=defaultCityRules(),b=defaultCityRules();b.entries.food.params.rate=4;
 assert.equal(storeRuleProfile(storage,b,a),true);assert.deepEqual(loadRuleProfile(storage),{schema:1,current:b,previous:a});
 assert.equal(storeRuleProfile({setItem(){throw Error('quota');}},a,b),false);assert.equal(loadRuleProfile({getItem:()=>'{bad'}),null);
 const malicious=JSON.parse(map.get(CITY_RULES_KEY));malicious.current.entries.food.params.rate='fetch("https://x")';assert.equal(loadRuleProfile({getItem:()=>JSON.stringify(malicious)}),null);
 const legacy=createCity();assert.equal(applyCityRules(legacy,b).ok,false);
});
