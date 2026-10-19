import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCity,tickCity,command,serializeCity,restoreCity} from '../src/city-engine.mjs';
import {exposeSite,infectionLoad,localInfection,medicineEffect,medicationActivity} from '../src/city-biology.mjs';
import {WALLS} from '../src/city-frontier-data.mjs';
const data=JSON.parse(fs.readFileSync(new URL('../data/organisms.json',import.meta.url)));
const city=()=>createCity('normal','simulation',{specialists:true});
const advance=(s,n)=>{for(let i=0;i<n*20;i++)tickCity(s,.05,data);};
const until=(s,p,max=70)=>{for(let i=0;i<max*20&&!p();i++)tickCity(s,.05,data);assert.ok(p(),'state reached within '+max+'s');};

test('sandbox is quiet, cannot win or fail, and validates manual exposure routes and caps',()=>{
 const s=city();advance(s,95);assert.equal(s.spawn.length+s.enemies.length,0);assert.equal(localInfection(s),0);assert.equal(s.frontier.walls.every(w=>w.hp===100),true);
 s.districts.heart.hp=0;advance(s,1);assert.equal(s.status,'running');
 assert.equal(command(s,'expose',{recordId:'CDF-121',front:'blood',amount:3},data).ok,false);
 assert.equal(command(s,'expose',{recordId:'SAU-002',front:'blood',amount:12},data).ok,true);
 assert.equal(command(s,'expose',{recordId:'SAU-002',front:'blood',amount:12},data).ok,true);
 assert.equal(command(s,'expose',{recordId:'SAU-002',front:'blood',amount:12},data).ok,false);
 assert.equal(command(createCity('normal','steady',{specialists:true}),'expose',{recordId:'SAU-002',front:'blood',amount:3},data).ok,false);
});
test('skin exposure must cross a broken segment before it seeds an infection',()=>{
 const s=city();s.cells=[];
 assert.ok(command(s,'expose',{recordId:'SAU-002',front:'skin',wall:11,amount:3},data).ok);
 advance(s,8);assert.equal(localInfection(s),0);assert.ok(s.frontier.walls[11].hp>0);
 command(s,'lab-wound','11');until(s,()=>localInfection(s)>0);
 assert.ok(infectionLoad(s.biology.sites[WALLS[11].district])>0);
});
test('local infection persists without visible enemies, spreads via blood, and isolation blocks that route',()=>{
 const a=city(),b=city();for(const s of [a,b]){s.cells=[];exposeSite(s,'lung','SAU-002',70);}
 command(b,'isolate','lung');advance(a,22);advance(b,22);
 assert.ok(infectionLoad(a.biology.sites.heart)>0);assert.equal(infectionLoad(b.biology.sites.heart),0);
 assert.ok(a.biology.sites.lung.inflammation>0);assert.ok(a.districts.lung.hp<100);assert.ok(a.biology.transfers.length<=12);
});
test('medicine needs physical delivery; oral vancomycin stays local and IV stock distributes',()=>{
 const oral=city(),iv=city();
 for(const [s,route] of [[oral,'oral'],[iv,'iv']]){
  assert.ok(command(s,'medicine',{drugId:'vancomycin',route,packs:1},data).ok);
  advance(s,.2);assert.equal(s.biology.blood.vancomycin,0);assert.equal(s.biology.lumen.vancomycin,0);
  until(s,()=>s.biology.stats.medicine>0);advance(s,12);
 }
 assert.equal(oral.biology.blood.vancomycin,0);assert.ok(oral.biology.lumen.vancomycin>0);
 assert.ok(iv.biology.blood.vancomycin>0);assert.equal(iv.biology.lumen.vancomycin,0);
 assert.ok(medicineEffect(oral,'gut','CDF-121',data)>0);assert.equal(medicineEffect(iv,'gut','CDF-121',data),0);
 assert.equal(command(oral,'medicine',{drugId:'oxacillin',route:'oral',packs:1},data).ok,false);
 assert.equal(medicationActivity(data,'SAU-002','oxacillin').active,false);
 assert.equal(medicationActivity(data,'SAU-002','vancomycin').active,true);
});
test('antibodies mark targets without remote damage; exhausted phagocytes recover at a real workplace',()=>{
 const s=city();s.cells=[];s.antibodies['SAU-002']=100;
 s.enemies.push({id:999,recordId:'SAU-002',hp:200,maxHp:200,x:575,y:359,front:'blood',entered:true,site:'heart'});
 advance(s,2);assert.equal(s.enemies[0].hp,200);assert.ok(s.enemies[0].opsonized>0);
 const recovery=city(),c=recovery.cells.find(c=>c.kind==='neutrophil');recovery.cells=[c];Object.assign(c,{x:575,y:359,path:[],step:0,energy:1,integrity:50});
 advance(recovery,1);assert.equal(c.recovering,true);assert.equal(c.target,'heart');
 until(recovery,()=>!c.recovering,65);assert.ok(c.energy>=85);assert.ok(c.integrity>=85);assert.equal(c.workplace,null);
 command(recovery,'response','recover:heart');advance(recovery,10);assert.equal(c.recovering,true);
});
test('cell loss creates removable cell remains, not a false pathogen antigen',()=>{
 const s=city(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,{x:575,y:359,integrity:.001,path:[],step:0});
 s.enemies.push({id:999,recordId:'SAU-002',hp:200,maxHp:200,x:575,y:359,front:'blood',entered:true,site:'heart'});
 advance(s,.1);assert.equal(s.cells.length,0);assert.equal(s.biology.stats.losses,1);assert.equal(s.debris[0].cellKind,'neutrophil');assert.equal(s.debris[0].recordId,null);assert.ok(restoreCity(serializeCity(s)));
});
test('new state restores deterministically and rejects malformed physiology or delivery data',()=>{
 const s=city();command(s,'expose',{recordId:'CDF-121',front:'gut',amount:6},data);command(s,'medicine',{drugId:'vancomycin',route:'oral',packs:2},data);advance(s,13);
 const copy=restoreCity(serializeCity(s));assert.ok(copy);advance(s,4);advance(copy,4);assert.equal(serializeCity(s),serializeCity(copy));
 const bad=JSON.parse(serializeCity(s));bad.biology.sites.gut.strains['CDF-121']=-2;assert.equal(restoreCity(bad),null);
 const old=JSON.parse(serializeCity(s));delete old.biology;assert.ok(restoreCity(old));
});

test('recovery starts with an established focus; tissue phagocytes do not attack through intact barriers',()=>{
 const recovery=createCity('normal','recovery',{specialists:true});assert.ok(localInfection(recovery)>0);assert.ok(recovery.enemies.every(e=>e.entered));
 const s=city(),c=s.cells.find(c=>c.kind==='neutrophil');s.cells=[c];Object.assign(c,{x:WALLS[11].inside.x,y:WALLS[11].inside.y,path:[],step:0});
 command(s,'expose',{recordId:'SAU-002',front:'skin',wall:11,amount:3},data);advance(s,3);
 assert.ok(s.enemies.every(e=>e.hp===e.maxHp));assert.equal(c.energy,100);
});
